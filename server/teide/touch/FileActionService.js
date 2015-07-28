/**
 * @createTime 2015-01-04
 * @author louis.chu <louistru@live.com>
 * @copyright © 2011 louis.chu, http://mooogame.com
 * @version 1.0
 */

include('tesla/web/service/WebSocketService.js');
include('teide/touch/RevisionControlService.js');
include('teide/touch/Console.js');
include('teide/Settings.js');
include('tesla/Delegate.js');
include('tesla/node.js');

var zip = null;
var NativeFile = null;
try{
  zip = process.binding('native_zip');
  NativeFile = process.binding('native_fs').NativeFile;
} catch(e){ }

var wget = require('wget');

var Settings = teide.Settings;
var fs = tesla.node.fsx;

//
function compare(a, b){
	a = a.text.toLowerCase();
	b = b.text.toLowerCase();
	var l = Math.max(a.length, b.length);
	for(var i = 0; i < l; i++) {
		var codea = (a.substr(i,1) || 'a').charCodeAt(0);
		var codeb = (b.substr(i,1) || 'a').charCodeAt(0);
		if(codea != codeb){
			return codea - codeb;
		}
	}
	return 0;
}

function get_icon(name){
  var mat = name.match(/\.([^\.]+)$/);
  if(mat){
    return mat[1].replace(/\+/g, 'p').toLowerCase();
  }
  return '';
}

function get_clone_name(name) {
	return name.replace(/(_clone\d+)?(\.[^\.\/]+$|$)/, '_clone' + tesla.guid() + '$2');
}

// 解决路径重复
function solve_name_repeat(self, name){
  if(fs.existsSync(self.documentsPath + name)){ // 文件已存在,改名
    name = name.replace(/(_\d+)?(\.[^\.\/]+$|$)/, '_' + tesla.guid() + '$2');
  }
  return name;
}

/**
 * 创建新的管理器
 */
function new_revision_control_service(){
  var documents = 
    teide.touch.TouchServer.share().getDocumentsPath();
  return new teide.touch.RevisionControlService(documents);
}

// 保存的日志文件
var console_log_file = 'console.log';

// 共享console.log流
var share_write_stream = null;

/**
 * 初始console流写入
 */
var init_console_write_stream = function(){
  
  init_console_write_stream = te.noop;
  
  var console = teide.touch.Console.share();
  
  console.onlog.on(function(evt){
    share_write_stream.write(evt.data + '\n');
  });
  
  console.onerror.on(function(evt){
    share_write_stream.write(evt.data + '\n');
  });
};

/**
 * 重新初始写入流
 */
function reload_write_stream(force){
  
  if(share_write_stream){
    if(force){ // 强制重新初始
      share_write_stream.destroy();
    }
    else{
      return;
    }
  }
  
  var path = teide.touch.TouchServer.share().getDocumentsPath() + console_log_file;
  share_write_stream = fs.createWriteStream(path, { flags: 'a' });
  share_write_stream.on('error', function(){
    reload_write_stream(true); // 错误
  });
  
  init_console_write_stream();
}

/**
 * init
 */
function initFileActionService(self){
  
  var console = teide.touch.Console.share();
  
  self.m_event_handle_id = te.guid();

  console.onlog.on(function(evt){
    self.onconsole_log.notice(evt.data);
  }, self.m_event_handle_id + 'onconsole_log');
  
  console.onerror.on(function(evt){
    self.onconsole_error.notice(evt.data);
  }, self.m_event_handle_id + 'onconsole_error');
  
  reload_write_stream(); //重新初始写入流
}

/**
 * 释放
 */
function releaseFileActionService(self){
  var console = teide.touch.Console.share();
  console.onlog.off(self.m_event_handle_id + 'onconsole_log');
  console.onerror.off(self.m_event_handle_id + 'onconsole_error');
}

/**
 * 停止下载
 */
