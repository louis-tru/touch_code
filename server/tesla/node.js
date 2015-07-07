
tesla.node = {
  get assert(){ return require('assert') },
  get buffer(){ return require('buffer') },
  get child_process(){ return require('child_process') },
  get cluster(){ return require('cluster') },
  get console(){ return require('console') },
  get constants(){ return require('constants') },
  get crypto(){ return require('crypto') },
  get dgram(){ return require('dgram') },
  get dns(){ return require('dns') },
  get events(){ return require('events') },
  get freelist(){ return require('freelist') },
  get fs(){ return require('fs') },
  get http(){ return require('http') },
  get https(){ return require('https') },
  get module(){ return require('module') },
  get net(){ return require('net') },
  get os(){ return require('os') },
  get path(){ return require('path') },
  get punycode(){ return require('punycode') },
  get querystring(){ return require('querystring') },
  get readline(){ return require('readline') },
  get repl(){ return require('repl') },
  get stream(){ return require('stream') },
  get string_decoder(){ return require('string_decoder') },
  get sys(){ return require('sys') },
  get timers(){ return require('timers') },
  get tls(){ return require('tls') },
  get tty(){ return require('tty') },
  get url(){ return require('url') },
  get util(){ return require('util') },
  get vm(){ return require('vm') },
  get zlib(){ return require('zlib') }
};

/**
 * @class tesla.node.fsx
 * @extends Object
 * @createTime 2012-02-08
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

var _path = require('path');//node.path;
var mkdir = require('fs').mkdir;
var mkdirSync = require('fs').mkdirSync;
var chmod = require('fs').chmod;
var chown = require('fs').chown;

/**
 * copy all file sync
 * @param {String}   path
 * @param {String}   target  target file
 * @param {Function} cb   (Optional)
 * @private
 */
function innerCopyItem(path, target, cb) {

  var cancel = false;
  var end = false;
	var read = fsx.createReadStream(path);
	var write = fsx.createWriteStream(target);

	function error(e) {
	  end = true;
		read.destroy();
		write.destroy();
		console.error(e);
		throwError(e, cb);
	}

	read.on('data', function(buff) {
		write.write(buff);
	});
	read.on('end', function() {
	  if(!cancel){
	    end = true;
  		write.end();
  		cb && cb();
	  }
	});
	read.on('error', error);
	write.on('error', error);
	
	return function (){ 
    cancel = true;
    if(!end){
      read.destroy();
      write.destroy();
    }
  };
}

function innerCopy(handle, path, target, cb){

	fsx.stat(path, function(err, stat) {
	  
	  if(err){
	    return throwError(err, cb);
	  }
    
		var file = false;
		var dir = target = $f(_path.resolve(target));

		if (file = stat.isFile()){
			dir = dir.match(/^(.+\/)([^\/]*)$/)[1];
		}
		else if (!stat.isDirectory()){
			return cb && cb();
		}

		fsx.mkdir(dir, function(err) {
		  
		  if(err){
		    return throwError(err, cb);
		  }
		  
			if (file){
			  if(!handle.is_cancel){
			    handle.inner_cancel_fn = innerCopyItem(path, target, cb);
			  }
				return;
			}

			target = target.replace(/\/?$/, '/');
			path = path.replace(/\/?$/, '/');
			
			var ls = null;
			
			function shift(err){
			  
			  if(err){
			    return throwError(err, cb);
			  }
			  
				if (!ls.length){
					return cb && cb();
				}
				var name = ls.shift();
				
				innerCopy(handle, path + name, target + name, shift);
			}
			
			fsx.readdir(path, function(err, data) {
			  ls = data;
			  shift(err);
			});
		});
	});
}

function rmSync(path){
  
	var stat = fsx.statSync(path);
	if (stat.isFile()){
		return fsx.unlinkSync(path);
	}
	else if (!stat.isDirectory()){
		return;
	}
	
	var ls = fsx.readdirSync(path);
	
	for(var i = 0; i < ls.length; i++){
	  rmSync(path + '/' + ls[i]);
	}
	fsx.rmdirSync(path);
}

function innerRm(handle, path, cb){

	fsx.stat(path, function(err, stat) {

	  if(err){
	    return throwError(err, cb);
	  }

		if (stat.isFile()){
		  if(!handle.is_cancel){ // 没有取消
		    fsx.unlink(path, cb);
		  }
			return;
		}
		else if (!stat.isDirectory()){
			return cb && cb();
		}
		
		var ls = null;
		
		function shift(err){
		  
		  if(err){
		    return throwError(err, cb);
		  }
			if (!ls.length){
				return fsx.rmdir(path, cb);
			}
			innerRm(handle, path + '/' + ls.shift(), shift);
		}
    
		//dir
		fsx.readdir(path, function(err, data) {
		  ls = data;
		  shift(err);
		});
	});
	
}

//
var fsx =

