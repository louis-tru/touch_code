/**
 * @createTime 2011-09-29
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

'use strict';

//
// Util
// ======
//
function _constructor() { }
var _sysid = Math.round(Math.random() * 1E7);
var _slice = Array.prototype.slice;

var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var getOwnPropertyNames = Object.getOwnPropertyNames;
//var defineProperty = Object.defineProperty;

var cloneObject = getOwnPropertyDescriptor ? function (newObj, obj) {

  var names = getOwnPropertyNames(obj);
  for (var i = 0, len = names.length; i < len; i++) {
    var name = names[i];
    var property = getOwnPropertyDescriptor(obj, name);
    if (property.writable)
      newObj[name] = clone(property.value);
    //else
    //    defineProperty(newObj, name, property);
  }
  return newObj;
} : function (newObj, obj) {
  for (var name in obj)
    newObj[name] = clone(obj[name]);
  return newObj;
};

function clone(obj) {

  if (obj && typeof obj == 'object') {

    switch(obj.constructor){
      case Object:
        var newObj = {};
        for(var i in obj)
          newObj[i] = clone(obj[i]);
        return newObj;
      case Array:
        var newObj = [];
        for (var i = 0; i < obj.length; i++)
          newObj[i] = clone(obj[i]);
        return newObj;
      case Date:
        return new Date(obj.valueOf());
      default:
        _constructor.prototype = obj.constructor.prototype;
        return cloneObject(new _constructor(), obj);
    }
  }
  return obj;
}

ts.extend(ts, {

  /**
  * update object property value
  * @param  {Object} obj             need to be updated for as
  * @param  {Object} extd            update object
  * @return {Object} return obj
  * @static
  */
  update: function (obj, extd) {
    for (var key in extd) {
      if (key in obj)
        obj[key] = ts.defaults(extd[key], obj[key]);
    }
    return obj;
  },
  
  /**
  * defaults
  * @param  {Object} value
  * @param  {Object} defaults
  * @return {Object}
  * @static
  */
  defaults: function (value, defaults) {
    return value === undefined || value === null ? defaults :
      defaults === undefined || defaults === null ||
      value.constructor === defaults.constructor ||
      value instanceof defaults.constructor ? value : defaults;
  },

  /**
   * get object value by name
   * @param  {String} name
   * @param  {Object} _this (Optional)
   * @return {Object}
   * @static
   */
  get: function (name, _this) {
    var names = name.split('.');
    var item;
    _this = _this || global;

    while (item = names.shift()) {
      _this = _this[item];
      if (!_this)
        return _this;
    }
    return _this;
  },

 /**
  * Setting object value by name
  * @param  {String} name
  * @param  {Object} value
  * @param  {Object} _this (Optional)
  * @return {Object}
  * @static
  */
  set: function (name, value, _this) {
    _this = _this || global;
    var item;
    var names = name.split('.');
    name = names.pop();

    while (item = names.shift())
      _this = _this[item] || (_this[item] = {});
    _this[name] = value;
    return _this;
  },

  /**
   * Remove object value by name
   * @param  {String} name
   * @param  {Object} _this (Optional)
   * @static
   */
  remove: function (name, _this) {
    var names = name.split('.');

    name = names.pop();
    _this = _get(names.join('.'), _this || global);
    if (_this)
      delete _this[name];
  },

  /**
   * 创建随机数字
   * @method random
   * @param  {Number} start (Optional) 开始位置
   * @param  {Number} end   (Optional) 结束位置
   * @return {Number}
   * @static
   */
  random: function (start, end) {
    var r = Math.random();
    start = start || 0;
    end = end || 1E8;
    return Math.floor(start + r * (end - start + 1));
  },

  /**
  * 固定随机值,指定几率返回常数
  * @param  {Number} args.. 输入百分比
  * @return {Number}
  * @static
  */
  fixRandom: function () {
    var total = 0;
    var argus = [];
    var i = 0;

    var len = arguments.length;
    for (; (i < len); i++) {
      var e = arguments[i];
      total += e;
      argus.push(total);
    }

    var r = ts.random(0, total - 1);
    for (i = 0; (i < len); i++) {
      if (r < argus[i])
        return i;
    }
  },

  /**
    * 获取唯一id
    */
  sysid: function () {
    return _sysid++;
  },

  /**
   * 克隆一个Object对像
   * @method clone
   * @param  {Object} obj 要复制的Object对像
   * @return {Object} 返回新对像
   * @static
   */
  clone: clone,
  
	/**
		* object filter
		* @param  {Object}  obj
		* @param  {Object}  exp   filter exp
		* @param  {Boolean} non   take non
		* @return {Object}
		* @static
		*/
	filter: function(obj, exp, non) {
		var newObj = {};
		var isfn = (typeof exp == 'function');
    
		for (var key in obj) {
			var value = obj[key];
			var b = isfn ? exp(key, value) : (exp.indexOf(key) != -1);
			if (non ? !b : b)
				newObj[key] = value;
		}
		return newObj;
	},
  
  /**
  * 获取对像属性值列表
  * @param {Object} obj
  * @return {Object[]}
  * @static
  */
  values: function (obj) {

    var result = [];
    for (var i in obj)
      result.push(obj[i]);

    return result;
  },

  /**
  * 获取对像属性键列表
  * @param {Object} obj
  * @return {String[]}
  * @static
  */
  keys: function (obj) {

    var result = [];
    for (var i in obj)
      result.push(i);

    return result;
  },

  /**
  * 清除使用delay延时的函数
  * @param {Number} (Optional) 要删除的延时句柄,如果没有传入,删除所有
  * @static
  */
  clearDelay: function (id) {
    if (arguments.length) {
      var timeoutid = delays[id] || iDelays[id];
      clearTimeout(timeoutid);
      delete delays[id];
    }
    else {
      for (var i in delays) {
        clearTimeout(delays[i]);
        delete delays[i];
      }
    }
  }
});

