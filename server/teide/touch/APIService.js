/**
 * @createTime 2014-12-18
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/web/service/HttpService.js');
include('tesla/web/service/Conversation.js');
include('teide/Settings.js');
include('teide/touch/Console.js');
include('teide/touch/ScriptService.js');

var Settings = teide.Settings;
var fs = tesla.node.fsx;

function get_icon(name){
  var mat = name.match(/\.([^\.]+)$/);
  if(mat){
    return mat[1].replace(/\+/g, 'p').toLowerCase();
  }
  return '';
}

/**
 * 是否要排除文件
 */
function is_exclude_file(name){
  
  name = name.toLowerCase();
  
  // 使用微信SDK后会有这个文件
  if (name.indexOf('tencent_wxo_analysis') != -1) {
    return true;
  }
  
  var exclude_files = {

    /* 使用ShareSDK后会有这个文件 */
    'tcsdkconfig.plus': true, 
    /* 
     * apple ios 外部打开的文件会自动创建这个文件夹,
     * 且这个文件夹还没有权限删除,所以不需要显示它
    */
    'inbox': true,
  };

  // console.log('is_exclude_file', name);
  
  exclude_files[Settings.SETTINGS_FILE_NAME.toLowerCase()] = true;
  
  if(name in exclude_files){
    return true;
  }
   
  // if(/\.map\/entity$/.test(name) || /\.map\/conf.keys/.test(name)){
  if(/\.map(\/|$)/.test(name)){
    return true;
  }
  return false;
}

// 支持的所有后缀
var support_find_suffix = 
'abap|asciidoc|c9search_results|search|Cakefile|coffee|cf|cfm|cs|css|dart|diff|patch|dot|\
glsl|frag|vert|vp|fp|go|groovy|hx|haml|htm|html|xhtml|c|cc|cpp|cxx|h|hh|hpp|clj|jade|java|\
jsp|js|json|conf|jsx|te|teh|latex|tex|ltx|bib|less|lisp|scm|rkt|liquid|lua|lp|lucene|\
GNUmakefile|makefile|Makefile|OCamlMakefile|make|mk|keys|script|log|module|map|\
md|markdown|m|mm|ml|mli|pl|pm|pgsql|php|phtml|ps1|py|gyp|gypi|r|Rd|Rhtml|ru|gemspec|rake|rb|\
scad|scala|scss|sass|sh|bash|bat|sql|styl|stylus|svg|tcl|tex|txt|textile|typescript|ts|str|\
xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl|vx|xq|yaml'.toLowerCase().split('|');

/**
 * 是否可以搜索的文件
 */
function is_find(path){
  var suffix = path.match(/[^\.\/]+$/)[0].toLowerCase();
  return support_find_suffix.indexOf(suffix) != -1;
}

var console_log_file = 'console.log';

function getReadOnly(filename){
  if(filename == console_log_file){
    return true;
  }
  return false;
}

// 是否可运行
function is_run(filename){
  var service = teide.touch.ScriptService.share();
  return service.is_can_run(filename);
}

/*
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 * because the buffer-to-string conversion in `fs.readFileSync()`
 * translates it to FEFF, the UTF-16 BOM.
 */
function stripBOM(buff) {
  //0xFEFF
  //0xFFFE
  var c = buff[0];//.charCodeAt(0);
	if (c === 0xFEFF || c == 0xFFFE) {
		return buff.slice(1);
	}
	return buff;
}

// 查找文本中换行的数量与最后上个换行符号的位置
function find_wrap(text){
  
  var count = 0;
  var index = -1;
  
  while(true){
    var i = text.indexOf('\n', index + 1);
    if(i == -1){
      break;
    }
    count++;
    index = i;
  }
  return { count: count, lastIndex: index };
}

/**
 * 搜索文件
 * @private
 */
