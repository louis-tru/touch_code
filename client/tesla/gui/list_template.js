/**
 * @class tesla.gui.ListTemplate 数据列表模板
 * @extends tesla.gui.Control
 * @createTime 2012-06-01
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/gui/control.js');
include('tesla/data/service_data_source.js');
include('tesla/data/data.js');

var REG_EXP = /^(Page|Load|Empty)Template$/;
var Data = tesla.data.Data;
var Node = tesla.gui.Node;
var Control = tesla.gui.Control;
var DataSource = tesla.data.DataSource;
var ServiceDataSource = tesla.data.ServiceDataSource;
var body = tesla.vx.views;
var doc = document;

//复制视图数据
function cloneView(obj, data, out) {
  
  if (typeof obj == 'string') {
    
    var mat = obj.match(/^{([^\{\}]+)}$/);
    if (mat) { // 做为对像使用
      
      var name = mat[1];
      if (name == '$'){
        return val.$;
      }
      
      var val = tesla.get(name, data);
      if (val !== undefined){
        return val;
      }
    }
    else{ // 只做字符串使用
      return obj.replace(/{([^\{\}]+)}/gm, function(all, name) {
        var r = tesla.get(name, data);
        return (r === undefined ? all : r);
      });
    }
  }
  else if (obj) {

    if (Array.isArray(obj)) {
      var newObj = [];
      var len = obj.length;
      for (var i = 0; i < len; i++) {
        newObj[i] = cloneView(obj[i], data, out);
      }
      return newObj;
    }

    else if (typeof obj == 'object') {

      var newObj = {};
      for (var i in obj){
        newObj[i] = cloneView(obj[i], data, out);
      }
      
      if(obj.te === 0){
        newObj.text += '';
      }
      else if ('id' in obj){
        out[newObj.id] = true;
      }

      return newObj;
    }
  }
  return obj;
}

//载入普通元素
function loadDom(parent, view) {
  var el = $(view.tagName);
  el.appendTo(parent, view.id);
  return el;
}

//载入控件
function loadControl(self, parent, view, ds) {
  var view01 = body[view.view];

  //普通控件
  if (!view01 || !/^(Group|Item)Template$/.test(view.app + '')){
    return Control.New(view, parent);
  }

  //以下为模板
  var templateChild = view01.__c;
  if (!templateChild)
      return;

  var count = view.count || 1e5;

  if(view.app == 'ItemTemplate'){
    
    for (var i = 0; i < count && ds.length; i++) {
      var out = {};
      var data = ds.pop();
      var len = templateChild.length;

      for (var j = 0; j < len; j++) {
        var v = templateChild[j];
        v = Control.formatView(cloneView(v, data, out)); //获取新视图
        _load[v.te](self, parent, v, ds);
      }

      var items = self.items;
      for (var id in out) {
        out[id] = self[id];
        delete self[id];
      }

      items.push(out);
      self.onrenderitem.notice(
        { template: self, data: data, item: out, index: items.length - 1 });
    }
  }
  else{
    
    for (var i = 0; i < count && ds.length; i++) {
      var len = templateChild.length;
      for (var j = 0; j < len; j++) {
        var v = templateChild[j];
        _load[v.te](self, parent, v, ds);
      }
    }
  }
}

var _load = [
  
  function(self, parent, v){ //模板下的字符串
    parent.idom.appendChild(doc.createTextNode(v.text));
  },
  
  loadControl, //模板下的控件
  
  function(self, parent, v, ds){ //模板下的普通元素
    load(self, loadDom(parent, v), v, ds);
  }
];

//载入
function load(self, parent, view, ds) {
	loadChild(self, parent, view.__c, ds);
  Control.extend(parent, view);
}

function loadChild(self, parent, child, ds){
	if(child){
    var len = child.length;
    for (var i = 0; i < len; i++) {
      var v = child[i];
      _load[v.te](self, parent, v, ds);
    }
	}
}

/**
 * 新的附件容器
 */
function NewAnnex(self){
  deleteAnnex(self);
  var annex = $('div');
  annex.attr('class', 'annex');
  annex.appendTo(self);
  self.m_annex = annex;
  return annex;
}

function deleteAnnex(self){
  if(self.m_annex){
    self.m_annex.remove(); // 先删除
    self.m_annex = null;
  }
}

//数据源查询事件处理器
function dataSourceSelectedHandler(self, event) {
  
  var data = event.data;

  if (!self.onbeforerender.notice(data))
    return;

  var emptyTemplate = self.emptyTemplate;
  var pageTemplate = self.pageTemplate;

  deleteAnnex(self); // 删除附件

  // 增量加载不需要清空
  if(!event.sender.incrementLoad){
    self.empty();
  }

  if (data.length) {
    if (pageTemplate) {
      var originLength = self.items.length;
      data = data.map(function(item, index){
        return tesla.extend({ $index: originLength + index, $: item, $top: self }, item);
      }).reverse();
      loadChild(self, self, pageTemplate.__c, data);
    }
  }
  //没有数据显示空模板
  else if (emptyTemplate) {
	  loadChild(self, NewAnnex(self), emptyTemplate.__c, data);
  }
  self.onrender.notice();
}

