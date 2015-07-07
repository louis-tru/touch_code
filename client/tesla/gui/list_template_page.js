/**
 * @class tesla.gui.ListTemplateScroll 数据列表模板页
 * @extends tesla.gui.ScrollView
 * @createTime 2013-07-01
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */
 
'use strict';

include('tesla/gui/scroll_view.js');
include('tesla/gui/list_template.js');

var Data = tesla.data.Data;
var Control = tesla.gui.Control;
var ListTemplate = tesla.gui.ListTemplate;
var Control_view = Control.view;
var ServiceDataSource = tesla.data.ServiceDataSource;
var Control_loadView = Control.members.loadView;
var Node_append = tesla.gui.Node.members.append;
var parseTemplates = ListTemplate.parseTemplates;
var getSource = ListTemplate.getSource;

var Template = 

$class('Template', tesla.gui.ScrollView, {

  //模板对应的页面
  _page: -1,

  //当前模板数据量
  _size: 0,

  //是否正在加载中
  _loading: false,

  //关闭
  _closed: false,
  
  hScroll: false,
  vScroll: true,
  hScrollbar: false,
  vScrollbar: true,
  lockDirection: 2,
  //wheelReverse: true,
  
  //tesla.gui.ListTemplate
  value: null,

  Template: function(){
    this.ScrollView();
    this.scroller.remove();
    this.scroller = this.value = new ListTemplate();

    this.idom = this.dom;
    Node_append.call(this, this.value);
    this._atts.idom = this.value.dom;
    this.idom = this.value.dom;
    
    this.value.style = {
      'transform-style': 'preserve-3d', 
      'position': 'absolute',
      'transform-origin': '0 0',
      'min-width': '100%',
      'min-height': '100%'
    };
    this.onloadview.notice();
  }
});

// 绑定数据源
function bind(cthis, source){

  var oldSource = cthis._ds;
  
  if(oldSource){
    oldSource.onbeforeload.off(beforeLoadHandler, cthis);
    oldSource.onload.off(dataSourceSelectedHandler, cthis);
  }
  source.onbeforeload.$on(beforeLoadHandler, cthis);
  source.onload.$on(dataSourceSelectedHandler, cthis);
  cthis._ds = source;
}

// 滚动时载入数据
function _h_scroll(cthis){
  // TODO ?

  var width = cthis.viewWidth;
  var scroll = cthis.scrollLeft;
  var page = Math.round(scroll / width);
  
  if(page == cthis.page || page < 0 || page + 1 > cthis.totalPage){
    return;
  }
  cthis.page = page;
  cthis.onscrollpage.notice(page);

  cthis._ds.delayRequest = 500;
  cthis._ds.load({ index: page * cthis.pageSize, empty: true });
}

// 数据源加载事件处理器
function dataSourceSelectedHandler(cthis, event) {

  var data = event.data;
  var param = event.sender.param;
  var total = event.sender.total;
  var pageSize = cthis.pageSize;
  var totalPage = Math.ceil(total / pageSize);

  cthis.totalPage = totalPage;
  cthis.total = total;

  // TODO ? 根据数据总数重新计算页面索引位置
  // 数据源返回数据原则 index与length指示和数据块如有空缺部分,
  // index向左边移动(递减)直到能最大限度填满length

  //数据真实index与length
  var index = param.index;
  var length = data.length;
  var i = index + param.length - total;

  if(i > 0){
    index -= i;
    if(index < 0){
      index = 0;
    }
  }

  //重新初始页
  var pages = [];
  var mod = index % pageSize;

  //数据开始位置不是页的首位,抛弃该数据
  if(mod !== 0){

    var j = pageSize - mod;
    index += j;
    length -= j;

    if(length <= 0){
      throw new Error('数据错误');
    }
    data.splice(0, j);
  }

  var maxLength = pageSize * 3;

  //数据长度大于三页,最长不能超过三页,抛弃多于部分数据
  if(length > maxLength){ 
    length = maxLength;
    data.splice(maxLength, length - maxLength);
  }

  //重新设置正确参数
  param.index = index;
  param.length = length;

  //新数据块列表
  var newData = [];
  var len = Math.ceil(length / pageSize);
  var startPage = index / pageSize;

  for(i = 0; i < len; i++){
    var start = pageSize * i;
    var item = data.slice(start, start + pageSize);
    newData.push(item);
    pages.push(startPage + i);
  }

  //重新设置滚动位置
  var width = cthis.viewWidth;
  var scroll = cthis.scrollLeft;
  var curPage = Math.round(scroll / width);
  var page = Math.min(cthis.page, totalPage);

  cthis.scroller.css('width', width * totalPage + 'px');

  //当前位置不对,重新设置滚动位置
  if(page != curPage){
    cthis.set(page * pageSize, 0, null, 0);
  }

  getAvailablePages(cthis, pages);

  //得到的新模板
  var templates = initTemplateObject(cthis, pages);

  cthis.page = page;
  cthis.onscrollpage.notice(page);
  
  if (!cthis.onbeforerender.notice(data))
    return;

  templates.forEach(function(template, index){
    template._loading = false;
    template.value.dataSource.loadData(newData[index].map(function(item){
      return tesla.extend({ $$top: cthis }, item);
    }));
    template.set(0, 0, null, 0);
  });

  cthis.onrender.notice();
}