function stopDownload(self){
	if (self.mDownload) {
	  if (self.mDownload.request) {
      var mDownload = self.mDownload;
      self.mDownload = null;
      mDownload.request.abort();
    }
	}
}

function stopCompress(self){
	if(self.mZipCompress){
		self.mZipCompress.close();
		var exists = fs.existsSync(self.mZipCompress.path);
		if(exists){
			fs.unlinkSync(self.mZipCompress.path);
		}
		self.mZipCompress = null;
	}
}

function stopDecompress(self){
	if(self.mZipDecompress){
		self.mZipDecompress.close();
  	self.mZipDecompress = null;
	}
}

/**
 * 获取解压文件数据
 */
function getDecompressFileListData(self, mZipDecompress){
  
	var output = mZipDecompress.output;
	var dirPath = mZipDecompress.dirPath;
	var map = new_revision_control_service();
	var ls = [];

	for(var name in output){

		// map.add(dirPath + name);

		var data = {
		  text: name,
		  leaf: false,
		  info: map.stat_code(dirPath + name)
		};
		
		if(output[name] == 'file'){
			data.leaf = true;
			data.icon = get_icon(name);
		}
		else{
		  data.icon = 'dir';
		}
		ls.push(data);
	}
	
	map.release();
  return ls;
}

/**
 * 停止克隆
 */  
function stopClone(self){
  if(self.mCloneHandle){
    self.mCloneHandle.cancel();
    self.mCloneHandle = null;
  }
}

/**
 * 停止删除
 */
function stopDelete(self){
  if(self.mDeleteHandle){
    self.mDeleteHandle.cancel();
    self.mDeleteHandle = null;
  }
}

/**
 * 停止更新与提交
 */
function stopUpdateOrSubmit(self){
  if(self.mUpdateOrSubmitHandle){
    self.mUpdateOrSubmitHandle.cancel();
    self.mUpdateOrSubmitHandle = null;
  }
}

/**
 * @class teide.touch.FileActionService
 * @extends tesla.web.service.WebSocketService
 */
