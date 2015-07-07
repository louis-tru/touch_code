/**
 * @createTime 2012-01-02
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/data/conversation.js');
include('tesla/url.js');

//var TEST_TIME = 5E4;
//var TEST_MSG = '\ufffb\ubfff';

/*
* Send a test signal
*/
/*
function sendTest(_this) {

  clearTimeout(_this._test_timeout);

  _this._test_timeout =
  _this.send.delay(_this, TEST_TIME, TEST_MSG);
}*/

/**
 * @class tesla.data.WebSocketConversation
 * @extends tesla.data.Conversation
 */
$class('tesla.data.WebSocketConversation', tesla.data.Conversation, {

  /**
   * web socket connection
   * @private
   */
  m_socket: null,
  m_path: '',
  m_message: null,
  //_test_timeout: 0,
  
  /**
   * constructor function
   * @param {String} url
   * @constructor
   */
  WebSocketConversation: function(path) {
    this.Conversation();
    this.m_path = path;
    this.m_message = [];
  },
  
  /**
   * 初始连接
   * @ovrewrite
   */
  init: function() {
    
    if(this.m_socket){
      throw new Error('No need to repeat open');
    }
    
    var self = this;
    var bind_services = tesla.keys(this.services).join(',');
    var path = ts.url.set('bind_services', bind_services, this.m_path);
    
    this.m_socket = 
        global.WebSocket ? new WebSocket(path) :
        global.MozWebSocket ? new MozWebSocket(path) : null;
        
    if (!this.m_socket){
      throw new Error('create web socket unsuccessful');
    }
    
    this.m_socket.onopen = function(e) {
      
      var message = self.m_message;
      self.m_message = [];
      self.onopen.notice();

      for (var i = 0; i < message.length; i++){
        self.m_socket.send(message[i]);
      }
      //sendTest(self);
    };
    
    this.m_socket.onmessage = function(e) {
      // alert('onmessage');
      self.parse(e.data);
    };
    
    this.m_socket.onerror = function(e) {
      // alert('onerror');
      console.error(e);
      self.onerror.notice(e.data || 'Web Socket error');
      self.close();
    };
    
    this.m_socket.onclose = function(e) {
      // alert('onclose');
      console.log('web socket server close');
      self.m_socket = null;
      self.onclose.notice(e.data);
    };
  },
  
  /**
   * 关闭连接
   * @ovrewrite
   */
  close: function() {
    if (this.isOpen){
      this.m_socket.close();
    }
  },
  
  /**
   * 发送消息
   * @ovrewrite
   */
  send: function(msg) {
    
    msg = JSON.stringify(msg);
    
    if (this.isOpen) {
      this.m_socket.send(msg);
      //sendTest(this);
    }
    else{ //if (msg != TEST_MSG) {
      this.m_message.push(msg);
      this.connect(); // 尝试连接
    }
  }
  
}, {

  /**
   * web socket is support
   * @type {Boolean}
   * @static
   */
  is: !!(global.WebSocket || global.MozWebSocket)

});

