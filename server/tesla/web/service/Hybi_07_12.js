/**
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/web/service/Conversation.js');
include('tesla/Delegate.js');
include('tesla/node.js');

var crypto = tesla.node.crypto;
var Buffer = tesla.node.buffer.Buffer;
var Delegate = tesla.Delegate;
//var TIMEOUT = 7e4;
var TIMEOUT2 = 5e4;

/*
 * Unpacks a buffer to a number.
 *
 * @api public
 */

function _unpack(buffer) {
	var n = 0;
	for (var i = 0; i < buffer.length; ++i) {
		n = (i == 0) ? buffer[i] : (n * 256) + buffer[i];
	}
	return n;
}


var Parser = Class('Parser', {

	/*
	 * WebSocket parser
	 *
	 * @api public
	 */
  
	Parser: function() {
    
		this.onclose = new Delegate(this, 'close');
		this.ondata = new Delegate(this, 'data');
		this.onerror = new Delegate(this, 'error');
		this.onping = new Delegate(this, 'ping');
		this.onbinary = new Delegate(this, 'binary');
		
		//tesla.Delegate.def(this, 'close', 'data', 'error', 'ping', 'binary');
    
		this.state = {
			activeFragmentedOperation: null,
			lastFragment: false,
			masked: false,
			opcode: 0
		};
		
		this.overflow = null;
		this.expectOffset = 0;
		this.expectBuffer = null;
		this.expectHandler = null;
		this.currentMessage = '';
    
		var self = this;
		
		this.opcodeHandlers = {
		  
			// text
			'1': function(data) {
				var finish = function(mask, data) {
					self.currentMessage += self.unmask(mask, data);
					if (self.state.lastFragment) {
						var msg = self.currentMessage;
						if (msg[0] != '\ufffb' && msg[1] != '\ubfff')
							self.ondata.emit(msg);

						self.currentMessage = '';
					}
					self.endPacket();
				};

				var expectData = function(length) {
					if (self.state.masked) {
						self.expect('Mask', 4, function(data) {
							var mask = data;
							self.expect('Data', length, function(data) {
								finish(mask, data);
							});
						});
					}
					else {
						self.expect('Data', length, function(data) {
							finish(null, data);
						});
					}
				};

				// decode length
				var firstLength = data[1] & 0x7f;
				if (firstLength < 126) {
					expectData(firstLength);
				}
				else if (firstLength == 126) {
					self.expect('Length', 2, function(data) {
						expectData(_unpack(data));
					});
				}
				else if (firstLength == 127) {
					self.expect('Length', 8, function(data) {
						if (_unpack(data.slice(0, 4)) != 0) {
							self.error('packets with length spanning more than 32 bit is currently not supported');
							return;
						}
						var lengthBytes = data.slice(4); // note: cap to 32 bit length
						expectData(_unpack(data));
					});
				}
			},
			
			// binary
			'2': function(data) {
			  
				var finish = function(mask, data) {
					if (typeof self.currentMessage == 'string') self.currentMessage = []; // build a buffer list
					self.currentMessage.push(self.unmask(mask, data, true));
					if (self.state.lastFragment) {
						self.onbinary.emit(self.concatBuffers(self.currentMessage));
						self.currentMessage = '';
					}
					self.endPacket();
				};

				var expectData = function(length) {
					if (self.state.masked) {
						self.expect('Mask', 4, function(data) {
							var mask = data;
							self.expect('Data', length, function(data) {
								finish(mask, data);
							});
						});
					}
					else {
						self.expect('Data', length, function(data) {
							finish(null, data);
						});
					}
				};

				// decode length
				var firstLength = data[1] & 0x7f;
				if (firstLength < 126) {
					expectData(firstLength);
				}
				else if (firstLength == 126) {
					self.expect('Length', 2, function(data) {
						expectData(_unpack(data));
					});
				}
				else if (firstLength == 127) {
					self.expect('Length', 8, function(data) {
						if (_unpack(data.slice(0, 4)) != 0) {
							self.error('packets with length spanning more than 32 bit is currently not supported');
							return;
						}
						var lengthBytes = data.slice(4); // note: cap to 32 bit length
						expectData(_unpack(data));
					});
				}
			},
			
			// close
			'8': function(data) {
				self.onclose.emit();
				self.reset();
			},
			
			// ping
			'9': function(data) {
			  
				if (self.state.lastFragment == false) {
					self.error('fragmented ping is not supported');
					return;
				}

				var finish = function(mask, data) {
					self.onping.emit(self.unmask(mask, data));
					self.endPacket();
				};
        
				var expectData = function(length) {
					if (self.state.masked) {
						self.expect('Mask', 4, function(data) {
							var mask = data;
							self.expect('Data', length, function(data) {
								finish(mask, data);
							});
						});
					}
					else {
						self.expect('Data', length, function(data) {
							finish(null, data);
						});
					}
				};
        
				// decode length
				var firstLength = data[1] & 0x7f;
				if (firstLength === 0) {
					finish(null, null);
				}
				else if (firstLength < 126) {
					expectData(firstLength);
				}
				else if (firstLength == 126) {
					self.expect('Length', 2, function(data) {
						expectData(_unpack(data));
					});
				}
				else if (firstLength == 127) {
					self.expect('Length', 8, function(data) {
						expectData(_unpack(data));
					});
				}
			}
		};
		
		this.expect('Opcode', 2, this.processPacket);
	},
  
	/*
	 * Add new data to the parser.
	 *
	 * @api public
	 */

	add: function(data) {
		if (this.expectBuffer == null) {
			this.addToOverflow(data);
			return;
		}
		var toRead = Math.min(data.length, this.expectBuffer.length - this.expectOffset);
		data.copy(this.expectBuffer, this.expectOffset, 0, toRead);
		this.expectOffset += toRead;
		if (toRead < data.length) {
			// at this point the overflow buffer shouldn't at all exist
			this.overflow = new Buffer(data.length - toRead);
			data.copy(this.overflow, 0, toRead, toRead + this.overflow.length);
		}
		if (this.expectOffset == this.expectBuffer.length) {
			var bufferForHandler = this.expectBuffer;
			this.expectBuffer = null;
			this.expectOffset = 0;
			this.expectHandler.call(this, bufferForHandler);
		}
	},

	/*
	 * Adds a piece of data to the overflow.
	 *
	 * @api private
	 */

	addToOverflow: function(data) {
		if (this.overflow == null) this.overflow = data;
		else {
			var prevOverflow = this.overflow;
			this.overflow = new Buffer(this.overflow.length + data.length);
			prevOverflow.copy(this.overflow, 0);
			data.copy(this.overflow, prevOverflow.length);
		}
	},

	/*
	 * Waits for a certain amount of bytes to be available, then fires a callback.
	 *
	 * @api private
	 */

	expect: function(what, length, handler) {
		this.expectBuffer = new Buffer(length);
		this.expectOffset = 0;
		this.expectHandler = handler;
		if (this.overflow != null) {
			var toOverflow = this.overflow;
			this.overflow = null;
			this.add(toOverflow);
		}
	},

	/*
	 * Start processing a new packet.
	 *
	 * @api private
	 */

	processPacket: function(data) {
		if ((data[0] & 0x70) != 0) this.error('reserved fields must be empty');
		this.state.lastFragment = (data[0] & 0x80) == 0x80;
		this.state.masked = (data[1] & 0x80) == 0x80;
		var opcode = data[0] & 0xf;
		if (opcode == 0) {
			// continuation frame
			this.state.opcode = this.state.activeFragmentedOperation;
			if (!(this.state.opcode == 1 || this.state.opcode == 2)) {
				this.error('continuation frame cannot follow current opcode')
				return;
			}
		}
		else {
			this.state.opcode = opcode;
			if (this.state.lastFragment === false) {
				this.state.activeFragmentedOperation = opcode;
			}
		}
		var handler = this.opcodeHandlers[this.state.opcode];
		if (typeof handler == 'undefined') this.error('no handler for opcode ' + this.state.opcode);
		else handler(data);
	},

	/*
	 * Endprocessing a packet.
	 *
	 * @api private
	 */

	endPacket: function() {
		this.expectOffset = 0;
		this.expectBuffer = null;
		this.expectHandler = null;
		if (this.state.lastFragment && this.state.opcode == this.state.activeFragmentedOperation) {
			// end current fragmented operation
			this.state.activeFragmentedOperation = null;
		}
		this.state.lastFragment = false;
		this.state.opcode = this.state.activeFragmentedOperation != null ? this.state.activeFragmentedOperation : 0;
		this.state.masked = false;
		this.expect('Opcode', 2, this.processPacket);
	},

	/*
	 * Reset the parser state.
	 *
	 * @api private
	 */

	reset: function() {
		this.state = {
			activeFragmentedOperation: null,
			lastFragment: false,
			masked: false,
			opcode: 0
		};
		this.expectOffset = 0;
		this.expectBuffer = null;
		this.expectHandler = null;
		this.overflow = null;
		this.currentMessage = '';
	},

	/*
	 * Unmask received data.
	 *
	 * @api private
	 */

	unmask: function(mask, buf, binary) {
		if (mask != null) {
			for (var i = 0, ll = buf.length; i < ll; i++) {
				buf[i] ^= mask[i % 4];
			}
		}
		if (binary) return buf;
		return buf != null ? buf.toString('utf8') : '';
	},

	/*
	 * Concatenates a list of buffers.
	 *
	 * @api private
	 */

	concatBuffers: function(buffers) {
		var length = 0;
		for (var i = 0, l = buffers.length; i < l; ++i) {
			length += buffers[i].length;
		}
		var mergedBuffer = new Buffer(length);
		var offset = 0;
		for (var i = 0, l = buffers.length; i < l; ++i) {
			buffers[i].copy(mergedBuffer, offset);
			offset += buffers[i].length;
		}
		return mergedBuffer;
	},

	/*
	 * Handles an error
	 *
	 * @api private
	 */

	error: function(reason) {
		this.reset();
		this.onerror.emit(reason);
		return this;
	}

});
//Parser end

