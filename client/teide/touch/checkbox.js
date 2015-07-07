/**
 * @createTime 2015-06-10
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://mooogame.com
 * @version 1.0
 */
 
include('tesla/gui/control.js');
include('teide/touch/checkbox.vx');

function init(self){
  self.checkbox.on('click', function(){
    self.selected = !self.selected;
  });
}

/**
 * @class teide.touch.Checkbox
 * @extends tesla.gui.Control
 */
$class("teide.touch.Checkbox", tesla.gui.Control, {
  
  m_selected: false,
  m_disable: false,
  
  // 变化事件
  onchange: null,
  
	/**
	 * @constructor
	 */
  Checkbox: function () {
    this.Control('span');
    tesla.EventDelegate.init_events(this, 'change');
    this.onloadview.$on(init);
  },

  get disable(){
    return this.m_disable;
  },

  set disable(value) {
    this.m_disable = !!value;
    this.style = value ? {
      'pointer-events': 'none',
      'opacity': 0.5,
    } : {
      'pointer-events': 'auto',
      'opacity': 1,
    };
  },
  
  get selected(){
    return this.m_selected;
  },
  
  set selected(value){
    
    value = !!value;
    if(value == this.m_selected) return;
    
    this.m_selected = value;
    
    if(value){
      this.checkbox.addClass('on');
    }
    else{
      this.checkbox.removeClass('on');
    }
    this.onchange.notice(value);
  },
});

