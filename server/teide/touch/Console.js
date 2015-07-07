/**
 * @createTime 2015-01-16
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/Delegate.js');
include('tesla/Extend.js');

var share_console = null;

Class('teide.touch.Console', {
  
  /**
   * 日志事件
   */
  onlog: null,
  
  /**
   * 错误日志事件
   */
  onerror: null,
  
  Console: function(){
    tesla.Delegate.def(this, 'log', 'error');
  },
  
  /**
   * 记录日志
   */
  log: function(){
    var args = Array.toArray(arguments);
    var log = args.join(' ');
    this.onlog.emit(log);
    if(tesla.DEBUG){
      console.log.apply(console, args);
    }
  },
  
  /**
   * 记录错误日志
   */
  error: function(){
    var args = Array.toArray(arguments);
    var log = args.join(' ');
    this.onerror.emit(log);
    if(tesla.DEBUG){
      console.error.apply(console, args);
    }
  }
  
}, {
  
  /**
   * 获取共享控制台
   */
  share: function(){
    
    if(!share_console){
      share_console = new teide.touch.Console();
    }
    return share_console;
  }
});
