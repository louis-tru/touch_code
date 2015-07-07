/**
 * @createTime 2015-01-04
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/web/service/WebSocketService.js');
include('teide/touch/ScriptService.js');
include('tesla/Delegate.js');
include('tesla/node.js');

var fs = tesla.node.fsx;
var native_util = null;
try{
  native_util = process.binding('native_util');
} catch(e){ }

function version() {
  return native_util ? native_util.request_version() : 'v1.1.0';
}

function application_info() {

  if (native_util) {
    var is_pro = native_util.request_is_pro();
    var is_ph = native_util.request_is_ph();
    var is_lite = native_util.request_is_lite();
    var is_lite_x = native_util.request_is_lite_x();

    return {
      id: native_util.request_device_id(),
      introducer_id: native_util.request_introducer_id(),
      device_token: native_util.request_get_device_token(),
      share_count: native_util.request_share_count(),
      is_pro: is_pro,
      is_ph: is_ph,
      is_lite: is_lite,
      is_lite_x: is_lite_x,
      is_support_high: is_lite ? is_lite_x ? true : false : true,
      ios_native: teide.touch.TouchServer.share().hasIOSNative,
      version: version(),
      native_debug: native_util.request_has_debug(),
      application_run_count: native_util.request_application_run_count(),
      mark_reviews: native_util.request_mark_reviews(),
      language: teide.touch.TouchServer.share().get_language(),
    };
  } else {
    var is_pro = false;
    var is_ph = false;
    var is_lite = true;
    var is_lite_x = false;
    
    return { 
      id: 'dev_debug_device',
      introducer_id: '',
      device_token: '',
      share_count: 0,
      is_pro: is_pro,
      is_ph: is_ph,
      is_lite: is_lite,
      is_lite_x: is_lite_x,
      is_support_high: is_lite ? is_lite_x ? true : false : true,
      ios_native: false,
      version: version(),
      native_debug: true,
      application_run_count: 1,
      mark_reviews: false,
      language: teide.touch.TouchServer.share().get_language(),
    };
  }
}

function get_network_host(self){

// { 
//   lo0: 
//  [ { address: '::1', family: 'IPv6', internal: true },
//    { address: '127.0.0.1', family: 'IPv4', internal: true },
//    { address: 'fe80::1', family: 'IPv6', internal: true } ],
// en0: 
//  [ { address: 'fe80::89e:2356:5967:a5c8',
//      family: 'IPv6',
//      internal: false },
//    { address: '192.168.43.132', family: 'IPv4', internal: false } ],
// awdl0: 
//  [ { address: 'fe80::d9:21ff:fe77:da88',
//      family: 'IPv6',
//      internal: false } ] 
//    }
  
  var ifaces = te.node.os.networkInterfaces();
  var address = '';

  for(var i in ifaces){
    if(i.match(/^eth(\d)$/)){
      address = ifaces[i][0].address;
    }
    else if(i.match(/^en(\d)$/)){
      var item = ifaces[i];
      for(var j = 0; j < item.length; j++){
        if(item[j].family == 'IPv4' && !item[j].internal){
          address = item[j].address;
        }
      }
    }
  }
  return address ? address + ':' + self.server.port: '';
}

function initNativeService(self){
  if(native_util){
    self.m_native_util_service = new native_util.NativeUtilService();
    // 
    self.m_native_util_service.ondownload_file_handle = function(url){
      self.ondownload_file.notice(url); // 通知客户端下载文件
    };
    self.m_native_util_service.onopen_soft_keyboard_handle = function(){
      self.onopen_soft_keyboard.notice();
    };
    self.m_native_util_service.onclose_soft_keyboard_handle = function(){
      self.onclose_soft_keyboard.notice();
    };
    self.m_native_util_service.onclipboard_data_change_handle = function(data){
      self.onclipboard_data_change.notice(data);
    };
    self.m_native_util_service.onopen_external_file_handle = function(path){
      if (path.indexOf(self.documentsPath) != 0) return;
      path = path.substr(self.documentsPath.length);
      self.onopen_external_file.notice(path);
    };
    self.m_native_util_service.onpush_message_handle = function(json_msg) {
      self.onpush_message.notice(JSON.parse(json_msg));
    };
  }
  self.m_script_service = teide.touch.ScriptService.share();
  self.m_script_service.onstart.on(self.onscript_start); // 转发
  self.m_script_service.onexit.on(self.onscript_exit); // 转发
  self.m_script_service.onerror.on(self.onscript_error); // 转发
  // 
  // console.log(self.m_script_service.onstart.length);
  // console.log(self.m_script_service.onexit.length);
  // console.log(self.m_script_service.onerror.length);

  self.m_sys_error_handle = function(err){
    self.onnode_application_error.notice(err.data.stack);
  };
  tesla.onerror.on(self.m_sys_error_handle);
}

function releaseNativeService(self){
  if(native_util){
    // console.log('releaseNativeService == OK == OK ');
    self.m_native_util_service.ondownload_file_handle = function (){ };
    self.m_native_util_service.onopen_soft_keyboard_handle = function(){ };
    self.m_native_util_service.onclose_soft_keyboard_handle = function(){ };
    self.m_native_util_service.onclipboard_data_change_handle = function(){ };
    self.m_native_util_service.onopen_external_file_handle = function(){ };
    self.m_native_util_service.onpush_message_handle = function(){ };
    self.m_native_util_service = null;
  }
  self.m_script_service.onstart.off(self.onscript_start);
  self.m_script_service.onexit.off(self.onscript_exit);
  self.m_script_service.onerror.off(self.onscript_error);
  tesla.onerror.off(self.m_sys_error_handle);
  // 
  // console.log(self.m_script_service.onstart.length);
  // console.log(self.m_script_service.onexit.length);
  // console.log(self.m_script_service.onerror.length);
}

/**
 * @class teide.touch.FileActionService
 * @extends tesla.web.service.WebSocketService
 */
