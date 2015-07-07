/**
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/Delegate.js');
include('tesla/node.js');
include('tesla/web/service/WebSocketService.js');

var url = tesla.node.url;
//var crypto = tesla.node.crypto;
var all_conversations = {};

// 绑定服务
function bind_services(self, services, cb){
  
  if(!services.length){
    cb(true);
    return;
  }
  
  var name = services.shift();
  var klass = tesla.get(name);
  
  if(name in self.m_services){
    console.error('Service no need to repeat binding');
    cb(false);
    return;
  }

	if(!klass || !tesla.web.service.WebSocketService.equals(klass)){
		console.error(name + ' Service type is not correct');
		cb(false);
		return;
	}
	
	var service = new klass();
	self.m_services[name] = service;
	
	service.init(self);
	service.auth(function(is){ // 认证合法性
	  if(is){
	    bind_services(self, services, cb); // 继续绑定
	  }
	  else{
	    cb(false);
	  }
	});
}

//Init
function init(self, bind_services_name) {
  
	all_conversations[self.token] = self;
	self.m_is_open = true;
	
	var services = bind_services_name.split(',');
	
	if(!services[0]){ // 没有服务,这种连接没有意义
	  self.close();   // 关闭连接
	  return;
	}
	
	bind_services(self, services, function(is){
	  if(is){ 
    	self.init(); // 初始化连接/握手
    	if(self.m_is_open){
      	self.onopen.emit();
      	Conversation.onopen.emit(self);
    	}
	  }
	  else{ // 绑定失败
	    self.close(); // 关闭连接
	  }
	});
}

/**
 * 连接
 * @class tesla.web.service.Conversation
 */
var Conversation = Class('tesla.web.service.Conversation', {
  
  /**
   * 是否打开
   * @private
   */
  m_is_open: false,
  
	/**
	 * server
	 * @type {tesla.web.Server}
	 */
	server: null,
  
	/**
	 * request
	 * @type {tesla.node.http.ServerRequest}
	 */
	request: null,
  
	/**
	 * service
	 * @type {Object}
	 */
	m_services: null,
  
	/**
	 * Conversation token
	 * @type {Number}
	 */
	token: 0,
    
	/**
	 * @event onerror
	 */
	onerror: null,
  
	/**
	 * @event onmessage
	 */
	onmessage: null,
  
	/**
	 * @event onclose
	 */
	onclose: null,
  
	/**
	 * @event onclose
	 */
	onopen: null,
  
	/**
	 * @param {tesla.node.http.ServerRequest}   req
	 * @param {String}   bind_services_name
	 * @constructor
	 */
	Conversation: function(req, bind_services_name) {
	  tesla.Delegate.def(this, 'open', 'message', 'error', 'close');
	  
		this.server = req.socket.server;
		this.request = req;
		//this.token = crypto.createHash('md5').update(tesla.guid() + this.server.host).digest('hex');
    this.token = tesla.hash(tesla.guid() + this.server.host + '');
		this.m_services = { };
		
		var self = this;
    
		this.onclose.once(function() {
			delete all_conversations[self.token];
			self.m_is_open = false;
			self.onopen.off();
			self.onmessage.off();
			self.onerror.off();
			nextTick(self.onclose, self.onclose.off);
			Conversation.onclose.emit(self);
		});
		
		nextTick(init, this, bind_services_name);
	},
	
	/**
	 * 是否已经打开
	 */
	get isOpen(){
	  return this.m_is_open;
	},
  
	/**
	 * verifies the origin of a request.
	 * @param  {String} origin
	 * @return {Boolean}
	 */
	verifyOrigin: function(origin) {
	  
		var origins = this.server.origins;

		if (origin == 'null')
			origin = '*';
    
		if (origins.indexOf('*:*') != -1) {
			return true;
		}
    
		if (origin) {
			try {
				var parts = url.parse(origin);
				var ok =
					~origins.indexOf(parts.hostname + ':' + parts.port) ||
					~origins.indexOf(parts.hostname + ':*') ||
					~origins.indexOf('*:' + parts.port);
				if (!ok)
					console.warn('illegal origin: ' + origin);
				return ok;
			}
			catch (ex) {
				console.warn('error parsing origin');
			}
		}
		else {
			console.warn('origin missing from websocket call, yet required by config');
		}
		return false;
	},
	
	/**
	 * 获取绑定的服务
	 */
	get services(){
    return this.m_services;
	},
	
	/**
	 * 进一步解析数据
	 * @param {String} msg
	 */
	parse: function(msg){
    var data = JSON.parse(msg);
    if(data.type == 'bind_service'){ // 绑定服务消息
      bind_services(this, [data.name], function(is){ 
        if(!is){        // 绑定失败
          // TODO 是否要关闭连接
          // self.close(); // 关闭连接
        }
      });
    }
    else{
      this.onmessage.emit(data);
    }
	},
  
	/**
	 * open Conversation
	 */
	init: function(){ },

	/**
	 * close the connection
	 */
	close: function(){ },

	/**
	 * send message to client
	 * @param {Object} data
	 */
	send: function(data){ }

}, {
  
	/**
	 * @event onopen
	 * @static
	 */
	onopen: new tesla.Delegate(null, 'open'),
  
	/**
	 * @event onclose
	 * @static
	 */
	onclose: new tesla.Delegate(null, 'close'),
  
	/**
	 * Get Conversation by token
	 * @param {Number} token
	 * @return {tesla.web.service.Conversation}
	 */
	get: function(token) {
		return all_conversations[token];
	},
  
	/**
	 * Get all conversation by token
	 * @return {tesla.web.service.Conversation[]}
	 */
	all: function() {
		return all_conversations;
	}
	
});

