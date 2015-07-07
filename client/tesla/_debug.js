/*
 * @class ts._debug 系统调试
 * @createTime 2011-10-01
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */

'use strict';

if (!ts.debug) {
  throw new Error('Not include file "tesla/_debug.js"');
}

function tag(node, t) {
  return node.getElementsByTagName(t);
}

function child(node, tag) {
  var result = [];
  if (!node)
    return result;

  var ls = node.childNodes;
	var len = ls.length;
  for (var i = 0; i < len; i++) {
	var n = ls[i];//.item(i);
    if (n.nodeType == 1 && (!tag || n.tagName == tag))
      result.push(n);
  }
  return result;
}

//是否有子节点
function isChild(node) {
  var ls = node.childNodes;
	var len = ls.length;
  for (var i = 0; i < len; i++) {
	var n = ls[i];//.item(i);
    if (n.nodeType == 1 || n.nodeType == 3 || n.nodeType == 5)
      return true;
  }
  return false;
}

function parseAttr(value){
  value = String(value);
  return /^((-?\d+(\.\d+)?((e|E)\d+)?)|true|false)$/.test(value) ? EVAL(value) : value;
}

function parseStyle(value){

  //TODO ?
  var items = value.trim().split(/ *; */);
  var values = {};
  var l = items.length;

  for (var j = 0; j < l; j++) {
    var item = items[j];
    if (item) {
      item = item.split(/ *: */);
      values[item.shift().trim()] = item.join(':').trim();
    }
  }
  return values;
}

/*
 * 从元素节点扩展属性
 * @param {Object}      obj  需要扩展的对像
 * @param {HTMLElement} element 扩展源
 * @static
 */
function extend(obj, el) {
  var attrs = el.attributes;
  var len = attrs.length;

  for (var i = 0; i < len; i++) {

    var e = attrs[i];

    if (e.specified) {
      var name = e.name;
	    obj[name] = name == 'style' ?  parseStyle(e.value): parseAttr(e.value);
    }
  }
  return obj;
}

function extendLine(obj, el){
  var attrs = el.attributes;
  var len = attrs.length;

  for (var i = 0; i < len; i++) {

    var e = attrs[i];

    if (e.specified) {
      var name = e.name;
      obj[name] = 
        name == 'value' ? 
        parseStyle(e.value): 
        parseAttr(name == 'curve' ? e.value.empty() : e.value);
    }
  }
    return obj;
}

/*
 * 解析xml视图为vx
 * @param {Object}      vx     要put的vx对像
 * @param {HTMLElement} el  视节点
 * @param {String}      view 如果该视图为匿名的,应该传入该参数
 * @static
 */
function parseJSON(vx, el, view) {
  
  var name = view || el.tagName;

  //声明了 override 表示可覆盖视图
  if (vx.views[name] && el.getAttribute('override') != 'yes')
    throw new Error(name + ' 视图重复定义,覆盖请声明override=yes');

  var _vx = { view: name, __c: [] };
  vx.views[name] = _vx;

  //非匿名视图
  if(!view){
    extend(_vx, el);
  }

  var ns = el.childNodes;

  var __c = _vx.__c;
  var len = ns.length;

  for (var i = 0; i < len; i++) {

    var n = ns[i];

    if (n.nodeType == 1) { //

      if (n.tagName == 'keyframes'){ //时间线

        var frames = n.childNodes;
        var __k = [];
        var ll = frames.length;

        for (var j = 0; j < ll; j++) {
          var frame = frames[j];

          if (frame.nodeType == 1){
            __k.push(extendLine({}, frame));
	        }
        }
        if(__k.length){
          _vx.__k = __k;
        }
      }
      else{ //Nodes
        __c.push(parseJSON01(vx, n));
      }
    }
    else if (n.nodeType == 3 || n.nodeType == 5)//文本节点
      __c.push({ te: 0, text: n.nodeValue || n.text });
  }
}

/*
 * 解析HTML节点为vx数据
 * @param  {Object}      vx       要put的对像
 * @param  {HTMLElement} el  HTML节点
 * @return {Object}               返回JSON数据
 * @static
 */
