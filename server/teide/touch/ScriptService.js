/**
 * @createTime 2015-03-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/RemoteScriptContext.js');
include('teide/touch/JavascriptContext.js');
include('teide/touch/Console.js');

var native_util = null;
try{
  native_util = process.binding('native_util');
}catch(err){ }

/**
 * 通过名称获取后缀
 */
function get_suffix(name){
  var mat = name.match(/\.([^\.]+)$/);
  if(mat){
    return mat[1].replace(/\+/g, 'p').toLowerCase();
  }
  return '';
}

/**
 * 通过文件后缀获取构造器
 */
function get_constructor(suffix){
  
  switch (suffix) {
    case 'script':
      return teide.touch.RemoteScriptContext;
    case 'js':
      return teide.touch.JavascriptContext;
    default:
      return null;
  }
}

var share_service = null;

/**
 * 是否支持
 */
function is_support_high(){
  if(native_util){
    if(native_util.request_is_lite() &&  // lite 版本无法运行
      !native_util.request_is_lite_x()){ // lite_x 版本可运行
      //throw new Error('只有Ph与Pro版本才有此功能');
      return false;
    }
    return true;
  }
  return false;
}

/**
 * 脚本运行服务
 * @class teide.touch.ScriptService
 */
Class('teide.touch.ScriptService', {
  
  /**
   * @type teide.touch.ScriptContext
   */
  m_context: null,
  
  /**
   * 文档目录
   */
  documentsPath: '',

  /**
   * 运行启动
   */
  onstart: null,
  
  /**
   * 退出
   */
  onexit: null,
  
  /**
   * 退出
   */
  onerror: null,
  
  /**
   * @constructor
   */
  ScriptService: function(){
    te.Delegate.def(this, 'start', 'exit', 'error');
    this.documentsPath = 
      teide.touch.TouchServer.share().getDocumentsPath();
  },
  
  /**
   * 是否可运行这个文件
   */
  is_can_run: function(name){
    var suffix = get_suffix(name);
    var constructor = get_constructor(suffix);
    return !!constructor;
  },

  is_run_status: function(){
    return !!this.m_context;
  },

  /**
   * 强制运行
   * 如果当前有运行的上下文,停止当前,运行一个新的
   */
  force_run: function(name){

    if(!this.m_context){ 
      return this.run(name);
    }

    // 正在运行中,结束它
    var self = this;
    this.m_context.onexit.on(function(){ // 监听结束事件
      nextTick(function(){
        if(self.m_context){ // 如果还没有结束,报告异常
          self.onerror.notice({ msg: 'Run force error' });
        }
        self.run(name);  // 重新运行
      });
    });
    this.m_context.stop();
  },
  
  /**
   * 运行脚本
   */
  run: function(name){
    
    if(!is_support_high()){
      return this.onerror.notice({ message: $t('只有Ph与Pro版本才有此功能'), code: 109 });
    }
    
    if(this.m_context){
      return this.onerror.notice({ message: $t('同时只能运行一个脚本文件'), code: 104 });
    }
    var self = this;
    var suffix = get_suffix(name);
    var constructor = get_constructor(suffix);
    if (!constructor) {
      return this.onerror.notice({ message: $t('无法运行的文件类型'), code: 103 });
    }
    try {
      this.m_context = new constructor(name);
    }
    catch(err) {
      teide.touch.Console.share().error(err.message);
      return this.onerror.notice({ message: $t('运行异常详情请见控制台日志'), code: 102 });
    }

    this.m_context.onstdout.on(function(evt){
      teide.touch.Console.share().log(evt.data); // 打印日志
    });
    
    this.m_context.onstderr.on(function(evt){
      teide.touch.Console.share().error(evt.data);
    });
    
    this.m_context.onerror.on(function(evt){
      teide.touch.Console.share().error(evt.data);
      self.onerror.notice({ message: $t('运行异常详情请见控制台日志'), code: 102 });
    });
    
    this.m_context.onexit.on(function(evt){
      self.m_context = null;
      self.onexit.notice(te.extend({ name: name }, evt.data)); // 通知退出
    });
    
    try{
      this.m_context.run();
    }
    catch(err){
      this.onerror.notice({ message: err.message, code: 105 });
    }
    this.onstart.notice({ name: name }); // 通知启动
  },
  
  /**
   * 停止运行脚本
   */
  stop: function() {
    if(this.m_context){
      this.m_context.stop(); // 发送停止信号
    }
  }
  
}, {
  
  /**
    * 是否支持高级功能
    */
  is_support_high: is_support_high,
  
  /**
   * 获取共享服务
   */
  share: function(){
    if(!share_service){
      share_service = new teide.touch.ScriptService();
    }
    return share_service;
  }
});