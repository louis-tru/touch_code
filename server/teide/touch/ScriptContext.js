/**
 * @createTime 2015-06-01
 * @author louis.tru <louistru@live.com>
 * @copyright © 2015 louis.chu, http://mooogame.com
 * @version 1.0
 */

/**
 * @class teide.touch.ScriptContext
 */
Class('teide.touch.ScriptContext', {
  
  //
  m_name: '', // 代码文件名称
  m_path: '', // 代码文件路径
  
  /**
   * @event onstdout
   */
  onstdout: null,
  
  /**
   * @event onstderr
   */
  onstderr: null,
  
  /**
   * @event onerror
   */
  onerror: null,
  
  /**
   * @event onexit
   */
  onexit: null,
  
  /**
   * @constructor
   */
  ScriptContext: function(name){
    tesla.Delegate.def(this, 'stdout', 'stderr', 'error', 'exit');
    this.m_name = name;
    this.m_path = 
      teide.touch.TouchServer.share().getDocumentsPath() + name;
  },
  
  get name(){
    return this.m_name;
  },
  
  get path(){
    return this.m_path;
  },
  
  /**
   * 运行脚本
   */
  run: virtual,
  
  /**
   * 停止运行
   */
  stop: virtual
  
});
