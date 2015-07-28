/**
 * @class tesla.gui.Control 控件,派生于tesla.gui.Node,用于UI管理
 * @extends tesla.gui.Node
 * @createTime 2012-06-01
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

/*
<!--
.line2 {
    -webkit-gradient(
        linear,
        left center,
        right center,
        from(#000000),
        color-stop(25%, #666600),
        color-stop(50%, #CCCAC3),
        color-stop(75%, #666600),
        to(#000000)
    );
}
.aa {
    tap-highlight-color:rgba(0,0,0,0);
    border-radius: 4px;
    box-shadow: inset 0 0 20px 0 #1d2845, 0 0px 0 #d8c49d;
    box-shadow: 0px 0px 4px 0px black;
    text-shadow: 0px -1px 1px black;
}

transform: translate(10, 25) rotate(90deg) scale(2, 1) skew(30deg, -10deg);
transform-origin: 100% 100%;

background-color: blue;
transition-property: background-color;
transition-duration: 2s;

#rotate {
	margin: 0 auto;
	width: 600px;
	height: 400px;
	transform-style: preserve-3d;
	animation-name: x-spin;
	animation-duration: 7s;
	animation-iteration-count: infinite;
	animation-timing-function: linear;
}

@keyframes x-spin {
	0% { transform: rotateX(0deg); }
	50% { transform: rotateX(180deg); }
	100% { transform: rotateX(360deg); }
}


过渡
transition          : opacity 2s ease-out 200ms;

transition-property : opacity;
transition-duration : 2s;
transition-timing-function     : ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier(0.5, 0.2, 0.9, 0.4);
transition-delay    : 500ms;

事件
webkitTransitionEnd

动画 @keyframes
animation: name 1s infinite alternate 500ms ease both;

animation-name            : name;
animation-duration        : 1s;
animation-iteration-count : 1|10|infinite;
animation-direction       : normal|alternate;
animation-delay           : 500ms;
animation-timing-function : ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier(0.5, 0.2, 0.9, 0.4);
animation-fill-mode       : normal|backwards|forwards|both;
animation-play-state      : running|paused;

事件
webkitAnimationStart
webkitAnimationIteration
webkitAnimationEnd
-->

*/

'use strict';

include('tesla/event_delegate.js');
include('tesla/gui/resources.js');
include('tesla/gui/node.js');

var EventDelegate = tesla.EventDelegate;
var Node = tesla.gui.Node;
var CSS_PREFIX = Node.CSS_PREFIX;

var current_styles = {};
var doc = document;
var head = tesla.vx.head;
var views = tesla.vx.views;
var DOM_HEAD = $(doc.head);

//GLOBAL STYLE
var GLOBAL_STYLE_DEF = [
	'.te_hide{display:none !important}',
  '.te_3d,.te_3d *{ transform-style: preserve-3d; backface-visibility: hidden }',
  '.te_ani_test{ animation: te_ani_test 1s infinite; width: 1px;height: 1px;\
position: absolute; top: -10000px; left: 0; transform-style: preserve-3d; \
backface-visibility: hidden }',
  '@keyframes te_ani_test{0%  { transform: translate(0, 0) } \
100%{ transform: translate(10px, 0) }}'
];

GLOBAL_STYLE_DEF.push(
  '.te_{0}_3d,.te_{0}_3d *{transform-style: preserve-3d; backface-visibility: hidden}'
  .format(tesla.env.android ? 'android': tesla.env.ios ? 'ios': 'other'));

if(tesla.env.ios5_down){
  GLOBAL_STYLE_DEF.push(
    '.te_ios5_down_3d,.te_ios5_down_3d *{transform-style: preserve-3d; \
    backface-visibility: hidden}');
}

if(!tesla.env.mobile){
  GLOBAL_STYLE_DEF.push(
    '.te_pc_3d,.te_pc_3d *{transform-style: preserve-3d; \
    backface-visibility: hidden}');
}

var
GLOBAL_STYLE = $('style');
GLOBAL_STYLE.attr('type', 'text/css');
GLOBAL_STYLE.appendTo(DOM_HEAD);

