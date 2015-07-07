/**
 * @createTime 2012-01-04
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/data/http_heartbeat_conversation.js');
include('tesla/data/web_socket_conversation.js');
include('tesla/data/service.js');
include('tesla/event_delegate.js');

var WebSocketConversation = tesla.data.WebSocketConversation;
var HttpHeartbeatConversation = tesla.data.HttpHeartbeatConversation;

function parseErrorToObject(err) {
  
	if (typeof err == 'string'){
		err = new Error(err);
	}
	return (err instanceof Error ? tesla.extend({
		name: err.name,
		description: err.description,
		message: err.message
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
	    // err = ts.extend(new Error(err.message || 'Error'), 
	    //                 ts.filter(err, ['name', 'description']));
      err = ts.extend(new Error(err.message || 'Error'), err);
	    return err;
	  }
	}
}

function message_handle(self, evt){
  
  if(evt.data.service != self.name){ // 不是发给我的消息
    return;
  }
  
  var data = evt.data;
  var type = data.type;
  
  switch (type) {
    
    case 'event':
      self.notice(data.event, data.data);
      break;
      
    case 'call': // 调用client
    
  		var args = data.args;
  		var fn = self[data.name];
  		var cb = data.callback;
  		
  		if(!fn){
  		  return console.error('call client "{0}" no defined'.format(data.name));
  		}
  		
  		if(typeof fn != 'function'){
  		  return console.error('call client "{0}" no function'.format(data.name));
  		}
      
      var hasCallback = false;
  		var msg = { type: 'callback', callback: cb, service: self.name };
      
  		args.push(function(err, data) {
        
  			if (hasCallback)
  				return self.error(new Error('callback has been completed'));
  			hasCallback = true;
        
  			if (err){
  				msg.error = parseErrorToObject(err);
  			}
  			
  			if(cb){ // 需要回调
    			msg.data = data;
    			self.conversation.send(msg); // 如果连接断开,这个数据可能会被丢弃
  			}
  		});
      
      fn.apply(self, args);
      
      break;
    case 'cancel_call':
      // TOOD 
      break;
    case 'callback':
      
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
      break;
      
    default: break;
  }
}

function error_handle(self, evt){
  // console.error(evt.data);
}

function close_handle(self, evt){
  
  var callbacks = self.m_callbacks;
  var error = new Error('Connection closed unexpectedly');
  self.m_callbacks = { };
  
  for(var i in callbacks){
    callbacks[i](error); // 处理连接异常
  }
}

function get_callback(self, name, args, cb){
  
  return function(err, data){

    if (!err){
      
      self.oncompletecall.notice({ name: name, args: args, callback: cb, result: data });
      cb(err, data);
      return;
    }
    
    err = parseError(err);
    
    err.name = name;
    err.args = args;
    err.callback = cb;
    
    //TODO error ?
    if(!self.onerror.notice(err)){
      return;
    }
    
    var errorStatusHandler = self.errorStatusHandler;
    var error_code = (err.code || err.rc) + '';

    if(errorStatusHandler && error_code) {
      
      var handler = errorStatusHandler.all; //使用通用错误

      for(var code in errorStatusHandler){
        if(code.match('(^|,)' + error_code + '(,|$)')){
          handler = errorStatusHandler[code];
          break;
        }
      }
      if(handler){
        handler.call(self, err);
        return;
      }
    }
    throwError(err, cb);
  };
}

/**
 * @class tesla.data.WebSocketService
 * @extends tesla.data.Service
 */
$class('tesla.data.WebSocketService', tesla.data.Service, {
  
  /**
   * @private
   */
  m_callbacks: null,
  
  /**
   * conversation
   * @type {tesla.data.Conversation}
   * @private
   */
  m_conversation: null,
  
  /**
   * @param {String} name
   * @param {tesla.data.Conversation} conversation
   * @constructor
   */
  WebSocketService: function(name, conversation) {
    this.Service(name);
    this.m_conversation = conversation || tesla.data.WebSocketService.NewConversation();
    this.m_conversation.bind_service(this); // 绑定服务
    this.m_conversation.onmessage.$on(message_handle, this);
    // this.m_conversation.onerror.$on(error_handle, this);
    this.m_conversation.onclose.$on(close_handle, this);
    this.$on('error', error_handle);
    this.m_callbacks = {};
  },
  
  /**
   * 获取连接
   */
  get conversation() {
    return this.m_conversation;
  },
  
  /**
   * call service api
   * @param {String}    name
   * @param {Object[]}  args  (Optional)  
   * @param {Function}  cb    (Optional) 如果不希望服务器返回数据可以不传入回调
   * @return {Number} 返回调用id
   */
  call: function(name, args, cb) {
    
    if (typeof args == 'function') {
      cb = args;
      args = [];
    }
    
    args = args ? Array.isArray(args) ? args : [args] : [];
    
    var msg = { 
      service: this.name,
      type: 'call', 
      name: name, 
      args: args,
    };
    
    var id = 0;
    if(cb){
      msg.callback = id = ts.sysid();
      this.m_callbacks[id] = get_callback(this, name, args, cb);
    }
    this.conversation.send(msg);
    return id;
  },
  
  /**
   * 取消调用
   * @overwrite
   */
  abort: function (id) {
    // TODO 这个地方不能这样简单,最好能把取消的消息发到服务端
    // cancelCall
    if(id){
      delete this.m_callbacks[id];
    }
    else{
      this.m_callbacks = {};
    }
  },
  
}, {
  
  /**
   * 创建新的连接
   * @static
   */
  NewConversation: function(path) {
    
    path = $f(path || tesla.config.web_service || '');
    path = ts.url.remove('service', path);
    
    return WebSocketConversation.is ? 
            new WebSocketConversation(path.replace(/^http/i, 'ws')) :
            new HttpHeartbeatConversation(path.replace(/^ws/i, 'http'));
  }
});

// 扩展
tesla.extend(tesla.data.WebSocketService.members, tesla.EventDelegateCenter.members);