function createTemplateObject(cthis){

  var template = new Template();
  template.value.pageTemplate = cthis.pageTemplate;
  template.value.loadTemplate = cthis.loadTemplate;
  template.value.emptyTemplate = cthis.emptyTemplate;

  template.style = { position: 'absolute' };
  template.appendTo(cthis);

  cthis.onrenderitem.shell(template.value.onrenderitem); //事件包壳
  return template;
}

// 获得可用的页面
function getAvailablePages(cthis, pages){

  var templates = cthis.templates.concat();
  do{
    var ls = [-1, 1];
    var b = false;

    for(var i = 0; i < 2; i++){

      var page = (i === 0 ? pages[0]: pages.desc(0)) + ls[i];
      var index = templates.innerIndexOf('_page', page);

      if(index != -1){
        var template = templates[index];
        if(!template._loading && !template._closed){
          pages[i === 0 ? 'unshift': 'push'](page);
        }
        templates.splice(index, 1);
        b = true;
      }

      if(pages.length == 3){
        return pages;
      }
    }

    if(!b)
      break;
  } while(templates.length);
  return pages;
}

// 最多三个template,前后各一个
// pages 要加载的页
// force 强制加载
// 顺序返回要加载的页模板
function initTemplateObject(cthis, pages, force, empty){

  var templates = cthis.templates;
  var rest = [];

  if(!templates){
    cthis.templates = templates = [];
    templates.push(createTemplateObject(cthis));
    templates.push(createTemplateObject(cthis));
    templates.push(createTemplateObject(cthis));
  }

  var width = cthis.viewWidth;
  var style = { overflow: 'hidden', width: width + 'px', height: '100%', top: 0 };

  templates = templates.concat();
  
  if(!force){ //排除相同的(page),相同的不需要更新,除非强制更新

    for(var j = templates.length - 1; j > -1; j--){

      var template = templates[j];
      if(!template._loading && template._size == cthis.pageSize){

        var index = pages.indexOf(template._page);

        if(index != -1){ //找到相同
          pages.splice(index, 1);
          templates.splice(j , 1);
        }
      }
    }
  }

  pages = pages.concat();

  //查找相同位置的与相同大小模板
  for(var i = templates.length; i > -1; i--){

    var template = templates[i];
    var index = pages.indexOf(templates._page);

    //位置(page)与大小(pageSize)相同,不需要设置样式
    if(index != -1 && template._size == cthis.pageSize){ 
      if(!template._loading){ //如果当前模板没有显示loading
        if(empty)
          template.empty();
        template.value.showLoadTemplate();
        template._loading = true;
      }
      pages.splice(index, 1);
      templates.splice(i , 1);
      rest.push(template);
    }
  }

  //没有对应相同位置与相同大小的模板
  for(var i = 0; i < pages.length; i++){

    var page = pages[i];
    var template = templates.shift();
    template._page = page;
    template._size = cthis.pageSize;
    template.style = style;
    template.css('left', page * width + 'px');

    if(!template._loading){
      if(empty)
        template.empty();
      template.value.showLoadTemplate();
      template._loading = true;
    }

    if(template._closed){
      template._closed = false;
      template.show();
    }
    rest.push(template);
  }
  
  for(var i  = 0; i < templates.length; i++){
    var template = templates[i];
    template.hide();
    template._closed = true;
    template._page = -1;
  }

  //排序
  return rest.sort(function (a, b){ return a._page > b._page });
}

