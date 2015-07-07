/*
 * @class tesla._Debug 系统调试
 * @createTime 2011-11-02
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

include('tesla/node.js');

var fsx = tesla.node.fsx;
var DEBUG = tesla.DEBUG;
var JSX_DEBUG_CLIENT_VERSION_NAME = 'javascript-x-version';

if (!DEBUG) {
	throw new Error('Can not include "tesla/_Debug.js" file');
}

var debugCodeVersion = new Date().valueOf();

var toString = Object.prototype.toString;

function info(o) {

	var type = typeof o;
	var isObject = false;
	var isArray = false;
	var value = '[object Object]';
	var isProperties = false;
	type = type.substr(0, 1).toUpperCase() + type.substr(1);

	if (type == 'Object') {
		isObject = true;
		var t = toString.call(o).match(/\[.+ (.+)\]/)[1];
		if (t != 'Object' || (t = o.constructor && o.constructor.__name__)) {
			type += ',(' + t + ')';
		}
	}

	try {
		isArray = o instanceof Array;
		if (isObject && isArray) {
			value = '[' + (o.length < 10 ? o: '...') + ']';
		}
		else {
			value = o + '';
		}
	}
	catch(e) {}

	if (isObject) {
		if (isArray) {
			isProperties = (o.length !== 0);
		}
		else {
			for (var i in o) {
				isProperties = true;
				break;
			}
		}
	}

	return {
		type: type,
		value: value,
		isProperties: isProperties,
		isArray: isArray
	};
}



var _Debug =

Class('tesla._Debug', null, {

	/**
	* 是否输出请求日志
	* @type {Boolean}
	*/
	printRequest: true,

	//监视变量,返回JSON
	watch: function(o) {

		var properties = [];
		var result = info(o);
		var reg = [ / ^\d + $ / , /\.|(^\d)/];
		result.properties = properties;

		o = (typeof o == 'string' ? String.prototype: o);

		if (result.isProperties) {

			if (result.isArray) {
				o.forEach(function(item, i) {
					item = info(item);
					item.name = '[' + i + ']';
					properties.push(item);
				});
			}
			else {
				for (var i in o) {
					var item = info(o[i]);
					item.name = reg[0].test(i) ? '[' + i + ']': reg[1].test(i) ? '["' + i + '"]': i;
					properties.push(item);
				}
			}
		}
		return JSON.stringify(result);
	},

	//更新代码版本号
	updateCodeVersion: function() {
		debugCodeVersion = new Date().valueOf();
	},

	//设置 http debug client
	setHttpDebug: function(server, req, res) {

		//print request log
		if (_Debug.printRequest) {
			console.log(req.url);
		}

		var mat = (req.headers.cookie || '')
		.match('(?:^|;\\s*){0}=([^;$]+)'.format(JSX_DEBUG_CLIENT_VERSION_NAME));

		if (!mat || mat[1] != debugCodeVersion) {

			var setcookie = 
			  ['{0}={1}; Path=/'.format(JSX_DEBUG_CLIENT_VERSION_NAME, debugCodeVersion)];
			res.setHeader('Set-Cookie', setcookie);
		}
	}

});

