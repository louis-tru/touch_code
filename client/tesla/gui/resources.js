/**
 * @class tesla.gui.Resources 资源库(路径服务,同步资源数据)
 * @createTime 2011-04-07
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 * @singleton
 */

'use strict';

include('tesla/event_delegate.js');

var vx = tesla.vx;
var items = {};
var REG = /^(https?|wss?|\/)/;
var REG2 = /\.([^\.\?#]+)((\?|#).+)?$/;
var LISTEN_LOAD = false;

function getType(src){

	var mat = src.match(REG2);
	if(mat){
		switch(mat[1].toLowerCase()){
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'gif':
				return 'img';
			case 'mp3':
			case 'ogg':
			case 'wma':
			case 'acc':
				return 'audio';
			case 'mp4':
			case 'avi':
			case 'rmvb':
			case 'rm':
			case 'mov':
			case 'wmv':
			case '3gp':
				return 'video';
		}
	}
	return '';
}

function add(item) {

	if(typeof item == 'string'){
		item = { type: getType(item), src: item };
	}

	var dom;

	switch(item.type){
		case 'img':
		case 'image':
			dom = new Image();
			break;
		case 'audio':
			// TODO ?
			return;
		case 'video':
			// TODO ?
			return;
		default: return;
	}

	resources.progress = 1 - (++resources.loadLength / ++resources.loadTotalLength);

  dom.onerror = dom.onload = function(e) {
      
    dom.onerror = dom.onload = null;
    resources.loadLength--;
    resources.progress = 1 - (resources.loadLength / resources.loadTotalLength);
    resources.onchange.notice({ type: e.type, src: item.src });

    if (!resources.loadLength) {
      resources.loadTotalLength = 0;
      LISTEN_LOAD = false;
      resources.onload.notice();
    }
  };
	dom.src = $res(item.src);
}

function complete() {

  if (resources.loadLength || LISTEN_LOAD)
    return;
  LISTEN_LOAD = true;

  if(resources.loadLength){
    return;
  }
  LISTEN_LOAD = false;
  resources.onload.notice();
}

// 从vx数据载入资源
tesla.oninsmod.on(function() {

  var res = vx.head.res;

  for (var i in res) {
    if (!items[i]){
  		var item = tesla.extend({}, res[i]);
  		items[i] = item;
  		add(item);
  	}
  }
  complete();
});

tesla.onunmod.on(function(evt){
  var data = evt.data;

  for(var i = 0, l = data.length; i < l; i++){
    var item = data[i];
    if(item.vx){
      //删除内部资源
      for(var j in item.head.res)
        delete items[j];
    }
  }
});

function get(src) {
	src = REG.test(src) ? src : resources.dir + src;
	return ts.newPath(src);
}

// 
var resources = {

  //public:

  dir: tesla.config.resources_dir || '',

  /**
   * 下载总长度
   * @type {Number}
   * @static
   */
  loadTotalLength: 0,

  /**
   * 下载剩于长度
   * @type {Number}
   * @static
   */
  loadLength: 0,

  /**
   * @event onchange 载入变化事件
   * @static
   */
  onchange: new tesla.EventDelegate(null, 'change'),

  /**
   * @event onload 载入完成事件
   * @static
   */
  onload: new tesla.EventDelegate(null, 'load'),

  /**
   * 完成进度 从0至1
   * @type {Number}
   * @static
   */
  progress: 1,

  /**
   * 资源路径
   * @method get
   * @param {String}  src 路径
   * @return {Object} 返回新路径
   * @static
   */
  get: get,

  /**
   * 载入资源
   * @param {String[]} paths
   * @param {Function} cb (Optional)
   * @static
   */
  load: function(paths, cb) {

    if(cb) {
      Resources.onload.once(function() { cb() });
    }
    paths.forEach(add);
    complete();
  },

};

tesla.set('tesla.gui.resources', resources);

global.$res = get;


