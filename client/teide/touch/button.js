/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/button.vx');

function start(self) {
  self.addClass('son');
  // self.animate({'transform': 'scale(1.15)'}, 150);
  // self.animate({'transform': 'scale(1)'}, 100);
  if(self.music){
    // TODO ?
  }
}

function end(self) {
  self.removeClass('son');
}

function init(self) {

  self.attr('class', 'button ' + self.attr('class'));
  
  //self.css('transition-property', '-webkit-transform');

  if (tesla.env.mobile) {
    self.$on('touchstart', start);
    self.$on('touchend', end);
  }
  else { //pc
    self.$on('mousedown', start);
    self.$on('mouseup', end);
    self.$on('mouseout', end);
  }
}


/**
 * @class teide.touch.Button
 * @extends tesla.gui.Control
 */
global.Button = 
$class("teide.touch.Button", tesla.gui.Control, {

  /**
   * 按钮颜色
   * @private
   */
  m_color: 'blue', // blue | red | green | grey
  
  /**
   * 按钮类型
   * @private
   */
  m_type: 'basic',     // basic | circle | min | back | dialog
  
  /**
   * 在按钮组中是否被选中
   * @private
   */
  m_selected: false,
  
  /**
   * 点击按钮的声音
   */ 
  music: '',

  get selected(){
    return this.m_selected;
  },

  set selected(value){
    this.m_selected = value;
    if(value){
      this.addClass('on');
    }
    else{
      this.removeClass('on');
    }
  },

  get value(){
    return this.html;
  },

  set value(value){
    this.html = $t(value);
  },
  
  get color(){
    return this.m_color;
  },
  
  set color(value){
    this.removeClass(this.m_color);
    this.addClass(value);
    this.m_color = value;
  },
  
  get type(){
    return this.m_type;
  },
  
  set type(value){
    if(ts.env.ios && ts.env.ios_version >= 8.2 && ts.env.ios_version < 10){
      this.removeClass(this.m_type + ' fine');
      this.addClass(value + ' fine');
    }
    else{
      this.removeClass(this.m_type);
      this.addClass(value);
    }
    this.m_type = value;
  },

	/**
	 * @constructor
	 */
  Button: function (tag) {
    this.Control(tag);
    this.onloadview.$on(init);
  },

  click: function (msg) {
    this.notice("click", msg);
  }

});