tesla.oninsmod.on(function(evt){

  var data = evt.data;
  var len = data.length;

  for(var i = 0; i < len; i++){

    var _vx = data[i];

    if(_vx.vx){

      var items = _vx.views;
      var l = items.length;

      for (var j = 0; j < l; j++) {
	      var view = views[items[j]];
        formatView(view);
      }
      
      for(var j = 0; j < l; j++){
        var view = views[items[j]];
        formatViewMaster(view);
      }

      items = _vx.head;
      l = items.length;

      for(j = 0; j < l; j++){

        var id = items[j];
        var item = head[id];

        if (!current_styles[id] && /style/i.test(item.type)) {
          current_styles[id] = true;

	        var textContent = item.textContent.trim();

		      if(textContent){
		        
            var style = $('style');
            DOM_HEAD.append(style);

            style.attr('id', id);
            style.attr('type', 'text/css');
            style.attr('name', _vx.name);
            style.text = formatCssTable(textContent);
		      }
        }
      }
    }
  }
});

//卸载样式表
/*
tesla.onunmod.on(function(evt){

    var data = evt.data;
    var len = data.length;

    for(var i = 0; i < len; i++){
        var _vx = data[i];
        if(_vx.vx){

            var items = _vx.head;
            var l = items.length;

            for(var j = 0; j < l; j++){

                var id = items[j];

                if(current_styles[id]){
                    delete current_styles[id];
                    DOM_HEAD.children('#' + id)[0].remove();
                }
            }
        }
    }
});*/

//格式化样式表
var formatCssTable = function(css) {
  return formatSrc(css);
};

if(CSS_PREFIX){ //需要修復的样式表

  var REGEXP =
	new RegExp('({|;|@)(\\s)*(-ms-|-webkit-|-o-|-moz-)?((\\w+-)*?)({0})'
	.format(Node.CSS_PREFIX_ITEM.join('|')), 'ig');

  CSS_PREFIX = '-' + CSS_PREFIX + '-';
  
  formatCssTable = function(css) {
    css = css.replace(REGEXP, function(all, a, b, c, d, e, f) {
      return a + CSS_PREFIX + d + f;
    });
    return formatSrc(css);
  };
}

GLOBAL_STYLE.text = formatCssTable(GLOBAL_STYLE_DEF.join('\n'));

function get_src(src) {
  if(/\{.+?\}/.test(src)){ // 内部有未知标签
    return src;
  }
  return $res(src);
}

//处理 css url 数据
function formatSrc(css) {
  //(?!data) 排除base64数据
  css = css.replace(/(url\(("|')?)(?!data)([^"'].*?)(("|')?\))/ig,
  function(all, srart, a, src, end, b) {
    return srart + get_src($r(src)) + end;
  });
  return css;
}

var FORMAT_SRC_ITEMS = ['background', 'background-image', 'mask-image'];

function formatStyle(style) {

	if(style){

		var len = FORMAT_SRC_ITEMS.length;
    var name;
    var value;

		for(var i = 0; i  < len; i++){
      name = FORMAT_SRC_ITEMS[i];
      value = style[name];
      if(value){
        style[name] = formatSrc(value);
      }
    }
	}
	return style;
}

/*
 * 格式化视图数据,主要用来处理视图中的url路径与语言标记
 * @param  {Object} view
 * @return {Object}
 */
function formatView(view) {
  
	for (var i in view) {
	  var value = view[i];
	  if(typeof value === 'string'){
	    view[i] = $r(value);
	  }
	}
  
  if ('src' in view && view.src.constructor === String) {
    view.src = get_src(view.src);
  }
  
	formatStyle(view.style);
  
  var child = view.__c;
  if(child) {
    
    var len = child.length;
    
    for (var i = 0; i < len; i++) {
      var item = child[i];
      
      if(item.te === 0){
        item.text = $r(item.text);
      }
      else
        formatView(item);
    }
  }

	var keyframes = view.__k;
	if (keyframes) {
	  
    var len = keyframes.length;
    for (var i = 0; i < len; i++) {
			formatStyle(keyframes[i].value);
    }
	}

  return view;
}