/**
* @class Function
* 扩展javascript Function 对像
*/

// ES-5 15.3.4.5
// http://es5.github.com/#x15.3.4.5

if (!Function.prototype.bind) {

    /**
    * 重新给函数绑定this对像，并且在可提前传入参数
    * @method bind
    * @param {Object} that  新this对像
    * @param {Object} argu2 (Optional) 可选参数 提前传入的参数1
    * @param {Object} argu3.. (Optional) 可选参数 提前传入的参数...
    * @return {Function} 返回新函数
    */
  Function.prototype.bind = function (that) {

    var target = this;
    var args = _slice.call(arguments, 1);

    var bound = function () {

      if (this instanceof bound) {
        var F = function () { };
        F.prototype = target.prototype;
        var self = new F();

        var result = target.apply(
          self,
          args.concat(_slice.call(arguments))
        );
        if (result !== null && Object(result) === result)
          return result;
        return self;

      }
      else {
        // equiv: target.call(this, ...boundArgs, ...args)
        return target.apply(that, args.concat(_slice.call(arguments)));
      }

    };

    return bound;
  };
}

var delays = {};
var iDelays = {};

//private:
function delay(_this, args, delays){

  var self = typeof args[0] == 'number' ? _this : args.shift();
  var timeout = args.shift();
  var guid = ts.sysid();

  var timeoutid = setTimeout(function () {
    delete delays[guid];
    _this.apply(self, args);
  }, timeout);

  delays[guid] = timeoutid;
  return guid;
}

