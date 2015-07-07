
include('tesla/Extend.js');
include('tesla/db/mysql/Mysql.js');
include('tesla/db/Database.js');
include('tesla/memcached/Memcached.js');
include('tesla/xml/Document.js');
include('tesla/node.js');

//var crypto = tesla.node.crypto;
var Database = tesla.db.Database;
var Node = tesla.xml.Node;
var memcached = tesla.memcached.Memcached.get();
var cache = {};
var MAPS = {};
var INSTANCE;
var REG = /\{(.+?)\}/g;

/**
 * @class tesla.db.SqlMap.private$transaction
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var private$transaction =

Class('private$transaction', {

	/**
	 * sql map
	 * @type {tesla.db.SqlMap}
	 */
	map: null,

	/**
	 * database
	 * @type {tesla.db.Database}
	 */
	db: null,

	/**
	 * constructor function
	 * @param {tesla.db.SqlMap} sqlMap
	 * @constructor
	 */
	private$transaction: function(sqlMap) {
		this.map = sqlMap;
		this.db = getDb(sqlMap);

		//start transaction
		this.db.transaction();
	},

	/**
	 * get data list
	 * @param {String}   name              map name
	 * @param {Object}   param (Optional)  map name
	 * @param {Function} cb    (Optional)
	 */
	gets: function(name, param, cb) {
		query(this.map, 'get', name, param, cb, this.db);
	},

	/**
	 * get data
	 * @param {String}   name              map name
	 * @param {Object}   param (Optional)  map name
	 * @param {Function} cb    (Optional)
	 */
	get: function(name, param, cb) {
		query(this.map, 'get', name, param, function(err, data) {
			cb(err, data && data[0]);
		}, this.db);
	},

	/**
	 * post data
	 * @param {String}   name              map name
	 * @param {Object}   param (Optional)  map name
	 * @param {Function} cb    (Optional)
	 */
	post: function(name, param, cb) {
		query(this.map, 'post', name, param, cb, this.db);
	},

	/**
	 * commit transaction
	 */
	commit: function() {
		this.db.commit();
		this.db.close();
	},

	/**
	 * rollback transaction
	 */
	rollback: function() {
		this.db.rollback();
		this.db.close();
	}

});

