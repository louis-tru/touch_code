/**
 * @class tesla.web.Cookie Cookie
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');

Class('tesla.web.Cookie', {

	//private:
	_req: null,
	_res: null,

	/**
	 * 构造函数
	 * @param {http.ServerResponse} req
	 * @param {http.ServerResponse} res
	 * @constructor
	 */
	Cookie: function(req, res) {

		this._req = req;
		this._res = res;
	},

	/**
	 * 根据名字取Cookie值
	 * @param  {String}  name cookie的名称
	 * @return {String} 返回cookie值
	 */
	get: function(name) {

		var cookie = this._req.headers.cookie;

		if (cookie) {
			var i = cookie.match('(?:^|;\\s*){0}=([^;]+)(;|$)'.format(name));
			return i && decodeURIComponent(i[1]);
		}
		return null;
	},


	/**
	 * 设置cookie值
	 * @param {String}  name 名称
	 * @param {String}  value 值
	 * @param {Date}    expires (Optional) 过期时间
	 * @param {String}  path    (Optional)
	 * @param {String}  domain  (Optional)
	 * @param {Boolran} secure  (Optional)
	 * @static
	 */
	set: function(name, value, expires, path, domain, secure) {

		var setcookie = this._res.getHeader('Set-Cookie') || [];

		if (typeof setcookie == 'string')
			setcookie = [setcookie];

		for (var i = setcookie.length - 1; i > -1; i--) {
			if (setcookie[i].indexOf(name + '=') === 0)
				setcookie.splice(i, 1);
		}

		setcookie.push(
			'{0}={1}{2}{3}{4}{5}'.format(
				name,
				encodeURIComponent(value),
				expires ? '; Expires=' + expires.toUTCString() : '',
				path ? '; Path=' + path : '',
				domain ? '; Domain=' + domain : '',
				secure ? '; Secure' : ''
			));

		this._res.setHeader('Set-Cookie', setcookie);
	},


	/**
	 * 删除一个cookie
	 * @param {String}  name 名称
	 * @param {String}  path    (Optional)
	 * @param {String}  domain  (Optional)
	 * @static
	 */
	remove: function(name, path, domain) {

		this.set(name, 'NULL', new Date(0, 1, 1), path, domain);
	},


	/**
	 * 获取全部Cookie
	 * @return {Object} 返回cookie值
	 */
	getAll: function() {

		var j = (this._req.headers['cookie'] || '').split(';');
		var cookie = {};

		for (var i = 0, len = j.length; i < len; i++) {

			var item = j[i];
			if (item) {
				item = item.split('=');
				cookie[item[0]] = decodeURIComponent(item[1]);
			}
		}

		return cookie;
	},

	/**
	 * 删除全部cookie
	 */
	removeAll: function() {

		var cookie = this.getAll();
		for (var i in cookie)
			this.remove(i);
	}

});

