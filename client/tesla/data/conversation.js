/**
 * @createTime 2012-01-02
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/event_delegate.js');

function bind_service(self, name) {
  // 绑定服务
  self.send({ type: 'bind_service', name: name });
}

/**
 * @class tesla.data.Conversatio
 */
$class('tesla.data.Conversation', {

  /**
   * 是否尝试连接中
   * @private
   */  
  m_connect: false,

  /**
   * open status
   * @type Boolean
   */
  m_is_open: false,
  
  /**
   * 绑定的服务
   * @private
   */
  m_services: null,

  /**
   * @event onselected
   */
  onopen: null,

  /**
   * @event onselected
   */
  onmessage: null,

  /**
   * @event onselected
   */
  onerror: null,

  /**
   * @event onselected
   */
  onclose: null,

  /**
   * constructor function
   * @constructor
   */
  Conversation: function() {
    
    tesla.EventDelegate.init_events(this, 'open', 'message', 'error', 'close');
    
    var self = this;
    
    this.m_services = { };
    
    this.onopen.on(function() {
      // 握手成功连接已打开
      self.m_is_open = true;
      self.m_connect = false;
    });
    
    this.onclose.on(function() {
      self.m_is_open = false;
      self.m_connect = false;
    });
    
    this.onerror.on(function() {
      self.m_connect = false;
    });
  },
  
  /**
   * 获取是否打开连接
   */
  get isOpen() {
    return this.m_is_open;
  },
  
  /**
   * 绑定服务
   * @param {tesla.data.WebSocketConversation} service
   */
  bind_service: function(service){
    var name = service.name;
    var services = this.m_services;
    if(name in services){
      throw new Error('No need to repeat binding');
    }
    else{
      services[name] = service;
      if(this.m_is_open){
        bind_service(this, name);
      }
      else{
        nextTick(this, this.connect); // 还没有打开连接,下一帧开始尝试连接
      }
    }
  },
  
  /**
   * 获取绑定的服务列表
   */
  get services(){
    return this.m_services;
  },
  
  /**
   * connercion server
   */
  connect: function() {
    if (!this.m_is_open && !this.m_connect) {
      for(var i in this.m_services){
        this.m_connect = true;
        this.init();
        return;
      }
      // 连接必需要绑定服务才能使用
      throw new Error('connection must bind service');
    }
  },

  /**
   * parser message
   * @param {String} msg
   */
  parse: function(msg) {
    if (msg != '\ufffb\ubfff'){ // 这是test数据无需理会
      msg = JSON.parse(msg);
      this.onmessage.notice(msg);
    }
  },

  /**
   * init conversation
   */
  init: function(){
    
  },
  
  /**
   * close conversation connection
   */
  close: function(){
    
  },
    
  /**
   * send message to server
   * @param {Object} data
   */
  send: function(data){
    
  }

});

