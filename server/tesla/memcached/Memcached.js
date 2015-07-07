/**
 * @class tesla.memcached.Memcached memcached
 * @extends Object
 * @createTime 2012-01-15
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/Delegate.js');
include('tesla/memcached/HashRing.js');
include('tesla/memcached/Connect.js');
include('tesla/node.js');

var Buffer = tesla.node.buffer.Buffer;
var HashRing = tesla.memcached.HashRing;
var Connect = tesla.memcached.Connect;
var LINEBREAK = '\r\n';
var NOREPLY = ' noreply';
var FLAG_JSON = 1 << 1;
var FLAG_BINARY = 2 << 1;
var INSTANCE;

// Executes the command on the net.Stream, if no server is supplied it will use the query.key to get
// the server from the HashRing
function command(_this, query, server) {

	// generate a regular query,
	var redundancy = _this.redundancy && _this.redundancy < _this.servers.length && query.redundancy;

	// try to find the correct server for this query
	if (!server) {
		// no need to do a hashring lookup if we only have one server assigned to
		if (_this.servers.length === 1)
			server = _this.servers[0];
		else {
			if (redundancy) {
				redundancy = _this.HashRing.createRange(query.key, (_this.redundancy + 1), true);
				server = redundancy.shift();
			}
			else
				server = _this.HashRing.getNode(query.key);
		}
	}

	Connect.write(server, query.command + LINEBREAK, query);

	// if we have redundancy enabled and the query is used for redundancy, than we are going loop over
	// the servers, check if we can reach them, and connect to the correct net connection.
	// because all redundancy queries are executed with "no reply" we do not need to store the callback
	// as there will be no value to parse.
	if (redundancy) {
		var cmd = query.redundancy + LINEBREAK;
		for (var i = 0, l = redundancy.length; i < l; i++)
			Connect.write(redundancy[i], cmd);
	}
}

// As all command nearly use the same syntax we are going to proxy them all to this
// function to ease maintenance. This is possible because most set commands will use the same
// syntax for the Memcached server. Some commands do not require a lifetime and a flag, but the
// memcached server is smart enough to ignore those.
function setters(_this, type, key, value, lifetime, cb, cas) {
	var flag = 0;
	var valuetype = typeof value;
	var length;

	if (Buffer.isBuffer(value)) {
		flag = FLAG_BINARY;
		value = value.toString('binary');
	}
	else if (valuetype !== 'string' && valuetype !== 'number') {
		flag = FLAG_JSON;
		value = JSON.stringify(value);
	}
	else
		value = value.toString();

	length = Buffer.byteLength(value);
	if (length > _this.maxValue) {
		var err = new Error('The length of the value is greater than ' + _this.maxValue);
		console.error(err);
		return cb ? cb(err) : _this.onerror.emit(err);
	}

	var cmd = [type, key, flag, lifetime, length].join(' ') + (cas ? ' ' + cas : '');
	command(_this, {
		key: key,
		cb: cb,
		lifetime: lifetime,
		value: value,
		cas: cas,
		type: type,
		command: cmd + LINEBREAK + value,
		redundancy: cmd + NOREPLY + LINEBREAK + value
	});
}

// Small handler for incr and decr's
function incrdecr(_this, type, key, value, cb) {
	var cmd = [type, key, value].join(' ');
	command(_this, {
		key: key,
		cb: cb,
		value: value,
		type: type,
		command: cmd,
		redundancy: cmd + NOREPLY
	});
}

// Small wrapper that handle single keyword commands such as FLUSH ALL, VERSION and STAT
function singles(_this, type, cb) {
	var responses = [];
	var errors = [];
	var calls;

	// handle multiple servers
	function handle(err, results) {
		if (err)
			errors.push(err);
		if (results)
			responses = responses.concat(results);

		// multi calls should ALWAYS return an array!
		if (! --calls)
			cb(errors.length ? errors : null, responses);
	}

	multi(_this, null, function(server, keys, index, totals) {
		if (!calls)
			calls = totals;

		command(_this, {
			cb: handle,
			type: type,
			command: type
		}, server);
	});
}

// Creates a multi stream, so it's easier to query agains
// multiple memcached servers.
function multi(_this, keys, cb) {
	var map = {};
	var servers;
	var i;

	// gets all servers based on the supplied keys,
	// or just gives all servers if we don't have keys
	if (keys) {

		for (var i = 0, l = keys.length; i < l; i++) {

			var key = keys[i];
			var server = _this.servers.length === 1 ?
								_this.servers[0] : _this.HashRing.getNode(key);

			if (map[server])
				map[server].push(key);
			else
				map[server] = [key];
		}

		// store the servers
		servers = tesla.keys(map);
	}
	else
		servers = _this.servers;

	i = servers.length;
	while (i--)
		cb.call(_this, servers[i], map[servers[i]], i, servers.length);
}


var Memcached =

Class('tesla.memcached.Memcached', {

	//public:
	/**
	 * @event onerror
	 */
	onerror: null,

	/**
	 * max length of value allowed by Memcached
	 * @type {Number}
	 */
	maxValue: 1048576,

	/**
	 * allows you do re-distribute the keys over a x amount of servers
	 * @type {Boolean}
	 */
	redundancy: false,

	/**
	 * servers
	 * @type {String[]}
	 */
	servers: null,

	/**
	 * Constructs a new memcached client
	 * @param {String[]} servers  (Optional)  Do not pass use center server config
	 * @constructor
	 */
	Memcached: function(servers) {
		tesla.Delegate.def(this, 'error');

		if (servers) {
			if (!servers.length)
				throw new Error('No servers where supplied in the arguments');
			this.servers = servers;
			this.HashRing = new HashRing(servers);
		}
		else {
			//use center server config
			//on event
			throw new Error('use center server config');
		}
	},

	// This is where the actual Memcached API layer begins:
	get: function(key, cb) {
		if (Array.isArray(key))
			return this.getMulti(key, cb);

		command(this, {
			key: key,
			cb: cb,
			type: 'get',
			command: 'get ' + key
		});
	},

	// the difference between get and gets is that gets, also returns a cas value
	// and gets doesn't support multi-gets at this moment.
	gets: function(key, cb) {
		command(this, {
			key: key,
			cb: cb,
			type: 'gets',
			command: 'gets ' + key
		});
	},

	// Handles get's with multiple keys
	getMulti: function(keys, cb) {
		var _this = this;
		var responses = {};
		var errors = [];
		var calls;

		function handler(err, results) {
			if (err)
				errors.push(err);

			// add all responses to the array
			Array.isArray(results) ||
						(results = [results]);

			for (var i = 0, l = results.length; i < l; i++)
				tesla.extend(responses, results[i]);

			if (! --calls)
				cb(errors.length ? errors : null, responses);
		}

		multi(_this, keys, function(server, key, index, totals) {
			if (!calls)
				calls = totals;

			command(_this, {
				// handle multiple responses and cache them untill we receive all.
				cb: handler,
				multi: true,
				type: 'get',
				command: 'get ' + key.join(' ')
			}, server);
		});
	},

	// Curry the function and so we can tell the type our private set function
	set: function(key, value, lifetime, cb, cas) {
		setters(this, 'set', key, value, lifetime, cb, cas);
	},

	replace: function(key, value, lifetime, cb, cas) {
		setters(this, 'replace', key, value, lifetime, cb, cas);
	},

	add: function(key, value, lifetime, cb, cas) {
		setters(this, 'add', key, value, lifetime, cb, cas);
	},

	cas: function(key, value, cas, lifetime, cb) {
		setters(this, 'cas', key, value, lifetime, cb, cas);
	},

	append: function(key, value, cb) {
		setters(this, 'append', key, value, 0, cb);
	},

	prepend: function(key, value, cb) {
		setters(this, 'prepend', key, value, 0, cb);
	},

	// Curry the function and so we can tell the type our private incrdecr
	increment: function(key, value, cb) {
		incrdecr(this, 'incr', key, value, cb);
	},

	decrement: function(key, value, cb) {
		incrdecr(this, 'decr', key, value, cb);
	},

	// Deletes the keys from the servers
	del: function(key, cb) {
		command(this, {
			key: key,
			cb: cb,
			type: 'delete',
			command: 'delete ' + key,
			redundancy: 'delete ' + key + NOREPLY
		});
	},

	// Curry the function and so we can tell the type our private singles
	version: function(cb) {
		singles(this, 'version', cb);
	},

	flush: function(cb) {
		singles(this, 'flush_all', cb);
	},

	stats: function(cb) {
		singles(this, 'stats', cb);
	},

	settings: function(cb) {
		singles(this, 'stats settings', cb);
	},

	slabs: function(cb) {
		singles(this, 'stats slabs', cb);
	},

	items: function(cb) {
		singles(this, 'stats items', cb);
	},

	// You need to use the items dump to get the correct server and slab settings
	// see simple_cachedump.js for an example
	cachedump: function(server, slabid, number, cb) {
		command(this, {
			cb: cb,
			number: number,
			slabid: slabid,
			type: 'stats cachedump',
			command: 'stats cachedump ' + slabid + ' ' + number
		}, server);
	},

	// Kills all active connections
	end: function() {
		var connections = this.connections;
		for (var i in connections)
			connections[i].free(0);
	}

}, {

	/**
		* get default memcached client
		* @return {tesla.memcached.Memcached}
		* @static
		*/
	get: function() {
		if (!INSTANCE)
			INSTANCE = new tesla.memcached.Memcached(tesla.APP_CONF.memcached);
		return INSTANCE;
	}

});

