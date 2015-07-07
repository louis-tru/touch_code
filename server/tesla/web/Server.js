/**
 * @class tesla.web.Server 服务器
 * @extends http.Server
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Delegate.js');
include('tesla/web/Router.js');
include('tesla/web/service/WebSocketConversation.js');
include('tesla/web/service/HttpHeartbeatProxy.js');
include('tesla/web/service/StaticService.js');
include('tesla/node.js');

var StaticService = tesla.web.service.StaticService;
var NewWebSocketConversation = tesla.web.service.WebSocketConversation.New;

var http = te.node.http;
var server = null;
var ENV = tesla.env;
var MIME_TYPES = {};
var setHttpDebug = tesla.DEBUG ? tesla._Debug.setHttpDebug: noop;

readMime('tesla/web/mime/mime.types');
readMime('tesla/web/mime/node.types');
readMime('tesla/web/mime/tesla.types');

if (!tesla.DEBUG) {
	//只有在非调试时
	//error
	tesla.onerror.on(function(evt) {
		console.error(evt.data.stack);
		evt.returnValue = false;
	});
}

function readMime(filename) {

	filename = tesla.format(filename);
	var data = tesla.node.fsx.readFileSync(filename) + '';
	var ls = data.replace(/ *#.*\r?\n?/g, '').split(/\n/);
	var len = ls.length;

	for (var i = 0; i < len; i++) {
		var item = ls[i].replace(/^\s|\s$|;\s*$/g, '')
			.replace(/\s+|\s*=\s*/, '*%*').split('*%*');

		var key = item[0];
		var value = item[1];
		if (value){
			var values = value.split(/\s+/);
			var len2 = values.length;

			for(var j = 0; j < len2; j++){
				MIME_TYPES[values[j]] = key;
			}
		}
	}
}

//Handle http and websocket and http-heartbeat request
function init(self) {
  
	//http
	self.on('request', function(req, res) {
    
		//设置http client deubg
		setHttpDebug(self, req, res);
    
    var url = decodeURI(req.url);       // 解码
		var info = self.router.find(url);   // 通过url查找目标服务信息
		var name = info.service;
    
		// TODO ?
		//var mod = name.replace(/\./g, '/') + '.js';
		//insmod(mod);
    
		var klass = tesla.get(name);
    
		if(klass){
			if(!StaticService.equals(klass)){
				console.error(name + ' not the correct type, http request');
				klass = StaticService;
			}
		}
		else{
			klass = StaticService;
		}
    
		var service = new klass();
    
		req.pause();
		//**
		service.init(req, res);
		service.auth(function(e) { // 认证请求的合法性
      
			req.on('data', function() { });
      
			if (!e) {
			  // 立即断开连接
				return req.socket.destroy(); //.delay(req.socket, 10);
			}
			req.resume();
			service.action(info);
		}, info.action);
	});
  
	// upgrade websocket
	self.on('upgrade', function(req, socket, upgradeHead) {
		// 创建新web socket连接
		NewWebSocketConversation(req, upgradeHead);
	});
	
	self.on('error', function(err){
	  console.log(err);
	  console.log('Server Error ---------------');
	});
	
}

