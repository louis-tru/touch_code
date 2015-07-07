/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */
 
 
define(function(require, exports, module) {

var _slice = Array.prototype.slice;

function extend(obj, extd) {
  for (var name in extd){
    obj[name] = extd[name];
  }
  return obj;
}

window.global = window;
var ua = navigator.userAgent;

var env = function(){

  var mat = ua.match(/\(i[^;]+?; (U; )?CPU.+?OS (\d+)_?(\d+)?.+?Mac OS X/);
  var ios = !!mat;
  var ios_version = ios ? (mat[2] + (mat[3] ? '.' + mat[3] : '')) * 1 : 0;
  var ios5_down = ios && ios_version < 6;
  
  var env = {
    windows: ua.indexOf('Windows') > -1,
    windows_phone: ua.indexOf('Windows Phone') > -1,
    linux: ua.indexOf('Linux') > -1,
    android: /Android|Adr/.test(ua),
    macos: ua.indexOf('Mac OS X') > -1,
    ios: ios,
    ios5_down: ios5_down, 
    ios_version: ios_version,
    iphone: ua.indexOf('iPhone') > -1,
    ipad: ua.indexOf('iPad') > -1,
    ipod: ua.indexOf('iPod') > -1,
    mobile: ua.indexOf('Mobile') > -1 || 'ontouchstart' in global,
    touch: 'ontouchstart' in global,
    //--
    trident: !!ua.match(/Trident|MSIE/),
    presto: !!ua.match(/Presto|Opera/),
    webkit: 
      ua.indexOf('AppleWebKit') > -1 || 
      !!global.WebKitCSSKeyframeRule,
    gecko:
      ua.indexOf('Gecko') > -1 &&
      ua.indexOf('KHTML') == -1 || !!global.MozCSSKeyframeRule
  };
  
  return env;
}();

var nextFrame = env.ios ? setTimeout: 
  global.requestAnimationFrame ||
  global.oRequestAnimationFrame ||
  global.msRequestAnimationFrame ||
  global.mozRequestAnimationFrame ||
  global.webkitRequestAnimationFrame || setTimeout;

/**
 * Next tick exec
 * @method nextTick
 * @param {Object}   _this (Optional)
 * @param {Function} cb               callback function
 * @param {Object}   argus (Optional) params
 * @static
 */
function next_tick(cb) {
  var _this = null;
  var args = _slice.call(arguments, 1);

  if (typeof cb != 'function') {
    _this = cb;
    cb = args.shift();
  }
  if (typeof cb != 'function'){
    throw new Error('arguments error');
  }

  nextFrame(function() {
    cb.apply(_this, args);
  }, 1);
}

function def_class(klass, base, members){
  if(base){
    members.__proto__ = base.prototype;
  }
  klass.prototype = members;            
};

/**
 * 声明类型
 * @method Class
 * @param  {String} name 类型的完整名称,名称以private开头表示似有类型
 * @param  {Class}  bases (Optional) 基类型
 * @param  {Object} members 类成员(javascript键值对)
 * @return {Class}
 * @static
 */
function _class(base, members){

  if(typeof base == 'object'){
    members = base;
    base = null;
  }
  
  var klass = null;

  if(members){
    klass = members.constructor;
    if(typeof klass != 'function' || klass === Object){
      klass = function(){};
    }
  }
  else{
    members = {};
    klass = function(){ };
  }

  klass.members = members;
  def_class(klass, base, members);
  klass.call = Function.call;
  klass.prototype.constructor = klass;
  klass.base = base;
  klass.members = members;
  return klass;
}

var _guid = Math.round(Math.random() * 1E7);
function guid() {
  return _guid++;
}

if (!Function.prototype.delay) {
  
  var delays = {};
  var iDelays = {};
  
  //private:
  function delay(_this, args, delays){
  
    var self = typeof args[0] == 'number' ? _this : args.shift();
    var timeout = args.shift();
    var id = guid();
  
    var timeoutid = setTimeout(function () {
      delete delays[id];
      _this.apply(self, args);
    }, timeout);
  
    delays[id] = timeoutid;
    return id;
  }
  
  /**
  * 延迟执行函数单位毫秒,并且重新给函数绑定this对像,可提前传入参数
  * @method delay
  * @param {Object} argu1   (Optional) 可选参数 新this对像,如果没有传入this对像使用默认this
  * @param {Number} argu2   要延迟时间长度单位(毫秒)
  * @param {Object} argu3   (Optional) 提前传入的参数1
  * @param {Object} argu4.. (Optional) 可选参数 提前传入的参数...
  * @return {Number} 返回setTimeout延迟ID
  */
  Function.prototype.delay = function () {
    return delay(this, _slice.call(arguments), delays);
  };
  
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
  Function.prototype.delay2 = function(){
    return delay(this, _slice.call(arguments), iDelays);
  };
  
  /**
  * 清除使用delay延时的函数
  * @param {Number} (Optional) 要删除的延时句柄,如果没有传入,删除所有
  * @static
  */
  Function.undelay = function (id) {
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
  };
}

String.prototype.format =

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
function () {

  for (var i = 0, val = this, len = arguments.length; i < len; i++)
    val = val.replace(new RegExp('\\{' + i + '\\}', 'g'), arguments[i]);
  return val;
};

exports.extend = extend;
exports.env = env;
exports.next_tick = next_tick;
exports.class = _class;
exports.guid = guid;
exports.noop = function(){ };
exports.global = window;
window.global = window;

});