Class('teide.touch.NativeService', tesla.web.service.WebSocketService, {
  
  /**
	 * 文档根路径
	 */
	documentsPath: '',
	
	/**
	 * 打开软键盘事件
	 */
	onopen_soft_keyboard: null,
	
	/**
	 * 关闭软键盘事件
	 */
  onclose_soft_keyboard: null,
	
	/**
	 * 可显示端口尺寸发生变化事件,比如呼出软键盘
	 */
	ondisplay_port_size_change: null,
  
	/**
	 * 剪贴板数据变化事件
	 */
	onclipboard_data_change: null,

  /**
    * 打开外部文件
    */
  onopen_external_file: null,

  /**
   * 运行启动
   */
  onscript_start: null,
  
  /**
   * 退出
   */
  onscript_exit: null,
  
  /**
   * 退出
   */
  onscript_error: null,

  /**
   * native 文件下载
   */
  ondownload_file: null,

  onnode_application_error: null,

  /**
    * 服务器的push消息事件
    */
  push_message: null,

  //
  m_native_util_service: null,

  // 
  m_script_service: null,

  /**
   * @constructor
   */
  NativeService: function(){
    te.Delegate.def(this, 
      'open_soft_keyboard', 
      'close_soft_keyboard', 
      'display_port_size_change',
      'clipboard_data_change',
      'open_external_file',
      'download_file',
      'script_start',
      'script_exit',
      'script_error',
      'push_message',
      'node_application_error'
    );
    this.documentsPath = teide.touch.TouchServer.share().getDocumentsPath();
    initNativeService(this);
  },
  
  // 认证
  auth: function(cb){
    
    if(native_util){
      
      //var user_agent = this.request.headers['user-agent'];
      var token = native_util.request_get_application_token();
      var token1 = this.params.application_token;
      
      //if(user_agent.indexOf('TeIDE/') == -1){
      if(token != '0' && token != token1){
        return cb(false);       // 拒绝没有正确标识的客户端
      }
    }
    cb(true);
  },
  
  // overwrite
  init: function(conv){
    tesla.web.service.WebSocketService.members.init.call(this, conv);
    
    var self = this;
    conv.onclose.on(function(evt){
      releaseNativeService(self);
    });
  },
  
  /**
   * 设置剪贴板数据,信号
   */
  set_clipboard_data: function(data){
    if(native_util){
      native_util.request_set_clipboard_data(data);
    }
  },

  set_ace_clipboard_data: function(data){
    if(native_util){
      native_util.request_set_ace_clipboard_data(data);
    }
  },
  
  /**
   * 打开内部浏览器,信号
   */
  open_web_browser: function(url){
    if(native_util){
      if(url){
        native_util.request_open_web_browser(url, false);
      }
      else{
        // 没有传入地址,优先使用历史记录
        var host = get_network_host(this);
        native_util.request_open_web_browser(
          'http://' + (host || '127.0.0.1:' + this.server.port) + '/documents/', true);
      }
    }
  },
  
  open_web_browser_for_relative: function(url){
    var host = get_network_host(this);
    this.open_web_browser('http://' + (host || '127.0.0.1:' + this.server.port) + '/' + url);
  },
  
  is_ios_native: function(cb) {
    cb(null, teide.touch.TouchServer.share().hasIOSNative);
  },
  
  version: function(cb) {
    cb(null, version());
  },
  
  application_info: function(cb){
    cb(null, application_info());
  },
  
  // 更新数据
  update_application_info: function(data, cb) {
    if (native_util) {
      if ('share_app_url' in data) {
        native_util.request_set_share_app_url(data.share_app_url);
      }
      if ('introducer_id' in data) {
        native_util.request_set_introducer_id(data.introducer_id);
      }
      if ('share_count' in data) {
        native_util.request_set_share_count(data.share_count);
      }
      if ('serial_number' in data) { // 激活序列号, 激活lite_x
        native_util.request_set_serial_number(data.serial_number);
      }
      cb (null, application_info());
    } else {
      cb (null, data);
    }
  },
  
  open_app_store_reviews: function() {
    if (native_util) {
      native_util.request_open_app_store_reviews();
    }
  },

  open_app_store_buy_pro: function(){
    if (native_util) {
      native_util.request_open_app_store_buy_pro();
    }
  },

  open_app_store_buy_ph: function(){
    if (native_util) {
      native_util.request_open_app_store_buy_ph();
    }
  },
    
  /**
   * 完成载入
   */
  complete_load_notice: function(){
    if(native_util){
      nextTick(function(){
        native_util.request_notify_complete_load();
      });
    }
  },
  
	/**
	 * 运行脚本文件
	 */
	run: function(name){
	  teide.touch.ScriptService.share().run(name);
	},
	
	/**
	 * 停止运行,信号
	 */
	stop_run: function(){
	  teide.touch.ScriptService.share().stop();
	},

  /**
   * 当前是否在运行状态
   */
  is_run_status: function(cb){
    cb(null, teide.touch.ScriptService.share().is_run_status());
  },

  /**
   * 日志,信号
   */
  log: function(){
    var ls = Array.toArray(arguments);
    ls.pop();
    console.log.apply(console, ls);
  },

  /**
   * 
   */
  ping: function(){ 
    // console.log('ping');
  },
  
  get_network_host: function(cb) {
    cb(null, get_network_host(this));
  },
  
  /**
   * 分享应用
   */
  share_app: function(rect) {
    if (native_util) {
      native_util.request_share_app(rect);
    }
  },
  
  /**
   * 禁用睡眠
   */
  sleep_disabled: function(is) {
    if (native_util) {
      native_util.request_sleep_disabled(is);
    }
  },
  
  // 是否支持高级功能
  is_support_high: function(cb) {
    cb(null, teide.touch.ScriptService.is_support_high());
  },

  /**
    * 发送文件给好友
    */
  send_file: function(path) {
    if (native_util) {
      native_util.request_send_file(this.documentsPath, path);
    }
  },

  send_email_to_author: function() { 
    if (native_util) {
      native_util.request_send_email_to_author();
    }
  },

  /**
    * 显示广告
    */
  show_ad_panel: function() {
    if (native_util) {
      native_util.request_show_ad_panel();
    }
  },

  /**
    * 隐藏广告
    */
  hide_ad_panel: function(){
    if (native_util) {
      native_util.request_hide_ad_panel();
    }
  },
  
});