function handshakes(self, req, socket, head) {

	var key = req.headers['sec-websocket-key'];
	var origin = req.headers['sec-websocket-origin'];
	var location = (socket.encrypted ? 'wss' : 'ws') + '://' + req.headers.host + req.url;
	var upgrade = req.headers.upgrade;

	if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
		console.error('connection invalid');
		self.close();
		return false;
	}

	if (!self.verifyOrigin(origin)) {
		console.error('connection invalid: origin mismatch');
		self.close();
		return false;
	}

	if (!key) {
		console.error('connection invalid: received no key');
		self.close();
		return false;
	}

	// calc key
	var shasum = crypto.createHash('sha1');
	shasum.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
	key = shasum.digest('base64');

	var headers = [
		'HTTP/1.1 101 Switching Protocols',
		'Upgrade: websocket',
		'Connection: Upgrade',
		'Sec-WebSocket-Accept: ' + key
	];

	try {
		socket.write(headers.concat('', '').join('\r\n'));
	}
	catch (e) {
		console.error(e);
		self.close();
		return false;
	}
	return true;
}


/*
 * Frame server-to-client output as a text packet.
 *
 * @api private
 */
function _frame(_this, opcode, str) {
	var dataBuffer = new Buffer(str);
	var dataLength = dataBuffer.length;
	var startOffset = 2;
	var secondByte = dataLength;

	if (dataLength > 65536) {
		startOffset = 10;
		secondByte = 127;
	}
	else if (dataLength > 125) {
		startOffset = 4;
		secondByte = 126;
	}
	var outputBuffer = new Buffer(dataLength + startOffset);
	outputBuffer[0] = opcode;
	outputBuffer[1] = secondByte;
	dataBuffer.copy(outputBuffer, startOffset);
	switch (secondByte) {
		case 126:
			outputBuffer[2] = dataLength >>> 8;
			outputBuffer[3] = dataLength % 256;
			break;
		case 127:
			var l = dataLength;
			for (var i = 1; i <= 8; ++i) {
				outputBuffer[startOffset - i] = l & 0xff;
				l >>>= 8;
			}
	}
	return outputBuffer;
}


