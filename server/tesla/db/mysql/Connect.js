
include('tesla/db/mysql/Parser.js');
include('tesla/db/mysql/Mysql.js');
include('tesla/db/mysql/CONSTANTS.js');
include('tesla/db/mysql/Auth.js');
include('tesla/db/mysql/OutgoingPacket.js');
include('tesla/Delegate.js');
include('tesla/Extend.js');
include('tesla/node.js');

var Buffer = tesla.node.buffer.Buffer;
var Socket = tesla.node.net.Socket;
var mysql = tesla.db.mysql;
var Parser = mysql.Parser;
var CONSTANTS = mysql.CONSTANTS;
var Auth = mysql.Auth;
var OutgoingPacket = mysql.OutgoingPacket;

var CONNECT_TIMEOUT = 1e4;
var MAX_CONNECT_COUNT = 20;
var connect_pool = {};
var require_connect = [];

function write(_this, packet) {
  _this._socket.write(packet.buffer);
}

function sendAuth(_this, greeting) {

	var opt = _this.opt;
	var token = Auth.token(opt.password, greeting.scrambleBuffer);
	var packetSize = (
		4 + 4 + 1 + 23 +
		opt.user.length + 1 +
		token.length + 1 +
		opt.database.length + 1
	);
	var packet = new OutgoingPacket(packetSize, greeting.number + 1);

	packet.writeNumber(4, Connect.DEFAULT_FLAGS);
	packet.writeNumber(4, Connect.MAX_PACKET_SIZE);
	packet.writeNumber(1, Connect.CHAREST_NUMBER);
	packet.writeFiller(23);
	packet.writeNullTerminated(opt.user);
	packet.writeLengthCoded(token);
	packet.writeNullTerminated(opt.database);

	write(_this, packet);

	// Keep a reference to the greeting packet. We might receive a
	// USE_OLD_PASSWORD_PROTOCOL_PACKET as a response, in which case we will need
	// the greeting packet again. See sendOldAuth()
	_this._greeting = greeting;
}

function sendOldAuth(_this, greeting) {
	var token = Auth.scramble323(greeting.scrambleBuffer, _this.opt.password);
	var packetSize = (token.length + 1);

	var packet = new OutgoingPacket(packetSize, greeting.number + 3);

	// I could not find any official documentation for this, but from sniffing
	// the mysql command line client, I think this is the right way to send the
	// scrambled token after receiving the USE_OLD_PASSWORD_PROTOCOL_PACKET.
	packet.write(token);
	packet.writeFiller(1);

	write(_this, packet);
}

function removeConnect(_this) {
	_this.onerror.unon();
	_this.onpacket.unon();
	_this._socket.destroy();

	var opt = _this.opt;
	var key = opt.host + ':' + opt.port;
	var pool = connect_pool[key];
	pool.removeVal(_this);

	var queue = require_connect.shift();
	if (queue) {
		Function.undelay(queue.timeout);
		Connect.get.apply(null, queue.args);
	}
}

/**
 * @class tesla.db.mysql.Connect.private$connect
 * @extends Object
 * @createTime 2012-01-13
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

var private$connect =

Class('private$connect', {

	//private:
	_greeting: null,
	_socket: null,
	_parser: null,
	_tomeout: 0,
	_use: true,

	//public:

	/**
	 * option
	 * @type {Object}
	 */
	opt: null,

	/**
	 * @event onerror
	 */
	onerror: null,

	/**
	 * @event onpacket
	 */
	onpacket: null,

	/**
	 * constructor function
	 * @param {Object}   opt
	 * @param {Function} cb
	 * @constructor
	 */
	private$connect: function(opt, cb) {
		tesla.Delegate.def(this, 'error', 'packet');

		this.opt = opt;
		var _this = this;
		var parser = _this._parser = new Parser();
		var socket = _this._socket = new Socket();

		socket.setTimeout(8e7);
		socket.setNoDelay(true);
		socket.on('data', parser.write.bind(parser));
		socket.on('error', function(err) {
			_this.onerror.emit(err);
			removeConnect(_this);
		});
		socket.on('end', function() {
			_this.onerror.emit(new Error('mysql server has been disconnected'));
			removeConnect(_this);
		});

		socket.connect(opt.port, opt.host);

		parser.onpacket.on(function(e) { _this.onpacket.emit(e.data) });
		_this.onerror.on(function(e) { cb(e.data) });
		_this.onpacket.on(function(e) {
			var packet = e.data;

			if (packet.type == Parser.GREETING_PACKET)
				return sendAuth(_this, packet);

			if (packet.type == Parser.USE_OLD_PASSWORD_PROTOCOL_PACKET)
				return sendOldAuth(_this, _this._greeting);

			//connection ok
			//error
			if (packet.type === Parser.ERROR_PACKET) {
				cb(packet.toUserObject());
				removeConnect(_this);
			}
			else {
				_this.onerror.unon();
				_this.onpacket.unon();
				cb(null, _this);
			}
		});
	},

	/**
	 * write buffer
	 * @param {node.Buffer}
	 */
	write: function(buffer) {
		this._socket.write(buffer);
	},

	/**
	* return connection pool
	*/
	back: function() {
		this.onerror.unon();
		this.onpacket.unon();
		this._use = false;

		for (var i = 0, l = require_connect.length, opt1 = this.opt; i < l; i++) {
			var req = require_connect[i];
			var args = req.args;
			var opt = args[0];

			if (
			opt.host == opt1.host &&
			opt.port === opt1.port &&
			opt.user == opt1.user &&
			opt.password == opt1.password) {
				require_connect.splice(i, 1);
				Function.undelay(req.timeout);
				return Connect.get.apply(null, args);
			}
		}

		this._tomeout = removeConnect.delay(CONNECT_TIMEOUT, this);
	},

	/**
		* start use connect
		*/
	use: function() {
		this._use = true;
		Function.undelay(this._tomeout);
	}

});