function find_file(self, path, name, data, cb, end_cb){

  // 是否要跳过文件,从指定位置开始
  if(data.result.index < data.index){ 
    data.result.index++;
    return cb(); // 跳过
  }
  
  data.result.index++; // 增加一个索引
  
  if(!is_find(name)){ // 不支持的文件格式
    return cb();
  }

  fs.readFile(self.documentsPath + path + name, function(err, buff){
    
    if(err){
      return cb(err);
    }
    
    // TODO find string
    var results = [];
    var code = stripBOM(buff).toString('utf-8');
    //
    var cur_row = 0;    // 当前行数
    var prev_index = 0; // 上一个匹配的位置
    
    var match = data.regexp.exec(code);
    
    function match_code(){
      
      if(current_find_id != data.current_find_id){ // 是否还在查询中
        return end_cb();
      }
      
      var index = -1;
      var match_count = 0;
      
      while(match){
        
        if(index == match.index){ // 如果一直相等就会死循环了
          // return end_cb('The query expression error');
          return end_cb($t('查询表达式格式错误'));
        }
        index = match.index; 
        
        match_count++;
        if(match_count > 100){ // 歇会,这里主要是不想出现死循环,把线程阻塞
          return match_code.delay2(10);
        }
        
        var wrap = find_wrap(code.substring(prev_index, index)); 
        var last_wrap_index = prev_index + wrap.lastIndex; // 最后一个换行符位置
        cur_row += wrap.count;  // 加上经过的换行
        
        var length = match[0].length;
        var start = index - last_wrap_index - 1; //列开始位置
        var html_0_len = Math.min(start, 30); // 最多显示30个字符
        var html_2_len = code.substr(index + length, 30).indexOf('\n');
        
        results.push({ 
          row: cur_row, 
          start: start,
          length: length,
          html: [ 
            code.substr(index - html_0_len, html_0_len).trimLeft(),
            code.substr(index, length), // 匹配的文本
            code.substr(index + length, html_2_len == -1 ? 30 : html_2_len).trimRight()
          ]
        });
        
        prev_index = index; 
        
        match = data.regexp.exec(code); // 继续匹配
      }
      
      if(results.length){  // 如果有结果返回这个文件
        data.result.data.push({
          icon: get_icon(name),
          text: name,
          path: path.substr(0, path.length - 1),
          results: results,
          count: results.length,
          expand: data.expand_class
        });
        data.result.count++;
      }
      cb();
    }
    
    match_code();
    
  });
}

/**
 * 当前是否正在查询
 * 为性能考虑一次只能进行一次查询
 * @private
 */
var current_find_id = 0;

/**
 * 搜索目录
 * @private
 */
function find_dir(self, path, data, cb, end_cb){
  
  if(current_find_id != data.current_find_id){ // 是否还在查询中
    return end_cb();
  }
  
  var ls = null;
  var documentsPath = self.documentsPath;
  
  function callback(err){
    
    if(err){
      return end_cb(err);
    }
    
    if(data.result.count > 49){   // 匹配的文件达到50个停止搜索
      data.result.is_end = false; // 标记为没有结束
      return end_cb();
    }
    
    if(!ls.length){
      return cb();
    }

    var name = ls.shift();
    
    // 忽略影藏文件,与app设置文件
		if(is_exclude_file(name) || name.slice(0, 1) == '.'){
		  return callback();
		}
    
    fs.stat(documentsPath + path + name, function(err, stat){
      
      if(err){
        return end_cb(err);
      }
      
      if(stat.isFile()){
        find_file(self, path, name, data, callback, end_cb);
      }
      else{
        find_dir(self, path + name + '/', data, callback, end_cb);
      }
    });
  }
  
  // 读取目录
  fs.readdir(documentsPath + path, function(err, list){
    if(err){
      return end_cb(err);
    }
    ls = list;
    callback();
  });
}

