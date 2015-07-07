/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/gui/session_control.js');
include('teide/touch/button.js');

var Button = teide.touch.Button;

function on_children_click_handle(self, evt){

  var id = evt.sender.id;
  if(id == self.value){
    return;
  }

  self.value = id;
  self.onchange.notice(id);
}

function init(self){

  var value = self.value;

  self.children().forEach(function(btn){
    if(btn instanceof Button){
      btn.$on('click', on_children_click_handle, self);
    }
  });
  
  if(self.m_value){ //有选择值
    self[self.m_value].click();
  }
}

/**
 * @class teide.touch.GroupButton
 * @extends tesla.gui.SessionControl
 */
global.GroupButton = 
$class('teide.touch.GroupButton', tesla.gui.SessionControl, {

  m_value: null,
  m_init: false,
  onchange: null,
  
	/**
	 * @constructor
	 */
  GroupButton: function(tag){
    this.SessionControl(tag);
    tesla.EventDelegate.init_events(this, 'change');
    this.onloadview.$on(init);
  },
  
  setValue: function(value){
    if(this[this.m_value]){
      this[this.m_value].selected = false;
    }
    var btn = this[value];
    if(!btn && btn instanceof Button){
      return;
    }
    this.m_value = value;
    this.saveSession(value);
    btn.selected = true;
  },
  
  get value(){
    return this.m_value;
  },
  
  set value(value){
    this.setValue(value);
    if(this.m_init){        //是否已经初始化
      btn.click();
    }
  },
  
  get session(){
    return this.value;
  },
  
  set session(value){
    this.value = value;
  }
}); 



