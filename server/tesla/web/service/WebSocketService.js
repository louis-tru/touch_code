/**
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Delegate.js');
include('tesla/web/service/Service.js');
include('tesla/web/Session.js');

function parseErrorToObject(err) {
  
	if (typeof err == 'string'){
		err = new Error(err);
	}
	return (err instanceof Error ? tesla.extend({
		name: err.name,
		description: err.description,
		message: err.message,
	}, err) : err);
}

function parseError(err) {
	if (typeof err == 'string'){
		return new Error(err);
	}
	else{
	  if(err instanceof Error){
	    return err;
	  }
	  else{
	    // err = te.extend(new Error(err.message || 'Error'), 
	    //                 te.filter(err, ['name', 'description']));
	    err = te.extend(new Error(err.message || 'Error'), err);
	    return err;
	  }
	}
}

function onmessage_handle(self, evt){
  
  var service_name = self.constructor.fullName;
  
  if(evt.data.service != service_name){ // 不是我的消息
    return;
  }
  
	var data = evt.data;
	var type = data.type;
	
	if (type == 'call') { // 调用函数
    
		var args = data.args;
		var fn = self[data.name];
		var cb = data.callback;
		
		if (!fn) {
		  return console.error('"{0}" no defined'.format(data.name));
		  // return self.error('"{0}" no defined'.format(data.name));
		}
		
		if (typeof fn != 'function') {
		  return console.error('"{0}" no defined'.format(data.name));
		  // return self.error('"{0}" no function'.format(data.name));
		}
    
    var hasCallback = false;
		var msg = { type: 'callback', callback: cb, service: service_name };
    
    if (cb) { // 需要回调
      args.push(function(err, data) {
      
        if (hasCallback){
          return console.error('callback has been completed');
        }
        hasCallback = true;
        
        if(self.conversation.isOpen){  // 如果连接断开,将这个数据丢弃
          if (err){
          	msg.error = parseErrorToObject(err);
          }
          msg.data = data;
          self.conversation.send(msg);  
        }
      });
    } else {
      args.push(function(){});
    }
    
		fn.apply(self, args);
	}
	else if(type == 'cancel_call'){
	  // TODO cancel call
	}
	else if(type == 'callback'){ // 客户端返回的回调
	
    var err = data.error;
    var id = data.callback;
    var callbacks = self.m_callbacks;
    var callback = callbacks[id];
    
    if(!callback){
      // 没有回调可能已经取消
      return;
    }
    
    delete callbacks[id];
    
    callback(err, data.data);
	}
	else{
	  // TODO Unknown
	}
}

function onclose_handle(self, evt){
	var all = tesla.Delegate.all(self);
  // 删除全部侦听器
	for (var i = 0; i < all.length; i++) {
		all[i].off();
	}
	
  var callbacks = self.m_callbacks;
  var error = new Error('Connection closed unexpectedly');
  self.m_callbacks = { };
  
  for(i in callbacks){
    callbacks[i](error); // 处理连接异常
  }
}

// 
function get_callback(self, name, args, cb){
  
  return function(err, data){
    if(err){
      cb(parseError(err));
    }
    else{
      cb(err, data);
    }
  };
}

/**
 * @class tesla.web.service.WebSocketService
 * @extends tesla.web.service.Service
 */
Class('tesla.web.service.WebSocketService', tesla.web.service.Service, {
  
// private:
  m_callbacks: null,
  m_conversation: null,
  
// public:
	/**
	 * @event onerror
	 */
	onerror: null,
	
	/**
	 * conversation
	 * @type {tesla.web.service.conversation.Conversation}
	 */	
	get conversation(){
	  return this.m_conversation;
	},
  
	/**
	 * site session
	 * @type {tesla.web.Session}
	 */
	session: null,

	/**
	 * init WSService
	 * @param {tesla.web.service.conversation.Conversation} conv
	 */
	init: function(conv) {
		this.initBase(conv.request);
		this.m_conversation = conv;
		this.m_callbacks = { };
		this.session = new tesla.web.Session(this);
		
		var service_name = this.constructor.fullName;
		
		tesla.Delegate.def(this, 'error');
		
		var self = this;
    
		function listen(evt) {
			if(self.conversation.isOpen) {  // 如果连接断开,将这个数据丢弃
				conv.send({
				  service: service_name, 
				  type: 'event', 
				  event: evt.type,
				  data: evt.type == 'error' ? parseErrorToObject(evt.data) : evt.data
				});
			}
		}
		
		var all = tesla.Delegate.all(this);
		// 侦听事件发送到客户端
		for (var i = 0; i < all.length; i++) {
			all[i].on(listen);
		}
		
		conv.onmessage.$on(onmessage_handle, this);
		conv.onclose.$on(onclose_handle, this);
	},
	
	/**
	 * 调用客户端 api
	 * @param {String} name
   * @param {Object[]}  args  (Optional)  
   * @param {Function}  cb    (Optional) 如果不希望返回数据可以不传入回调
   * @return {Number} 返回调用id
	 */
	call: function(name, args, cb) {
    
    if(!this.conversation.isOpen){ // 连接是否关闭
      if(cb){
        nextTick(cb, new Error('error connection close status'));
      }
      return 0;
    }
    
    if (typeof args == 'function') {
      cb = args;
      args = [];
    }
    
    args = args ? Array.isArray(args) ? args : [args] : [];
    
    var msg = {
      service: this.constructor.fullName,
      type: 'call', 
      name: name, 
      args: args,
    };
    
    var id = 0;
    if(cb){
      msg.callback = id = te.guid();
      this.m_callbacks[id] = get_callback(this, name, args, cb);
    }
    this.conversation.send(msg);
    
    return id;
	},
	
  /**
   * 取消调用
   */
	abort: function() {
	  // TODO 这个地方不能这样简单,最好能把取消的消息发到客服端
	  // cancel_call
    if(id){
      delete this.m_callbacks[id];
    }
    else{
      this.m_callbacks = {};
    }
	},
	
	/**
	 * trigger error event
	 * @param {Error} err
	 */
	error: function(err) {
		this.onerror.notice(parseError(err));
	}

});


