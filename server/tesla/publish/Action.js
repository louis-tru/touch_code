/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/node.js');
include('tesla/xml/Document.js');
include('tesla/publish/Parser.js');
include('tesla/publish/FileMap.js');
include('tesla/publish/module/ModuleParser.js');

var fsx = tesla.node.fsx;
var FileMap = tesla.publish.FileMap;
var Parser = tesla.publish.Parser;
var Document = tesla.xml.Document;

var JSX_NAME = 'tesla/tesla.js';
var JSX_NAME_PUB = 'bin/qLYots.js';
var WORKER_SERVICE = 'tesla/_WorkerService.js';
var WORKER_SERVICE_PUB = 'bin/ZYV98B.js';
//--
var APP_CONFIG = 'bin/app.conf';
var WORKER = 'tesla/Worker.js';
var SOURCE_CODE = {};

function writeFile(self, path, data, version, force){
  
  var target = self.target + path;
  var nativeTarget = self.nativeTarget + path;

  if(force || !fsx.existsSync(target)){
    fsx.writeFileSync(target, data);
  }
  
  if(self.isNativeShell){

    var statics = self.statics;
    var nativeTargetVer = nativeTarget + '_v' + version;

    for(var i = 0; i < statics.length; i++){
        
      if(path.indexOf(statics[i]) === 0){
        nativeTargetVer = nativeTarget;
        break;
      }
    }
    
    if(force || !fsx.existsSync(nativeTargetVer)){
        fsx.writeFileSync(nativeTargetVer, data);
    }
  }
}

function createDirectoryByFilename(self, path){
  path = path.replace(/[^\/]+$/, '');
  mkdir(self, path);
}

function mkdir(self, path){

  fsx.mkdirSync(self.target + path);    
  if(self.isNativeShell){
    fsx.mkdirSync(self.nativeTarget + path);
  }
}

//开始发布
function start(self, source, target, type) {

  self.type = type;
  self.output = [];
  self.conf = {};
  self.version = new Date().valueOf();
  self.temp = $f(te.APP_CONF.temp || self.source + '../temp/');

  source = $f(source).trim().replace(/\/?$/, '/');
  target = $f(target).trim().replace(/\/?$/, '/');

  self.sourceMap = new FileMap(source, self.version);
  self.targetMap = new FileMap(target, self.version);
  self.sourceMap.isFullname = self.isFullname;
  self.targetMap.isFullname = self.isFullname;
  self.source = source;
  self.target = target;
  self.nativeTarget = target.replace(/([^\/]+)\/$/, '$1_native/');
  
  te.node.fsx.mkdirSync(self.temp);

  try{
    var	conf = fsx.readFileSync(source + 'app.conf');
    self.conf = EVAL('(' + conf + ')');
	}
	catch(e){
	  
	}

  mkdir(self, '');

	if(type == 'client'){
	  start_client(self);
	}
	else{
		each(self, '');
	}

	//self.sourceMap.save();
	self.targetMap.save();
}

//开始发布客户端文件
function start_client(self) {

  var source = self.source;
  var target = self.target;
  var targetMap = self.targetMap;

	fsx.writeFileSync(target + 'version', self.version); //写入版本
  mkdir(self, 'bin/');

  var items = [JSX_NAME, JSX_NAME_PUB, WORKER_SERVICE, WORKER_SERVICE_PUB];

	while (items.length){

    var sourceFilename = items.shift();
    var targetFilename = items.shift();

		//TODO ???

    if(fsx.existsSync(source + sourceFilename)){
        
      var code = self.getSourceCode(sourceFilename) + 
      (sourceFilename == 'tesla/tesla.js'? 
        ';(function(){' + self.getSourceCode('tesla/util.js') + '})()': '');

      var c_md5 = tesla.hash(code);
      var update = c_md5 != targetMap.get(targetFilename); 

      if(update){
        console.log(targetFilename);
        self.output.push(targetFilename);
      }

      targetMap.set(targetFilename, c_md5);
      writeFile(
        self, targetFilename, code, targetMap.info(targetFilename).ver, update);
    }
	}

	each(self, '');
	start_client_module(self); // 模块
}