/**
 * @class tesla.db.mysql.Connect
 * @extends Object
 * @createTime 2012-01-13
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

var Connect =

Class('tesla.db.mysql.Connect', null, {

	/**
	 * get connect
	 * @param {Object}   opt
	 * @param {Function} cb
	 * @static
	 */
	get: function(opt, cb) {

		var key = opt.host + ':' + opt.port;
		var pool = connect_pool[key] || (connect_pool[key] = []);

		for (var i = 0, l = pool.length; i < l; i++) {
			var connect = pool[i];
			var opt1 = connect.opt;

			if (!connect._use &&
				opt1.user == opt.user &&
				opt1.password == opt.password) {
				connect.use();

				var db = opt.database
				if (opt1.database == db)
					return nextTick(cb, null, connect);

				opt1.database = db;

				//init db
				var packet = new OutgoingPacket(1 + Buffer.byteLength(db, 'utf-8'));
				packet.writeNumber(1, CONSTANTS.COM_INIT_DB);
				packet.write(db, 'utf-8');
				write(connect, packet);

				return connect.onpacket.on(function(e) {
					connect.onpacket.unon();

					var packet = e.data;
					var type = packet.type;

					if (type === Parser.ERROR_PACKET) {
						connect.back();
						return cb(result.toUserObject());
					}
					cb(null, connect);
				});
			}
		}

		//is max connect
		if (pool.length < Connect.MAX_CONNECT_COUNT)
			return pool.push(new private$connect(opt, cb));

		var req = {
			timeout: function() {
				require_connect.removeVal(obj);
				cb(new Error('obtaining a connection from the connection pool timeout'));
			} .delay(CONNECT_TIMEOUT),
			args: Array.toArray(arguments)
		};

		//append to require connect
		require_connect.push(req);
	},

	/**
		* <span style="color:#f00">[static]</span>max connect count
		* @type {Numbet}
		* @static
		*/
	MAX_CONNECT_COUNT: MAX_CONNECT_COUNT,

	/**
		* <b style="color:#f00">[static]</b>default flags
		* @type {Number}
		* @static
		*/
	DEFAULT_FLAGS:
		CONSTANTS.CLIENT_LONG_PASSWORD
		| CONSTANTS.CLIENT_FOUND_ROWS
		| CONSTANTS.CLIENT_LONG_FLAG
		| CONSTANTS.CLIENT_CONNECT_WITH_DB
		| CONSTANTS.CLIENT_ODBC
		| CONSTANTS.CLIENT_LOCAL_FILES
		| CONSTANTS.CLIENT_IGNORE_SPACE
		| CONSTANTS.CLIENT_PROTOCOL_41
		| CONSTANTS.CLIENT_INTERACTIVE
		| CONSTANTS.CLIENT_IGNORE_SIGPIPE
		| CONSTANTS.CLIENT_TRANSACTIONS
		| CONSTANTS.CLIENT_RESERVED
		| CONSTANTS.CLIENT_SECURE_CONNECTION
		| CONSTANTS.CLIENT_MULTI_STATEMENTS
		| CONSTANTS.CLIENT_MULTI_RESULTS,

	/**
		* <b style="color:#f00">[static]</b>max packet size
		* @type {Number}
		* @static
		*/
	MAX_PACKET_SIZE: 0x01000000,

	/**
		* <b style="color:#f00">[static]</b>charest number
		* @type {Number}
		* @static
		*/
	CHAREST_NUMBER: CONSTANTS.UTF8_UNICODE_CI

});

