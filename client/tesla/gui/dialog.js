/**
 * @createTime 2013-11-06
 * @author louis.chu <louistru@gmail.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

include('tesla/gui/window.js');

var dialog_stack = []; //显示中的窗口堆栈

/**
 * @class tesla.gui.Dialog
 * @extends tesla.gui.Window
 */
$class('tesla.gui.Dialog', tesla.gui.Window, {

  /**
   * 构造函数
   * @param {String} tag
   * @constructor
   */
  Dialog: function(tag){
    this.Window(tag);
    var self = this;
    
    this.onhide.on(function() {
      if(dialog_stack.desc(0) === self){
        tesla.gui.Dialog.current = null;
        dialog_stack.pop();
      }
      // else{
      //   throw new Error('Remove the stack error dialog');
      // }
    });
    
    this.onshow.on(function(){
      tesla.gui.Dialog.current = self;
      dialog_stack.push(self);
      self.css('z-index', dialog_stack.length + 10000);
    });
  }
}, {

  /**
   * 获取对话框栈
   * @return {Array}
   */
  getStack: function(){
    return dialog_stack;
  },
  
  /**
   * 当前对话框
   * @type {tesla.gui.Dialog}
   */
  current: null,
  
});