function start_client_module(self){

	var data = new tesla.publish.module.ModuleParser(self).parse();

	var map_content = self.targetMap.getContent();
	var config = JSON.stringify(self.conf);
	var x_x = [
		'<map>',
		map_content,
		'<config>',
		config,
		'<module>',
		data
	];

	//写入x.x文件
	writeFile(self, 'x.x', x_x.join('\n'), self.version, true);
}

//排除文件
function excludeFile(self, path){
	return self.excludes.indexOf(path) != -1;
}

//each and pub client code
//遍历文件目录
function each(self, name) {

	var ls = fsx.readdirSync(self.source + name);

	for(var i = 0;  i < ls.length; i++){
		var item = ls[i];
		var path = name + item;

        if (!/^\./.test(item) && !excludeFile(self, path)){

		    var stat = fsx.statSync(self.source + path);

			if(stat.isDirectory()){
				each(self, path + '/');
			}
			else{
				file(self, path);
			}
		}
	}
}

function appendMeta(doc, node, name, content){
	//'javascript-x-version'

	var meta = doc.getElementsByTagName('meta');
    for (var i = 0; i < meta.length; i++) {
    	var n = meta.item(i);

		if(n.getAttribute('name') == name){
			return n.setAttribute('content', content);
		}
	}

	var childNodes = node.parentNode.childNodes;
	var len = childNodes.length;

	var newNode = doc.createElement('meta');
	newNode.setAttribute('name', name);
	newNode.setAttribute('content', content);
	node.parentNode.insertBefore(newNode, node);
}

//处理客户端html文件
function client_html(cthis, name) {

  var filename = cthis.source + name;
  var doc = new Document();
	doc.load(fsx.readFileSync(filename).toString());

  var meta = doc.getElementsByTagName('meta');

    //是否存在 jsx app 节点,发布之
  for (var i = 0; i < meta.length; i++) {
    var node = meta.item(i);
  
  	if(/^javascript-x/.test(node.getAttribute('name'))){
  
  		var script = doc.getElementsByTagName('script');
  
  		for(var j = 0; j < script.length; j++){
  
  			var item = script[j];
  			var src = item.getAttribute('src') || '';
        var pubsrc = JSX_NAME_PUB + '?v' + cthis.targetMap.info(JSX_NAME_PUB).ver;
  
  			if (src.indexOf(JSX_NAME) != -1) {
  				item.setAttribute('src', src.replace(JSX_NAME, pubsrc));
  			}
  		}
  
  		appendMeta(doc, node, 'javascript-x-version', cthis.version);
  		appendMeta(doc, node, 'javascript-x-not-debug', true);
  		if(cthis.map)
  			appendMeta(doc, node, 'javascript-x-map', true);
  
      //save file
      var html = doc.toString();
  
  		cthis.targetMap.set(name, tesla.hash(html));
      cthis.output.push(name);
  
      console.log(name);
  
      //写入文件目录
      createDirectoryByFilename(cthis, name);
  
      //写入文件
      writeFile(cthis, name, html, cthis.targetMap.info(name).ver, true);
  
  		return;
  	}
  }

  //普通html文件
  copy(cthis, name);
}

//复制普通文件
function copy(cthis, name) {
  var sourceMap = cthis.sourceMap;
  var targetMap = cthis.targetMap;
  //var target = cthis.target + name;
  
  //if(name == 'test/test6.htm'){
  //    debugger;
  //}

  var s_md5 = sourceMap.get(name);
  var t_md5 = targetMap.get(name);
  var update = s_md5 != t_md5;

  if (update) {//文件内容相同,需要强行拷贝
  
    console.log(name);
    cthis.output.push(name);
  }
  
  targetMap.set(name, s_md5);

  //写入文件目录
  createDirectoryByFilename(cthis, name);

  //写入文件
  writeFile(cthis, name,
  	fsx.readFileSync(cthis.source + name), targetMap.info(name).ver, update);
}

function copyConf(cthis, name){
	if(!fsx.existsSync(cthis.target + name)){
		copy(cthis, name);
	}
}

