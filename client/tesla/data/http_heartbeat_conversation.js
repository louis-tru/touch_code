/**
 * @createTime 2012-01-02
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/data/conversation.js');
include('tesla/data/http_service.js');

var TIMEOUT = 2E4;    // error timeout default as 20s
var MAX_DATA_LENGTH = 8e3;

//listen server message
function listen(self) {
  
  if (!self.isOpen){
    return;
  }

  var http = self.m_http;
  var timeout = function() {
    timeout = null;
  } .delay(TIMEOUT);
  
  // 保持http连接,等待服务端消息
  http.call('listen', [self.m_token, self.m_password.main], function(err, data) {
    
    if (!self.isOpen) {
      return;
    }

    if (err) {
      if (timeout) {
        self.onerror.notice(err);
        self.onclose.notice();
      }
      else{
        listen(self);
      }
      return;
    }

    switch (data.type) {
      case 'message':
        data = data.data;
        for (var i = 0; i < data.length; i++){
          self.parse(data[i]);
        }
        listen(self); // 重新发起侦听
        break;
      case 'close':   // 关闭连接
        self.onclose.notice();
        break;
      default:        // 异常关闭连接
        self.onerror.notice(new Error('http heartbeat listen error'));
        self.onclose.notice();
        break;
    }
  });
}

//send message
function send(self, msg) {
  
  if (msg){
    self.m_message.push(msg);
  }
  
  if (self.isOpen && !self.m_send && self.m_message.length) {

    var message = self.m_message;
    var send_msg = '';
    var http = self.m_http;

    while (message.length) {
      var len = MAX_DATA_LENGTH - send_msg.length;
      if (message[0].length < len){
        send_msg += message.shift();
      }

      else {
        send_msg += message[0].substr(0, len);
        message[0] = message[0].substr(len);
        break;
      }
    }

    self.m_send = true;
    
    // 服务端接收消息
    http.call('receive', 
      [self.m_token, self.m_password.aid, send_msg], function(err, data) {

      self.m_send = false;

      if (err || data.type != 'receive_complete') {
        self.onerror.notice(err || new Error('http heartbeat send message error'));
        self.onclose.notice();
      }
      else{
        send(self);
      }
    });
  }
}

/**
 * 如果客户端不支持 web socket 这可以冲当一个备选方案
 * @class tesla.data.HttpHeartbeatConversation
 * @extends tesla.data.Conversation
 */
$class('tesla.data.HttpHeartbeatConversation', tesla.data.Conversation, {

  m_http: null,
  m_password: null,
  m_token: 0,
  m_message: null,
  m_send: false,
  m_path: '',
  m_param: '',
  
  /**
   * @param {String} path (Optional)
   * @constructor
   */
  HttpHeartbeatConversation: function(path) {
    this.Conversation();
    this.m_path = path;
    this.m_message = [];
  },
  
  /**
   * init overwrite
   * @overwrite
   */
  init: function() {

    var self = this;
    var bind_services = tesla.keys(this.services).join(',');
    
    this.m_http = 
      new tesla.data.HttpService('tesla.web.service.HttpHeartbeatProxy', this.m_path);
    // 初次握手
    this.m_http.call('handshakes', [bind_services], function(err, data) {
      
      // 握手异常
      if (err) {
        self.onerror.notice(err);
        self.onclose.notice();
        return;
      }
      
      switch (data.type) {
        case 'handshakes_complete':         // 初次握手成功
          self.m_token = data.token;        // 连接token
          self.m_password = data.password;  // 连接通道密码
          self.onopen.notice();
          //
          send(self);   // 发送消息
          listen(self); // 开始侦听消息
          break;
        case 'close': // 服务端拒绝主动关闭
          self.onclose.notice();
          break;
        default:      // 错误关闭
          self.onerror.notice(new Error('http heartbeat handshakes error'));
          self.onclose.notice();
          break;
      }
    });
  },
  
  /**
   * 关闭连接
   * @overwrite
   */
  close: function() {
    if (this.isOpen) {
      //发送一个关闭连接的标识消息
      send(this, '\u0000\u0000'); 
      this.onclose.notice();
    }
  },
  
  /**
   * 发送消息
   * @overwrite
   */
  send: function(msg) {
    
    send(this, '\u0000' + JSON.stringify(msg) + '\ufffd');
    if (!this.isOpen){
      this.connect();
    }
  }

});