//格式化母版视图
//@param  {Object} view
//@return {Object}
function formatViewMaster(view){

  if (view.master) {
    
    var masterName = view.master;
    //重组Master视图
    var masterView = views[masterName];
    if (!masterView)
      throw new Error('找不到"' + masterName + '"母版视图');
    
    var newView = tesla.clone(formatViewMaster(masterView));
    replacePlaceHolder(view, newView);
    
    for (var key in view){
      if(!/__c|master/.test(key))
        newView[key] = view[key];
    }
	  views[view.view] = view = newView;
  }
	return view;
}

//替换视图中的占位
//@param {Object} view 替换内容视图
//@param {Object} masterView 要被替换母版视图
function replacePlaceHolder(view, masterView) {

  var masterChild = masterView.__c;
  if (masterChild){

    for (var i = masterChild.length - 1, e; i > -1; i--) {
      e = masterChild[i];

      if (e.te == 1) {
        if (e.view == 'ContentPlaceHolder') {

          var content;
          var viewChild = view.__c;
          var is = false;

          for (var j = 0, o; (o = viewChild[j]); j++) {
            if (o.te == 1) {

              is = (o.view == 'Content' && o.ContentPlaceHolderID == e.id);

              if (is) {
                masterChild.splice(i, 1);
                break;
              }

              var qview = views[o.view];
              is = qview && o.ContentPlaceHolderID == e.id;

              if (is) {
                masterChild.splice(i, 1);
                var qViewChild = tesla.clone(qview.__c);
                for (var k = qViewChild.length - 1, t; k > -1; k--) {
                  t = qViewChild[k];
                  masterChild.splice(i, 0, t);
                }
                break;
              }
            }
          }
          if (!is)
            throw new Error('替换母版错误,在子视图中找不到替换内容,' + e.id);
        }
      }
      else if (e.tagName){
        replacePlaceHolder(view, e);
      }
    }
  }
}

function extend(_this, extd) {

  var dom = _this.dom;

  for (var i in extd) {

    var value = extd[i];

    if (i.indexOf('on') === 0) {
      var name = i.substr(2);
      var top = _this;
      for (; ; ) {
        var h = top[value];
        if (typeof h == 'function') {
          _this.on(name, h, top);
          break;
        }
        top = top.top;
        if (!top)
          throw new Error(value + ',事件处理器不存在');
      }
    }
    else if (i in _this){
      _this[i] = value;
    }
    else {
      dom.setAttribute(i, value);
    }
  }
}

//get view
function getView(o) {

  if(typeof o == 'string') {
      
    var view = views[o];
    if (view) {
      return view;
    }
    throw new Error('找不到视图,' + o);
  }
  return o;
}

function getClass(app, viewName){

  if(app) {
    var klass = tesla.get(app);
    if(klass) {
      return klass;
    }
    else {
      throw new Error(viewName + '未定义视图或,' + app + ',未定义的类型');
    }
  }
  else {
    // 没有app时候尝试使用view名称做app
    var klass = tesla.get(viewName);
    if(klass){
      return klass;
    }
  } 
  return Control;
}

var _extend = Function.__proto__ ? function _extend(o, extd) {
  var rest = tesla.extend({ }, o);
  rest.__proto__ = extd;    
  return rest;
}: 
function(o, extd) {
  return tesla.extend(tesla.extend({}, extd), o);
};

var _load = [
  function(view, cthis) {//TextNode
    cthis.idom.appendChild(doc.createTextNode(view.text));
  },
  function(view, cthis) { //Control

    var app;
    var viewName = view.view;
    var proto_view = views[viewName];

    if (proto_view) {
      view = _extend(view, proto_view);
      app = view.app;
    }
    else  //找不到原视图数据,viewName做app使用
      app = viewName;

    var klass = getClass(app, viewName);
    var con = new klass(view.tagName);
    
    con.appendTo(cthis, view.id);
    con.loadView(view);
    return con;
  },

  function(view, cthis) {//Node
    var el = new Node(doc.createElement(view.tagName));
	  el.appendTo(cthis, view.id);
    loadView(el, view);    
  }
];