Class('tesla.node.fsx', null, tesla.extend(tesla.extend({}, require('fs')), {

	/**
	 * set user and file
	 * @param {String}   path
	 * @param {Number}   uid
	 * @param {Number}   gid
	 * @param {Function} cb    (Optional)
	 * @param {Boolean}  depth (Optional) default true
	 */
	chown: function(path, uid, gid, cb, depth) {

		if(depth === false){
			return chown(path, uid, gid, cb);
		}
		path = _path.resolve(path);

		chown(path, uid, gid, function(path, _cb){
			var callee = arguments.callee;

			fsx.stat(path, function(stat) {

				if (!stat.isDirectory()){
					return _cb();
				}

				var dir = $f(path.replace(/\/?$/, '/'));

				fsx.readdir(dir, function(ls){

					if(!ls.length){
						return _cb();
					}
					path = dir + ls.shift();
					chown(path, uid, gid, callee.cb(cb, path, arguments.callee.cb(cb, ls)));

				}.cb(cb));
			}.cb(cb));
		}.cb(cb, path, cb || tesla.noop));
	},

	/**
	 * set user file weight
	 * @param {String}   path
	 * @param {String}   mode
	 * @param {Function} cb    (Optional)
	 * @param {Boolean}  depth (Optional) default true
	 */
	chmod: function(path, mode, cb, depth) {

		if(depth === false){
			return chmod(path, mode, cb);
		}
		path = _path.resolve(path);

		chmod(path, mode, function(path, _cb){
			var callee = arguments.callee;

			fsx.stat(path, function(stat) {

				if (!stat.isDirectory()){
					return _cb();
				}

				var dir = $f(path.replace(/\/?$/, '/'));

				fsx.readdir(dir, function(ls){
					if(!ls.length){
						return _cb();
					}
					path = dir + ls.shift();
					chmod(path, mode, callee.cb(cb, path, arguments.callee.cb(cb, ls)));
				}.cb(cb));
			}.cb(cb));
		}.cb(cb, path, cb || tesla.noop));
	},
  
	/**
	 * remove all file async
	 * @param {String}   path
	 * @param {Function} cb   (Optional)
	 */
	rm: function(path, cb) {
	  var handle = { is_cancel: false };
	  innerRm(handle, path, cb);
		return {
		  cancel: function(){ // 取消delete
		    handle.is_cancel = true; 
		    cb && cb(null, null, true);
		  },
		};
	},
  
  /**
   * 删除文件与文件夹
   */
	rmSync: function(path){
		rmSync(path);
	},
  
	/**
	 * copy all file sync
	 * @param {String}   path
	 * @param {String}   target  target dir
	 * @param {Function} cb   (Optional)
	 */
	cp: function(path, target, cb) {
	  
	  var handle = {
	    is_cancel: false,
	    inner_cancel_fn: tesla.noop
	  };
	  
	  innerCopy(handle, path, target, cb);
	  
		return {
		  cancel: function() { // 取消cp
		    handle.is_cancel = true;
		    handle.inner_cancel_fn();
		    cb && cb(null, null, true);
		  }
		};
	},
  
	/**
		* create all file dir
		* @param {String}   path
		* @param {String}   mode  (Optional)
		* @param {Function} cb    (Optional)
		*/
	mkdir: function(path, mode, cb) {

		if(typeof mode == 'function'){
			cb = mode;
			mode = null;
		}

		path = $f(_path.resolve(path));
		fsx.exists(path, function(exists) {
			if (exists){
				return cb && cb();
			}

			var prefix = path.match(/^(\w+:)?\//)[0];
			var ls = path.substr(prefix.length).split('/');

			(function() {
				var callee = arguments.callee;
				if (!ls.length){
					return cb && cb();
				}

				prefix += ls.shift() + '/';
				fsx.exists(prefix, function(exists) {
					if (exists){
						return callee();
					}
					mkdir(prefix, mode, callee.cb(cb));
				});
			})();
		});
	},
  
	/**
		* create all file dir sync
		* @param {String}   path
		* @param {String}   mode  (Optional)
		*/
	mkdirSync: function(path, mode){

		path = $f(_path.resolve(path));

		if(fsx.existsSync(path)){
			return;
		}

		var prefix = path.match(/^(\w+:)?\//)[0];
		var ls = path.substr(prefix.length).split('/');

		for(var i = 0; i < ls.length; i++){
			prefix += ls[i] + '/';
			if(!fsx.existsSync(prefix)){
				mkdirSync(prefix, mode);
			}
		}
	},
  
	/**
		* get all dir or file info
		* @param {String}   path
		* @param {Function} cb
		* @param {Boolean}  depth (Optional)
		*/
	ls: function(path, cb, depth) {
  
		path = _path.resolve(path);

		fsx.stat(path, function(path, _depth, _cb, stat) {
			var callee = arguments.callee;
			stat.dir = stat.isDirectory();

			if (!stat.dir || !_depth){
				return _cb(null, stat);
			}

			var cls = stat.children = [];
			var dir = $f(path.replace(/\/?$/, '/'));

			fsx.readdir(dir, function(ls) {

				if(!ls.length){
					return _cb(null, stat);
				}

				var ls_callee = arguments.callee;
				var name = ls.shift();
				var i_path =  dir + name;

				fsx.stat(i_path, callee.cb(cb, i_path, depth, function(err, stat){
					stat.name = name;
					cls.push(stat);
					ls_callee(ls);
				}));
			}.cb(cb));

		}.cb(cb, path, true, function(err, stat){ cb(err, stat.children || null) }));
	},
  
  /**
   * 
   */
	lsSync: function(path, depth){
		//TODO ?
	}

}));