//取得文件类型
function gettype(name) {
  var mat = name.match(/\.(\w+)$/);
  if (!mat)
    return 1;
  var f = mat[1].toLowerCase();
  var ls = { js: 2, vx: 3, htm: 4, html: 4, map: 5, conf: 6, module: 7 };
  return ls[f] || 1;
}

//遍历后处理文件
function file(cthis, name) {
  
  var type = gettype(name);
  //console.log(name, type);
  
  switch (type) {
    case 1: //xxx
      copy(cthis, name);
      break;
    case 2: //js,compress;
    case 3: //vx,compress

      if(cthis.type == 'client'){
        cthis.sourceMap.get(name);
      }
      else
        copy(cthis, name);
      break;
    case 4: //html,pub
      if(cthis.type == 'client')
        client_html(cthis, name);
      else
        copy(cthis, name);
      break;
  	case 6: //conf
  		if(cthis.type == 'server'){
  			copyConf(cthis, name);
  		}
  		else if(name != 'app.conf'){
  		    copy(cthis, name);
  		}
  		break;
    case 5: //map
  	case 7: //module
      break;
  }
}

/**
 * @class tesla.publish.Action
 */
Class('tesla.publish.Action', {

  //private:
  temp: '',

  //public:
  /**
   * 当前运行发布的类型client|server
   * @type {String}
   */
  type: '',

  /**
   * 压缩代码解析器
   * @type {tesla.pubpush.Parser}
   */
  parser: null,

  /**
   * 发布源文件 map
   * @type {jsxpub.FileMap}
   */
  sourceMap: null,

  /**
   * 发布目标文件 map
   * @type {jsxpub.FileMap}
   */
  targetMap: null,

  /**
   * 发布源路径
   * @type {String}
   */
  source: '',

  /**
   * 发布目标路径
   * @type {String}
   */
  target: '',
  
  /**
   * native directory
   * @type {String}
   */
  nativeTarget: '',

  /**
   * 输出日志
   * @type {Boolean}
   */
  output: null,

  /**
   * 读取的配置
   * @type {Object}
   */
  conf: null,

  /**
   * 当前版本号
   */
  version: 0,

  /**
   * 是否启用MAP
   * @type {Boolean}
   */
  map: false,

	/**
	 * is published to native shell
	 * @type {Boolean}
	 */
	isNativeShell: false,
	
	/**
	 * 是否完整保存完整名称
	 * @type {Boolean}
	 */
	isFullname: false,

  /**
   * 排除文件列表
   * @type {String[]}
   */
  excludes: null,
  
  /**
   * 静态文件列表
   * @type {String[]}
   */
  statics: null,

  /**
   * 构造函数
   * @constructor
   */
  Action: function() {
    this.parser = new Parser();
    this.excludes = [];
    this.statics = [];
  },

  /**
   * 发布服务器代码
   * @param {String}   source
   * @param {String}   target
   */
  server: function(source, target) {
      start(this, source, target, 'server');
  },

  /**
   * 发布客户端代码
   * @param {String}   source
   * @param {String}   target
   */
  client: function(source, target) {
      start(this, source, target, 'client');
  },

  /**
   * 获取压缩的js与vx数据
   * @param  {String}   name
   * @return {String}
   */
  getSourceCode: function(name) {

    var code = SOURCE_CODE[name];
    if (code)
		  return code;

      var md5 = this.sourceMap.get(name);
      var path = this.temp + md5;

      if(fsx.existsSync(path)){
        code = fsx.readFileSync(path) + '';
      }
      else{

        code = fsx.readFileSync(this.source + name) + '';

        if (gettype(name) == 3) { //vx
          var doc = new Document();
          doc.load(code);
          code = this.parser.vx(name, doc);
        }
        else
          code = this.parser.js(name, code);
        fsx.writeFileSync(path, code);
      }
      
      if (name == WORKER){
        var pubsrc = 
          WORKER_SERVICE_PUB + '?v' + cthis.targetMap.info(WORKER_SERVICE_PUB).ver;
        code = code.replace(WORKER_SERVICE, pubsrc);
      }

      SOURCE_CODE[name] = code;
		return code;
	},

	writeFile: function(path, data, version, force){
		writeFile(this, path, data, version, force);
	}

});


