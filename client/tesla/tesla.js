/**
 * @createTime 2011-11-02
 * @author louis.chu <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

//'use strict';

(function(global, EVAL) {

  function CORE_DEFINE(global, EVAL, defs_mark_push, DEBUG){

    //start defined tesla
    var ts = { };

    if(!global.JSON){
      global.JSON = {
        parse: function(json) {
          return EVAL('(' + json + ')');
        },
        stringify: _noop
      };
    }

    var slice = Array.prototype.slice;
    var console = function (){
      var console = global.console || (global.console = {});
      var keys =
          'assert|count|debug|dir|dirxml|error|group|groupCollapsed|groupEnd|\
info|log|markTimeline|profile|profileEnd|time|timeEnd|timeStamp|trace|warn'.split('|');

      for (var i = 0, key; (key = keys[i]); i++){
        console[key] || (console[key] = _noop);
      }
      return console;
    }();
    
    console.test = function(){
      var args = slice.call(arguments);
      var img = new Image();
      var src = '/test/' + new Date().valueOf() + '/';

      for(var i = 0; i < args.length; i++){
        src += args[i] + ' ';
      }            
      img.src = src;
    };

    if(!global.localStorage){ //本地缓存对像
      global.localStorage = {
        getItem: function() { return null },
        setItem: ts.noop,
        removeItem: ts.noop,
        clear: ts.noop
      };
    }

    function extend(obj, extd) {
      for (var name in extd){
        obj[name] = extd[name];
      }
      return obj;
    }

    var NAVIGATOR  = navigator;
    var USER_AGENT = NAVIGATOR.userAgent;

    var env = function(){
      
      var mat = USER_AGENT.match(/\(i[^;]+?; (U; )?CPU.+?OS (\d+)_?(\d+)?.+?Mac OS X/);
      var ios = !!mat;
      var ios_version = ios ? (mat[2] + (mat[3] ? '.' + mat[3] : '')) * 1 : 0;
      var ios5_down = ios && ios_version < 6;
      
      var env = {
        windows: USER_AGENT.indexOf('Windows') > -1,
        windows_phone: USER_AGENT.indexOf('Windows Phone') > -1,
        linux: USER_AGENT.indexOf('Linux') > -1,
        android: /Android|Adr/.test(USER_AGENT),
        macos: USER_AGENT.indexOf('Mac OS X') > -1,
        ios: ios,
        ios5_down: !!ios5_down, 
        ios_version: ios_version,
        iphone: USER_AGENT.indexOf('iPhone') > -1,
        ipad: USER_AGENT.indexOf('iPad') > -1,
        ipod: USER_AGENT.indexOf('iPod') > -1,
        mobile: USER_AGENT.indexOf('Mobile') > -1 || 'ontouchstart' in global,
        touch: 'ontouchstart' in global,
        //--
        trident: !!USER_AGENT.match(/Trident|MSIE/),
        presto: !!USER_AGENT.match(/Presto|Opera/),
        webkit: 
          USER_AGENT.indexOf('AppleWebKit') > -1 || 
          !!global.WebKitCSSKeyframeRule,
        gecko:
          USER_AGENT.indexOf('Gecko') > -1 &&
          USER_AGENT.indexOf('KHTML') == -1 || !!global.MozCSSKeyframeRule
      };
      
      return env;
    }();

		/**
     * 包含js文件或vx文件,该函数只有在调式状态时才可访问
     * @method include
     * @param {String} name
     * @static
     */

		/**
		 * 使用程序包
		 * @method insmod
		 * @param {String} name 多个名字使用","分割
		 * @param {Function} cb (Optional)
		 */

    /**
     * 卸载程序包
     * @method unmod
     * @param  {String} pkg_name
     * @return {Object} 返回卸载后的包信息
		 */

		/**
		 * close
		 * @method close
		 * @param {Number} sig (Optional)
		 */

    /**
     * 抛出异常
     * @method throwError
     * @param {Object}   err
     * @param {Function} cb  (Optional) 异步回调错误
     * @static
     */
    var _throwError = env.trident ? function(err, cb){

      if (cb)
        cb(err);
      else{
        var error =
          typeof err == 'string' ? new Error(err) :
          extend(new Error(err.message || 'error'), err);
        throw error;
      }
    }:
    function(err, cb){

      if (cb)
        cb(err);
      else
        throw err;
    };

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
    function _nextTick(cb) {
      var _this = null;
      var args = slice.call(arguments, 1);

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

    var is = !!global.addEventListener;

    var _on = is ? function(_this, type, handler){
      _this.addEventListener(type, handler, false);
    }:
    function(_this, type, handler){
      var wrapper = function() {
        handler(global.event);
      };
      handler._wrapper = wrapper;
      _this.attachEvent('on' + type, wrapper);
    };

    var _unon = is ? function(_this, type, handler) {
      _this.removeEventListener(type, handler, false);
    }:
    function(_this, type, handler){
      _this.detachEvent('on' + type, handler._wrapper || handler);
    };

    //简单事件处理
    function BaseEvent() {
      this.listens = [];
      this.on = function(cb){
          this.listens.push(cb);
      };
      this.off = function(cb){
        var listens = this.listens;
        for(var i = listens.length - 1; i > -1; i--){
          if(listens[i] === cb){
            return listens.splice(i, 1);
          }
        }
      };
      this.notice = function(data){
        var listens = this.listens;
        var send = { data: data, return_value: true };
        for(var i = 0, l = listens.length; i < l; i++)
          listens[i](send);
	      return send;
      };
    }

    /**
     * 定义一个需要实现的虚函数
     * @method virtual
     * @type {Function}
     * @static
     */
    function _virtual() {
      throw new Error('Need to implement virtual functions');
    }

    /**
     * Whether this type of sub-types
     * @method Class.equals
     * @param  {Class}    type   type or children type
     * @return {Boolean}
     * @static
     */
    function equals(type){
  
      if (type === this)
        return true;
      if (type === undefined || type === null)
        return false;
  
      var base;
      while ((base = type.base)) {
        if (base === this){
          return true;
        }
        type = base;
      }
      return false;
    }

    var def_class = function(klass, base, members){
      if(base){
        members.__proto__ = base.prototype;
      }
      klass.prototype = members;            
    };

    var def_static_class = function(klass, staticMembers){
      klass.__proto__ = staticMembers;
    };

    Function.__proto__ || (function (){
  
  		var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  
  		//返回成员信息,0为普通字段,1为属性访问器,2为函数,3为不存在
  		var getMemberType =  getOwnPropertyDescriptor ? function(obj, name) {
  
  			var property = getOwnPropertyDescriptor(obj, name);
  			var type = 3;
  			var value;
  
  			if (property) {
  				if (property.writable) {
  					value = property.value;
  					type = (typeof value == 'function' ? 2 : 0);
  				}
  				else {//属性访问器
  					type = 1;
  				}
  			}
  			return { property: property, value: value, type: type };
  
  		} : function(obj, name) {
  			if (name in obj){
  				return { value: obj[name], type: typeof value == 'function' ? 2 : 0 };
  			}
  			return { value: 3 };
  		};
  
  		//get base member type info
  		var getBaseMemberType = getOwnPropertyDescriptor ?
  		function(obj, name, klass) {
  
  			var property;
  			var type = 3;
  			var value;
  			var base;
  
  			if (name in obj) {
  				while ((base = klass.base)) {
  				  
          /**
      		 * klass.name = name;
      		 * klass.base = base;
      		 * klass.members = members;
           */
  					var members = base.members;
  					if (members &&
  						(property = getOwnPropertyDescriptor(members, name))) {
  
  						if (property.writable) {
  							value = property.value;
  							type = (typeof value == 'function' ? 2 : 0);
  						}
  						else{
  							type = 1;
  						}
  						break;
  					}
  					klass = base;
  				}
  			}
  			return { property: property, value: value, type: type };
  		} : getMemberType;
  
      //inherit constructor
      function _constructor() { }
      var defineProperty = Object.defineProperty;
      
      def_class = function(klass, base, members){
        
        if(base){
        	_constructor.prototype = base.prototype;
        	klass.prototype = new _constructor();
        }
        var prototype = klass.prototype;
        
        for(var i in members){
  
  				var baseProperty =
  					base ? getBaseMemberType(base.prototype, i, klass): { type: 3 };
  				var property = getMemberType(members, i);
  				var type = property.type;
  
  				if(type == 1){
  					property = property.property;
  					if (baseProperty.type == 1) {
  						baseProperty = baseProperty.property;
  						property.get = property.get || baseProperty.get;
  						property.set = property.set || baseProperty.set;
  					}
  					defineProperty(prototype, i, property);
  				}
  				else{
  					prototype[i] = property.value;
  				}
  			}
  		};
      
      def_static_class = getOwnPropertyDescriptor ? function(klass, staticMembers){
    
        for(var i in staticMembers){
          var property = getMemberType(staticMembers, i);
    		  if(property.type == 1){
            defineProperty(klass, i, property.property);
    	    }
    	    else{
    		    klass[i] = property.value;
    	    }
        }
      }: extend;

		})();

    /**
     * 声明类型
     * @method Class
     * @param  {String} name 类型的完整名称,名称以private开头表示似有类型
     * @param  {Class}  bases (Optional) 基类型
     * @param  {Object} members 类成员(javascript键值对)
     * @param  {Object} staticMembers (Optional) 静态成员(javascript键值对)
     * @return {Class}
     * @static
     */
    function _class(name, base, members, staticMembers){

      if(typeof base == 'object'){
        staticMembers = members;
        members = base;
        base = null;
      }
      name = name.replace(/\s+/g, '');

      var klass;
      var names = name.split('.');
      var klassName = names.pop();

      if(members){
        klass = members[klassName];
        if(typeof klass != 'function'){
          klass = function(){};
        }
      }
      else{
        members = {};
        klass = function(){};
      }

      klass.members = members;
      def_class(klass, base, members);
      def_static_class(klass, staticMembers || {});
      klass.call = Function.call;
      klass.prototype.constructor = klass;
      klass.fullName = name;
      klass.base = base;
      klass.members = members;
      klass.equals = equals;

      if(names.length) {
        var e;
        var self = global;

        while (e = names.shift()){
          self = self[e] || (self[e] = {});
        }
        if (klassName in self)
          throw new Error(name + ': repeat the definition of');
        //TODO 添加到定义
        defs_mark_push(name);
        self[klassName] = klass;
      }
      return klass;
    }

    //********* Defined class function END *********

    /**
     * Empty function
     * @method noop
     * @static
     */
    function _noop() { }

    /**
     * @class tesla
     * @createTime 2011-11-02
     * @updateTime 2011-11-02
     * @author www.mooogame.com, Simplicity is our pursuit
     * @copyright (C) Copyright mooogame Corporation 2011-2100 All Rights Reserved.
     * @version 1.0
     * @singleton
     */

    //替换标签文本
    var rtags = { };
    
    // 定义替换标签
    function set_tags(tags) {
      if(Object.prototype.toString.call(tags) == '[object Array]') {
        for(var i = 0; i < tags.length; i += 2) {
          rtags[tags[i]] = tags[i + 1];
        }
      }
      else {
        extend(rtags, tags);
      }
    }
    
    // 替换文本中的标签
    function rep(text) {
      text = text.replace(/\{\@(([^\{]*?|\{.+?\})+?)\}/g, function(all, tag) {
        var str = rtags[tag];
        if (str) {
          return str;
        }
        return tag;
      });
      return text;
    }
    
    // 获取标签
    function tag(tag) {
      return rtags[tag] || tag;
    }
    
    var xhrs = { };
    var xhr_counter = 0;

    _on(global, 'unload', function(evt) {
      for (var i in xhrs)
        xhrs[i].abort();
    });

    function ajax(p, callback) {
  
      p = extend({
        type: 'GET',
        dataType: 'text',
        data: null
      }, p);

      p.url = ts.format(p.url);

      var id = xhr_counter++ + '';
      var xhr = xhrs[id] =
        global.XMLHttpRequest ? new XMLHttpRequest() :
        new ActiveXObject('Microsoft.XMLHTTP');

      function cb() {

        if (p.onchange)
          return p.onchange(xhr);

        var readyState = xhr.readyState;
        if (readyState == 4)
          delete xhrs[id];
        else
          return;

        var err;
        var status = xhr.status;
        var result = xhr.responseText;

        if (status == 200 || status == 304) {

          switch (p.dataType) {

            case 'json':
              try{
                result = JSON.parse(result);
              }
              catch(e){
                err = e.message + ' info:\n' + result;
              }
              break;

            case 'xml':
              result = xhr.responseXml || xhr.responseXML;
              if (result) {
                var parseError = result.parseError;
                if (
                  env.trident && parseError &&
                  parseError.errorCode !== 0
                ){
                  err = 'XML format error\n' +
                    parseError.srcText + '\n' +
                    parseError.reason +
                    '\n,' + p.url;
                }
              }
              else
                err = 'XML format error\r\n,' + p.url;
              break;
          }

          if(!err){
            return callback ? callback(null, result): result;
          }
        }

        //TODO ?
        //if(!status)
        //    return;

        var rest = {
          url: p.url,
          data: p.data,
          type: p.type,
          dataType: p.dataType,
          status: status,
          message: err || result || 'Error http status:' + status
        };

        console.error(rest.message);

        throwError(rest, callback);
      }

      if (callback)
        xhr.onreadystatechange = cb;
      xhr.open(p.type, p.url, !!callback);

      if(p.onopen)
        p.onopen(xhr);

      try {
        xhr.send(p.data);
      } catch (_e) { }

      return callback ? xhr: cb();
    }


    var FORMAT_REG = [
      /\\/g,
      /\/\.\//g,
      /^(\/)|((https?|wss?):\/\/)/i,
      /((https?|wss?):\/)?\/[^\/]+\/\.{2,}/i,
      /\.+\//g
    ];


    function format(path) {

      path = path.replace(FORMAT_REG[0], '/').replace(FORMAT_REG[1], '/');
      var m = path.match(FORMAT_REG[2]);
      path =
        (m ? m[1] ? ts.root_dir + path.substr(1) : path : ts.dir + path);

      var reg = FORMAT_REG[3];
      while (m = path.match(reg)) {

        if (m[1])
          break;
        var index = m.index;
        path = path.substring(0, index) + path.substr(index + m[0].length);
      }

      return path.replace(FORMAT_REG[4], '');
    }


    var I64BIT_TABLE =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('');

    function _hash(input){
      var hash = 5381;
      var i = input.length - 1;

      if(typeof input == 'string'){
        for (; i > -1; i--)
          hash += (hash << 5) + input.charCodeAt(i);
      }
      else{
        for (; i > -1; i--)
          hash += (hash << 5) + input[i];
      }
      var value = hash & 0x7FFFFFFF;

      var retValue = '';
      do{
        retValue += I64BIT_TABLE[value & 0x3F];
      }
      while(value >>= 6);

      return retValue;
    }

		_on(global, 'error', function(evt) {
			//TODO ?
			if(global.onerror !== onerror)
				global.onerror = onerror;
			if(ts.onerror.listens.length)
				evt.stopPropagation();
		});

		_on(global, 'beforeunload', function(evt) {

			var return_value = ts.onclose.notice().return_value;
			if(return_value !== true){
				return evt.return_value = return_value || '.';
			}
		});

		function onerror(msg) {
			ts.onerror.notice(msg);
		}

    /**
     * 应用程序开发调试(未发布状态)
     * @property DEBUG
     * @type {Boolean}
     * @static
     */
		ts.DEBUG = ts.debug = DEBUG;
    
    /**
     * 终端使用的语言
     * @type {String}
     * @static
     */
    ts.language = (NAVIGATOR.browserLanguage || NAVIGATOR.language).toLowerCase();
        
    /**
     * 当前时区
     * @type {Number}
     * @static
     */
    ts.timezone = new Date().getTimezoneOffset() / -60;

    /**
     * 格式化路径
     * @method format
     * @param  {String}  path 路径
     * @return {String}  返回完整路径
     * @static
     */
    ts.format = format;

    /**
     * 定义替换标签
     * @method rtag
     * @param {Object} 定义值
     * @static
     */
    ts.set_tags = set_tags;
    
    /**
     * 替换文本中的标签
     * @method rep
     * <pre><code>
     * var str = '今天在日本{@a0}发生了{@a1}级大{@a2},中{@a0}北京都可以感觉到{a-2}';
     * var newStr = $r(str);
     * </code></pre>
     * @param {String} text 要格式化的文本
     * @return {String} 返回格式化后的文本
     * @static
     */
    ts.rep = rep;
    
    /**
     * 或取标签
     */
    ts.tag = tag;
    
    /**
     * 发送ajax请求
     * @method ajax
     * @param {Object} p                                参数
     * <pre><code>
     * {
     *     type     : 'GET'|'POST',                     //请求数据类型
     *     url      :  url,                             //请求地址
     *     dataType : 'text'|'json'|'xml',              //返回数据类型
     *     data     : null,                             //发送的数据
     *     onopen   : Function,                         //打开连接事件
     *     onchange : Function                          //响应变化
     * }
     * </code></pre>
     * @param {Function} callback  (Optional)
     * 成功响应回调,不传入为同步请求
     * @return {Object} 如果为同步请求返回数据,否则返回当前xhr对像
     * @static
     */
    ts.ajax = ajax;

    /**
     * 从extd扩展属性至obj
     * @method extend
     * @param  {Object} obj                 需要被扩展的对像
     * @param  {Object} extd                原始对像
     * @return {Object}                     返回扩展后的对像
     * @static
     */
    ts.extend = extend;

    /**
     * get hash value
     * @param  {Object} input
     * @return {String}
     */
    ts.hash = _hash;

    /**
     * noop
     * @method noop
     * @static
     */
    ts.noop = _noop;

    /**
     * add event listener
     * @method on
     * @static
     */
    ts.on = _on;

    /**
     * remove event listener
     * @method unon
     * @static
     */
    ts.off = _unon;

    /**
     * 环境版本信息
     * <pre><code>
     *   WINDOWS
     *   WINDOWS_PHONE
     *   LINUX
     *   ANDROID
     *   MACOS
     *   IOS
     *   IPHONE
     *   IPAD
     *   MOBILE
     *   TRIDENT
     *   PRESTO
     *   WEBKIT
     *   GECKO
     * </code></pre>
     * @type {Object}
     * @static
     */
		ts.env = env;

    /**
     * set exception event
     * @type {BaseEvent}
     * @static
     */
    ts.onerror = new BaseEvent();

    /**
     * close
     * @type {BaseEvent}
     * @static
     */
		ts.onclose = new BaseEvent();

		// TODO
		global.onerror = onerror;

    return {
      global: {
        ts: ts,
        tesla: ts,
        nextTick: _nextTick,
        next_tick: _nextTick,
        throwError: _throwError,
        throw_err: _throwError,
        virtual: _virtual,
        $f: format,
        $r: rep,
        $t: tag,
        noop: _noop,
        global: global,
        EVAL: EVAL
      },
      BaseEvent: BaseEvent,
      _class: _class
    };
  }

  //标识class
  function Mark(){
    var _queue = [];
    this.push = function(name){
      _queue.push(name || '&');
    };
    this.pop = function(ls){
      for(;;){
        var name = _queue.pop();
        if(!name || name == '&')
          break;
        ls.push(name);
      }
      ls.reverse();
    };
  }
  
  var defs_mark       = new Mark(); //类型枚举名称
  var incs_mark       = new Mark(); //包含文件名称
  var doc             = document;
  var LOCATION        = location + '';
  var LOCAL_STORAGE   = localStorage;
  
	var DEBUG = (function(){ //get bebugger status
		var metas = doc.getElementsByTagName('meta');
		var len = metas.length;
		for(var i = 0; i < len; i++){
			if(metas[i].getAttribute('name') == 'javascript-x-not-debug'){
				return false;
			}
		}
		return true;
	})();
  
  //TODO ?
  var exports =
	  CORE_DEFINE(global, EVAL, function(name){ defs_mark.push(name) }, DEBUG);

	var ts          = exports.global.ts;
	var oninsmod    = new exports.BaseEvent();   //insmod event
  var onunmod     = new exports.BaseEvent();   //unmod event
  
  /**
   * 站点根目录
   * @type {String}
   * @static
   */
  ts.root_dir = LOCATION.match(/https?:\/\/[^\/]*/) + '/';
  
  function writeData(name, value){
    try{
      LOCAL_STORAGE.setItem(name, value);
    }
    catch(err){
      console.error(err.message);
    }
  }
  
  function readData(name){
    try{
      return LOCAL_STORAGE.getItem(name);
    }
    catch(err){
      console.error(err.message);
    }
  }
  
  //update app version reload page
  function updateVersion(ver){
    if(ver > VERSION){
      writeData('javascript-x-version', ver);
      location.reload();
    }
  }
  
  var VERSION = 0;
  var dir = readData('javascript-x-dir');     //应该程序目录
  var MAIN    = '';                               //应用程序入口
  var use_map = false;                            //默认not使用MAP系统    
  
  //获取应该程序目录,入口文件,version
  (function (){
  
    var reg = /^javascript-x-(map|dir|main|version)$/;
    var metas = doc.getElementsByTagName('meta');
    var cur = LOCATION.replace(/[\?\#].*$/, '').replace(/\/[^\/]*$/, '') + '/';
    var dirs = [];
		var len = metas.length;

    for(var i = 0; i < len; i++){
      var meta = metas.item(i);
      var mat = (meta.getAttribute('name') || '').match(reg);
      if(mat){
      
        var content = meta.getAttribute('content');
        switch(mat[1]){
          case 'map':
            use_map = content != 'false';
            break;

          case 'dir':
            // TODO NOTE
            // 可配置多个javascript-x-dir节点,用于服务器的负载均衡
            // 跨域目录需在服务器响应头中请加入
            // Access-Control-Allow-Origin:*

            if(!content.match(/^(https?:|\/)/))
                content = cur + content;
            dirs.push(ts.format(content).replace(/\/?$/, '/'));
            break;
            
          case 'main':
            MAIN = content;
            break;
          case 'version':
            VERSION = content;
            break;
        }
      }
    }
        
		if(dirs.indexOf(dir) == -1){
			dir = null;
		}
    
		len = dirs.length;
    
    if(!dir && len){
        var index = len == 1 ? 0: Math.round(Math.random() * (len - 1));
        writeData('javascript-x-dir', dir = dirs[index]);
    }
    
    if(DEBUG && len){
			dir = dirs[0];
		}
    
    var ver1 = readData('javascript-x-version') || 0;
    var ver2 = doc.cookie.match(new RegExp('javascript-x-version=([^;$]+)'));
    VERSION = Math.max(VERSION, ver1, ver2 ? ver2[1]: 0) || 0;
    
    writeData('javascript-x-version', VERSION);
    
    //Use random version number
    if(VERSION === 0 || (DEBUG && !use_map)){
      VERSION = new Date().valueOf();
    }
  }());
  
  if(dir) {
    ts.extend(global, exports.global);
  }
  else {
    return;
  }
  
  //获取配置
  function getConf(name){
      
    var names = name.split('.');
    var rest = config;
    
    while ((name = names.shift()) && (rest = rest[name])){
      
    }
    return rest;
  }
  
	var INCLUDE_REGEXP = /\{([^!=\|\}]+)(?:(=|!)([^\|\}]+))?(?:\|([^\}]+))?\}/g;
  
  /**
   * 包含js文件或vx文件,该函数只有在调式状态时才可访问
   * 可包含替换表达式
   *
   * 列:
   * include('thk/col/MainMaster_{skin=q}_{platform}.vx');
   * include('thk/col/MainMaster_{skin!r}_xl.vx');
   *
   *
   * @method include
   * @param {String} name
   * @static
   */
  function _i_nclude(name) {

    var is = true;

    name = name.replace(/\s+/g, '')
      .replace(INCLUDE_REGEXP, 
      function(all, name, sign, value, or){
    
      var conf_val = getConf(name);
      if(
        sign == '=' ? conf_val == value:
        sign == '!' ? conf_val != value:
        conf_val
      ){
        return conf_val;
      }
    	else if(or){
    		return or;
    	}
      else {
          is = false;
      }
    });

    if(is){

      incs_mark.push(name);
      _load(name);
    }
  }

  //定义vx
  function __defvx(out, inc, data, type) {
    for (var i in data) {
      var item = data[i];
      if (i in out && item.override != 'yes')
        throw new Error(i + ',' + type +
          'repeat the definition to cover, please declare the override=yes');
      out[i] = data[i];
      inc.push(i);
    }
  }

    var vxdata = { head: { res: {} }, views: {} }; //vx data
    var INCLUDE = {};          //包含日志
    var MODULE = {};          //包数据

    var __def = {

    //发布后的代码调用,为代码拱单独的封闭空间,同时获取定义信息
    js: function(name, includes, def) {
      var inc = {
        name: name,
        includes: includes,
        names: [],
        code: '(' + def + ')()'
      };
      INCLUDE[name] = inc;

      //TODO 标识
      defs_mark.push();
      def();
      defs_mark.pop(inc.names);
    },

    //def vx
    vx: function (name, _vx) {
      //include data
      var inc_head = [];
      var inc_views = [];
      var inc = { name: name, vx: true, head: inc_head, views: inc_views, includes: [] };
      inc_head.res = [];
      INCLUDE[name] = inc;

      //vx
      var head = vxdata.head;
      var _head = _vx.head || {};
      //def
      __defvx(head.res, inc_head.res, _head.res, 'resources');
      __defvx(vxdata.views, inc_views, _vx.views, 'view');

      delete _head.res;
      for (var i in _head){
        head[i] = _head[i];
        inc_head.push(i);
      }
    }
  };

	var LOAD_FILES = {};

  //下载代码
  function _load(name, cb){

    //is included
    if (name in LOAD_FILES){
      return cb && cb();
    }

    var vx = /\.vx($|\?|#)/i.test(name);
    var url = newPath(name);
    var opt = { url: url, dataType: vx ? 'xml': 'text' };

    var compile = function(code) {

      if (name in LOAD_FILES)
        return;
	    LOAD_FILES[name] = true;

      if(vx){
        return __def.vx(name, ts._debug.vx(code));
      }
        
      var opt = { __name: name, include: _i_nclude, $class: exports._class };

	    //TODO ?
      if(DEBUG) {
            
    		code = '(function(){' + code + '\n})()';
                var inc = { name: name, includes: [], names: [], code: code };

  	  	INCLUDE[name] = inc;
  
        //TODO 标识
        incs_mark.push();
        defs_mark.push();
        EVAL(code, global, ts, { 
            __name: name, 
            include: _i_nclude, 
            $class: exports._class 
        });
        defs_mark.pop(inc.names);
        incs_mark.pop(inc.includes);
      }
      else{
        EVAL(code, global, ts, {
            __def: __def, 
            __name: name, 
            $class: exports._class
        });
      }
    };

    cb ?
    ts.ajax(opt, function(err, data) {
      if (!err){
        compile(data);
      }
      cb(err);
    }):
    compile(ts.ajax(opt));
  }

  //获取依赖
  function readRely(name, out, mark){
    if(name in mark)
      return;
    mark[name] = true;
    //start query
    var inc = INCLUDE[name];
    if(inc){
      var includes = inc.includes;
      for(var i = 0, l = includes.length; i < l; i++)
        readRely(includes[i], out, mark);
      //push rest
      out.push(inc);
    }
  }

	function readModRely(mod_name, out, mark){
		var mod = MODULE[mod_name];
		if(mod){
			var members = mod.members;
			var len = members.length;
			for(var i = 0; i < len; i++){
				readRely(members[i], out, mark);
			}
		}
	}

  // 安装模块
  // @method insmod
  // @param {String} name 多个名字使用","分割
  // @param {Function} cb (Optional)
  function insmod(name, cb){

    var names = name.replace(/\s+/g, '').split(',');
    var len = names.length;
    var files = [];

    for(var i = 0; i < len; i++){
        var item = names[i];
        var mode = MODULE[item];

        if(mode){
            if(!mode.loaded){
                files = files.concat(mode.files);
            }
        }
        else
            throwError(
                new Error(item + ',Module does not undefined,defined in the head'), 
                cb);
    }

    if(!files.length){
        return cb ? cb(null, []): [];
    }

    //
    function callee(err){

      if(err)
          return cb(err);
      //include complete
      if(!files.length){

        var out = [];
        var mark = {};
        while(name = names.shift()){
          readModRely(name, out, mark);
          MODULE[name].loaded = true;
        }
        oninsmod.notice(out);
        return cb ? cb(err, out): out;
      }

      //
	    //debugger;
      var item = files.shift();
	    //TODO ?
      return cb ? _load(item, callee): callee(null, _load(item));
    }

    return cb ? nextTick(callee): callee();
  }

  // 卸载模块
  // @method unmod
  // @param  {String} pkg_name
  // @return {Object} 返回卸载后的包信息
  function unmod(pkg_name){

    //TODO ?
    var mode = MODULE[pkg_name];
    if(!mode || !mode.loaded){
        return;
    }

    mode.loaded = false;

  	var all_mark = {};
  	var all_files = {};
  	var current_mark = {};
  	var current_files = mode.files;

    readModRely(pkg_name, [], current_mark);

    //START 排除公共还需要用的包
    for(var m in MODULE){
        //
      var mod = MODULE[m];
      if(mod.loaded){
    		var files = mod.files;
    		var len = files.length;
    
    		for(var i = 0; i < len; i++){
    			all_files[files[i]] = true;
    		}
        readModRely(m, [], all_mark);

      }
    }

    for(var i = 0, len = current_files.length; i < len; i++){
  		var file = current_files[i];
  		if(!(file in all_files)){
  			//delete load files
  			delete LOAD_FILES[file];
  		}
  	}

    for(var name in all_mark){
      if(name in current_mark){
        //该项不需要卸载
        delete current_mark[name];
      }
    }
      // END

    //开始卸载包,删除INCLUDES中的项,删除ts.vx中的项目,发射事件
    var current_out = [];
    var vx = ts.vx;
    var head = vx.head;

    for(name in current_mark){
  
  		if(DEBUG){
  			delete LOAD_FILES[name];
  		}

      var item = INCLUDE[name];
      delete INCLUDE[name];
      current_out.push(item);

      //是否为vx包
      if(item.vx){
        var data = [item.views, vx.views, item.head, head, item.head.res, head.res];
        for(var i = 0; i < 6; i += 2){
          var ls = data[i];
          for(var j = 0, l = ls.length; j < l; j++){
            delete data[i + 1][ls[j]];
          }
        }
      }
      else{
        var names = item.names;
        for(var o = 0, ol = names.length; o < ol; o++){
          EVAL('delete global.' + names[o], global); //删除类型定义
        }
      }
    }

    //emit event
    onunmod.notice(current_out);
    return current_out;
  }

  //文件映射表
  var maps = {};
  var config = {}; //应用配置
  var READ_REG = new RegExp('^(' + dir + '([^\\?#]+))', 'i');

  //get new path
  function newPath(url){

    //是否在当前域中的文件,否则返回原始路径
    var mat = ts.format(url).match(READ_REG);
    if (!mat)
      return url;

    var filename = mat[1];
    var basename = mat[2];
    var search;

    //启用文件MAP功能
    if (use_map){
      var ver = maps[DEBUG ? basename: ts.hash(basename)];
      search = ver ? '?v' + ver: '';
    }
    else
      search = DEBUG ? '?v' + VERSION : '';

    return filename + search;
  }

  function initMap(data){

    var items = data.split('\n');
    var len = items.length;

    for (var i = 0; i < len; i++) {
      var ls = items[i].split(/\s+/);
      var name = ls[0];
      if(name)
        maps[name] = ls[1];
    }
  }

  //初始定义模块,当程序需要时加载
  function initModule(data){

    var items = data.replace(/\\\s*\r?\n/g, ' ').split('\n');
    var len = items.length;

    for (var i = 0; i < len; i++) {
  
      var item = items[i].replace(/(^\s+)|(\s+$)/g, '');
      if(!/^\s*(#|$)/.test(item)){
    
    		var ls = item.split(/\s*:\s*/);
    		var members = ls[0].split(/\s+/);
    		var files = DEBUG ? members: ls[1].split(/\s+/);
    		var mod = { members: members, files: files[0] ? files: [], loaded: false };
    
    		for(var j = 0; j < members.length; j++){
    
    			var name = members[j];
    
    			if(MODULE[name]){
    				throw new Error(name + ' duplicate definition');
    			}
    			else
    				MODULE[name] = mod;
    		}
      }
    }
  }

  //初始map
  function init(cb) {

    if(!DEBUG){

      ts.ajax({ url: dir + 'x.x?v' + VERSION }, function(err, data){
        if(err){
          throw new Error('Did not find the file x.x');
        }

        var items = data.split(/<.+?>/);
        initMap(items[1]);     //
        ts.extend(config, EVAL('(' + items[2] + ')'));
        initModule(items[3]);  //
        cb();
      });
      return;
    }

    var map = function(err, data){
  
      if(err){
        console.error('Did not find the mapping table');
      }
      if(data){
        initMap(data);
      }
  
      ts.ajax({ url: newPath('app.conf') }, function(err, data){
    
        if(err){
          console.error('Did not find the file app.conf');
    		}
    		else{
    			ts.extend(config, EVAL('(' + data + ')'));
    		}
    
        ts.ajax({ url: newPath('app.module') }, function(err, data){
    
          if(err)
              throw new Error('Did not find the file app.module');
          initModule(data);
          cb();
        });
      });
    };

    if(use_map){
      ts.ajax({ url: dir + '.file.map?' + VERSION }, map);
    }
    else{
      map();
    }
  }
  
  /**
   * 包信息
   * @type {Object}
   * @static
   */
  ts.modules = ts.MODULE = MODULE;
  
  /**
   * 应用程序运行目录(javascript目录)
   * @type {String}
   * @static
   */
  ts.dir = dir;
  
  /**
   * 应用配置
   * @type {Object}
   * @static
   */
  ts.config = ts.config = config;
  
  /**
   * 应用程序入口
   * @type {String}
   * @static
   */
  ts.main = MAIN;
  
  /**
   * 当前应用程序版本
   * @type {Number}
   * @static
   */
  ts.version = VERSION;
  
  /**
   * Update the application version number, the next time you load the page
   * @method updateVersion
   * @param {Number} version
   * @static
   */
  ts.update_version = updateVersion;
  
  /**
   * vx 数据
   * @type {Object}
   * @static
   */
  ts.vx = vxdata;
  
  /**
   * Synchronization server files, get a md5 parameter path,
   * the path across the BROWSER cache, get the latest contents of the file
   * @method newPath
   * @param  {String}   url
   * @return {String}
   */
  ts.newPath = newPath;

  /**
   * @event oninsmod
   * @static
   */
  ts.oninsmod = oninsmod;

  /**
   * @event onunmod
   * @static
   */
  ts.onunmod = onunmod;

  global.insmod = insmod;
  global.unmod = unmod;
  
  if(ts.env.ios){
    //document.body.style.height = global.innerHeight + 150 + 'px';
    doc.write('<div style="position: absolute; left: 0; top: 0; height: ' + 
      (global.innerHeight + 110) + 'px; width: 1px;" id="ios_div"></div>');
  }

  //Wait for page plus all the load is complete
  //Activate the browser cache mode,
  //but there are a small number of browser is not compatible with
  ts.on(global, 'load', function(){

    //Avoid page refresh can not use the cache
    nextTick(init, function(){
      
      if(ts.env.ios){
        doc.body.scrollTop = 1;
        doc.body.removeChild(doc.getElementById('ios_div'));
        ts.__screen_width__ = global.innerWidth;
        ts.__screen_height__ = global.innerHeight;
      }
      
  		//debug status
  		if (DEBUG){
        _load('tesla/util.js');
  			_load('tesla/_debug.js');
  		}

      if (MAIN) {
  			//使用主模块模块
  			insmod(MAIN, function(err){
  				if(err)
  					throw err;
  			});
      }
    });
  });

} (self, function(__code, global, ts, __opt){
  
  var tesla = ts;

  if(__opt){
    var __def = __opt.__def;
    var __name = __opt.__name;
    var include = __opt.include;
    var $class = __opt.$class;
    var rest = eval(__code);
    __code = __def = include = $class = undefined;
    return rest;
  }
  return eval(__code);
}));
