/**
 * @class tesla.db.mysql.Mysql
 * @extends tesla.db.Database
 * @createTime 2012-01-12
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/db/Database.js');
include('tesla/db/mysql/CONSTANTS.js');
include('tesla/db/mysql/Query.js');
include('tesla/db/mysql/OutgoingPacket.js');
include('tesla/db/mysql/Connect.js');

var Buffer = tesla.node.buffer.Buffer;
var mysql = tesla.db.mysql;
var CONSTANTS = mysql.CONSTANTS;
var Query = mysql.Query;
var OutgoingPacket = mysql.OutgoingPacket;
var Connect = mysql.Connect;

//private:
//close back connect
function close(_this) {
	var connect = _this._connect;
	_this._connect = null;
	_this.connected = false;
	connect && connect.back && connect.back();
}

//net error and connection error
function connectionErrorHandler(_this, err) {
	close(_this);
	console.error(err);

	var task = _this._queue[0];
	var cb = task ? task.cb : null;

	if (cb instanceof Query)
		return cb.onerror.emit(err);

	if (cb)
		cb(err);
	else
		_this.onerror.emit(err);
	dequeue(_this);
}

//onpacket handle
function handlePacket(e) {
	var _this = this;
	var packet = e.data;

	// @TODO Simplify the code below and above as well
	var type = packet.type;
	var task = _this._queue[0];
	var cb = task ? task.cb : null;

	if (cb instanceof Query)
		return cb.handlePacket(packet);

	//delete packet.ondata;
	if (type === Parser.ERROR_PACKET) {
		packet = packet.toUserObject();

		console.error(packet);
		if (cb)
			cb(packet);
		else
			_this.onerror.emit(packet);
	}
	else if (cb)
		cb(null, packet.toUserObject());

	dequeue(_this);
}

//get connect
function connect(_this) {

	var num = tesla.random(1);
	var opt = {
		host: _this.host,
		port: _this.port,
		user: _this.user,
		password: _this.password,
		database: _this.database
	};
	_this._connect = num;

	Connect.get(opt, function(err, connect) {

		if (_this._connect !== num) //not current connect
			return connect && connect.back();
		if (err)
			return connectionErrorHandler(_this, err);

		_this._connect = connect;
		_this.connected = true;

		connect.onpacket.on(handlePacket, _this);
		connect.onerror.on(function(e) {
			connectionErrorHandler(_this, e.data);
		});
		_this._queue[0].exec();
	});
}

//write packet
function write(_this, packet) {
	_this._connect.write(packet.buffer);
}

//enqueue
function enqueue(_this, exec, cb) {
	if (!_this._connect)
		connect(_this);
	var query = _this._queue;

	query.push({ exec: exec, cb: cb });
	if (query.length === 1 && _this.connected)
		exec();
}

//dequeue
function dequeue(_this) {
	var queue = _this._queue;

	queue.shift();
	if (!queue.length)
		return;
	if (!_this._connect)
		return connect(_this);

	_this.connected && queue[0].exec();
}

//public:
Class('tesla.db.mysql.Mysql', tesla.db.Database, {

	//private:
	_queue: null,
	_connect: null,
	_transaction: false,

	//public:
	port: 3306,

	/**
		* is connection
		* @type {Boolean}
		*/
	connected: false,

	/**
		* constructor function
		* @param {Object} opt (Optional)
		* @constructor
		*/
	Mysql: function(opt) {
		this.Database();
		tesla.update(this, opt);
		this._queue = [];
	},

	//overlay
	statistics: function(cb) {
		var _this = this;
		enqueue(_this, function() {
			var packet = new OutgoingPacket(1);
			packet.writeNumber(1, CONSTANTS.COM_STATISTICS);
			write(_this, packet);
		}, cb);
	},

	//overlay
	query: function(sql, cb) {
		var _this = this;
		var query = new Query(sql);

		if (cb) {
			var rows = [];
			var fields = {};

			query.onerror.on(function(e) {
				cb(e.data);
				dequeue(_this);
			});
			query.onfield.on(function(e) {
				var field = e.data;
				fields[field.name] = field;
			});

			query.onrow.on(function(e) {
				rows.push(e.data);
			});
			query.onend.on(function(e) {
				var result = e.data;
				result ? cb(null, result) : cb(null, rows, fields);
				dequeue(_this);
			});
		}

		else {

			query.onerror.on(function(e) {
				_this.onerror.emit(e.data);
				dequeue(_this);
			});

			query.onend.on(function() {
				dequeue(_this);
			});
		}

		enqueue(_this, function() {

			var packet = new OutgoingPacket(1 + Buffer.byteLength(sql, 'utf-8'));

			packet.writeNumber(1, CONSTANTS.COM_QUERY);
			packet.write(sql, 'utf-8');
			write(_this, packet);
		}, query);

		return query;
	},

	//overlay
	close: function() {
		var _this = this;

		if (this._transaction)
			this.commit();

		enqueue(_this, function() {
			close(_this);
			dequeue(_this);
		});
	},

	//overlay
	transaction: function() {
		if (this._transaction)
			return;
		this._transaction = true;
		this.query('START TRANSACTION');
	},

	//overlay
	commit: function() {
		this._transaction = false;
		this.query('COMMIT');
	},

	//overlay
	rollback: function() {
		this._queue = [];
		this._transaction = false;
		this.query('ROLLBACK');
	}

});