// 数据源加载前处理器,处理载入参数
function beforeLoadHandler(cthis, evt){

  var pageSize = cthis.pageSize;
  
  if(!pageSize){
    throw new Error('tesla.gui.ListTemplatePage.pageSize can not be zero');
  }

  cthis._ds.abort();
  cthis.catchX = cthis.viewWidth;

  var param = evt.data;

  if('static' in param){ //如果为静态数据,从0页开始
    initTemplateObject(cthis, [0, 1], true);
    return;
  }

  var index = param.index;
  var totalPage = cthis.totalPage;

  //默认为使用上一页面参数,初始化时应该为上一个参数应该为零
  //如果没有传入index参数,表示强制重新加载当前页数据
  if(!('index' in param)){ 
    index = pageSize * cthis.page;
    param.force = true;
  }

  var page = Math.round(index / pageSize); //根据index得到的page值

  //最多三个template,前后各一个,0,1,2
  var pages = [page - 1, page, page + 1];

  // TODO ? init pages

  if(!page){ //等于零时
    pages.shift();
  }

  if(totalPage && page + 1 >= totalPage){ //totalPage 不等于零时并且
    pages.pop();
  }

  //page 0,1,2
  //param.force 强制载入
  var templates = initTemplateObject(cthis, pages, param.force, param.empty);
  delete param.force;
  delete param.empty;

  var len = pages.length;

  // 如果没有数据要加载，返回false
  if(len){
      
    param.index = pages[0] * pageSize;
    param.length = len * pageSize;
    //totalPage 不为0时,如果是最后一页
    if(totalPage && pages.desc(0) + 1 >= totalPage){ 
      var mod = cthis._ds.total % pageSize;
      if(mod){
        param.length -= pageSize - mod;
      }
    }
  }
  else{
    evt.return_value = false;
  }
}

$class('tesla.gui.ListTemplatePage', tesla.gui.ScrollView, {

  //pivate:
  _ds: null,

  //重写
  hScroll: true,
  vScroll: false,
  hScrollbar: false,
  vScrollbar: false,
  friction: 100,
  lockDirection: 2,
  //wheelReverse: true,
  //

  //public:
  /**
   * 数据总量
   * @type {Number}
   */
  total: 0,

  /**
   * 分页总数
   * @type {Number}
   */
  totalPage: 0,

  /**
   * 每页数据大小
   * @type {Number}
   */
  pageSize: 0,

  /**
   * 当前页
   * @type {Number}
   */
  page: 0,

  /**
   * 内部 list template 集合
   * @type {tesla.gui.ScrollView[]}
   */
  templates: null,

  /**
   * 当前页内部 template
   * @type {tesla.gui.ScrollView}
   */
  get template(){
    var templates = this.templates;
    return templates && templates[templates.innerIndexOf('_page', this.page)] || null;
  },

  /**
   * 页模板视图
   * @type {Object}
   */
  pageTemplate: null,

  /**
   * loading模板视图
   * @type {Object}
   */
  loadTemplate: null,

  /**
   * 空数据模板视图
   * @type {Object}
   */
  emptyTemplate: null,

  /**
   * template 列表项目
   * @type {Array} 
   */
  get items(){
    return this.template && this.template.value.items;
  },

  /**
   * 获取数据源
   * @type {tesla.data.DataSource}
   */
  get dataSource(){
    return this._ds;
  },

  /**
   * 设置数据源
   * @type {tesla.data.DataSource}
   */
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
   * 在开始渲染列表前触发
   * @event onbeforerender
   */
  onbeforerender: null,

  /**
   * 渲染列表完成触发
   * @event onrender
   */
  onrender: null,

  /**
   * 渲染每一个列表项时触发
   * @event onrenderitem
   */
  onrenderitem: null,
  
  /**
   * 滚动分页动作
   * @event onscrollpage
   */
  onscrollpage: null,

  /**
   * 构造函数
   * @constructor
   */
  ListTemplatePage: function(){
    this.ScrollView();
    this.onscroll.$on(_h_scroll);
    tesla.EventDelegate.init_events(this, 'beforerender', 'render', 'renderitem', 'scrollpage');
    bind(this, new ServiceDataSource());
  },

  //重写 tesla.gui.Control.loadView
  loadView: function(view){
    view = tesla.extend({}, Control_view(view));
    tesla.extend(this, parseTemplates(view));
    view.__c = null;
    Control_loadView.call(this, view);
  },

  /**
   * 重新载入当前页数据
   */
  reload: function(){
    // param 为空时重新载入当前页
    this._ds.load();
  },

  /**
   * 跳转到目标数据页
   * @param {Number} page
   */
  gotoPage: function(page){
    this._ds.load({ index: this.pageSize * page });
  },
  
  /**
   * 显示下一页
   */
  nextPage: function(){
    this.goto(this.page + 1);
  },
  
  /**
   * 显示上一页
   */
  prevPage: function(){
    this.goto(this.page - 1);
  }
    
});

global.ListTemplatePage = tesla.gui.ListTemplatePage;