ts.extend(Function.prototype, {

  /**
  * 延迟执行函数单位毫秒,并且重新给函数绑定this对像,可提前传入参数
  * @method delay
  * @param {Object} argu1   (Optional) 可选参数 新this对像,如果没有传入this对像使用默认this
  * @param {Number} argu2   要延迟时间长度单位(毫秒)
  * @param {Object} argu3   (Optional) 提前传入的参数1
  * @param {Object} argu4.. (Optional) 可选参数 提前传入的参数...
  * @return {Number} 返回setTimeout延迟ID
  */
  delay: function () {
    return delay(this, _slice.call(arguments), delays);
  },

  /**
   * 延迟执行函数单位毫秒,并且重新给函数绑定this对像,可提前传入参数
   * 该函数不受Function.undelay()影响
   * @method iDelay
   * @param {Object} argu1   (Optional) 可选参数 新this对像,如果没有传入this对像使用默认this
   * @param {Number} argu2   要延迟时间长度单位(毫秒)
   * @param {Object} argu3   (Optional) 提前传入的参数1
   * @param {Object} argu4.. (Optional) 可选参数 提前传入的参数...
   * @return {Number} 返回setTimeout延迟ID
   */
  delay2: function(){
    return delay(this, _slice.call(arguments), iDelays);
  },

  /**
  * 创建一个callback函数
  * @paeam {Object}   _this (Optional)
  * @paeam {Function} errcb 处理异常回调
  * @paeam {Object}   args  (Optional)
  */
  cb: function (/*_this, errcb, args*/) {
    var _this = this;

    var args = _slice.call(arguments);
    var once = args[0];
    var self = typeof once == 'function' ||
    once === undefined || once === null ? global : args.shift();

    var errcb = args.shift();

    return function (err, _data) {
      if (err)
        return throwError(err, errcb);
      arguments.length > 1
        && args.push(_data);

      _this.apply(self, args);
    };
  }
});

/**
 * 清除使用delay延时的函数
 * @method indexOf
 * @param {Number} (Optional) 要删除的延时句柄,如果没有传入,删除所有
 * @static
 */
Function.undelay = ts.clearDelay;

/**
* @class Array
* 扩展javascript Array 对像
*/

/**
 * 把对像转换为数组
 * @method toArrat
 * @param  {Object} obj 需要转换的对像
 * @return {Object[]}
 * @static
 */
Array.toArray = function(obj) {
  return _slice.call(obj);
};

// ES5 15.4.3.2
// http://es5.github.com/#x15.4.3.2
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
if (!Array.isArray) {

  /**
   * obj是否为数组
   * @method isArray
   * @param {Object} obj 要验证的对像
   * @static
   */
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]';
  };
}

// ES5 15.4.4.18
// http://es5.github.com/#x15.4.4.18
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/forEach
if (!Array.prototype.forEach) {

  /**
   * 遍历数组元素
   * @method forEach
   * @param {Function} cb           回调函数
   * @param {Function} thisp  (Optional)  回调函数的this对像
   */
  Array.prototype.forEach = function(cb, thisp) {

    var i = 0;
    var len = this.length;

    while (i < len) {
      if (i in this) {
        // Invoke the callback function with call, passing arguments:
        // context, property value, property key, thisArg object context
        cb.call(thisp, this[i], i, this);
      }
      i++;
    }
  };
}

// ES5 15.4.4.14
// http://es5.github.com/#x15.4.4.14
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {

  /**
   * 查询val元素在数组中的索引位置，如果查询不匹配返回-1
   * @method indexOf
   * @param {Object} sought                需要查询的值
   * @param {number} fromIndex  (Optional) 从索引开始
   * @return {Number} 返回数组索引值
   */
  Array.prototype.indexOf = function(sought, fromIndex) {

    var len = this.length;

    if (!len)
      return -1;

    // handle negative indices
    var i = fromIndex ? ((fromIndex % len) + len) % len: 0;
    for (; i < len; i++) {
      if (this[i] === sought) {
        return i;
      }
    }
    return -1;
  };

  /**
   * 从后面开始查询val元素在数组中的索引位置，如果查询不匹配返回-1
   * @method indexOf
   * @param {Object} sought                需要查询的值
   * @param {number} fromIndex  (Optional) 从索引开始
   * @return {Number} 返回数组索引值
   */
  Array.prototype.lastIndexOf = function(sought, fromIndex) {

    var len = this.length;

    if (!len)
      return -1;

    // handle negative indices
    var i = fromIndex ? ((fromIndex % len) + len) % len: 0;
    for (; i > -1; i--) {
      if (this[i] === sought) {
        return i;
      }
    }
    return -1;
  };

}

