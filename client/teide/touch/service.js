/**
 * @createTime 2014-12-15
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/dialog.js');
include('tesla/gui/view_data_source.js');
include('tesla/data/web_socket_service.js');
include('tesla/url.js');
include('teide/touch/added_menu.js');

var errorStatusHandler = {
// 	all: function(err){
// 		Dialog.error('', err.message);
// 	}
};

/**
 * @class teide.touch.Service
 * @wxtends tesla.data.HttpService
 */
$class('teide.touch.TouchService', tesla.data.HttpService, {
  /**
   * @constructor
   */
  TouchService: function(name, path){
    this.HttpService(name, path);
    this.errorStatusHandler = errorStatusHandler;
  }
});

/**
 * @teide.touch.SocketService
 * @tesla.data.WebSocketService
 */
$class('teide.touch.SocketService', tesla.data.WebSocketService, {
  
  /**
   * @constructor
   */
  SocketService: function(name, conv) {
    this.WebSocketService(name, conv);
    this.errorStatusHandler = errorStatusHandler;
    // this.onerror.on(function(evt){
    //   Dialog.error(evt.message);
    // });
  },
  
});

// 快速native服务
$class('teide.touch.FastNativeService', {

  // private:
  m_callbacks: null,
  // public:
  onace_text_input_focus: null,
  onace_text_input_blur: null,
  onace_text_input_input: null,
  onace_text_input_backspace: null,
  onace_text_input_indent: null,
  onace_text_input_outdent: null,
  onace_text_input_comment: null,
  onace_text_input_composition_start: null,
  onace_text_input_composition_update: null,
  onace_text_input_composition_end: null,
  ondisplay_port_size_change: null,

  FastNativeService: function(){
    ts.EventDelegate.init_events(this, 
      'ace_text_input_focus',
      'ace_text_input_blur',
      'ace_text_input_input',
      'ace_text_input_backspace',
      'ace_text_input_indent',
      'ace_text_input_outdent',
      'ace_text_input_comment',
      'ace_text_input_composition_start',
      'ace_text_input_composition_update',
      'ace_text_input_composition_end',
      'display_port_size_change');
    this.m_callbacks = {};
  },

  // 是否支持快速native服务
  is_support: function(){
    return teide.touch.MainViewport.share().ios_native;
  },
  
  callback: function(id, args){
    var cb = this.m_callbacks[id];
    if(cb){
      delete this.m_callbacks[id];
      cb.apply(null, args || []);
    }
  },

  call: function(name, args, cb){

    if(typeof args == 'function'){
      cb = args;
      args = [];
    }
    
    args = args || [];

    var main = teide.touch.MainViewport.share();
    if(main.ios_native){
      var param = [ name, args, ];
      if(cb){
        var id = ts.sysid();
        param.push(String(id));
        this.m_callbacks[id] = cb;
      }
      var send_msg = '/teide_native_call/' + JSON.stringify(param);
      location.href = encodeURIComponent(send_msg);
    }
    else{
      // alert('Error: Not support FastNativeService');
    }
  },

  onace_text_input_focus_notice: function(){
    return this.onace_text_input_focus.notice();
  },
  
  onace_text_input_blur_notice: function(){
    return this.onace_text_input_blur.notice();
  },

  onace_text_input_input_notice: function(data){
    return this.onace_text_input_input.notice(data);
  },

  onace_text_input_backspace_notice: function(){
    return this.onace_text_input_backspace.notice();
  },
  
  onace_text_input_indent_notice: function(){
    return this.onace_text_input_indent.notice();
  },
  
  onace_text_input_outdent_notice: function(){
    return this.onace_text_input_outdent.notice();
  },
  
  onace_text_input_comment_notice: function(){
    return this.onace_text_input_comment.notice();
  },
  
  onace_text_input_composition_start_notice: function(data){
    return this.onace_text_input_composition_start.notice(data);
  },

  onace_text_input_composition_update_notice: function(data){
    return this.onace_text_input_composition_update.notice(data);
  },

  onace_text_input_composition_end_notice: function(data){
    return this.onace_text_input_composition_end.notice(data);
  },

  ondisplay_port_size_change_notice: function(width, height){
    return this.ondisplay_port_size_change.notice({ width: width, height: height });
  },

});

console.nlog = function(){
  NativeService.call('log', Array.toArray(arguments));
};

var application_token = ts.url.get('application_token');

// 创建Socket连接
var conv = 
  tesla.data.WebSocketService.NewConversation('?application_token=' + application_token);
global.APIService = new teide.touch.TouchService('teide.touch.APIService');
global.FileActionService = new teide.touch.SocketService('teide.touch.FileActionService', conv);
global.NativeService = new teide.touch.SocketService('teide.touch.NativeService', conv);
global.ManageService = 
  new teide.touch.TouchService('tc.ManageService', ts.config.manage_server);
global.FastNativeService = new teide.touch.FastNativeService();

conv.onopen.once(function(){ // 为确保与服务器随时保持连接,间隔1秒ping
  setInterval(function(){ NativeService.call('ping'); }, 1000);
});

/**
 * @class teide.touch.ViewDataSource
 * @extends tesla.gui.ViewDataSource
 */
global.ViewDataSource = 

$class('teide.touch.ViewDataSource', tesla.gui.ViewDataSource, {
  
  /**
   * @constructor
   */
  ViewDataSource: function(){
    tesla.gui.ViewDataSource.call(this);
  },
  
  /**
   * 通过名称创建新数据服务
   */
  NewService: function(name){
    var services = {
      'teide.touch.APIService'        : APIService,
      'teide.touch.FileActionService' : FileActionService,
      'teide.touch.NativeService'     : NativeService,
      'teide.pc.ManageService'        : ManageService,
    };
    var service = services[name];
    if(!service){
      service = new teide.touch.SocketService(name, conv);
      services[name] = service;
    }
    return service;
  },
  
});

