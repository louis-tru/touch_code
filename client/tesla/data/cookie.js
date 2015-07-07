/**
 * @class tesla.data.Cookie Cookie 操作类
 * @createTime 2011-09-29
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 * @singleton
 */

'use strict';

inclide('tesla/util.js');

var cookie_obj = {

  /**
   * 根据名字取Cookie值
   * @param {String} name cookie的名称
   * @return {String} 返回cookie值
   * @static
   */
  get: function(name) {
    var i = document.cookie.match(new RegExp('(?:^|;\\s*){0}=([^;]+)(;|$)'.format(name)));
    return i && decodeURIComponent(i[1]);
  },

  /**
   * 获取全部Cookie
   * @return {Object} 返回cookie值
   * @static
   */
  get_all: function() {

    var j = document.cookie.split(';');
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

    var cookie =
      '{0}={1}{2}{3}{4}{5}'.format(
        name, encodeURIComponent(value),
        expires ? '; Expires=' + expires.toUTCString() : '',
        path ? '; Path=' + path : '',
        domain ? '; Domain=' + domain : '',
        secure ? '; Secure' : ''
      );
    document.cookie = cookie;
  },

  /**
   * 删除一个cookie
   * @param {String}  name 名称
   * @param {String}  path    (Optional)
   * @param {String}  domain  (Optional)
   * @static
   */
  remove: function(name, path, domain) {
    cookie_obj.set(name, 'NULL', new Date(0, 1, 1), path, domain);
  },

  /**
   * 删除全部cookie
   * @static
   */
  remove_all: function() {
    var all = cookie_obj.get_all();
    for (var i in all)
      cookie_obj.remove(i);
  }
};

tesla.set('tesla.data.cookie', cookie_obj);
