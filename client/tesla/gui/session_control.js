/**
 * @class tesla.gui.SessionControl 控件,派生于tesla.gui.Control,可保存session状态
 * @extends tesla.gui.Control
 * @createTime 2013-01-16
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/gui/control.js');
include('tesla/gui/page.js');

var Page = tesla.gui.Page;
var SESSION_NAME = '_SESSION_CONTROL_NAME';
var ALL_SESSION = { };

function get_page(self){

  var top = self.top;

  while(top){
    if(top instanceof Page){
      return top.view || top.constructor.fullName;
    }
    top = top.top;
  }
  return '';
}

function init(self){

  var page = get_page(self);
  self.m_key = tesla.hash(SESSION_NAME + page + self.id);

  var value = self.use && ALL_SESSION[self.m_key] || self.session;
  if(value){
    self.session = value;
  }

  self.on('change', function(){
    self.saveSession(self.session);
  });
}

$class('tesla.gui.SessionControl', tesla.gui.Control, {
    
  //private:
  m_key: '',

  //public:
  /**
   * session 开关,默认为打开
   * @type {Boolean}
   */
  use: true,

  /**
   * 构造函数
   * @constructor
   * @param {String} tag (Optional) 元素名称,默认使用div
   */
  SessionControl: function(tag){
    this.Control(tag);
    this.onloadview.$on(init);
  },

  /**
   * 保存session
   * @param {Object} value
   */
  saveSession: function(value){
    var key = this.m_key;
    if(key && this.use){
      ALL_SESSION[key] = value;
    }
  },

  /**
   * 获取session,可重写该属性
   * get session 
   * @type {Object}
   */
  get session(){
    return this.dom.value;
  },

  /**
   * 获取session,可重写该属性
   * set session 
   * @type {Object}
   */
  set session(value) {
    this.dom.value = value;
    this.saveSession(value);
  }

});






