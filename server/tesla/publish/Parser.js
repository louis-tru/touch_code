/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/uglify/Uglify.js');

//****************js****************
/*
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 * because the buffer-to-string conversion in `fs.readFileSync()`
 * translates it to FEFF, the UTF-16 BOM.
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

function format(text) {
  return text.replace(/[^\x00-\x7f]/g, function(a) {
    var code = a.charCodeAt(0);
    var x = code < 0xff ? '\\u00' : '\\u';
    return x + code.toString(16);
  });
}

//****************vx****************

function tag(node, tag) {
  return node.getElementsByTagName(tag);
}

function child(node, tag) {
  var result = [];
  if (!node)
    return result;

  var ls = node.childNodes;
	var len = ls.length;
  for (var i = 0; i < len; i++) {
	var n = ls.item(i);
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
	var n = ls.item(i);
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

/**
 * 从元素节点扩展属性
 * @param {Object}      obj  需要扩展的对像
 * @param {HTMLElement} element 扩展源
 * @static
 * @private
 */
function extend(obj, el) {
  var attrs = el.attributes;
  var len = attrs.length;

  for (var i = 0; i < len; i++) {

    var e = attrs.item(i);

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

//obj.frameType = el.tagName;

  for (var i = 0; i < len; i++) {

    var e = attrs.item(i);

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

/**
 * 解析xml视图为vx
 * @param {Object}      vx     要put的vx对像
 * @param {HTMLElement} el  视节点
 * @param {String}      view 如果该视图为匿名的,应该传入该参数
 * @static
 * @private
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

    var n = ns.item(i);//[i];

    if (n.nodeType == 1) { //

      if (n.tagName == 'line'){ //时间线

        var frames = n.childNodes;
        var __k = [];
        var ll = frames.length;

        for (var j = 0; j < ll; j++) {
          var frame = frames.item(j);//[j];

          if (frame.nodeType == 1)
            __k.push(extendLine({}, frame));
        }
        if(__k.length){
            _vx.__k = __k;
        }
      }
      else{ //Nodes
        __c.push(parseJSON01(vx, n));
      }
    }
    else if (n.nodeType == 3 || n.nodeType == 5) {//文本节点
      __c.push({ te: 0, text: (n.nodeValue || n.text).replace(/\r/g, '') });
    }
  }
}

/**
 * 解析HTML节点为vx数据
 * @param  {Object}      vx       要put的对像
 * @param  {HTMLElement} el  HTML节点
 * @return {Object}               返回JSON数据
 * @static
 * @private
 */
function parseJSON01(vx, el) {

  var _vx = {};
  var tagName = el.tagName;

  if (/^te:/.test(tagName)) { //为控件

    var str = tagName.substr(3);

    if (isChild(el)) {//有子节点创建匿名视图

      var view = '' + tesla.guid();
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
      var n = ns.item(i);//[i];
      if (n.nodeType == 1){
        __c.push(parseJSON01(vx, n));
      }
      else if (n.nodeType == 3 || n.nodeType == 5){//文本节点
        __c.push({ te: 0, text: (n.nodeValue || n.text).replace(/\r/g, '') });
      }
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
//    <MainScene app="tesla.dom.Scene">
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
//        app: 'tesla.dom.Scene',
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


/**
 * 分析js文件头部
 * @private
 */
function analysisHeader(code, name){

	code = code.replace(/^(\r?\n)*/, '');
  
  var use_strict = false;
  var mat = code.match(/^("|')use strict("|')(;|,)?/);

  if(mat){
    use_strict = true;
    code = code.substr(mat[0].length);
  }
    
  //

	var includes = [];
  var exp = /include\(("([^"]+)"|([^\)]+))\)(;|,)?/;
  var end;
  var item;
  
  while (mat = exp.exec(code)) {

    if (mat.index)
        throw new Error(name + ', error ' + mat[0] +
		' ,include只能在头部包含,且code不能出现在include之前');
    if (mat[3]){
      throw new Error(
        name + ', error ' + mat[0] + ' ,include参数只能使用字符串常量');
    }

    code = code.substr(mat[0].length);
    item = mat[2];

    //排除 tesla/Extend.js 与 tesla/_Debug.js 文件
    if(item != 'tesla/Extend.js' && item != 'tesla/_Debug.js'){ 
      includes.push(item);
    }
    end = mat[4] == ',';
  }

  var option = {
  	gen_options: { ascii_only: true },
  	mangle_options: { toplevel: true }
	};

  code = tesla.uglify.Uglify.parse((end ? '"",': '') + code, option);

	return { 
	  includes: includes, 
	  code: (use_strict ? '"use strict";': '') + code 
	};
}

/**
 * @class tesla.publish.Parser
 */
Class('tesla.publish.Parser', {

  //public:
  /**
   * 压缩javascript代码
   * @param {String}   source
   */
  js: function(name, source) {
    
    // 删除文本中的bom字符
    source = stripBOM(source);
  
  	console.log(name);
    
  	try{
  
  		source = tesla.uglify.Uglify
  			.parse2(source, { gen_options: { ascii_only: true } });
  	}
  	catch(err){
  
  		var msg = [
  			name,
  			'message:' + err.message,
  			'line:' + err.line,
  			'col:' + err.col,
  			'pos:' + err.pos
  		];
  		throw new Error(msg.join('\n'));
  	}
  
  	var rest = analysisHeader(source, name);
  
  	if(rest.includes.length){
  	  // 压缩的文件,把包含头放到第一行#后面
  		source = '#' + rest.includes.join(';') + '\n' + rest.code;
  	}
  	else{
  		source = rest.code;
  	}
    return source;
  },

  /**
   * 解析vx视图文件
   * @param {xml} tesla.xml.Document
   * @return {Object}
   */
  vx: function(name, xml) {

	  console.log(name);

    //xml element
    var _te = tag(xml, 'tesla').item(0);//[0];
    var head = child(_te, 'head')[0];
	  var res = child(head, 'res')[0];
	  var views = child(_te, 'views')[0];

    //vx data
    var _vx = { head: { res: {} }, views: {} };
    var _head = _vx.head;
    var _res = _head.res;

    child(res).forEach(function(n) {
      var name = n.getAttribute('name') || tesla.guid();
      var type = n.tagName;

      if (_res[name] && n.getAttribute('override') != 'yes')
        throw new Error(name + ' 重复定义,覆盖请声明override=yes');
      _res[name] = extend({ type: type }, n);
    });
    //del res node
    if(res){
      head.removeChild(res);
    }

    child(head).forEach(function(n) {
      var type = n.tagName;
      var out = extend({ type: type }, n);
      _head[tesla.guid()] = out;
      //get text
  
  		var value = '';
  		var items = n.childNodes;
  		var len = items.length;
  		for (var i = 0; i < len; i++) {
  			var item = items.item(i);
  			if (item.nodeType == tesla.xml.Node.TEXT_NODE)
  				value += item.nodeValue;
  		}
  
  		out.textContent =
  			type.toLowerCase() == 'style' ?
  			value.replace(/(\s+)|(\/\*([^\*]*\**(?!\/))*(\*\/)?)/g, ' ') :
  			value;

    });

    child(views).forEach(function(n) {
        parseJSON(_vx, n);
    });

    return format(JSON.stringify(_vx));
  }
});