Class('tesla.web.Server', http.Server, {

	//public:
	/**
	 * 侦听主机IP
	 * @type {String}
	 */
	host: '',

	/**
	 * 侦听端口
	 * @type {Number}
	 */
	port: 80,

	/**
	 * session timeout default 15 minutes
	 * @type {Number}
	 */
	session: 15,

	/**
	 * 站点根目录
	 * @type {String}
	 */
	root: tesla.format('../client/'),

	/**
	 * 临时目录
	 * @type {String}
	 */
	temp: tesla.format('../temp/'),

	/**
	 * 站点虚拟目录
	 * @type {String}
	 */
	virtual: '',

	/**
	 * web socket conversation verify origins
	 * @type {String[]}
	 */
	origins: null,

	/**
	 * 是否浏览静态文件目录
	 * @type {Boolean}
	 */
	autoIndex: false,

	/**
	 * 静态缓存文件过期时间,以分钟为单位,为默认为30天
	 * @type {Number}
	 */
	expires: 60 * 24 * 30,

	/**
	 * 静态文件缓存,该值可减低硬盘静态文件读取次数,但需要消耗内存,单位(秒)
	 * @type {Number}
	 */
	fileCacheTime: 6,

	/**
	 * Download file size limit
	 * @type {Number}
	 */
	maxFileSize: 5 * 1024 * 1024,

	/**
	 * Max form data size limit
	 */
	maxFormDataSize: 5 * 1024 * 1024,

	/**
	 * Upload file size limit
	 * @type {Number}
	 */
	maxUploadFileSize: 5 * 1024 * 1024,
	
	/**
	 * 文本文件编码,默认为utf-8
	 */
	textEncoding: 'utf-8',

	/**
	 * 请求超时时间(秒)
	 * @type {Number}
	 */
	timeout: 120,

	/**
	 * 静态gzip文件格式
	 * defaults javascript|text|json|xml
	 * @type {Regexp}
	 */
	gzip: null,

	/**
	 * 是否动态数据内容压缩
	 * @type {Boolean}
	 */
	agzip: true,
  
	/**
	 * 默认页
	 * @type {String[]}
	 */
	defaults: null,

	/**
	 * 设置禁止访问的目录
	 * @type {RegExp}
	 */
	disable: null,

	/**
	 * 错误状态页
	 * @type {Object}
	 */
	errorStatus: null,

	/**
	 * 配置的文件mime
	 * mime types
	 * @type {Object}
	 */
	mimeTypes: null,
  
	/**
	 * http请求路由器
	 * @type {tesla.web.Router}
	 */
	router: null,
  
	//private:
	/**
	 * 是否正在运行
	 */
	m_isRun: false,

	/**
	 * 构造函数
	 * @constructor
	 * @param {Object} opt (Optional) 配置项
	 */
	Server: function(opt) {
		http.Server.call(this);

		this.gzip = /javascript|text|json|xml/i;
		this.errorStatus = {};
		this.disable = /^\/server/i;
		this.defaults = [];
		this.mimeTypes = {};
		this.origins = ['*:*'];
		this.router = new tesla.web.Router();

		this.config(opt || {});
		init(this);
	},

	/**
	 * 设置服务器
	 * @param {Object} conf 配置项
	 */
	config: function(conf) {

		te.update(this, te.filter(conf, [
			'host',
			'autoIndex',
			'mimeTypes',
			'errorStatus',
			'agzip',
			'origins',
			'port',
			'fileCacheTime',
			'expires',
			'timeout',
			'session',
			'maxFileSize',
			'maxFormDataSize',
			'maxUploadFileSize',
			'textEncoding',
		]));

		var defaults = conf.defaults;
		var disable = conf.disable ? '|' + (conf.disable + '').replace(/\s+/, '|') : '';
		var root = conf.root;
		var temp = conf.temp;
		var virtual = conf.virtual;
		var gzip = conf.gzip;

		this.port = parseInt(ENV.WEB_SERVER_PORT) || this.port;
		this.defaults = defaults ? (defaults + '').split(/\s+/) : [];
		this.disable = new RegExp('^(/server' + disable + ')', 'i');
		this.root = root ? tesla.format(root + '').replace(/\/?$/, '/') : this.root;
		this.temp = temp ? tesla.format(temp + '').replace(/\/?$/, '/') : this.temp;
		this.virtual = virtual ? (virtual + '').replace(/^(\/|\\)*([^\/\\]+)/, '/$2') : this.virtual;

    this.gzip = (gzip === false) ? null :
      new RegExp('javascript|text|json|xml' +
      (gzip ? ('|' + gzip).trim().replace(/\s+/, '|') : ''), 'i');

		tesla.node.fsx.mkdir(this.temp);
		this.router.config({
			staticService: conf.staticService,
			virtual: this.virtual,
			router: conf.router
		});
	},

	/**
	 * MIME 获取类型
	 * @param {String}   ename  扩展名或文件名称
	 * @return {String}
	 */
	getMIME: function(name) {
	  
		var mat = name.match(/\.([^$\?\/\\\.]+)((#|\?).+)?$/);
		if (mat) {
			name = mat[1];
		}
		name = name.toLowerCase();
		return this.mimeTypes[name] || MIME_TYPES[name] || 'application/octet-stream';
	},
  
	/**
	 * 是否正在运行
	 */
	get isRun(){
		return this.m_isRun;
	},
  
	/**
	 * 启动服务
	 */
	start: function() {

		if (this.port) {
			this.listen(this.port, this.host);
		}
		else {
			this.listen();
			var addr = this.address();
			this.host = addr.address;
			this.port = addr.port;
		}
		this.m_isRun = true;
	},
  
	/**
	 * 停止服务
	 */
	stop: function() {
		this.close();
		this.m_isRun = false;
	},
	 
	/**
	 * 重新启动
	 */
	restart: function(){
	  this.stop();
	  this.start();
	}
	
}, {
  
	/**
	 * get default web server
	 * @return {tesla.web.Server}
	 * @static
	 */
	share: function() {
		if (!server) {
			server = new tesla.web.Server(tesla.APP_CONF.server);
		}
		return server;
	}
});