Class('teide.touch.FileActionService', tesla.web.service.WebSocketService, {
  
  /**
	 * 文档根路径
	 */
	documentsPath: '',
	
	/**
	 * 控制台日志
	 */
	onconsole_log: null,
	
	/**
	 * 控制台错误日志
	 */
	onconsole_error: null,
	
	/**
	 * 下载进度变化事件
	 */
	ondownloadprocess: null,

	/**
	 * 上传文件事件
	 */
	onuploadfile: null,
	
	/**
	 * 当前下载对像
	 */
	mDownload: null,

	/**
	 * 当前解压对像
	 */
	mZipDecompress: null,

	/**
	 * 当前压缩对像
	 */
	mZipCompress: null,
	
	/**
	 * 克隆句柄
	 */
	mCloneHandle: null,
	
	/**
	 * 删除句柄
	 */
	mDeleteHandle: null,
	
	/**
	 * 更新或提交文件句柄
	 */
	mUpdateOrSubmitHandle: null,
  
  /**touch
   * @constructor
   */
  FileActionService: function() {
    tesla.Delegate.def(this, 
      'console_log', 'console_error', 'downloadprocess', 'uploadfile');
    this.documentsPath = 
      teide.touch.TouchServer.share().getDocumentsPath();
    initFileActionService(this);
  },
  
  // overwrite
  init: function(conv){
		var self = this;
		tesla.web.service.WebSocketService.members.init.call(this, conv);
		conv.onclose.on(function(){ // 监控连接是否关闭
			stopDownload(self);
			stopCompress(self);
			stopDecompress(self);
			stopClone(self);
			stopDelete(self);
			stopUpdateOrSubmit(self);
			releaseFileActionService(self); //释放
		});
  },
  
  /**
   * 通知上传了新文件
   */
  onupload_file_notice: function(dir, data){
    
    var map = new_revision_control_service();
    var results = [];
    
    for(var i = 0; i < data.length; i++){
      var name = data[i];
  		var item = {
  		  text: name, 
  		  leaf: true,
  		  info: map.stat_code(dir + name),
  		  icon: get_icon(name),
  		};
  		results.push(item);
    }
    map.release();
    this.onuploadfile.notice({ dir: dir, data: results});
  },

  /**
   * 停止当前下载,信号
   */
  stopDownload: function(){
    stopDownload(this);
  },
  
  /**
   * 停止压缩,信号
   */
  stopCompress: function(){
		stopCompress(this);
  },
  
  /**
   * 停止解压缩,信号
   */
  stopDecompress: function(){
		stopDecompress(this);
  },
  
	/**
	 * 停止克隆,信号
	 */  
  stopClone: function(){
    stopClone(this);
  },
  
  /**
   * 停止删除,信号
   */
  stopDelete: function() {
    stopDelete(this);
  },
  
	/**
	 * 停止更新与提交,信号
	 */
  stopUpdateOrSubmit: function(){
    stopUpdateOrSubmit(this);
  },
  
  /**
   * 下载文件
   */
  download: function(target, save, cb){

    if(this.mDownload){
    	return cb($t('当前正在下载状态'));
    }

    var self = this;
    var save_path = this.documentsPath + save;
    var download = wget.download(target, save_path);

		this.mDownload = {
			download: download,
			target: target,
			save: save,
		};
		
		var header_name = '';

		download.on('ready', function(data){
		  
		  //content-disposition "attachment; filename=iscroll-master.zip"
		  
		  var disposition = data.res.headers['content-disposition'];
		  if (disposition) {
		    var mat = disposition.match(/filename=([^\;\&]+)/i);
		    if (mat) {
		      header_name = mat[1];
		    }
		  }
		  
			if (self.mDownload) {
				self.mDownload.request = data.req;
				self.mDownload.response = data.res;
			}
			else {
				data.res.close(); // 关闭
			}
		});
    
		download.on('error', function(err) {
			self.mDownload = null;
		  cb(err);
		});
    
		download.on('end', function(output) {
		  
			var cancel = !self.mDownload; // 是否取消
      self.mDownload = null;
			var rest = { cancel: cancel };
			
      // 是否要改正名字,以响应头中的名字命名 ?
      if (header_name) {
        var ls = save.split('/');
        if(header_name != ls[ls.length - 1].replace(/_[\d]+/, '')){ // 不相似需要改名
          ls[ls.length - 1] = header_name;
          save = solve_name_repeat(self, ls.join('/'));
          fs.renameSync(save_path, self.documentsPath + save);
          rest.rename = save.split('/').pop();
        }
      }
      
      var map = new_revision_control_service();
      rest.info = map.stat_code(save);
      cb(null, rest);
      map.release();
		});

    var progress_int = 0;
    
		download.on('progress', function(progress) {
      
      progress = progress || 0;
      
      var i = Math.round(progress * 100);
      if (progress_int == i) {
        return;
      }
      progress_int = i;
      
      // 为节省性能,只发送总数
			self.ondownloadprocess.notice({ target: target, save: save, progress: progress });
		});
    // 初始进度 0%
    self.ondownloadprocess.notice({ target: target, save: save, progress: 0 });
  },
  
  /**
   * 添加zip压缩文件
   * {String} target 压缩的目录文件
   * {String} save 	 压缩保存的zip文件
   */
  compress: function(target, save, cb){

  	if(!zip){
  		// return cb('not support compress');
  		return cb($t('不支持压缩功能'));
  	}

    if(this.mZipCompress){
    	return cb($t('当前正在压缩状态'));
    }
    
  	var ls = target.split('/');
  	var name = ls.pop();
  	
    if (name == '.map') {
  	  return cb($t('不能压缩.map文件'));
  	}
  	
  	var self = this;
  	var zipPath = this.documentsPath + save;

  	self.mZipCompress = new zip.ZipCompress(zipPath);
  	self.mZipCompress.target = target;
  	self.mZipCompress.path = zipPath;
  	self.mZipCompress.save = save;
  	
    // 开始压缩
  	var dirPath = (ls.length ? ls.join('/') + '/' : '');
  	var rootPath = this.documentsPath + dirPath;
  	
  	function error(err){
  		stopCompress(self);
  		cb(err);
  	}
    
		function done(){
      if(self.mZipCompress){
			  self.mZipCompress.close(); // 关闭
        self.mZipCompress = null;
        var map = new_revision_control_service();
        cb(null, { info: map.stat_code(save), cancel: false });
        map.release();
      } else{ // 已取消,压缩的文件被删除
		    cb(null, { cancel: true });
      }
		}

  	function eachDirectory(target, callback){

  		var source = rootPath + target;

  		fs.readdir(source, function(err, ls){

  			if(err){
  				return error(err);
  			}

  			if(!self.mZipCompress){ // 已经被强制停止
  				return done(); // 结束
  			}

  			function shift(err){

  				if(err){
  					return error(err);
  				}

  				if(!ls.length){
  					return callback();
  				}
  				
  				var name = ls.shift();
  				
  				if (name == '.map') {
            console.log('**************************.MAP**************************');
  				  shift();
  				} else {
  				  compress(target + '/' + name, shift);
  				}
  			}

  			shift();
  		});
  	}

  	function compress(target, callback) {

  		var source = rootPath + target;

  		fs.stat(source, function(err, stat){

  			if(err){
  				return error(err);
  			}

  			if(!self.mZipCompress){ // 已经停止
  				return callback();
  			}
  			
  			if(stat.isDirectory()){
  				eachDirectory(target, callback);
  			}
  			else {
          teide.touch.Console.share().log('Zip c', dirPath + target);
					if (self.mZipCompress.compress(source, target)) {
						callback();
					}
					else{
						error($t('压缩文件失败'));
					}
  			}
  		});
  	}
  	
  	compress(name, done);
  },

	/**
	 * 解压缩zip包
	 */
	decompress: function(target, cb){

		if(!zip){
			// return cb('not support decompress');
			return cb($t('不支持解缩功能'));
		}

    if(this.mZipDecompress){
    	return cb($t('当前正在解压状态'));
    }

  	var self = this;
  	var zipPath = this.documentsPath + target;

  	try{
  		self.mZipDecompress = new zip.ZipDecompress(zipPath);
  	}
  	catch(err){
  		if(self.mZipDecompress){
  			self.mZipDecompress = null;
  		}
  		return cb(err);
  	}

    var mZipDecompress = self.mZipDecompress;

  	self.mZipDecompress.target = target;
  	self.mZipDecompress.path = zipPath;
  	self.mZipDecompress.output = {};

  	// 开始解压
  	var ls = target.split('/'); ls.pop();
  	var dirPath = (ls.length ? ls.join('/') + '/' : '');
  	var rootPath = this.documentsPath + dirPath;
  	self.mZipDecompress.dirPath = dirPath;
  	self.mZipDecompress.rootPath = rootPath;

  	function done(){
      if(self.mZipDecompress){
        self.mZipDecompress.close(); // 关闭
        self.mZipDecompress = null;
      }
			var data = getDecompressFileListData(self, mZipDecompress);
			cb(null, data);
  	}

  	function decompress(){

  		if(!self.mZipDecompress){ // 已经被强制停止
  			return done();
  		}

  		var name = self.mZipDecompress.name();
  		var save = rootPath + name;
  		var is;

  		try{
  		  teide.touch.Console.share().log('Zip x', dirPath + name);
				is = self.mZipDecompress.decompress(save);
			}
			catch(err){
				stopDecompress(self);
  			return cb(err);
			}

  		if(is){

				var name1 = name.match(/^[^\/]+/)[0]; // 只添加目录与当前目录的文件
				if(!self.mZipDecompress.output[name1]){
					self.mZipDecompress.output[name1] = (name == name1 ? 'file' : 'dir');
				}
  			if(!self.mZipDecompress.next()){ // 下一个文件
  				done(); // 定位失败表示解压完成
  			}
  			else{
  				decompress.delay2(1); // 解压5个文件歇会,这里主要是不想出现死循环,把线程阻塞
          // nextTick(decompress);
  			}
  		}
  		else{
				stopDecompress(self);
  			cb('解压文件失败');
  		}
  	}

  	decompress();
	},
  
	/**
	 * get project resources list by path
	 * @param {String}   path
	 * @param {Function} cb
	 */
	readFilesList: function(path, cb) {
    
    var map = new_revision_control_service();
    
    path = path ? path.replace(/\/?$/, '/') : '';
    
    fs.ls(this.documentsPath + path, function(err, ls) {
      
			if (err){
				return cb(err);
			}
			
			var dir = [];
			var leaf = [];
      
			for (var i = 0, l = ls.length; i < l; i++) {
			  
				var info 			= ls[i];
				var name 			= info.name;
				var new_path 	= path + name;
        
        // 排除一些文件,这些文件不需要提供给用户
        if (!/\.map(\/conf\.keys)?$/.test(new_path)) {
          if (teide.touch.APIService.is_exclude_file(new_path)) { 
  					continue;
  				}
        }
        
				var data = { 
				  text: name, 
				  leaf: false, 
				  info: map.stat_code(new_path)
				};
				
				if(!info.dir){
					data.leaf = true;
					data.icon = get_icon(name);
					leaf.push(data);
				}
				else {
				  data.icon = 'dir';
				  dir.push(data);
				}
			}
			
			map.release();
			
			cb(null, dir.sort(compare).concat(leaf.sort(compare)));
		});
	},
	
	/**
	 * 获取文件info标识
	 */
	readFileInfo: function(path, cb){
	  var map = new_revision_control_service();
	  cb(null, map.stat_code(path));
	  map.release();
	},
  
	/**
	 * save text file
	 * @param {String}    filename
	 * @param {String}    code
	 * @param {Number[]}  breakpoints
	 * @param {Object}    folds
	 * @param {Function}  cb
	 */
	saveFileAsText: function(name, code, attachment, cb) {
	 
		var root = this.documentsPath;
		var path = root + name;

		fs.exists(path, function(exists) {
			if (!exists){
				return cb($t('文件不存在'));
			}
			fs.writeFile(path, code, function() {
				Settings.get(root).setFileProperty(name, attachment);
				var map = new_revision_control_service();
				cb(null, map.stat_code(name));
				map.release();
			}.cb(cb));
		});
	},
  
	/**
	 * 保存文本文件折叠信息
	 */
	saveTextFolds: function(name, folds, cb) {
		Settings.get(this.documentsPath).setFolds(name, folds);
		cb();
	},
  
  /**
   * 保存文本断点信息
   */
	saveTextBreakpoints: function(name, breakpoints, cb) {
	  Settings.get(this.documentsPath).setBreakpoints(name, breakpoints);
		cb();
	},
	
	/**
	 * 文件是否存在
	 */
	exists: function(name, cb) {
	  fs.exists(this.documentsPath + name, function(exists){
	    cb(null, exists);
	  });
	},
  
	/**
	 * create directory
	 * @param {String}    path
	 * @param {Function}  cb
	 */
	mkdir: function(name, cb) {
	  
	  teide.touch.Console.share().log('Mkdir local', name);
    
		var path = this.documentsPath + name;
		fs.exists(path, function(exists) {
			if (exists){
				return cb($t('目录已存在'));
			}
			fs.mkdir(path, function(){
			  var map = new_revision_control_service()
			 // map.add(name, function(err){
			  cb(null, map.stat_code(name));
			  map.release();
			 // };
			}.cb(cb));
		});
	},
	
	/**
	 * 创建目录映射
	 */
	createMap: function(dir, cb){
	  
	  var map_path = this.documentsPath + (dir ? dir + '/.map': '.map');
	  var keys_path = map_path + '/conf.keys';
	  
		fs.exists(keys_path, function(exists) {
			if (exists){
				return cb($t('无需重复添加,请打开文件.map/conf.keys'));
			}
			fs.mkdir(map_path, function(){
        var demo_path = teide.touch.ScriptService.is_support_high() ? 
          $f('teide/touch/template/demo.mapping') : $f('teide/touch/template/demo2.mapping');
        var code = $r(fs.readFileSync(demo_path).toString('utf-8'));
  			fs.writeFile(keys_path, code, function(){
  			  var map = new_revision_control_service();
  			  cb(null, map.stat_code(dir));
  			  map.release();
  			}.cb(cb));
			}.cb(cb));
		});
	},
	
	/**
	 * 创建远程脚本
	 */
	createScript: function(name, cb) {
		var path = this.documentsPath + name;
		fs.exists(path, function(exists) {
			if (exists){
				return cb('File already exists');
			}
      var demo_path = teide.touch.ScriptService.is_support_high() ? 
        $f('teide/touch/template/demo.script') : $f('teide/touch/template/demo2.script');
      var code = $r(fs.readFileSync(demo_path).toString('utf-8'));
			fs.writeFile(path, code, function(){
			  var map = new_revision_control_service()
			  cb(null, map.stat_code(name));
			  map.release();
			}.cb(cb));
		});
	},
  
	/**
	 * create file
	 * @param {String}    name
	 * @param {Function}  cb
	 */
	create: function(name, cb) {
    
    teide.touch.Console.share().log('A local', name);
    
		var path = this.documentsPath + name;
		fs.exists(path, function(exists) {
			if (exists){
				return cb($t('文件已存在'));
			}
			var code = '';
			var suffix = name.match(/\.?([^\.]+)$/)[1].toLowerCase();
			var demo_path = $f('teide/touch/template/demo.' + suffix);
			if(fs.existsSync(demo_path)){
			  code = $r(fs.readFileSync(demo_path).toString('utf-8'));
			}
			fs.writeFile(path, code, function(){
			  var map = new_revision_control_service();
			  cb(null, map.stat_code(name));
			  map.release();
			}.cb(cb));
		});
	},
  
	/**
	 * 删除文件或目录
	 * all 完全删除,删除本地与版本管理
	 */
	remove: function(name, all, cb) {
	  
	  teide.touch.Console.share().log('D local', name);
	  
    var self = this;
    var root = this.documentsPath;
    
	  function delete_complete(err){
      self.mDeleteHandle = null;
      if (err) return cb(err);
      
      if (fs.existsSync(root + name)) { // 文件还存可能是取消了
        var map = new_revision_control_service();
        cb(null, map.stat_code(name));
        map.release();
        return;
      }
      
      Settings.get(root).removeFileProperty(name);
      if(name == console_log_file){
        reload_write_stream(true);
      }
      cb();
	  }
	  
	  if (all) {
	    var map = new_revision_control_service();
      // 这些句柄必须提供一个cancel方法
      self.mDeleteHandle = map;
	    self.mDeleteHandle.remove(name, function(err){
        map.release();
        delete_complete(err);
      });
	  } else {
      if (NativeFile) {
        this.mDeleteHandle = new NativeFile();
        this.mDeleteHandle.rm(root + name, delete_complete)
      } else {
        self.mDeleteHandle = fs.rm(root + name, delete_complete);
      }
	  }
	},
  
	/**
	 * rename directory or file
	 * @param {String}    old_name
	 * @param {String}    new_name
	 * @param {Function}  cb
	 */
	rename: function(old_name, new_name, cb) {
    
    teide.touch.Console.share().log('R local', old_name, 'to', new_name);
    
		var root = this.documentsPath;
    
    fs.exists(root + new_name, function(exists){
      
      if (exists) {
        return cb($t('文件已存在'));
      }
      
      var map = new_revision_control_service();
      
      map.rename(old_name, new_name, function(err, data, cancel){
        map.release(); // 结束
        if(err) return cb(err);
        if (cancel) {
          cb(null, { cancel: cancel, info: map.stat_code(new_name) });
        } else {
          Settings.get(root).renameFileProperty(old_name, new_name);
          cb(null, { info : map.stat_code(new_name) });
        }
      });
    });
	},
  
	/**
	 * 文件克隆
	 * clone directory or file
	 * @param {String}    name
	 * @param {Function}  cb
	 */
	clone: function(name, cb) {
	  
	  teide.touch.Console.share().log('C local', name);
    
		var root = this.documentsPath;
		var new_name = get_clone_name(name);
		var self = this;

    function callback (err){
      self.mCloneHandle = null;
      if (fs.existsSync(root + name)) { // 文件存在
        var map = new_revision_control_service();
        cb(null, { name: new_name, info: map.stat_code(new_name) });
        map.release();
      } else {
        cb(err);
      }
    }
		
    if (NativeFile) {
      this.mCloneHandle = new NativeFile();
      this.mCloneHandle.cp(root + name, root + new_name, callback)
    } else {
  		this.mCloneHandle = fs.cp(root + name, root + new_name, callback);
    }
	},
	
	/**
	 * 通过名称查询冲突
	 */
	conflict_list: function(name, cb){
	  var map = new_revision_control_service();
	  map.conflict_list(name, function(err, data){
	    cb(err, data);
	    map.release();
	  });
	},
	
	/**
	 * 更新
	 */
	update: function(name, cb){
	  if(this.mUpdateOrSubmitHandle){
	    return cb($t('有一个任务正在进行'));
	  }

	  var self = this;
	  var map = new_revision_control_service();
	  this.mUpdateOrSubmitHandle = map;
	  map.update(name, function(err){
	    self.mUpdateOrSubmitHandle = null;
	    if(err){ 
	    	if(typeof err == 'string'){
	    		err = { message: err };
	    	}
	    	err.info = map.stat_code(name);
	    	cb(err);
	    }
	    else{
	    	cb(null, map.stat_code(name));
	    }
	    map.release();
	  });
	},
	
	/**
	 * 提交更改
	 */
	submit: function(name, cb){
	  if(this.mUpdateOrSubmitHandle){
	    return cb($t('有一个任务正在进行'));
	  }

	  var self = this;
	  var map = new_revision_control_service();
	  this.mUpdateOrSubmitHandle = map;
	  map.submit(name, function(err){
	    self.mUpdateOrSubmitHandle = null;
	    cb(err, err ? null : map.stat_code(name));
	    map.release();
	  });
	},

	/**
	 * 解决冲突
	 */
	resolved: function(name, cb){
	  var map = new_revision_control_service();
	  map.resolved(name, function(err){
	    cb(err, err ? null : map.stat_code(name));
  	  map.release();
	  });
	},
	
	/**
	 * 加入到映射
	 */
	join: function(name, cb){
	  var map = new_revision_control_service();
	  map.add(name, function(err){
	    cb(err, err ? null : map.stat_code(name));
	    map.release();
	  });
	},

	/**
	 * 测试文件是否在有效的映射范围
	 */
	test_mapping: function(name, cb){
	  var map = new_revision_control_service();
	  map.test(name, function(err, data){
	    cb(err, data);
	    map.release();
	  });
	},

	/**
		* 解锁文件
	  */
	unlock: function(name, cb){
	  var map = new_revision_control_service();
	  map.unlock(name, function(err, data){
	    cb(err, err ? null : map.stat_code(name));
	    map.release();
	  });
	},

	/**
		* 清理文件夹
	  */
	cleanup: function(name, cb){
	  var map = new_revision_control_service();
	  map.cleanup(name, function(err, data){
	    cb(err, err ? null : map.stat_code(name));
	    map.release();
	  });
	},

});


