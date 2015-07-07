/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/gui/dialog.js');
include('teide/touch/dialog.vx');
include('teide/touch/button.js');
include('teide/touch/input.js');

var Button = teide.touch.Button; 
var Control = tesla.gui.Control;
var tesla_gui_Dialog = tesla.gui.Dialog;
var tesla_gui_Window_show = tesla.gui.Window.members.show;
var tesla_gui_Window_hide = tesla.gui.Window.members.hide;
var tesla_gui_Window_close = tesla.gui.Window.members.close;

/**
 * @class teide.touch.BasicDialog
 * @extends tesla.gui.Dialog
 */
$class('teide.touch.BasicDialog', tesla.gui.Dialog, {

  /**
   * 是否显示
   * @private
   */
  m_is_show: false,
  
  /**
   * dialog的宽度
   * @private
   */
  m_width: 262,
  
  /**
   * 设置为true时点击dialog外部就会关闭
   */
  frail: false,
  
	/**
	 * @constructor
	 */
	BasicDialog: function(tag){
		tesla_gui_Dialog.call(this, tag);
    
	},
  
  /**
   * 显示dialog
   */
  show: function () {
    var self = this;
    tesla_gui_Window_show.call(this);
    this.css('display', '');
    this.addClass('show');
    this.m_is_show = true;
    this.bg.animate({ opacity: 0.3 }, 200);
    if(ts.env.ios){
      if(ts.env.ipad){
        this.box.css('width', '380px');
      }
      else{
        this.box.css('width', '90%');
      }
    }
    this.box.animate({ transform: 'scale(0, 0)', opacity: 0.01 }, 0);
    this.box.style = { transform: 'scale(0, 0)', opacity: 0.01 };
    this.box.animate({ transform: 'scale(1, 1)', opacity: 1 }, 200);
  },
  
  /**
   * 隐藏dialog
   */
  hide: function(){
    var self = this;
    this.m_is_show = false;
    this.bg.animate({ opacity: 0.01 }, 200);
    this.box.animate({ transform: 'scale(0, 0)', opacity: 0.01 }, 200, function(){
      if(!self.m_is_show)
        tesla_gui_Window_hide.call(self);
    });
  },
  
  /**
   * 关闭dialog
   */
  close: function(){
    this.hide();
    this.onhide.once(function(){
      tesla_gui_Window_close.call(this);
    });
  },
  
  get width(){
    return this.m_width;
  },
  
  set width(value){
    // /262
    this.m_width = value;
    this.box.css('width', value + 'px');
  },
  
  m_bg_click_handle: function(){
    if(this.frail){
      this.close();
    }
  }
  
});


//--------------------------------------------------
//dialog

function init_DialogMaster(self){
  if(self.buttons.length){
    self.buttons_box.removeClass('hide');
  }
}

/**
 * @class teide.touch.Dialog
 * @extends teide.touch.BasicDialog
 */
global.Dialog = 