/**
 * @class tesla.db.SqlMap Half of the object with disabilities
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

function parseMapEl(_this, el) {

	var ls = [];
	var obj = { __t__: el.tagName, __ls__: ls };
	var ns = el.attributes;

	for (var i = 0, l = ns.length; i < l; i++) {
		var n = ns.item(i);
		obj[n.name] = n.value;
	}

	ns = el.childNodes;
	for (var i = 0, l = ns.length; i < l; i++) {
		var node = ns.item(i);

		switch (node.nodeType) {
			case Node.ELEMENT_NODE:
				ls.push(parseMapEl(_this, node));
				break;
			case Node.TEXT_NODE:
			case Node.CDATA_SECTION_NODE:
				ls.push(node.nodeValue);
				break;
		}
	}
	return obj;
}

function getOriginalMap(_this, name) {
	var map = MAPS[name];

	if (!map) {
		var ls = name.split('.');
		var id = ls.pop();
		var prefix = ls.join('.') + '.';
		var filename = tesla.format(ls.join('/')) + '.xml';
		var doc = new tesla.xml.Document();
		doc.loadFile(filename);

		var ns = doc.getElementsByTagName('map');
		var l = ns.length;

		if (!l)
			throw new Error(name + ' : not map the root element');
		var root = ns.item(0);

		ns = root.childNodes;

		for (var i = 0, l = ns.length; i < l; i++) {
			var node = ns.item(i);
			if (node.nodeType === Node.ELEMENT_NODE)
				MAPS[prefix + node.tagName] = parseMapEl(_this, node);
		}
		map = MAPS[name];
		if (!map)
			throw new Error(name + ' : can not find the map');
	}
	return map;
}

//compilation sql
function compilation(_this, exp, param) {

	var variable = {};

	exp = exp.replace(REG, function(all, name) {
		variable[name] = param[name];
		return name;
	});

	var code = ['(function(){'];

	for (var i in variable) {
		var item = variable[i];
		var value =
			item instanceof Date ? 'new Date({0})'.format(item.valueOf()) :
			JSON.stringify(item);
		code.push('var {0} = {1};'.format(i, value));
	}

	code.push('return !!(' + exp + ')');
	code.push('}())');
	return eval(code.join(''));
}

//format sql
function format(_this, sql, param) {
	return sql.replace(REG, function(all, name) {
		return Database.escape(param[name]);
	});
}

//join map
function joinMap(_this, item, param) {

	var name = item.name;
	var value = param[name];

	if (!value)
		return '';
	var ls = Array.toArray(value);

	for (var i = 0, l = ls.length; i < l; i++)
		ls[i] = Database.escape(ls[i]);
	return ls.join(item.value || '');
}

//if map
function ifMap(_this, item, param) {

	var exp = item.exp;
	var name = item.name;
	var prepend = item.prepend;

	if (exp) {
		if (!compilation(_this, exp, param))
			return null;
	}
	else if (name && !(name in param))
		return null;

	var sql = lsMap(_this, item.__ls__, param);
	return { prepend: prepend, sql: sql };
}

//ls map
function lsMap(_this, ls, param) {

	var result = [];
	for (var i = 0, l = ls.length; i < l; i++) {
		var item = ls[i];
		var type = item.__t__;

		if (typeof item == 'string') {
			item = format(_this, item, param).trim();
			item &&
				result.push(' ' + item);
			continue;
		}

		if (type == 'if') {
			item = ifMap(_this, item, param);
			if (item && item.sql) {
				var prepend = result.length ?
					(item.prepend || '') + ' ' : '';

				result.push(' ' + prepend + item.sql);
			}
		}
		else if (type == 'join')
			result.push(joinMap(_this, item, param));
	}
	return result.join(' ');
}

//get map object
function getMap(_this, name, param) {

	var map = getOriginalMap(_this, name);
	var i = ifMap(_this, map, param);

	map.sql = i ? '{0} {1}'.format(i.prepend || '', i.sql) : '';
	return map;
}

//get db
function getDb(_this) {

	var db = _this.db;
	var klass = tesla.get(_this.type);

	if (Database.equals(klass))//select server
		return new klass(db[0]);

	throw new Error(_this.type + ': not the correct type or not in');
}

// del cache
//
// Special attention,
// taking into account the automatic javascript resource management,
// where there is no "This", more conducive to the release of resources
//
function delCache(key) {
	delete cache[key];
}

//query
function query(_this, type, name, param, cb, _db) {

	cb = typeof param == 'function' ? param :
			typeof cb == 'function' ? cb : null;
	param = tesla.defaults(param, {});
	var db;

	try {
		db = _db || getDb(_this);
		var map = getMap(_this, name, param);
		var cacheTime = parseInt(map.cache) || 0;
		var sql = map.sql;

		function handle(err, data) {
			_db || db.close();
			if (err) {
				console.error(err);
				return throwError(err, cb);
			}

			if (type == 'get' && cacheTime) {
				if (_this.memcached)
					memcached.set(key, data, cacheTime);
				else {
					cache[key] = data;
					delCache.delay(cacheTime * 1e3, key);
				}
			}
			cb && cb(null, data);
		}

		if (type == 'post' || !cacheTime) {
			db.query(sql, handle);
			return;
		}

		//use cache
    // crypto.createHash('md5').update(sql).digest('hex');
    var key = tesla.hash(sql);
		if (_this.memcached)
			return memcached.get(key, function(err, data) {
				if (err)
					console.err(err);
				if (data)
					return cb && cb(err, data);

				db.query(sql, handle);
			});

		var data = cache[key];
		if (data)
			return cb && cb(null, data);
		db.query(sql, handle);
	}
	catch (err) {

		db && db.close();
		throwError(err, cb);
	}

}


Class('tesla.db.SqlMap', {

	//public:
	/**
	 * database type
	 * @type {String}
	 */
	type: 'tesla.db.mysql.Mysql',

	/**
	 * is use memcached
	 * @type {Boolean}
	 */
	memcached: false,

	/**
	 * db config info
	 * @type {Object[]}
	 */
	db: null,

	/**
	 * constructor function
	*` @param {Object} (Optional) conf    Do not pass use center server config
	* @constructor
	*/
	SqlMap: function(conf) {

		if (conf) {
			tesla.update(this, conf);
			var db = this.db;
			if (!db || !db.length)
				throw new Error('No servers where supplied in the arguments');
		}
		else {
			//use center server config
			//on event
			throw new Error('use center server config');
		}
	},

	/**
		* get data list
		* @param {String}   name              map name
		* @param {Object}   param (Optional)  map name
		* @param {Function} cb    (Optional)
		*/
	gets: function(name, param, cb) {
		query(this, 'get', name, param, cb);
	},

	/**
		* get data
		* @param {String}   name              map name
		* @param {Object}   param (Optional)  map name
		* @param {Function} cb    (Optional)
		*/
	get: function(name, param, cb) {
		query(this, 'get', name, param, function(err, data) {
			cb(err, data && data[0]);
		});
	},

	/**
		* post data
		* @param {String}   name              map name
		* @param {Object}   param (Optional)  map name
		* @param {Function} cb    (Optional)
		*/
	post: function(name, param, cb) {
		query(this, 'post', name, param, cb);
	},

	/**
		* start transaction
		* @return {tesla.db.SqlMap.private$transaction}
		*/
	transaction: function() {
		return new private$transaction(this);
	}

}, {

	/**
		* get default dao
		* @return {tesla.db.Dao}
		* @static
		*/
	get: function() {
		if (!INSTANCE)
			INSTANCE = new tesla.db.SqlMap(tesla.APP_CONF.dao);
		return INSTANCE;
	}

});