//set util
function setHeader(self) {
  var res = self.response;
  res.setHeader('Server', 'Tesla framework, Touch Code');
  res.setHeader('Date', new Date().toUTCString());
  var expires = self.server.expires;
  if(expires){
    res.setHeader('Expires', new Date().add(6e4 * expires).toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=' + (expires * 60));
  }
}

/**
 * @param {String}
 */
function uploadFile(self, path, cb) {

  if (self.request.method != 'POST') {
    return cb();
  }
  
  var files = self.data.file; // 上传的文件列表
  if(!files.length){ // 没有上传文件
    return cb();
  }

  var index = path.indexOf('?');
  if(index != -1){
    path = path.substring(0, index);
  }

  var documentsPath = self.documentsPath;
  var relative_dir = path ? path.replace(/\/?$/, '/') : '';
  var dir = documentsPath + relative_dir;
  var output = [];
  
  function h() {

    if(!files.length){
      // 通知连接的所有客户端
      // 获取所socket连接
      var convs = tesla.web.service.Conversation.all();
      for(var token in convs){
        var services = convs[token].services; // 获取绑定的服务
        for(var name in services){
          if(name == 'teide.touch.FileActionService'){
            // 通知服务上传了文件
            services[name].onupload_file_notice(relative_dir, output);
          }
        }
      }
      return cb();
    }
    
    var file = files.shift();
    var filename = file.filename;
    if(!filename){
      return h();
    }
    
    fs.exists(file.path, function(exists){
      if(!exists){
        return h();
      }
      teide.touch.Console.share().log('Upload', './' + filename);
      output.push(filename);
      fs.rename(file.path, dir + filename, h.cb(cb));
    });
  }
  h();
}

function readDocumentDirectory(self, path){

  var res = self.response;
  var req = self.request;

  //读取目录
  if (path && !path.match(/\/$/)){  //目录不正确,重定向
    return self.redirect(self.cleanurl.replace(/\/?$/, '/'));
  }

  fs.ls(self.documentsPath + path, function(err, files) {

    if (err){
      return self.returnStatus(404);
    }
    
    teide.touch.Console.share().log('Readdir', './' + path);
    
    var html =
      '<!DOCTYPE html><html><head><title>Index of {0}</title>'.format(path) +
      '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' +
      '<style type="text/css">*{font-family:Courier New}div,span{line-height:20px;' +
      'height:20px;}span{display:block;float:right;width:220px}</style>' +
      '</head><body bgcolor="white">' +
      '<h1>Touch Code documents</h1>'+
      '<h4>Index of {0}</h4><hr/><pre><div><a href="{1}">../</a></div>'
      .format(path, path ? '../' : 'javascript:');

    var ls0 = [];
    var ls1 = [];

    for (var i = 0, stat; (stat = files[i]); i++) {
      var name = stat.name;
      
      if(is_exclude_file(path + name)){
        continue;
      }

      var link = name;
      var size = (stat.size / 1024).toFixed(2) + ' KB';
      var isdir = stat.dir;

      if (isdir) {
        link += '/';
        size = '-';
      }
      else{
        if(/\.script$/i.test(name)){
          continue; // 禁止访问 
        }
      }
      
      var s =
        '<div><a href="{0}">{0}</a><span>{2}</span><span>{1}</span></div>'
            .format(link, stat.ctime.toString('yyyy-MM-dd hh:mm:ss'), size);
      isdir ? ls0.push(s) : ls1.push(s);
    }

    html += ls0.join('') + ls1.join('') + '</pre>';

    var from = [
      '<form enctype="multipart/form-data" method="post">',
        '<input type="file" name="file" multiple="" />',
        '<input type="submit" value="upload" />',
      '</form>',
    ];

    html += from.join('\n');
    html += '<hr/></body></html>';

    setHeader(self);
    var type = self.server.getMIME('html');
    res.writeHead(200, { 'Content-Type': type });
    res.end(html);
  });
}

/**
 * @class teide.touch.APIService
 * @extends tesla.web.service.HttpService
 */
Class('teide.touch.APIService', tesla.web.service.HttpService, {
  
  /**
	 * 文档根路径
	 */
	documentsPath: '',
  
  /**
   * @constructor
   */
  APIService: function(){
    this.documentsPath = teide.touch.TouchServer.share().getDocumentsPath();
  },

  //overlay
  auth: function(cb, action) {

    //console.log('auth', action);
    if(this.form){
      // 默认为不允许上传文件,这里设置为可以
      this.form.isUpload = (action == 'readDocuments');
    }
    cb(true);
  },
  
  /**
   * 获取本机系统网络信息
   */
  networkInterfaces: function(cb){
    var ifaces = te.node.os.networkInterfaces();
    var data = { ifaces: ifaces, port: this.server.port };
    cb(null, data);
  },
  
	/**
	 * read file as text
	 * @param {String}   filename
	 * @param {Function} cb
	 */
	readFileAsText: function(filename, cb) {

		var self = this;
		var root = this.documentsPath;
		var path = root + filename;

		fs.stat(path, function(stat){

			if (stat.size > self.server.maxFileSize) {// File size exceeds the limit
				return cb($t('文件大小超过限制'));
			}

			fs.readFile(path, function(buff) {

				var value = Settings.get(root).getFileProperty(filename);
				cb(null, {
					code: buff + '',
					breakpoints: value.breakpoints,
					folds: value.folds,
					readonly: getReadOnly(filename),
					is_run: is_run(filename),
				});
			}.cb(cb));
		}.cb(cb));
	},
	
	// 读取偏好设置
	get_preferences: function(cb){
	  cb(null, Settings.get(this.documentsPath).get_preferences());
	},
	
	// 保存偏好设置
	set_preferences: function(preferences, cb){
	  Settings.get(this.documentsPath).set_preferences(preferences)
	  cb();
	},
	
	/**
	 * 返回html
	 */
	touch: function(){
	  this.return_site_file('teide/touch/html/touch.htm');
	},
	
	/**
	 * 返回html
	 */
	touch_debug: function(cb){
	  this.return_site_file('teide/touch/html/touch_debug.htm');
	},
  
	/**
	 * read file
	 * @param {String}   filename
	 * @param {Function} cb
	 */
	readFile: function(filename, cb){
	  
	  // var self = this;
	  var name = filename.replace(/\?.*$/, '');
	  
	 // fs.readFile(this.documentsPath + name, function(err, data){
	 //   if(err){
	 //     return self.returnStatus(404, err.message);
	 //   }
	 //   self.returnData(self.server.getMIME(name), data);
	 // });
	 
	  this.setHeaders = function(res, status){
	    res.removeHeader('Expires');        // 删除默认的过期头
	    res.removeHeader('Cache-Control');
	    res.removeHeader('Last-Modified');
	    // console.log(filename, status);
	    return status;
	  };
	  
	  this.returnFile(this.documentsPath + name);
	},

  /**
   * 读取文档
   */
  readDocuments: function(path, cb){

    var name = path;
    var index = name.indexOf('?');
    var self = this;

    if(index != -1){
      name = path.substring(0, index);
    }
    
    if(is_exclude_file(name) || /\.script$/i.test(name)){
      return this.returnStatus(403); // 禁止访问
    }
    
    fs.stat(this.documentsPath + name, function(err, stat){

      if(!err && stat.isDirectory()){
        uploadFile(self, path, function(err){
          if(err){
            return self.returnStatus(500, err.message); // 错误
          }
          readDocumentDirectory(self, path);
        });
      }
      else{
        if(/\.script$/i.test(name)){
          this.returnStatus(403); // 禁止访问 
        }
        else{
          teide.touch.Console.share().log('Readfile', './' + name);
          self.returnFile(self.documentsPath + name);
        }
      }
    });
  },
  
	/**
	 * 停止搜索
	 */
	stopFind: function(){
	  current_find_id = 0; // 停止查询
	},
	
	/**
	 * 查询文件
	 */
	find: function(param, cb){
	  
	  if(current_find_id){
	    return cb($t('请先结束当前查询才能开始新的查询'));
	  }
	  
	  current_find_id = tesla.guid();

    var self = this;
	  var key = param.key;
	  var options = param.options;
    var path = param.path;
    
    var data = {
      result: {
        data: [],
        // 这种文件内部查询非常耗时,没有办法知道有多少个文件匹配成功
        // 只能一次查询部分结果,再次查询时以上次结束的位置开始.
        total: 0,     
        count: 0,     // 一次最多返回50个文件的搜索结果?
        index: 0,     // 当前查询到的文件位置
        is_end: true  // 是否查询结束,告诉客户端不需要发起后续查询
      },
      index: param.index || 0, // 从指定的文件位置开始
      current_find_id: current_find_id, // 当前查询的标识
      enable_hide_file: options.enable_hide_file, // 是否查询隐藏的文件
      expand_class: options.expand_all_results ? 'expand' : '', // 是否要展开结果
      // 查询表达式
      regexp: new RegExp(
        options.enable_regexp ? key : // 使用正则
        key.replace(/([\\\[\]\(\)\{\}\.\$\&\*\+\-\^\?\|\<\>\=])/g, '\\$1'), // 使用普通文本匹配
        options.ignoring_case ? 'img' : 'mg')
    };
    
    // this.conversation.onclose.on(function(){ // 监控连接是否关闭
    //   current_find_id = 0;
    // });
    
    this.response.on('close', function(){ // 监控连接是否关闭
      current_find_id = 0;
    });
    
    function callback(err){
      current_find_id = 0;
      cb(err, data.result);
    }
    
    fs.stat(this.documentsPath + path, function(stat){
      if(stat.isFile()){
        var ls = path.split('/');
        var name = ls.pop();
        find_file(self, ls.length ? ls.join('/') + '/' : '', name, data, callback, callback);
      }
      else{
        find_dir(self, path ? path.replace(/\/?$/, '/') : '', data, callback, callback);
      }
    }.cb(callback));
	}
	
}, {
  /**
   * 支持的后缀
   */
  support_find_suffix: support_find_suffix,
  
  /**
   * 是否要排除文件
   */
  is_exclude_file: is_exclude_file,
});