$class('teide.touch.Dialog', teide.touch.BasicDialog, {
  
	/**
	 * @constructor
	 */
  Dialog: function(tag){
    this.BasicDialog(tag);
    this.onloadview.$on(init_DialogMaster);
  },

  get title(){
    return this.title_box.html;
  },
  
  set title(value){
    this.title_box.html = $t(value);
    if(value){
      this.title_box.show();
    }
    else{
      this.title_box.hide();
    }
  },
  
  get content(){
    return this.content_box.html;
  },
  
  set content(value){
    this.content_box.html = $t(value).replace(/\n/g, '<br/>');
  },
  
  get buttons (){
    var els = this.buttons_box.children();
    var rest = [];
    els.forEach(function(el){
      if(el instanceof Button){
        rest.push(el);
      }
    });
    return rest;
  },
  
  set buttons(buttons){

    if (!Array.isArray(buttons)) { //不为数组

      var btns = [];
      for (var name in buttons) {
        var btn = Control.New('DialogButton');
        btn.value = $t(name);
        btn.on('click', buttons[name]);
        btns.push(btn);
      }
      buttons = btns;
    }
    
    this.buttons_box.empty();
    
    if(buttons.length){
      this.buttons_box.removeClass('hide');
    }
    else{
      this.buttons_box.hide();
      this.buttons_box.addClass('hide');
    }

    buttons = buttons || [];
    
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].on('click', Dialog.close);
      buttons[i].appendTo(this.buttons_box);
    }
  }
}, {
  
  /**
   * 显示对话框
   * @param {String}            text               内容
   * @param {String}            title   (Optional) 标题
   * @param {Object}            buttons (Optional) 按钮集合
   */
  show: function (text, title, buttons) {
    var dag = new Control.New('EmptyShareDialog');
    dag.title = title || '';
    dag.buttons = buttons;
    dag.content = text;
    dag.show();
    dag.dom.focus.delay(dag.dom, 220);
  },

  /**
   * 警报
   * @param {String}   text 警报内容
   * @param {Function} cb (Optional) 事件处理
   */
  alert: function (text, cb) {
    text = text ? $t(text + '') : '';
    if(FastNativeService.is_support()){
      return FastNativeService.call('alert', [text], cb);
    }
    Dialog.alert_html(text, cb);
  },

  alert_html: function(text, cb){
    var dag = Control.New('AlertDialog');
    dag.buttons[0].on('click', cb || tesla.noop);
    dag.content = text || '';
    dag.show();
    dag.dom.focus.delay(dag.dom, 220);
    return dag;
  },

  /**
   * 错误提示
   * 显示在最上面
   */
  error: function (text, cb) {
    text = text ? $t(text + '') : '';
    if(FastNativeService.is_support()){
      return FastNativeService.call('alert', [text], cb);
    }
    Dialog.error_html(text, cb);
  },

  error_html: function(text, cb){
    var dag = Dialog.alert_html(text, cb);
    dag.css('z-index', 12000);
    return dag;
  },

  /**
   * 确认
   * @param {String}   text 确认内容
   * @param {Function} cb 回调
   */
  confirm: function (text, cb) {
    text = text ? $t(text + '') : '';
    if(FastNativeService.is_support()){
      return FastNativeService.call('confirm', [text], cb);
    }
    Dialog.confirm_html(text, cb);
  },

  confirm_html: function(text, cb){
    var dag = Control.New('ConfirmDialog');
    if(cb){
      dag.buttons[0].on('click', cb.bind(null, false));
      dag.buttons[1].on('click', cb.bind(null, true));
    }
    dag.content = text || '';
    dag.show();
    dag.dom.focus.delay(dag.dom, 220);
    return dag;
  },
  
  delete_file_confirm: function(text, cb){
    text = text ? $t(text + '') : '';
    if(FastNativeService.is_support()){
      return FastNativeService.call('delete_file_confirm', [text], cb);
    }
    Dialog.delete_file_confirm_html(text, cb);
  },
  
  delete_file_confirm_html: function(text, cb){
    var dag = Control.New('DeleteFileConfirmDialog');
    if(cb){
      dag.buttons[0].on('click', cb.bind(null, 0));
      dag.buttons[1].on('click', cb.bind(null, 1));
      dag.buttons[2].on('click', cb.bind(null, 2));
    }
    dag.content = text || '';
    dag.show();
    dag.dom.focus.delay(dag.dom, 220);
    return dag;
  },
  
  /**
   * 提示输入
   */
  prompt: function(text, input, cb){

    if(typeof input == 'function'){
      cb = input;
      input = '';
    }

    text = text ? $t(text + '') : '';
    input = input ? $t(input + '') : '';

    if(FastNativeService.is_support()){
      return FastNativeService.call('prompt', [text, input], cb);
    }

    Dialog.prompt_html(text, input, cb);
  },
  
  prompt_html: function(text, input, cb){

    if(typeof input == 'function'){
      cb = input;
      input = '';
    }
    
    text = text ? $t(text + '') : '';
    input = input ? $t(input + '') : '';

    var dag = Control.New('PromptDialog');
    if(cb){
      dag.buttons[0].on('click', cb.bind(null, null));
      dag.buttons[1].on('click', function(){
        cb(dag.input.value);
      });
      dag.input.onenter.on(function(){
        dag.close();
        cb(dag.input.value);
      });
      dag.input.onesc.on(function(){
        dag.close();
        cb(null);
      });
    }
    // TODO set content
    dag.prompt_text.html = text;
    dag.input.value = input;
    dag.show();
    dag.input.focus.delay(dag.input, 300);
    return dag;
  },

});

