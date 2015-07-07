/**
 * @createTime 2013-11-06
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

include('tesla/gui/root.js');

var tesla_gui_Node_show = tesla.gui.Node.members.show;
var tesla_gui_Node_hide = tesla.gui.Node.members.hide;
var tesla_gui_Node_appendTo = tesla.gui.Node.members.appendTo;

/**
 * @class tesla.gui.Window
 * @extends tesla.gui.Control
 */
$class('tesla.gui.Window', tesla.gui.Control, {

  /**
   * 卸载前
   * @event onbeforeunload
   */
  onbeforeunload: null,

  /**
   * 显示事件
   * @event onshow
   */    
  onshow: null,

  /**
   * 隐藏事件
   * @event onhide
   */
  onhide: null,

  /**
   * 构造函数
   * @param {String} tag
   * @constructor
   */
  Window: function(tag){

    this.Control(tag);
    tesla.EventDelegate.init_events(this, 
      'beforeunload', 'show', 'hide', 'beforeshow', 'beforehide');
    tesla_gui_Node_hide.call(this);

    var root = tesla.gui.root.share();
    if(root){
      this.appendTo(root);
    }
    else{
      throw new Error('Create a window currently exist must have a Root');
    }
  },

  //重写
  show: function(){
    if(!this.visible && this.onbeforeshow.notice()){
      tesla_gui_Node_show.call(this);
      this.onshow.notice();
    }
  },

  //重写
  hide: function(){
    if(this.visible && this.onbeforehide.notice()){
      tesla_gui_Node_hide.call(this);
      this.onhide.notice();
    }
  },

  /**
   * 关闭窗口,成功关闭会返回true
   */
  close: function(){
    if(this.onbeforeunload.notice()){
      this.remove();
    }
  },

  //重写
  appendTo: function(body, id){
    if(tesla.gui.root.is_root(body)) {
      tesla_gui_Node_appendTo.call(this, body, id);
    } else {
      throw new Error('The parent window is necessary for the Root');
    }
  }
});