// ES5 15.4.4.19
// http://es5.github.com/#x15.4.4.19
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
if (!Array.prototype.map) {

  Array.prototype.map = function(cb, thisp) {
    var len = this.length;
    var result = Array(len);

    for (var i = 0; i < len; i++) {
      if (i in this)
        result[i] = cb.call(thisp, this[i], i, this);
    }
    return result;
  };
}

// ES5 15.4.4.20
// http://es5.github.com/#x15.4.4.20
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
if (!Array.prototype.filter) {

  Array.prototype.filter = function(cb, thisp) {
    var len = this.length;
    var result = [];

    for (var i = 0; i < len; i++) {
      if (i in this && cb.call(thisp, this[i], i, this))
        result.push(this[i]);
    }
    return result;
  };
}

/**
 * 查询数组元素指定属性名称的值是否与val相等,如果查询不匹配返回-1
 * @param {String} name 数组元素的属性名
 * @param {Object} val  需要查询的值
 * @return {Number}     返回数组索引值
 */
function innerIndexOf(name, val, fromIndex) {

  var len = this.length;

  if (!len)
    return -1;

  var i = fromIndex ? ((fromIndex % len) + len) % len: 0;

  for ( ;i < len; i++) {
    if (this[i][name] === val)
      return i;
  }
  return -1;
}

/**
 * 从后面开始查询数组元素指定属性名称的值是否与val相等,如果查询不匹配返回-1
 * @param {String} name 数组元素的属性名
 * @param {Object} val  需要查询的值
 * @return {Number}     返回数组索引值
 */
function innerLastIndexOf(name, val, fromIndex) {

  var len = this.length;

  if (!len)
    return -1;

  var i = fromIndex ? ((fromIndex % len) + len) % len: 0;

  for ( ;i > -1; i--) {
    if (this[i][name] === val)
      return i;
  }
  return -1;
}

ts.extend(Array.prototype, {

  /**
  * 倒叙索引数组元素
  * @param {Number} index 数组倒序索引值
  * @return {Object}
  */
  desc: function (index) {

    return this[this.length - 1 - index];
  },

  /**
  * 移除指定值元素
  * @param {Object} val 需要从数组移除的值或对像
  */
  removeVal: function (val) {

    var i = this.indexOf(val);
    i == -1 || this.splice(i, 1);

    return this;
  },

  innerIndexOf: innerIndexOf,

  innerLastIndexOf: innerLastIndexOf

});

/**
* @class String
* 扩展javascript String 对像
* @author www.mooogame.com
*/

// ES5 15.5.4.20
// http://es5.github.com/#x15.5.4.20
var ws = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\
\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\
\u2029\uFEFF';

if (!String.prototype.trim || ws.trim()) {
  // http://blog.stevenlevithan.com/archives/faster-trim-javascript
  // http://perfectionkills.com/whitespace-deviations/

  /**
  * 清空字符串中前后空白
  * @method trim
  * @return {String}
  */

  var j = '[' + ws + ']';
  var trimBeginRegexp = new RegExp('^' + j + j + '*');
  var trimEndRegexp = new RegExp(j + j + '*$');
  String.prototype.trim = function trim() {
    return String(this).replace(trimBeginRegexp, '').replace(trimEndRegexp, '');
  };
}


var _empty_regexp = new RegExp('[' + ws + ']+', 'g');