/**
 * @class tesla.web.service.Hybi_07_12
 * @extends tesla.web.service.Conversation
 */
Class('tesla.web.service.Hybi_07_12', tesla.web.service.Conversation, {
  
	/**
	 * @private
	 */
	_socket: null,
	
	/**
	 * @private
	 */
	_head: null,
  
	/**
	 * constructor function
	 * @param {http.ServerRequest} req
	 * @param {Buffer}             upgradeHead
	 * @param {String}             bind_services_name
	 * @constructor
	 */
	Hybi_07_12: function(req, upgradeHead, bind_services_name) {
		this.Conversation(req, bind_services_name);
		this._socket = req.socket;
		this._head = upgradeHead;
	},
  
  /**
   * @overwrite
   */
	init: function() {
		var self = this;
		var socket = this._socket;
		var parser = new Parser();

		if (!handshakes(this, this.request, socket, this._head))
			return;

		socket.setTimeout(0);
		//socket.setNoDelay(true);
		socket.setKeepAlive(true, TIMEOUT2);

		socket.on('timeout', function() {
			//console.log('websocket timeout close');
			self.close();
		});

		socket.on('end', function() {
			//console.log('websocket end close');
			self.close();
		});

		socket.on('close', function() {
			//console.log('websocket close');
			self.close();
		});

		socket.on('error', function(e) {
			console.error(e);
			self.onerror.emit(e);
			self.close();
			self._socket.destroy();
		});

		socket.on('data', parser.add.bind(parser));

    parser.ondata.on(function(evt){
      self.parse(evt.data);
    });
    
		parser.onclose.on(function() {
			//console.log('websocket parser close');
			self.close();
		});

		parser.onerror.on(function(e) {
			var data = e.data;
			console.error(data);
			self.onerror.emit(data);
			self.close();
		});
	},
  
	send: function(msg) {
		if (!this.isOpen){
			throw new Error('error connection close status');
		}
		
		msg = JSON.stringify(msg);

		var buf = _frame(this, 0x81, msg);
		try {
			this._socket.write(buf, 'binary');
		}
		catch (e) {
			console.error(e);
			this.close();
		}
	},
  
	close: function() {
		if (this.isOpen) {
			var socket = this._socket;
			socket.removeAllListeners('end');
			socket.removeAllListeners('close');
			socket.removeAllListeners('error');
			socket.removeAllListeners('data');
			socket.end();
			this.onclose.emit();
		}
	}
});

