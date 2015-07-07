/**
 * @class tesla.gui.Page module in the scene
 * @extends tesla.gui.Control
 * @createTime 2012-06-01
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/event_delegate.js');
include('tesla/url.js');
include('tesla/gui/resources.js');
include('tesla/gui/control.js');

//static private:
var url = tesla.gui.url;
var Control = tesla.gui.Control;
var resources = tesla.gui.resources;
var EventDelegate = tesla.EventDelegate;
var Control_view = tesla.gui.Control.view;
var vxviews = tesla.vx.views;

var DEBUG = tesla.DEBUG;
var HISTORY_COUNT = tesla.config.pageHistoryCount || 15; //历史记录的最大长度
var ALL_PAGE_SESSION = {};      //模块session信息
var ALL_PAGE = {};              //所有模块
var IS_HISTORY_PUSH_STATE = !!history.pushState;
var MODULE = tesla.MODULE;


function getModuleName(name){

	var names = name.split('.');
	var mod_name = names.join('/') + '.js';
	var mod = MODULE[mod_name];
  
	if(mod){
		return { module: mod, name: mod_name };
	}

	names.pop();
	mod_name = names.join('/') + '.js';
	mod = MODULE[mod_name];

	if(mod){
		return { module: mod, name: mod_name };
	}
  return null;
}

function recordHistory(id){

	if(IS_HISTORY_PUSH_STATE){
    history.pushState(id, document.title);
	}
	else{
    location.href = url.set_hash('action', id);
	}
}

function create(pageid, name, message, history_id/*使用历史记录*/){

  var old_page = ALL_PAGE[pageid];
	var prev = old_page.prev || old_page.__prev;
	var parent = old_page.parent || old_page.__parent;
	var top = old_page.top;

  old_page.remove();

    //卸载旧包
	var old = getModuleName(old_page.constructor.fullName);
	var cur = getModuleName(name);
	// TODO TEST ?
	if(old_page.unmod && old && (!cur || old.module !== cur.module)) {
		unmod(old.name);
	}

  //创建新模块
  var klass = tesla.get(name);
	if(!klass)
		throw new Error('"' + name + '" undefined');
		
  var new_page = new klass();
  var historyData = old_page._historyData;
  var id = history_id || (tesla.sysid() + '');

  message = message || {};

  new_page._historyData = historyData;
  new_page._id = id;
  new_page._pageid = pageid;
  new_page.history = !!history_id;
  new_page.message = message;

	var HISTORY_COUNT = Page.HISTORY_COUNT;

	if(HISTORY_COUNT) {

		if(history_id){
	    var index = historyData.innerIndexOf('id', history_id);
			if(index > 0)
				new_page.prevMsg = historyData[index - 1];
		}
		else{
	    var index = historyData.innerIndexOf('id', old_page._id);
			new_page.prevMsg = historyData[index];
	    historyData.splice(index + 1, 10, { message: message, name: name, id: id });
	    historyData.splice(0, historyData.lengt - HISTORY_COUNT);

			recordHistory(id);
		}
  }

	var view = Control_view(new_page.view || new_page.constructor.fullName);
	new_page.__prev = prev;
	new_page.__parent = parent;

	if(top){
		new_page.top = top;
		var id = view.id || new_page.id;
		if(id){
    	if (top[id])
    		throw new Error('不能使用id:"' + id + '",已存在同名属性');
			top[id] = new_page;
		}
	}

	new_page.loadView(view);
	delete new_page.__prev;
	delete new_page.__parent;

	if(prev){
		prev.after(new_page);
	}
	else if(parent){
		parent.append(new_page);
  }
}

//安装场景模块
function _insmod(mid, name, cb){
  
  function load(){
    if(resources.progress == 1){
      nextTick(cb);
    }
    else{
      resources.onload.once(cb);
    }
  }

  var old_page = ALL_PAGE[mid];

  if (old_page) {
    if(old_page.calling){
      var err = 'Module is action';
      console.error(err);
      old_page.ongopageerror.notice('Module is action');
      return;
    }
    old_page.calling = true;
  }

	// TODO TEST ?
	var mod = getModuleName(name);
	if(!mod || mod.module.loaded) {
		return load();
	}

  //使用场景包
  insmod(mod.name, function(err) {

    if (!err) {
      var klass = tesla.get(name);
      if (!klass)
        err = name + ',undefined';
    }

    if(err){
      
      console.error(err);

      if(old_page){
        old_page.calling = false;
        old_page.ongopageerror.notice(err);
      }
	    return;
    }
    load();
  });
}

function go(pageid, name, message){
  _insmod(pageid, name, create.bind(null, pageid, name, message));
}

//跳转到历史记录
function go_history(id) {

	if(id && !Page.DISABLE_HISTORY){

		for(var pageid in ALL_PAGE){
	    var page = ALL_PAGE[pageid];
	    var history = page._historyData;

	    if(id == page._id){ //
        return;
	    }

	    var len = history.length;
	    for(var i = 0; i < len; i++){
        var msg = history[i];

        if(msg.id == id){ //命中历史记录
          //TODO ?
          _insmod(pageid, msg.name,
            create.bind(null, pageid, msg.name, msg.message, id));
          return;
        }
	    }
		}
	}
}

if(IS_HISTORY_PUSH_STATE){
  tesla.on(global, 'popstate', function(evt){
    go_history(evt.state);
  });
}
else{
  tesla.on(global, 'hashchange', function(){
    go_history(url.get_hash('mod_id'));
  });
}

