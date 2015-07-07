/**
 * @createTime 2015-03-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/ScriptContext.js');

var NodeVirtualMachine = null;
try {
  NodeVirtualMachine = 
    process.binding('node_virtual_machine').NodeVirtualMachine;
}catch(err){ }

/**
 * @class teide.touch.JavascriptContext
 * @extends teide.touch.ScriptContext
 */
Class('teide.touch.JavascriptContext', teide.touch.ScriptContext, {
  
  m_node_ctx: null,
  
  /**
   * @constructor
   */
  JavascriptContext: function(name){
    if(!NodeVirtualMachine){
      throw new Error($t('暂不支持Javascript运行'));
    }
        
    this.ScriptContext(name);
    this.m_node_ctx = new NodeVirtualMachine('node', this.path, '--teide-start');
    
    var self = this;
    
    this.m_node_ctx.onstart_handle = function(){
      // TODO
    };
    
    this.m_node_ctx.onstop_handle = function(){
      self.onexit.notice({ code: 0, signal: null });
    };
    
    this.m_node_ctx.onconsole_log_handle = function(data){
      self.onstdout.notice(data);
    };
    
    this.m_node_ctx.onconsole_error_handle = function(data){
      self.onstderr.notice(data);
    };
    
    this.m_node_ctx.onexception_handle = function(data){
      // self.onstderr.notice(data);
      // console.log('javascript onException', data);
      self.onerror.notice(data);
    };
  },
  
  /**
   * @overwrite
   */
  run: function(){
    
    if(this.m_node_ctx.is_run()){
      throw new Error($t('已经开始运行'));
    }
    
    this.m_node_ctx.start(); // 启动
  },
  
  /**
   * @overwrite
   */
  stop: function(){
    this.m_node_ctx.stop(); // 停止
  }
  
});

