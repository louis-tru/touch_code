/**
 * @createTime 2014-12-24
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */
 
include('tesla/gui/control.js');
include('teide/touch/input.vx');

function update(self){
	self.m_delayid = 0;
  if (!self.input) return;
  
  if(self.input.value){
    self.clear_btn.show();
  } else {
    self.clear_btn.hide();
  }
  if (self.value === '' && self.desc) {
    self.desc_div.show();
  } else {
    self.desc_div.hide();
  }
  self.onchange.notice();
}

function init(self){

  self.on('click', function(){
    self.input.dom.focus();
  });
  //
  self.input.on('keyup', function(evt){
    var keyCode = evt.data.keyCode;
    switch(keyCode){
      case 13:
        self.onenter.notice();
        break;
      case 27:
        self.onesc.notice();
        break;
    }
    update(self);
  });
  
  self.input.on(['copy', 'cut', 'paste', 'change', 'input'], function(){
  	if(self.m_delayid){
  		Function.undelay(self.m_delayid);
  	}
    self.m_delayid = update.delay(50, self);
  });

  self.input.on('focus', function(){
    if (global.FastNativeService && FastNativeService.is_support()) {
      FastNativeService.call('force_browser_focus');
    }
    self.onfocus.notice();
  });
  self.input.on('blur', function() {
    self.onblur.notice();
  });
  
  update(self);

  self.$on('unload', release);
}

function release(self) {
  Function.undelay(self.m_delayid);
}

/**
 * 单行文本输入框
 * @class teide.touch.Input
 * @extends tesla.gui.Control
 */
$class('teide.touch.Input', tesla.gui.Control, {
  
  m_delayid: 0,
  
  m_font_size: 14,

  /**
   * 回车事件
   */
  onenter: null,

  /**
   * Esc 事件
   */
  onesc: null,
  
  onfocus: null,
  onblur: null,
  onchange: null,
  m_desc: '',
  
	/**
	 * @constructor
	 */
  Input: function(tag) {
    this.Control(tag);
    tesla.EventDelegate.init_events(this, 'enter', 'esc', 'change', 'focus', 'blur');
    this.onloadview.$on(init);
  },
  
  get fontSize() {
    return this.m_font_size;
  },
  
  set fontSize(value) {
    this.m_font_size = value;
    this.input.css('font-size', value + 'px');
    this.css('font-size', value + 'px');
  },
  
  get desc() {
    return this.m_desc;
  },
  
  set desc(value) {
    this.m_desc = value;
    this.desc_text.text = value;
  },
  
  get value() {
    return this.input.value;
  },


  set value(value) {
    this.input.value = value;
    update(this);
  },
  
  select: function() {
    this.input.dom.select();
  },
  
  focus: function() {
    this.input.dom.focus();
  },
  
  get max_length() {
    return this.input.attr('maxlength');
  },
  
  set max_length(value) {
    this.input.attr('maxlength', value);
  },
  
  get type() {
    return this.input.attr('type');
  },

  set type(value) {
    this.input.attr('type', value);
  },

  /**
   * 失去焦点
   */
  blur: function() {
    this.input.dom.blur();
  },  
  
  /**
   * 清空文本
   */
  clear: function() {
    this.input.value = '';
    update(this);
    this.clear_btn.hide();
  }
  
});