var Node_remove = tesla.gui.Node.members.remove;
var Control_loadView = tesla.gui.Control.members.loadView;

function get_session(_this){
	var name = _this.constructor.fullName;
	var session = ALL_PAGE_SESSION[name] || (ALL_PAGE_SESSION[name] = {});
	return tesla.extend(session, _this.message);
}

function parent_mod(self){
	if(self){
		if(self instanceof Page){
			return self;
		}
		else{
			return parent_mod(self.top);
		}
	}
	return null;
}

var Page =

$class('tesla.gui.Page', Control, {

  //**
  // * 历史数据
  // * @type {Onject[]}
  // */
  _historyData: null,

  //**
  // * 模块id,模块创建
  // * @type {String}
  // */
  _id: '',

  //**
  // * 页面id
  // * @type {String}
  // */
	_pageid: '',

  //public:

	/**
	 * 是否要卸载模块
	 * @type {Boolean}
	 */
	unmod: false,

  /**
   * 模块与模块之间的跳转传递的消息
   * @type {Object}
   */
  message: null,

  /**
   * session
   * @type {Object}
   */
  session: null,

  /**
   * 是否正在呼叫新模块
   * @type {Boolean}
   */
  calling: false,

  /**
   * 上一个模块信息
   * @type {Object}
   */
  prevMsg: null,

  /**
   * 该参数为true时表示当前模块为历史模块
   * @type {Boolean}
   */
  history: false,

  /**
   * @event onbeforeloadview
   */
  onbeforeloadview: null,

  /**
   * @event onunload
   */
  onunload: null,

  /**
   * @event oninsmoderror
   */
  oninsmoderror: null,
  
  /**
   * 模块跳转异常
   * @event ongopageerror
   */
  ongopageerror: null,

  /**
   * 构造
   * @param {String} tag
   * @constructor
   */
  Page: function(tag) {
    var view = vxviews[this.view || this.constructor.fullName];
    this.Control(tag || view && view.tagName);
    this.onbeforeloadview = new EventDelegate('beforeloadview', this);
    this.onunload = new EventDelegate('unload', this);
    this.oninsmoderror = new EventDelegate('insmoderror', this);
    this.ongopageerror = new EventDelegate('gopageerror', this);
  },
  
    //重写
	loadView: function(view){

		if(!this._mid){  //第一次创建

			var msg = {
				id: tesla.sysid() + '',
				name: this.constructor.fullName,
				message: {}
			};

			this._pageid = tesla.sysid() + '';
			this._id = msg.id;
			this.history = false;
			this.message = msg.message;

			if(Page.HISTORY_COUNT && this.constructor.fullName != 'tesla.gui.Page'){
				this._historyData = [msg];
				recordHistory(msg.id);
			}
			else{
				this._historyData = [];
			}
		}
    
		this.session = get_session(this);
    
		ALL_PAGE[this._mid] = this;
    
    if(this.onbeforeloadview.notice()){
      var self = this;
      this.ready_model(function(err, model) {
        if (err) {
          throw err;
        }
        self.model = model;
        self.empty(); // 载入前先清空
        Control_loadView.call(self, view);
        Page.onload.notice(this);
      });
    }
	},
	
  /**
    * 准备数据模型
    * 默认为一个空对像,子类重写这个函数
    */
  ready_model: function(cb) {
    cb(null, { }); 
  },

  //重写
  remove: function(){
    Node_remove.call(this);
    delete ALL_PAGE[this._mid];
  },

  /**
   * 复位当前模块
   */
  reset: function(){
    this.empty();
    var view = Control_view(this.view || this.constructor.fullName);
    this.loadView(view);
  },

  /**
   * 后退至上一个模块
   */
  back: function() {
    var prev = this.prevMsg;
    if(prev)
      go_history(prev.id);
  },
    
  /**
   * 后退至上一个模块,如果当前模块没有后退历史,把该动作传递给父级模块
   */
	backs: function(){
    var prev = this.prevMsg;
    if(prev){
      go_history(prev.id);
    }
	  else{
			var p_mod = parent_mod(this.top);
			if(p_mod){
				p_mod.backs();
			}
		}
	},

  /**
   * 跳转到新模块,卸载当前模块
   * @param {String}   name               模块类型名称
   * @param {Object}   message (Optional) 发送到要新模块的消息
   */
  go: function(name, message) {
    go(this._pageid, name, message);
  }

}, {

	/**
	 * 是否禁用历史记录
	 * @type {Boolean}
	 */
	DISABLE_HISTORY: false,

	/**
	 * 历史记录的最大长度
	 */
	HISTORY_COUNT: tesla.config.pageHistoryCount || 15,

  /**
   * @event onload
   * @static
   */
  onload: new tesla.EventDelegate('load'),
  
  /**
   * create Page
   * @method create
   * @param  {String}  name  Scene class name
   * @return {tesla.gui.Page}
   */
  New: function(name){
    
    var klass = tesla.get(name);
    if (!klass) {
      throw new Error(name + ', undefined, Type error');
    }
    
    var page = new klass();
	  var view = page.view || klass.fullName;

    if (resources.progress == 1) {
      page.loadView(view);
    }
    else {
      resources.onload.once(page.loadView.bind(page, view));
    }
    return page;
  }
});

global.Page = tesla.gui.Page;

