
include('tesla/Delegate.js');
include('tesla/node.js');

var TEST_TIME = 5E4;
var TEST_MSG = '\ufffb\ubfff';

/**
 * @class tesla.client.Conversation.private$parser
 * @extends Object
 * @createTime 2012-03-08
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var private$parser =

Class('private$parser', {

	buffer: '',
	i: 0,

	private$parser: function() {
		this.onclose = new Delegate(this, 'close');
		this.ondata = new Delegate(this, 'data');
		this.onerror = new Delegate(this, 'error');
	},

	add: function(data) {
		this.buffer += data;
		this.parse();
	},

	parse: function() {
		for (var i = this.i, chr, l = this.buffer.length; i < l; i++) {

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

/**
 * @class tesla.client.Conversation
 * @extends Object
 * @createTime 2012-03-08
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

/*
 * Send a test signal
 */
function sendTest(_this) {
	Function.undelay(_this._test_timeout);
	_this._test_timeout = _this.send.delay(_this, TEST_TIME, TEST_MSG);
}

Class('tesla.client.Conversation', {

	//private:
	_connect: false,
	_socket: null,
	_url: '',
	_message: null,
	_test_timeout: 0,


	//public:
	/**
	 * open status
	 * @type Boolean
	 */
	open: false,

	/**
	 * @event onselected
	 */
	onopen: null,

	/**
	 * @event onselected
	 */
	onmessage: null,

	/**
	 * @event onselected
	 */
	onerror: null,

	/**
	 * @event onselected
	 */
	onclose: null,

	/**
		* constructor function
		* @constructor
		*/
	Conversation: function(url) {
		var _this = this;
		this._url = url;
		this._message = [];

		Delegate.def(this, 'open', 'message', 'error', 'close');
		nextTick(this, this.connect);

		this.onopen.on(function() {
			_this.open = true;
			_this._connect = false;
		});

		this.onclose.on(function() {
			_this.open = false;
			_this._connect = false;
		});

		this.onerror.on(function() {
			_this._connect = false;
		});
	},

	/**
		* connercion server
		*/
	connect: function() {
		if (!this.open && !this._connect) {
			this._connect = true;
			this.init();
		}
	},

	/**
		* init conversation
		*/
	init: function() {
		var _this = this;
		var mat = this._url.match(/^wss?:\/\/([^\/:]+)(:(\d+))?(\/.+)$/i);

		// make a request
		var options = {
			port: parseInt(mat[3]) || 80,
			host: mat[1],
			path: mat[4] || '/',
			headers: {
				'Connection': 'Upgrade',
				'Upgrade': 'websocket'
			}
		};

		var req = tesla.node.http.request(options);
		req.end();

		req.on('upgrade', function(res, socket, upgradeHead) {
			_this._socket = socket;

			socket.setNoDelay(true);
			socket.setEncoding('utf8');

			socket.on('end', function() {
				console.log('client socket end close');
				_this.close();
			});

			socket.on('close', function() {
				console.log('client socket close');
				_this.close();
			});

			socket.on('error', function(e) {
				console.error(e);
				_this.onerror.emit(e);
				_this.close();
				_this._socket.destroy();
			});

			var parser = new private$parser();
			socket.on('data', parser.add.bind(parser));

      _this.onmessage.shell(parser.ondata);
            
			parser.onclose.on(function() {
				console.log('websocket parser close');
				_this.close();
			});

			parser.onerror.on(function(e) {
				var data = e.data;
				console.error(data);
				_this.onerror.emit(data);
				_this.close();
			});

			var msg = _this._message;
			_this._message = [];
			_this.onopen.emit();

			for (var i = 0, l = msg.length; i < l; i++)
				socket.write(msg[i]);

			sendTest(_this);
		});
	},

	/**
		* send message to server
		* @param {String} msg
		*/
	send: function(msg) {
		msg = '\u0000' + msg + '\ufffd';

		if (this.open) {

			this._socket.write(msg);
			sendTest(this);
		}
		else if (msg != TEST_MSG) {
			this._message.push(msg);
			this.connect();
		}
	},

	/**
		* close conversation connection
		*/
	close: function() {
		if (this.open) {
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
