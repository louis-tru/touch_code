/**
 * @class tesla.web.StaticService static file service
 * @extends tesla.web.service.Service
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/web/service/Service.js');
include('tesla/node.js');

var fsx = tesla.node.fsx;
var http = tesla.node.http;
var zlib = tesla.node.zlib;
var crypto = tesla.node.crypto;
var CACHE = {};

//set util
function setHeader(self) {
	var res = self.response;
	res.setHeader('Server', 'MoooGame tesla');
	res.setHeader('Date', new Date().toUTCString());
	var expires = self.server.expires;
	if(expires){
		res.setHeader('Expires', new Date().add(6e4 * expires).toUTCString());
		res.setHeader('Cache-Control', 'public, max-age=' + (expires * 60));
	}
}

function getContentType(self, baseType){
  if(/javascript|text|json|xml/i.test(baseType)){
    return baseType + '; charset=' + self.server.textEncoding;
  }
  return baseType;
}

// 文件是否可支持gzip压缩
function isGzip(self, filename) {

  if(!self.server.gzip){
    return false;
  }

	var ae = self.request.headers['accept-encoding'];
	var type = self.server.getMIME(filename);

	return !!(ae && ae.match(/gzip/i) && type.match(self.server.gzip));
}

//返回目录
function _returnDirectory(self, filename) {
	if(self.server.autoIndex)
		self.returnDirectory(filename);
	else
		self.returnStatus(403);
}

//返回目录
function returnDirectory(self, filename) {

	//读取目录
	if (!filename.match(/\/$/))  //目录不正确,重定向
		return self.redirect(self.cleanurl + '/');

	var def = self.server.defaults;
	if (!def.length)  //默认页
		return _returnDirectory(self, filename);

	fsx.readdir(filename, function(err, files) {
        
		if(err){
      console.log(err);
			return self.returnStatus(404);
		}

		for (var i = 0, name; (name = def[i]); i++) {
			if (files.indexOf(name) != -1)
				return self.return_file(filename.replace(/\/?$/, '/') + name);
		}
		_returnDirectory(self, filename);
	});
}

//返回缓存
function returnCache(self, filename) {

	var cache = CACHE[filename];

	if (cache && cache.data) {
		var req = self.request;
		var res = self.response;
		var type = self.server.getMIME(filename);
		var ims = req.headers['if-modified-since'];
		var mtime = cache.time;

		setHeader(self);

		res.setHeader('Last-Modified', mtime.toUTCString());
		res.setHeader('Content-Type', getContentType(self, type));
		if(cache.gzip){
			res.setHeader('Content-Encoding', 'gzip');
		}
		res.setHeader('Content-Length', cache.size);

		if (ims && new Date(ims) - mtime === 0) { //使用 304 缓存
			res.writeHead(self.setHeaders(res, 304));
			res.end();
		}
		else {
			res.writeHead(self.setHeaders(res, 200));
			res.end(cache.data);
		}
		return true;
	}
	return false;
}

//返回数据
function resultData(self, filename, type, time, gzip, err, data) {
  
	if (err) {
		delete CACHE[filename];
		return self.returnStatus(404);
	}

	var res = self.response;
	var cache = { 
		data: data, 
		time: time, 
		gzip: gzip, 
		size: data.length 
	};
	if (self.server.fileCacheTime) { // 创建内存缓存
		CACHE[filename] = cache;
		setTimeout(function() { delete cache.data; }, self.server.fileCacheTime * 1e3);
	}
	if(gzip){
		res.setHeader('Content-Encoding', 'gzip');
	}
	res.setHeader('Content-Length', data.length);
	res.setHeader('Content-Type', getContentType(self, type));
	res.writeHead(self.setHeaders(res, 200));
  res.end(data);
}

// 返回大文件数据
function resultMaxFileData(self, filename, type, size){
	
	var res = self.response;
	res.setHeader('Content-Length', size);
	res.setHeader('Content-Type', getContentType(self, type));
	res.writeHead(self.setHeaders(res, 200));

	var end = false;
	var read = fsx.createReadStream(filename);

	read.on('data', function(buff) {
		res.write(buff);
	});
	read.on('end', function() {
		end = true;
		res.end();
	});
	read.on('error', function (e) {
		read.destroy();;
		console.error(e);
		end = true;
		res.end();
	});
	res.on('error', function(){
    if(!end){ // 意外断开
    	end = true;
    	read.destroy();
    }
	});
  res.on('close', function(){ // 监控连接是否关闭
    if(!end){ // 意外断开
    	end = true;
    	read.destroy();
    }
  });
}

//返回异常状态
function resultError(self, statusCode, text) {
	var res = self.response;
	var type = self.server.getMIME('html');

	setHeader(self);
  res.setHeader('Content-Type', getContentType(self, type));
	res.writeHead(self.setHeaders(res, statusCode));
	res.end('<!DOCTYPE html><html><body><h3>' +
		statusCode + ': ' + (http.STATUS_CODES[statusCode] || '') +
		'</h3><br/></h5>' + (text || '') + '</h5></body></html>');
}

Class('tesla.web.service.StaticService', tesla.web.service.Service, {
  
  // private:
  
  m_root: '',

	//public:
	/**
	 * response of server
	 * @type {http.ServerRequest}
	 */
	response: null,

	/**
	 * init service
	 * @param {http.ServerRequest} req
	 * @param {http.ServerResponse} res
	 */
	init: function(req, res) {
		this.initBase(req);
		this.response = res;
	  this.m_root = this.server.root.substr(0, this.server.root.length - 1);
	},
	
	/**
	 * 设置响应头,返回状态码
	 * 任何人可以重写它
	 * @return {Number}
	 */
	setHeaders: function(res, status){
	  return status;
	},
  
	action: function() {
	  
		var method = this.request.method;
		if (method == 'GET' || method == 'HEAD') {

	    var filename = this.cleanurl;
  		if (this.server.virtual) { //是否有虚拟目录
  			var mat = filename.match(new RegExp('^' + this.server.virtual, 'i'));
  
  			if (mat){
  				filename = filename.replace(mat[0], '');
  			}
  			else{
  				return this.returnStatus(404);
  			}
  		}
  
  		if (this.server.disable.test(filename)){  //禁止访问的路径
  			return this.returnStatus(403);
  		}
  
  		this.return_file(this.m_root + filename);
		}
		else
			this.returnStatus(405);
	},

	/**
	 * redirect
	 * @param {String} path
	 */
	redirect: function(path) {
		var res = this.response;
		res.setHeader('Location', path);
		res.writeHead(this.setHeaders(res, 302));
		res.end();
	},

	/**
	 * return the state to the browser
	 * @param {Number} statusCode
	 * @param {String} text (Optional)  not default status ,return text
	 */
	returnStatus: function(statusCode, text) {

		var self = this;
		var filename = this.server.errorStatus[statusCode];

		if (filename) {
			filename = self.m_root + filename;
			fsx.stat(filename, function(err) {

				if (err){
					resultError(self, statusCode, text);
				}
				else{
					self.return_file(filename);
				}
			});
		}
		else
			resultError(self, statusCode, text);
	},
	
	/**
	 * 返回站点文件
	 */
	return_site_file: function(name){
	  this.return_file(this.server.root + name);
	},
  
	/**
	 * return file to browser
	 * @param {String}       filename
	 */	
	return_file: function(filename){

		var self = this;
		var req = this.request;
		var res = this.response;
		var DEBUG = tesla.DEBUG;

		if (!DEBUG && returnCache(this, filename)){  //high speed Cache
			return;
		}

		fsx.stat(filename, function(err, stat) {
                          
			if (err){
				return self.returnStatus(404);
			}

			if (stat.isDirectory()){  //dir
				return returnDirectory(self, filename);
			}
      
			if (!stat.isFile()){
				return self.returnStatus(404);
			}

			//for file
			if (stat.size > self.server.maxFileSize){ //File size exceeds the limit
				return self.returnStatus(403);
			}

			var mtime = stat.mtime;
			var ims = req.headers['if-modified-since'];
			var type = self.server.getMIME(filename);
			var gzip = isGzip(self, filename);

			setHeader(self);
			res.setHeader('Last-Modified', mtime.toUTCString());

			if (ims && new Date(ims) - mtime === 0) { //use 304 cache
			  res.setHeader('Content-Type', getContentType(self, type));
				res.writeHead(self.setHeaders(res, 304));
				res.end();
				return;
			}

			if (stat.size > 5 * 1024 * 1024) { //数据大于5MB使用这个函数处理
				return resultMaxFileData(self, filename, type, stat.size);
			}
			else if(!gzip){ //no use gzip format
				return fsx.readFile(filename, 
						resultData.bind(null, self, filename, type, mtime, false));
			}

			var md5 = tesla.hash(filename);
			var c_filename = self.server.temp + md5;
			var is_update = false;
			var cache = CACHE[filename];

			if (cache){
				is_update = cache.time < mtime;
			}
			else {
				try {
          stat = fsx.statSync(c_filename);
					is_update = stat.mtime < mtime;

				} catch (e) {
					is_update = true;
				}
			}

			if (!is_update){  //not update gzip cache
				return fsx.readFile(c_filename, 
					resultData.bind(null, self, filename, type, mtime, true));
			}

			fsx.readFile(filename, function(err, data) {

				if(err){
          console.err(err);
					return self.returnStatus(404);
				}

				zlib.gzip(data, function(err, data) {        		//gzip
					fsx.writeFile(c_filename, data, tesla.noop); 	//save gzip
					resultData(self, filename, type, mtime, true, err, data);
				});
			});
		});
	},

	returnFile: function(name) {
	  this.return_file(name);
	},

	/**
	 * return dir
	 * @param {String}       filename
	 */
	returnDirectory: function(filename) {

		var self = this;
		var res = this.response;
		var req = this.request;

		//读取目录
		if (!filename.match(/\/$/)){  //目录不正确,重定向
			return self.redirect(self.cleanurl.replace(/\/?$/, '/'));
		}

		fsx.ls(filename, function(err, files) {
			if (err){
				return self.returnStatus(404);
			}

			var	dir = filename.replace(self.m_root, '');
			var html =
				'<!DOCTYPE html><html><head><title>Index of {0}</title>'.format(dir) +
				'<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />' +
				'<style type="text/css">*{font-family:Courier New}div,span{line-height:20px;height:20px;}span{display:block;float:right;width:220px}</style>' +
				'</head><body bgcolor="white">' +
				'<h1>Index of {0}</h1><hr/><pre><div><a href="{1}">../</a></div>'.format(dir, dir ? '../' : 'javascript:')

			var ls1 = [];
			var ls2 = [];

			for (var i = 0, stat; (stat = files[i]); i++) {
				var name = stat.name;
				if (name.slice(0, 1) == '.'){
					continue;
				}

				var link = name;
				var size = (stat.size / 1024).toFixed(2) + ' KB';
				var isdir = stat.dir;

				if (isdir) {
					link += '/';
					size = '-';
				}

				var s =
					'<div><a href="{0}">{0}</a><span>{2}</span><span>{1}</span></div>'
							.format(link, stat.ctime.toString('yyyy-MM-dd hh:mm:ss'), size);
				isdir ? ls1.push(s) : ls2.push(s);
			}

			html += ls1.join('') + ls2.join('') + '</pre><hr/></body></html>';
			setHeader(self);

			// var type = self.server.getMIME('html');
			
			res.writeHead(self.setHeaders(res, 200));
			res.end(html);
		});
	}

});
