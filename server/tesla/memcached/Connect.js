
include('tesla/Extend.js');
include('tesla/node.js');

var Socket = tesla.node.net.Socket;
var LINEBREAK = '\r\n';
var FLUSH = 1E3;
var BUFFER = 1E2;
var CONTINUE = 1E1;
var FLAG_JSON = 1 << 1;
var FLAG_BINARY = 2 << 1;
var CONNECT_TIMEOUT = 1e4;
var connections = {};


// These do not need to be publicly available as it's one of the most important
// parts of the whole client, the parser commands:
var parsers = {
	// handle error responses
	'NOT_FOUND': function() {
		return [CONTINUE, false];
	},
	'NOT_STORED': function() {
		return [CONTINUE, false];
	},
	'ERROR': function(_this, tokens, dataSet, err) {
		err.push(new Error('Received an ERROR response'));
		return [FLUSH, false];
	},
	'CLIENT_ERROR': function(_this, tokens, dataSet, err) {
		err.push(tokens.splice(1).join(' '));
		return [CONTINUE, false];
	},
	'SERVER_ERROR': function(_this, tokens, dataSet, err, queue) {
		//_this.connectionIssue(tokens.splice(1).join(' '), socket);
		return [CONTINUE, false];
	},

	// keyword based responses
	'STORED': function() {
		return [CONTINUE, true];
	},
	'DELETED': function() {
		return [CONTINUE, true];
	},
	'OK': function() {
		return [CONTINUE, true];
	},
	'EXISTS': function() {
		return [CONTINUE, false];
	},
	'END': function(_this, tokens, dataSet, err, queue) {
		if (!queue.length)
			queue.push(null);
		return [FLUSH, true];
	},

	// value parsing:
	'VALUE': function(_this, tokens, dataSet, err, queue) {
		var key = tokens[1];
		var flag = +tokens[2];
		var expire = tokens[3];
		var cas = tokens[4];
		var multi = _this.metaData[0] && _this.metaData[0].multi || cas ? {} : false;
		var tmp;

		switch (flag) {
			case FLAG_JSON:
				dataSet = JSON.parse(dataSet);
				break;
			case FLAG_BINARY:
				tmp = new Buffer(dataSet.length);
				tmp.write(dataSet, 0, 'binary');
				dataSet = tmp;
				break;
		}

		// Add to queue as multiple get key key key key key returns multiple values
		if (!multi)
			queue.push(dataSet);
		else {
			multi[key] = dataSet;
			if (cas)
				multi.cas = cas;
			queue.push(multi);
		}

		return [BUFFER, false];
	},
	'INCRDECR': function(_this, tokens) {
		return [CONTINUE, +tokens[1]];
	},
	'STAT': function(_this, tokens, dataSet, err, queue) {
		queue.push([tokens[1], /^\d+$/.test(tokens[2]) ? +tokens[2] : tokens[2]]);
		return [BUFFER, true];
	},
	'VERSION': function(_this, tokens, dataSet) {
		var versionTokens = /(\d+)(?:\.)(\d+)(?:\.)(\d+)$/.exec(tokens.pop());

		return [CONTINUE, {
			server: _this.serverAddress,
			version: versionTokens[0],
			major: versionTokens[1] || 0,
			minor: versionTokens[2] || 0,
			bugfix: versionTokens[3] || 0
		}
		];
	},
	'ITEM': function(_this, tokens, dataSet, err, queue) {
		queue.push({
			key: tokens[1],
			b: +tokens[2].substr(1),
			s: +tokens[4]
		});
		return [BUFFER, false];
	}
};

// Parses down result sets
var resultParsers = {
	// combines the stats array, in to an object
	'stats': function(_this, resultSet) {
		var response = {};

		// add references to the retrieved server
		response.server = _this.serverAddress;

		// Fill the object
		resultSet.forEach(function(statSet) {
			response[statSet[0]] = statSet[1];
		});

		return response;
	},

	// the settings uses the same parse format as the regular stats
	'stats settings': function(_this, resultSet) {
		return resultParsers.stats(_this, resultSet);
	},

	// Group slabs by slab id
	'stats slabs': function(_this, resultSet) {
		var response = {};

		// add references to the retrieved server
		response.server = _this.serverAddress;

		// Fill the object
		resultSet.forEach(function(_this, statSet) {
			var identifier = statSet[0].split(':');

			if (!response[identifier[0]]) response[identifier[0]] = {};
			response[identifier[0]][identifier[1]] = statSet[1];
		});

		return response;
	},

	'stats items': function(_this, resultSet) {
		var response = {};

		// add references to the retrieved server
		response.server = _this.serverAddress;

		// Fill the object
		resultSet.forEach(function(statSet) {
			var identifier = statSet[0].split(':');

			if (!response[identifier[1]]) response[identifier[1]] = {};
			response[identifier[1]][identifier[2]] = statSet[1];

		});

		return response;
	}
};

// Generates a RegExp that can be used to check if a chunk is memcached response identifier
var KEYS = tesla.keys(parsers).join('|');
var allCommands = new RegExp('^(?:' + KEYS + '|\\d' + ')');
var bufferedCommands = new RegExp('^(?:' + KEYS + ')');