ts.extend(String.prototype, {

  /**
  * 格式化字符串
  * <pre><code>
  * var str = '今天在日本{0}发生了{1}级大{2},中{0}北京都可以感觉到{2}';
  * var newStr = str.format('国', 10, '地震');
  * //结果 newStr为 '今天在日本国发生了10级大地震,中国北京都可以感觉到地震'
  * </code></pre>
  * @param {String} argu1 (Optional) 可选参数 要替换的字符串
  * @param {String} argu2.. (Optional) 可选参数 要替换的字符串
  * @return {String} 返回格式化后的字符串
  */
  format: function () {

    for (var i = 0, val = this, len = arguments.length; i < len; i++)
      val = val.replace(new RegExp('\\{' + i + '\\}', 'g'), arguments[i]);
    return val;
  },

  /**
  * 清空字符串中所有空白
  */
  empty: function () {
    return this.replace(_empty_regexp, '');
  }
});

/**
* @class Number
* 扩展javascript Number 对像
* @author www.mooogame.com
* @copyright (C) Copyright mooogame Corporation 2011-2100 All Rights Reserved.
* @version 1.0
*/

Number.prototype._toFixed = Number.prototype.toFixed;

/**
* 转换为前后固定位数的字符串
* @method toFixed
* @param {Number} after  小数点后固定位数
* @param {Number} before (Optional) 小数点前固定位数
* @return {String}
*/
Number.prototype.toFixed = function (after, before) {
  var num =
    typeof after == 'number' ? this._toFixed(after) : this + '';

  if (typeof before == 'number') {

    var match = num.match(/^(\d+)(\.\d+)?$/);
    var integer = match[1];
    var len = before - integer.length;

    if (len > 0)
      num = new Array(len + 1).join('0') + num;
  }
  return num;
};


/**
* @class Date
* 扩展javascript Date 对像
* @author www.mooogame.com
*/

Date.prototype._toString = Date.prototype.toString;

ts.extend(Date.prototype, {

  /**
  * 给当前Date时间追加毫秒,改变时间值
  * @param {Number} i 要添追加的毫秒值
  * @return {Date}
  */
  add: function (i) {
    this.setMilliseconds(this.getMilliseconds() + i);
    return this;
  },

  /**
  * 复制当前Date时间,并且返回新时间对像
  * @return {Date} 返回新时间对像
  */
  clone: function () {
    return new Date(this.valueOf());
  },

  /**
  * 给定日期格式返回日期字符串
  * <pre><code>
  * var date = new Date();
  * var format = 'yyyy-MM-dd hh:mm:ss.fff 星期D';
  * var dateStr = dats.toString(format); // dateStr的值为 '2008-12-10 10：32：23 星期六'
  * format = 'yyyy-MM-dd hh:mm:ss 日期D D2 D3';
  * dateStr = dats.toString(format); // dateStr的值为 '2008-12-10 10：32：23 星期六 Saturday 6'
  * format = 'yyyy/MM/dd hh:mm:ss';
  * dateStr = dats.toString(format); // dateStr的值为 '2008/12/10 10：32：23'
  * format = 'yyyy/MM/dd';
  * dateStr = dats.toString(format); // dateStr的值为 '2008/12/10'
  * format = 'yyyy-MM-dd hh';
  * dateStr = dats.toString(format); // dateStr的值为 '2008-12-10 10'
  * </code></pre>
  * @param {String} format (Optional) 可选参数 要转换的字符串格式
  * @return {String} 返回格式化后的时间字符串
  */
  toString: function (format) {

    var _this = this;

    if (format) {

      var i = [
        ['日', 'Sunday', 0],
        ['一', 'Monday', 1],
        ['二', 'Tuesday', 2],
        ['三', 'Wednesday', 3],
        ['四', 'Thursday', 4],
        ['五', 'Friday', 5],
        ['六', 'Saturday', 6]
      ][_this.getDay()];

      return format.replace('yyyy', _this.getFullYear())
      .replace('MM', (_this.getMonth() + 1).toFixed(null, 2))
      .replace('dd', _this.getDate().toFixed(null, 2))
      .replace('hh', _this.getHours().toFixed(null, 2))
      .replace('HH', _this.getHours().toFixed(null, 2))
      .replace('mm', _this.getMinutes().toFixed(null, 2))
      .replace('ss', _this.getSeconds().toFixed(null, 2))
      .replace('fff', _this.getMilliseconds().toFixed(null, 3))
      .replace('D', i[0])
      .replace('D2', i[1])
      .replace('D3', i[2]);

    }
    else
      return _this._toString();
  }

});