function parseJSON01(vx, el) {

  var _vx = {};
  var tagName = el.tagName;

  if (/^te:/.test(tagName)) { //为控件

    var str = tagName.substr(3);

    if (isChild(el)) {//有子节点创建匿名视图

      var view = '' + ts.sysid();
      _vx.view = view;
      _vx.app = str;

      parseJSON(vx, el, view);
    }
    else{
      _vx.view = str;
    }

    extend(_vx, el);
    _vx.te = 1;
    
  }
  else {

    _vx.tagName = tagName;
    
    extend(_vx, el);
    _vx.te = 2;
    
    var ns = el.childNodes;
    
    var __c = [];
    var len = ns.length;
    
    
    
    for (var i = 0; i < len; i++) {
      
      var n = ns[i];
      if (n.nodeType == 1)
        __c.push(parseJSON01(vx, n));
      else if (n.nodeType == 3 || n.nodeType == 5)//文本节点
        __c.push({ te: 0, text: n.nodeValue || n.text });
    }

    if(__c.length){
      _vx.__c = __c;
    }
    
  }
  return _vx;
}

//<head>
//   <style>
//         .kl{width: 200px;height: 300px;color: #f00;font-size: 12px;}
//	 	.kl1{width: 200px;height: 300px;color: #f00;font-size: 12px;}
//	</style>
//</head>

//<views>
//    <MainScene app="ts.html.Scene">
//        <line>
//            <Frame x="0" y="0" />
//            <Transition type="C" length="10" />
//            <Frame x="100" y="100" />
//        </line>
//        <Js:test.Test id="test.Test" />
//        <div class="div1">
//            ABCD
//            <div><Js:Image src="res:OK_A" /></div>
//            <div id="bottom"></div>
//        </div>
//    </MainScene>
//</views>

//    //测试样例
//    var MainScene = {
//        view: 'MainScene',
//        app: 'ts.html.Scene',
//        __k: [
//            { frameType: 'Frame', x: 0, y: 0 },
//            { frameType: 'Transition', type: 'C', length: 10 },
//            { frameType: 'Frame', x: 100, y: 100 }
//        ],
//        __c: [
//            '\n',
//            { te: 1, view: 'test.Test', id: 'test.Test', tagName: 'div' },
//            {
//                tagName: 'div',
//                class: 'div1',
//                __c: [
//                    'ABCD\n',
//                    {
//                        tagName: 'div',
//                        __c: [
//                            { te: 1, view: 'Image', src: 'res:OK_A' }
//                        ]
//                    },
//                    { tagName: 'div', id: 'bottom' }
//                ]
//            },
//            '\n'
//        ]
//    };

tesla._debug = {

  /**
   * 解析XML为vx数据
   * @param  {XMLDocument} xml
   * @return {Object}
   * @static
   */
  vx: function(xml) {
    //xml element
    var _te = tag(xml, 'tesla')[0];//.item(0);//[0];
    var head = child(_te, 'head')[0];
  	var res = child(head, 'res')[0];
  	var views = child(_te, 'views')[0];
  
    //vx data
    var _vx = { head: { res: {} }, views: {} };
    var _head = _vx.head;
    var _res = _head.res;
  
    child(res).forEach(function(n) {
      var name = n.getAttribute('name') || ts.sysid();
      var type = n.tagName;

      if (_res[name] && n.getAttribute('override') != 'yes')
        throw new Error(name + ' 重复定义,覆盖请声明override=yes');
      _res[name] = extend({ type: type }, n);
    });
    //del res node
    if(res)
      head.removeChild(res);
  
    child(head).forEach(function(n) {
      var type = n.tagName;
      var out = extend({ type: type }, n);
      
      _head[ts.sysid()] = out;
      
      //get text
      var value = n.textContent || n.text || '';
  
      out.textContent = type.toLowerCase() == 'style' ?
        value.replace(/(\s+)|(\/\*([^\*]*\**(?!\/))*(\*\/)?)/g, ' ') :
  	  value;
    });
  
    child(views).forEach(function(n) {
        parseJSON(_vx, n);
    });
  
    return _vx;
  }
};