// When working with large chunks of responses, node chunks it in to pieces. So we might have
// half responses. So we are going to buffer up the buffer and user our buffered buffer to query
// against. Also when you execute allot of .writes to the same stream, node will combine the responses
// in to one response stream. With no indication where it had cut the data. So it can be it cuts inside the value response,
// or even right in the middle of a line-break, so we need to make sure, the last piece in the buffer is a LINEBREAK
// because that is all what is sure about the Memcached Protocol, all responds end with them.
function parser(_this, buffer) {
	_this._buffer += buffer;

	// only call transform the data once we are sure, 100% sure, that we valid response ending
	if (_this._buffer.substr(_this._buffer.length - 2) !== LINEBREAK)
		return;

	var chunks = _this._buffer.split(LINEBREAK);
	_this._buffer = ''; // clear!

	// The actual parsers function that scan over the responseBuffer in search of Memcached response
	// identifiers. Once we have found one, we will send it to the dedicated parsers that will transform
	// the data in a human readable format, deciding if we should queue it up, or send it to a callback fn.
	var queue = [];
	var token;
	var tokenSet;
	var dataSet = '';
	var resultSet;
	var metaData;
	var err = [];
	var tmp;
	var key;
	var reg = /^\d+$/;

	while (chunks.length && allCommands.test(chunks[0])) {

		token = chunks.shift();
		tokenSet = token.split(' ');
		key = tokenSet[0];

		// special case for digit only's these are responses from INCR and DECR
		if (reg.test(key))
			tokenSet.unshift('INCRDECR');

		// special case for value, it's required that it has a second response!
		// add the token back, and wait for the next response, we might be handling a big
		// ass response here.
		if (key == 'VALUE' && chunks.indexOf('END') == -1)
			return chunks.unshift(token);

		// check for dedicated parser
		var fn = parsers[key];
		if (fn) {

			// fetch the response content
			if (key == 'VALUE') {
				while (chunks.length) {
					if (bufferedCommands.test(chunks[0]))
						break;

					dataSet += chunks.shift();
				};
			}

			resultSet = fn(_this, tokenSet, dataSet || token, err, queue);

			// check how we need to handle the resultSet response
			switch (resultSet.shift()) {
				case BUFFER:
					break;

				case FLUSH:
					metaData = _this.metaData.shift();
					resultSet = queue;

					// if we have a callback, call it
					if (metaData && metaData.cb) {

						fn = resultParsers[metaData.type];
						//callback
						metaData.cb(err.length ? err : null,

						// see if optional parsing needs to be applied to make the result set more readable
								fn ? fn(_this, resultSet, err) : !Array.isArray(queue) || queue.length > 1 ? queue : queue[0]
							);
					}

					queue.length = err.length = 0;
					break;

				case CONTINUE:
				default:
					metaData = _this.metaData.shift();
					//callback
					if (metaData && metaData.cb)
						metaData.cb(err.length > 1 ? err : null, resultSet[0]);

					err.length = 0;
					break;
			}
		} else {
			// handle unkown responses
			metaData = socket.metaData.shift();
			if (metaData && metaData.cb)
				metaData.cb(new Error('Unknown response from the memcached server: "' + token + '"'));
		}

		// cleanup
		dataSet = ''
		tokenSet = metaData = undefined;

		// check if we need to remove an empty item from the array, as splitting on /r/n might cause an empty
		// item at the end..
		chunks[0] || chunks.shift();
	};
}

//remove connect
function removeConnect(_this) {
	_this.connected = false;
	_this._socket.destroy();
	delete connections[_this.server];
}

//error
function connectionErrorHandler(_this, err) {
	console.error(err);
	var metaData = _this.metaData;

	var data;
	while (data = metaData.shift())
		data.cb && cb(err);
}

/**
 * @class tesla.memcached.Connect.private$connect
 * @extends Object
 * @createTime 2012-01-16
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var private$connection =

Class('private$connect', {

	//private:
	_socket: null,
	_buffer: '',
	_init_queue: null,

	//public:
	/**
		* meta data
		*
		*/
	metaData: null,

	/**
		* server
		* @type {String}
		*/
	server: null,

	/**
		* connected
		* @type {Boolean}
		*/
	connected: false,

	/**
		* constructor function
		* @param {String}   server
		* @param {Function} cb
		* @constructor
		*/
	private$connect: function(server, cb) {
		var _this = this;

		_this.metaData = [];
		_this._init_queue = [];
		_this.server = server;

		var mat = server.match(/(.*):(\d+)$/);
		var host = mat[1];
		var port = parseInt(mat[2]);

		var socket = this._socket = new Socket();
		socket.setTimeout(Connect.CONNECT_TIMEOUT);
		socket.setNoDelay(true);
		socket.connect(port, host);

		socket.on('error', function(err) {
			connectionErrorHandler(_this, err);
			removeConnect(_this);
		});
		socket.on('end', function() {
			var err = new Error('memcached server has been disconnected')
			connectionErrorHandler(_this, err);
			removeConnect(_this);
		});
		socket.on('connect', function() {
			var cmd;
			_this.connected = true;
			while (cmd = _this._init_queue.shift())
				_this._socket.write(cmd);
		});
		socket.on('data', parser.bind(null, _this));
	},

	/**
		* write
		* @param {String} cmd
		* @param {Object} data (Optional)
		*/
	write: function(cmd, data) {
		if (data)
			this.metaData.push(data);
		this.connected ?
			this._socket.write(cmd) : this._init_queue.push(cmd);
	}

});


/**
 * @class tesla.memcached.Connect
 * @extends Object
 * @createTime 2012-01-16
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

var Connect =

Class('tesla.memcached.Connect', null, {

	/**
		* write connect
		* @param {String}   server
		* @param {String}   cmd
		* @param {Object}   data (Optional)
		* @static
		*/
	write: function(server, cmd, data) {

		var connect =
		connections[server] || (connections[server] = new private$connection(server));

		connect.write(cmd, data);
	},

	/**
		* <span style="color:#f00">[static]</span>connect max timeout
		* @type {Numbet}
		* @static
		*/
	CONNECT_TIMEOUT: CONNECT_TIMEOUT

});