function beforeLoadHandler(self){ 
  // beforeloadHandler
  var loadTemplate = self.loadTemplate;
  if (loadTemplate) {
	  loadChild(self, NewAnnex(self), loadTemplate.__c, []);
  }
}

// 取消或异常
function AbortOrErrorEventHandle(self, evt){
  deleteAnnex(self); // 清空附件
  if(!self.items.length){ // 当前没有数据时候使用空模板
    var emptyTemplate = self.emptyTemplate;
    if(emptyTemplate){
      loadChild(self, NewAnnex(self), emptyTemplate.__c, []);
    }
  }
}

// 清空数据事件
function clearEventHandle(self, evt){
  self.empty();
}

function bind(self, source){
  var oldSource = self._ds;
  if(oldSource/* instanceof DataSource*/){
    oldSource.onbeforeload.off(beforeLoadHandler, self);
    oldSource.onload.off(dataSourceSelectedHandler, self);
    oldSource.onabort.off(AbortOrErrorEventHandle, self);
    oldSource.onerror.off(AbortOrErrorEventHandle, self);
    oldSource.onclear.off(clearEventHandle, self);
  }
  source.onbeforeload.$on(beforeLoadHandler, self);
  source.onload.$on(dataSourceSelectedHandler, self);
  source.onabort.$on(AbortOrErrorEventHandle, self);
  source.onerror.$on(AbortOrErrorEventHandle, self);
  source.onclear.$on(clearEventHandle, self);
  self._ds = source;
}

//通过视图解析模板
function parseTemplates(view){

  var child = view.__c;

  if (!child) {
      return { };
  }

  var rest = { };

  for (var i = 0; i < child.length; i++) {

    var item = child[i];
    var template = body[item.view];

    if(template){

      switch(item.app){
        case 'PageTemplate':
          rest.pageTemplate = template;
          break;
        case 'LoadTemplate':
          rest.loadTemplate = template;
          break;
        case 'EmptyTemplate':
          rest.emptyTemplate = template;
          break;
      }
    }
  }
  return rest;
}

function getSource(self, source) {

  if(typeof source == 'string'){

    var top = self.top;
    var ds;

    while (top) {

      ds = top[source];

      if (ds instanceof DataSource) {
        return ds;
      }
      top = top.top;
    }

    throw new Error(source + ',数据源不存在');
  }
  else if (source instanceof DataSource) {
    return source;
  }
  else{
    throw new Error('数据源类型错误');
  }
}

var Control_loadView = Control.members.loadView;
var Control_view = Control.view;

$class('tesla.gui.ListTemplate', Control, {

  //pivate:
  _ds: null,
  
  /**
   * 显示 loadTemplate emptyTemplate 的附件节点
   * @private
   */
  m_annex: null,

  //public:
  /**
   * 内部列表项目,ItemTemplate id的索引
   * @type {Array} 
   */
  items: null,

  /**
   * 页模板
   * @type {Object}
   */
  pageTemplate: null,

  /**
   * loading模板
   * @type {Object}
   */
  loadTemplate: null,

  /**
   * 空数据模板
   * @type {Object}
   */
  emptyTemplate: null,

  /**
   * 数据源
   * @type {tesla.data.DataSource}
   */
  get dataSource(){
      return this._ds;
  },

  set dataSource(source){

    if(source instanceof Data){
      nextTick(this._ds, this._ds.loadData, source.data);
    }
    else if(Array.isArray(source)){
      nextTick(this._ds, this._ds.loadData, source);
    }
    else{
      bind(this, getSource(this, source));
    }
  },

  /**
   * @event onbeforerender
   */
  onbeforerender: null,

  /**
   * @event onrender
   */
  onrender: null,

  /**
   * @event onrenderitem
   */
  onrenderitem: null,

  /**
   * 构造函数
   * @constructor
   * @param {String} tagName (Optional) 元素名称,默认使用div
   */
  ListTemplate: function(tagName) {
    this.Control(tagName);
    tesla.EventDelegate.init_events(this, 'beforerender', 'render', 'renderitem');
    this.items = [];
    bind(this, new DataSource());
  },

  //重写,从视图数据中提取Template
  loadView: function(view) {

    view = tesla.extend({}, Control_view(view));
    tesla.extend(this, parseTemplates(view));

    view.__c = null;
    Control_loadView.call(this, view);
  },

  /**
   * 显示loadTemplate
   */
  showLoadTemplate: function(){
    beforeLoadHandler(this);
  },
  
  /**
   * 清空
   */
  empty: function(){
    this.m_annex = null;
    this.items = [];
    tesla.gui.Node.members.empty.call(this);
  }

}, {

  /**
   * 通过视图解析模板
   * @methot getTemplates
   * @param  {Object} view
   * @return {Object}
   * @static
   */
  parseTemplates: parseTemplates,
  
  /**
   * 获取数据源
   * @methot getSource
   * @param  {Object} source
   * @return {tesla.data.DataSource}
   * @static
   */
  getSource: getSource
    
});

global.ListTemplate = tesla.gui.ListTemplate;