/**
 * @createTime 2015-06-10
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://mooogame.com
 * @version 1.0
 */
 
include('tesla/gui/control.js');
include('teide/touch/number_roller.vx');

function init(self){
  
  self.minus.on('click', function(){
    self.value = self.m_value - 1;
  });
  
  self.plus.on('click', function(){
    self.value = self.m_value + 1;
  });
  
}

/**
 * @class teide.touch.NumberRoller
 * @extends tesla.gui.Control
 */
$class("teide.touch.NumberRoller", tesla.gui.Control, {
  
  min: 0,
  max: 0, // 最大与最小相同表示不限制
  m_value: 0,
  
  m_format: '{0}',
  
  // 变化事件
  onchange: null,
  
	/**
	 * @constructor
	 */
  NumberRoller: function () {
    this.Control('span');
    ts.EventDelegate.init_events(this, 'change');
    this.onloadview.$on(init);
  },
  
  get format(){
    return this.m_format;
  },
  
  set format(value){
    this.m_format = value;
    this.val_box.text = value.format(this.m_value);
  },
  
  get value(){
    return this.m_value;
  },
  
  set value(value){
    
    if(value == this.m_value) return;
    
    if(this.min == this.max){ // 无限制
      this.m_value = value;
      this.onchange.notice(this.m_value);
    }
    else{
      var tmp = Math.min(Math.max(value, this.min), this.max);
      if(tmp == this.m_value) return;
      this.m_value = tmp;
    }
    this.val_box.text = this.format.format(this.m_value);
    this.onchange.notice(this.m_value);
  },
  
});