//加载子节点
function loadView(_this, view) {

  var child = view.__c;
  if (child) {

    var len = child.length;

    for(var i = 0; i < len; i++) {
      var v = child[i];
      _load[v.te](v, _this);
    }
  }

  //TODO ?
  extend(_this, view);
}

//
global.Control = 

$class('tesla.gui.Control', Node, {

  //public:
  /**
   * view app
   * @type {String}
   */
  app: '',
  
  //重写
  te: 1,

  /**
   * 视图名称
   * @type {String}
   */
  view: '',
  
  /**
    * 视图数据模型
    */
  model: null,
  
  /**
   * @event onloadview 初始视图完成
   */
  onloadview: null,

  /**
   * 构造函数
   * @constructor
   * @param {String} tag (Optional) 元素名称,默认使用div
   */
  Control: function (tag) {
    this.Node(document.createElement( tag || 'div' ));
    this.model = { };
    this.onloadview = new EventDelegate('loadview', this);
  },

  /**
   * 使用 JSON view 数据初化控件
   * @param  {Object} view json描叙的视图对像或视图名称
   */
  loadView: function (view) {
    loadView(this, getView(view));
    this.onloadview.notice();
  }

}, {
  
  /**
   * 
   * @type {CSSStyleSheet}
   * @static
   */
  CSS_STYLE_SHEET: GLOBAL_STYLE.dom.sheet,

  /**
   * 获取当前场景指定名称的视图
   * <pre><code>
   *         <views>
   *             <SLG.test2>
   *                 <div class="top"></div>
   *                 <div class="con">
   *                     <div class="left">
   *                         <ul>
   *                             <li>A</li>
   *                             <li>B</li>
   *                             <li>C</li>
   *                             <li>D</li>
   *                         </ul>
   *                     </div>
   *                     <div class="right">
   *                         <te:ContentPlaceHolder id="content1">
   *                         </te:ContentPlaceHolder>
   *                     </div>
   *                 </div>
   *             </SLG.test2>
   *             <SLG.test3 app="SLG.test3" master="SLG.test2">
   *                 <te:Content ContentPlaceHolderID="content1">
   *                       <div> 这里放置内容 </div>
   *                 </te:Content>
   *             </SLG.test3>
   *         <views>
   * </code></pre>
   * @method view
   * @param {String} name
   * @return {Object} 返回视图数据
   * @static
   */
  view: getView,

  /**
   * 使用 JSON view 数据初化控件
   * @method loadView
   * @param   {tesla.gui.Control} control
   * @param   {Object} view json描叙的视图对像
   * @static
   */
	loadView: loadView,

  /**
   * 从extd扩展属性
   * @method extend
   * @static
   */
  extend: extend,

  /**
   * 格式化样式表
   * @method formatCssTable
   * @param   {String} css
   * @return  {String}
   * @static
   */
  formatCssTable: formatCssTable,

	/**
   * 格式化标签样式
   * @method formatStyle
   * @param   {Object} style
   * @return  {Object}
	 * @static
   */
	formatStyle: formatStyle,

  /**
   * 格式化视图数据,(包含w3c css 标准/src 路径更新/语言标签替换)
   * @method extend
   * @param  {Object} view
   * @return {Object}
   * @static
   */
  formatView: formatView,

  /**
   * 通过视图创建控件(静态函数)
   * @method create
   * @param  {Object}            view
   *      要创建控件的视图描叙对像或该视图的名称(该对像必需为控件,否则抛出异常)
   * @param  {tesla.gui.Node}   parent (Optional) 要追加到的父级元素(可选参数)
   * @return {tesla.gui.Control}
   * @static
   */
  New: function(view, parent) {
    
    view = getView(view);
    var app;
    var viewName = view.view;
    var proto_view = views[viewName];
    
    if (proto_view) {
      if(view !== proto_view) {
        view = _extend(view, proto_view);
      }
      app = view.app; //
    }
    else  //找不到原视图数据,viewName做app使用
      app = viewName;

    var klass = getClass(app, viewName);
    var con = new klass(view.tagName);

    if(parent) {
      con.appendTo(parent, view.id);
    }
    con.loadView(view);
    return con;
  }
});

