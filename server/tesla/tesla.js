/**
 * @class Global
 * @createTime 2011-11-02
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

(function(global, EVAL) {

	function CORE_DEFINE(global, EVAL, defs_mark_push, DEBUG){

		var te = { };

		// 使用 NODEJS 模块包含
		// 只能加载Native模块
		function _require(module_name) {
			if (module_name.match(/^[^\/\\\.]+$/))
				return require(module_name);
			else
				throw new Error('module name not correct');
		}

		function extend(obj, extd) {
			for (var name in extd)
				obj[name] = extd[name];
			return obj;
		}

		//清空字符串中的空格
		function empty(string) {
			return string.replace(/\s+/g, '');
		}

    var env = (function(){

			var platform = process.platform;

			var env = extend(extend({}, process.env), {
          windows: /win(32|64)/.test(platform),
          linux: /linux/.test(platform),
          macos: /darwin/.test(platform),
          nodelike: !!process.env.NODE_LIKE
      });
			return env;
    })();

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
		 * @method uninsmod
		 * @param  {String} pkg_name
		 * @return {Object} 返回卸载后的包信息
		 */
		
		/**
		 * close
		 * @method close
		 * @param {Number} sig (Optional)
		 */
		function close(sig){
			process.exit(sig);
		}
		
		/**
		 * 抛出异常
		 * @method throwError
		 * @param {Object}   err
		 * @param {Function} cb  (Optional) 异步回调错误
		 * @static
		 */
		function _throwError(err, cb) {
			if (cb){
				cb(err);
			}
			else{
				throw err;
			}
		}
		
		var slice = Array.prototype.slice;
		
		/**
		* next Tick exec
		* @method nextTick
		* @param {Object} _this (Optional)
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
			if (typeof cb != 'function')
				throw new Error('arguments error');
 
			process.nextTick(function() {
				cb.apply(_this, args);
			});
		}
		
		//简单事件处理
		function BaseEvent() {
			this.listens = [];
			this.on = function(cb){
				this.listens.push(cb);
			};
			this.off = this.unon = function(cb){
				var listens = this.listens;
				for(var i = listens.length - 1; i > -1; i--){
					if(listens[i] === cb)
						return listens.splice(i, 1);
				}
			};
			this.emit = function(data){
				var listens = this.listens;
				var send = { data: data, returnValue: true };
				for(var i = 0, l = listens.length; i < l; i++)
					listens[i](send);
				return send;
			};
		}

		/**
		* 定义一个需要实现的虚函数
		* @type {Function}
		*/
		//virtual
		function _virtual() {
			throw new Erro('Need to implement virtual functions');
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
			while (base = type.base) {
				if (base === this)
					return true;
				type = base;
			}
			return false;
		}

    function def_class(klass, base, members){
      if(base)
        members.__proto__ = base.prototype;
      klass.prototype = members;
    }
    
    function def_static_class(klass, staticMembers){
      klass.__proto__ = staticMembers;
    }

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

		/**
		* Empty function
		* @method noop
		* @static
		*/
		function _noop() { }

		/**
		 * @class jsx
		 * @createTime 2011-12-12
		 * @author louis.tru <louis.tru@gmail.com>
         * @copyright (C) 2011 louis.tru, http://mooogame.com
         * Released under MIT license, http://license.mooogame.com
		 * @version 1.0
		 * @singleton
		 */

		var _FORMAT_REG = [
			/\\/g,
			/\/\.\//g,
			/^(\/)|(\w+:\/)/,
			/(\w+:)?\/[^\/]+\/\.{2,}/,
			/\.+\//g
		];

		function format(path) {

			path = path.replace(_FORMAT_REG[0], '/').replace(_FORMAT_REG[1], '/');
			var m = path.match(_FORMAT_REG[2]);
			path = m ? m[1] ? ROOT_DIR + path.substr(1) : path : APP_DIR + path;

			var reg = _FORMAT_REG[3];
			while (m = path.match(reg)) {

				if (m[1])
					break;
				var index = m.index;
				path = path.substring(0, index) + path.substr(index + m[0].length);
			}

			return path.replace(_FORMAT_REG[4], '');
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
    
    //替换标签文本
    var rtags = {};
    
    // 定义替换标签
    function set_tags(tags) {
      if(Object.prototype.toString.call(tags) == '[object Array]') {
        for(var i = 0; i < tags.length; i += 2){
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
    function tag(tag){
      return rtags[tag] || tag;
    }
    
		process.on('uncaughtException', function(evt){

			if(te.onerror.emit(evt).returnValue){
				throw evt;
			}
			return false;
		});

		process.on('exit', function(evt){
			te.onclose.emit(evt);
		});

		/**
     * 应用程序开发调试(未发布状态)
     * @property DEBUG
     * @type {Boolean}
     * @static
     */
		te.DEBUG = DEBUG;
		
    /**
     * 终端使用的语言
     * @type {String}
     * @static
     */
    te.language = (function() {
      // en_US.UTF-8
      var LANG = (process.env.LC_ALL || process.env.LANG || 'en-us').split('.')[0];
      var mat = LANG.match(/([a-z]+)((\-|\_)([a-z]+))?/i);
      return (mat[1] + (mat[4] ? '-' + mat[4] : '')).toLowerCase();
    }());
    
		/**
		 * 当前时区
		 * @type {Number}
		 * @static
		 */
		te.timezone = new Date().getTimezoneOffset() / -60;
    
		/**
		 * 把相对路径转换为完整路径
		 * @param  {String} path 路径
		 * @return {String} 返回完整路径
		 * @static
		 */
		te.format = format;

    /**
     * 定义替换标签
     * @method rtag
     * @param {Object} 定义值
     * @static
     */
    te.set_tags = set_tags;

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
    te.rep = rep;
    
    /**
     * 或取标签
     */
    te.tag = tag;
        
		/**
		 * 从extd扩展属性至obj
		 * @param  {Object} obj                 需要被扩展的对像
		 * @param  {Object} extd                原始对像
		 * @return {Object}                     返回扩展后的对像
		 * @static
		 */
		te.extend = extend;

		/**
		 * get hash value
		 * @param  {Object} input
		 * @return {String}
		 */
		te.hash = _hash;

		/**
		 * env info
		 * @type {Object}
		 */
		te.env = env;

		/**
		* noop
		* @method noop
		* @static
		*/
		te.noop = _noop;

		/**
		 * @type {String}
		 * @static
		 */
		te.execPath = process.execPath;

		/**
		 * @type {Number}
		 * @static
		 */
		te.pid = process.pid;

		/**
		 * @设置系统异常事件
		 * @event onerror
		 * @static
		 */
		te.onerror = new BaseEvent();

		/**
		 * close
		 * @type {BaseEvent}
		 * @static
		 */
		te.onclose = new BaseEvent();

		return {
			global: {
				te: te,
				tesla: te,
				nextTick: _nextTick,
				throwError: _throwError,
				virtual: _virtual,
				$f: format,
				$r: rep,
				$t: tag,
				noop: _noop,
				global: global,
				require: _require,
				EVAL: EVAL,
				_class: _class,
        close: close
			},
			BaseEvent: BaseEvent
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
  
  var defs_mark 	= new Mark(); //类型枚举名称
  var incs_mark 	= new Mark(); //包含文件名称
  
  /*nodejs api*/
  var nodelike = !!process.env.NODE_LIKE;
  var contextify = null;
  try{
    contextify = process.binding('contextify')
  }catch(err){ }
 
  var fs = require('fs');
  var runInThisContext = contextify ? (function(){
    var ContextifyScript = contextify.ContextifyScript;
    return function(code, name) {
      var script = new ContextifyScript(code, { filename: name });
      return script.runInThisContext();
    };
  }()) : process.binding('evals').NodeScript.runInThisContext;
  
  var MAIN = process.argv[2];
  var argv = process.argv.slice(3);
  var DEBUG = argv[0] == '--debug' && !!argv.shift();
  
	if (!MAIN){
    throw new Error('main file can not be found');
	}

	var APP_DIR = (function() {

		var mainModule = process.mainModule;
		var dir;
                 
		if (mainModule) {
			var path = String(mainModule.filename).replace(/\\/g, '/');
			var reg = path.match(/tesla\/[^\.\/]+\.js((\?|#).*)?$/i);
			if (reg)
				dir = path.replace(reg[0], '');
		}

		if (dir){
			return dir;
		}
		else{
			throw new Error('startup parameter error  node:   \
node [--debug] /../../tesla.js [--debug] tesla/xxx/xxx');
    }
    
		//TODO ?
		/*
		throw 'startup parameter error jsx: jsx [--dir path] [--debug] tesla/xxx/xxx';
		*/
	})();
 
	var ROOT_DIR =
		process.platform.match(/^win(32|64)$/i) ?
		APP_DIR.match('^.+:/')[0] : '/';
	var APP_CONF = { };

	//TODO ?
	var exports   =
		CORE_DEFINE(global, EVAL, function(name){ defs_mark.push(name) }, DEBUG);
	var te 		    = exports.global.te;
	var oninsmod 	= new exports.BaseEvent();   //insmod event
	var onunmod 	= new exports.BaseEvent();   //unmod event
  
	te.extend(global, exports.global);
	
	try {
		te.extend(APP_CONF,
			EVAL('(' + fs.readFileSync(APP_DIR + 'app.conf')  + ')'));
	}
	catch(err){
		console.error(err.message);
	}
  
  //获取配置
  function getConf(name) {
    
    var names = name.split('.');
    var rest = APP_CONF;
    
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
    
    name = name.replace(/\s+/g, '').replace(INCLUDE_REGEXP, 
    function(all, name, sign, value, or) {
      var conf_val = getConf(name);
      if(sign == '=' ? conf_val == value:
         sign == '!' ? conf_val != value: conf_val){
        return conf_val;
      }
      else if(or) {
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

	var INCLUDE = { }; //包含日志

  //下载代码
  function _load(name, cb) {
    
    //is included
    if (name in INCLUDE) {
        return cb && cb();
    }
    
    var filename = te.format(name);
    var compile = function(code) {
      
      code += '';
      
      if (name in INCLUDE)
        return;
          
      code = '(function(){' + code + '\n})();';
      var inc = { name: name, includes: [], names: [], code: code };
      
      INCLUDE[name] = inc;
      
      //TODO 标识
      incs_mark.push();
      defs_mark.push();
      runInThisContext(code, filename, true);
      defs_mark.pop(inc.names);
      incs_mark.pop(inc.includes);
    };
 
  	//TODO ?
  	return cb ? fs.readFile(filename, function(err, data) {
      if (!err){
        compile(data);
      }
      cb(err);
    }):
    compile(fs.readFileSync(filename));
  }
  
  //获取依赖
  function readRely(name, out, mark) {
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
  
	// 安装模块
  // @method insmod
  // @param {String} name 多个名字使用","分割
  // @param {Function} cb (Optional)
	function insmod(name, cb) {
    
    var names = name.replace(/\s+/g, '').split(',');
    
		//LOAD_FILES
    for (var i = names.length - 1; i > -1; i--) {
      var item = names[i];
			if (item in INCLUDE) {
				names.splice(i, 1);
			}
    }
    if (!names.length) {
      return cb ? cb(null, []): [];
    }
    var files = names.concat();
    
    //
    function callee(err) {
      
      if(err)
        return cb(err);
      //include complete
      
      if (!files.length) {
        var out = [];
        var mark = {};
        while (name = names.shift()) {
          readRely(name, out, mark);
        }
        oninsmod.emit(out);
        return cb ? cb(err, out): out;
      }
      
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
	function unmod(pkg_name) {

    //TODO ?
    if (!INCLUDE[pkg_name]) {
        return;
    }
    
		var all_mark = {};
		var current_mark = {};
		var current_out = [];
    
    readRely(pkg_name, [], current_mark);
    
		for (var name in INCLUDE) {
			if (!(name in current_mark)) {
				readRely(name, [], all_mark);
			}
		}
    
		for (var name in current_mark) {
			if (!(name in all_mark)) {
				//delete
				var item = INCLUDE[name];
				var names = item.names;
				var len = names.length;
				current_out.push(item);
        
				delete INCLUDE[name];
        
				for (var i = 0; i < len; i++) {
					EVAL('delete global.' + names[i], global); //删除类型定义
				}
			}
		}
    //emit event
    onunmod.emit(current_out);
    return current_out;
	}
  
	/**
	 * 应用程序运行目录(javascript目录)
	 * @type {String}
	 * @static
	 */
	te.dir = te.APP_DIR = APP_DIR;
  
	/**
	 * 根目录
	 * @type {String}
	 * @static
	 */
	te.root_dir = te.ROOT_DIR = ROOT_DIR;
  
	/**
   * 应用配置
   * @type {Object}
   * @static
   */
  te.config = te.APP_CONF = APP_CONF;
  
	/**
	 * file main
	 * @type {String}
	 * @static
	 */
	te.main = te.MAIN = MAIN;
  
	/**
	 * App run argv
	 * @type {Object[]}
	 * @static
	 */
	te.argv = argv;

	/**
	 * @event oninsmod
	 * @static
	 */
	te.oninsmod = oninsmod;

  /**
   * @event onunmod
   * @static
   */
  te.onunmod = onunmod;
 
  global.include = _i_nclude;
  global.Class = global._class;
	global.insmod = insmod;
	global.unmod = unmod;

  _load('tesla/Extend.js');

	//debug status
	if (DEBUG){
		_load('tesla/_Debug.js');
	}
 
	//使用主模块模块
	insmod(MAIN, function(err){
		if(err)
			throw err;
	});

} (global, function(__code, global, te, __opt){
  
  var tesla = te;
  
  if(__opt){
    var __def = __opt.__def;
    var __name = __opt.__name;
    var include = __opt.include;
    var Class = __opt.Class;
    var rest = eval(__code);
    __code = __def = include = Class = undefined;
    return rest;
  }
  return eval(__code);
}));