function indexOf(str, str1) {
  var index = str.indexOf(str1);
  return index > -1 ? index : 1e9;
}

/**
 * 返回当前时间撮
 * @method now
 * @return {Number}
 * @static
 */
if(!Date.now){
	Date.now = function(){
		return new Date().valueOf();
	};
}

ts.extend(Date, {

  /**
  * 解析字符串为时间
  * <pre><code>
  * var i = '2008-02-13 01:12:13';
  * var date = Date.parseDateTime(i); //返回的新时间
  * </code></pre>
  * @method parseDateTime
  * @param {String} date                要解析的字符串
  * @param {String} format   (Optional) date format   default yyyyMMddhhmmssfff
  * @param {Number} timezone (Optional) 要解析的时间所在时区,默认为当前时区
  * @return {Date}                      返回新时间
  * @static
  */
  parse_date_time: function (date, format, timezone) {

    date = dats.replace(/[^0-9]/gm, '');
    format = format || 'yyyyMMddhhmmssfff';

    var currentTimezone = ts.timezone;
    var l = dats.length;
    var val;

    if (timezone === undefined)
      timezone = currentTimezone;

    return new Date(
      dats.substr(indexOf(format, 'yyyy'), 4) || 0,
      (dats.substr(indexOf(format, 'MM'), 2) || 1) - 1,
      dats.substr(indexOf(format, 'dd'), 2) || 1,
      (dats.substr(indexOf(format, 'hh'), 2) || 0) - currentTimezone + timezone,
      dats.substr(indexOf(format, 'mm'), 2) || 0,
      dats.substr(indexOf(format, 'ss'), 2) || 0,
      dats.substr(indexOf(format, 'fff'), 3) || 0
    );
  },

  /**
  * 格式化时间戳(单位:毫秒)
  * <pre><code>
  * var x = 10002100;
  * var format = 'dd hh:mm:ss';
  * var str = Date.formatTimeSpan(x, format); // str = '0 2:46:42'
  * var format = 'dd hh:mm:ss';
  * var str = Date.formatTimeSpan(x, format); // str = '0天2时46分42秒'
  * format = 'hh时mm分ss秒';
  * str = Date.formatTimeSpan(x, format); // str = '2时46分42秒'
  * format = 'mm分ss秒';
  * str = Date.formatTimeSpan(x, format); // str = '166分42秒'
  * </code></pre>
  * @param {Number} x 要格式化的时间戳
  * @param {String} format (Optional) 可选参数 要格式化的时间戳格式
  * @return {String} 返回的格式化后的时间戳
  * @static
  */
  format_time_span: function (x, format) {
    format = format || 'dd hh:mm:ss';

    var data = [];
    var items = [
      [1, 1000, /fff/g],
      [1000, 60, /ss/g],
      [60, 60, /mm/g],
      [60, 24, /hh/g],
      [24, 1, /dd/g]
    ];

    var start = false;

    for (var i = 0; i < 5; i++) {
      var item = items[i];
      var reg = item[2];

      if (format.match(reg)) {
        start = true;
      }
      else if (start) {
        break;
      }
      x = x / item[0];
      data.push([x % item[1], x]);
    }

    if (!start) {
      return format;
    }

    data.desc(0).reverse();
    data.forEach(function (item, index) {
      format =
      format.replace(items[index][2], Math.floor(item[0]).toFixed(0, 2));
    });
    return format;
  }

});

