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

var Parser = Class('Parser', {

	buffer: '',
	i: 0,
  
	Parser: function() {
		this.onclose = new Delegate(this, 'close');
		this.ondata = new Delegate(this, 'data');
		this.onerror = new Delegate(this, 'error');
	},
  
	add: function(data) {
		this.buffer += data;
		this.parse();
	},
  
	parse: function() {
		for (var i = this.i, chr; i < this.buffer.length; i++) {
			chr = this.buffer[i];
      
			if (this.buffer.length == 2 && this.buffer[1] == '\u0000') {
				this.onclose.emit();
				this.buffer = '';
				this.i = 0;
				return;
			}
      
			if (i === 0) {
				if (chr != '\u0000')
					this.error('Bad framing. Expected null byte as first frame');
				else
					continue;
			}
      
			if (chr == '\ufffd') {
				var buffer = this.buffer.substr(1, i - 1);
				if (buffer[0] != '\ufffb' && buffer[1] != '\ubfff')
					this.ondata.emit(buffer);
          
				this.buffer = this.buffer.substr(i + 1);
				this.i = 0;
				return this.parse();
			}
		}
	},
  
	error: function(reason) {
		this.buffer = '';
		this.i = 0;
		this.onerror.emit(reason);
		return this;
	}
});

// 初次握手
function handshakes(self, req, socket, head, parser) {
  
	var key1 = req.headers['sec-websocket-key1'];
	var key2 = req.headers['sec-websocket-key2'];
	var origin = req.headers.origin;
	var location = (socket.encrypted ? 'wss' : 'ws') + '://' + req.headers.host + req.url;
	var upgrade = req.headers.upgrade;
	var headers;
	var encoding;
  
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
  
	if (key1 && key2) {
    
		if (head.length >= 8) {
			if (head.length > 8)
				parser.add(head.slice(8, head.length) + '');
        
			var num1 = parseInt(key1.match(/\d/g).join('')) / (key1.match(/\s/g).length);
			var num2 = parseInt(key2.match(/\d/g).join('')) / (key2.match(/\s/g).length);
			var md5 = crypto.createHash('md5');

			md5.update(String.fromCharCode(num1 >> 24 & 0xFF, num1 >> 16 & 0xFF, num1 >> 8 & 0xFF, num1 & 0xFF));
			md5.update(String.fromCharCode(num2 >> 24 & 0xFF, num2 >> 16 & 0xFF, num2 >> 8 & 0xFF, num2 & 0xFF));
			md5.update(head.slice(0, 8).toString('binary'));

			headers = [
				'HTTP/1.1 101 WebSocket Protocol Handshake',
				'Upgrade: WebSocket',
				'Connection: Upgrade',
				'Sec-WebSocket-Origin: ' + origin,
				'Sec-WebSocket-Location: ' + location
			];

			var protocol = req.headers['sec-websocket-protocol'];
			if (protocol)
				headers.push('Sec-WebSocket-Protocol: ' + protocol);

			headers.push('', md5.digest('binary'));
			encoding = 'binary';
		}
		else{
			self.close();
			return false;
		}
	}
	else {
		headers = [
			'HTTP/1.1 101 Web Socket Protocol Handshake',
			'Upgrade: WebSocket',
			'Connection: Upgrade',
			'WebSocket-Origin: ' + origin,
			'WebSocket-Location: ' + location,
			'',
			''
		];
		encoding = 'utf8';
	}
  
	try {
		socket.write(headers.join('\r\n'), encoding);
	}
	catch (e) {
		console.error(e);
		self.close();
		return false;
	}
	return true;
}


/**
 * @class tesla.web.service.Early
 * @extends tesla.web.service.Conversation
 */
Class('tesla.web.service.Early', tesla.web.service.Conversation, {

	m_socket: null,
	m_head: null,
  
	/**
	 * @param {http.ServerRequest} req
	 * @param {Buffer}             upgradeHead
   * @param {String}             bind_services_name
	 * @constructor
	 */
	Early: function(req, upgradeHead, bind_services_name) {
		this.Conversation(req, bind_services_name);
		this.m_socket = req.socket;
		this.m_head = upgradeHead;
	},
  
  /**
   * 初始化
   * @overwrite
   */
	init: function() {
	  
		var self = this;
		var socket = this.m_socket;
		var parser = new Parser();
    
		if (!handshakes(this, this.request, socket, this.m_head, parser)){
			return;
		}
    
		socket.setTimeout(0);
		//socket.setNoDelay(true);
		socket.setKeepAlive(true, TIMEOUT2);
		socket.setEncoding('utf8');
    
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
			self.m_socket.destroy();
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
  
  /**
   * @overwrite
   */
	close: function() {
	  
		if (this.isOpen) {
			var socket = this.m_socket;
			socket.removeAllListeners('end');
			socket.removeAllListeners('close');
			socket.removeAllListeners('error');
			socket.removeAllListeners('data');
			socket.end();
			this.onclose.emit();
		}
	},
	
  /**
   * @overwrite
   */
	send: function(msg) {
    
		if (!this.isOpen){
		  throw new Error('error connection close status');
		}
		
		msg = JSON.stringify(msg);

		var length = Buffer.byteLength(msg);
		var buffer = new Buffer(2 + length);

		buffer.write('\x00', 'binary');
		buffer.write(msg, 1, 'utf8');
		buffer.write('\xff', 1 + length, 'binary');

		try {
			this.m_socket.write(buffer);
		}
		catch (e) {
			this.close();
		}
	}
});


