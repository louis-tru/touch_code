/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/node.js');

var fsx = tesla.node.fsx;
var MAP_NAME = 'file.map.bak';

function readMap(name) {

	var data = '';
	try {
		data += fsx.readFileSync(name + MAP_NAME);
	} 
	catch (e){ }

	var items = data ? data.split(/\r?\n/) : [];
	var l = items.length;
	var map = {};
	for (var i = 0; i < l; i++) {
		var ls = items[i].split(' ');
		map[ls[0]] = { md5: ls[1], ver: parseInt(ls[2]), name: ls[3] || '' };
	}
	return map;
}

function getMd5(filename){
	var md5 = '';
	try {
		var data = fsx.readFileSync(filename);
		md5 = tesla.hash(data);
	}
	catch (e) { }
	return md5;
}

/**
 * @class jsxpub.FileMap
 */
Class('tesla.publish.FileMap', {

	//private:
	_path: '',

	map: null,
	old_map: null,
  ver: 0,
  isFullname: false,

	//public:
	/**
	 * 构造函数
	 * @param {String} path
   * @param {Number} ver
	 * @constructor
	 */
	FileMap: function(path, ver) {
		this._path = path;
    this.ver = Math.round((ver - new Date(2013, 4, 1)) / 6e4);
		this.map = {};
		this.old_map = readMap(path);
	},

	/**
	 * 获取文件map值,
	 * @param {String} filename
	 * @return {String}
	 */
	get: function(filename) {
    return this.info(filename).md5;
	},

  /**
   * get info 
   * @return {Object}
   */
	info: function(filename){
    var key = tesla.hash(filename);
		var map = this.map[key];
		if (map)
			return map;
		//var old = this.old_map[key];
		this.set(filename, /*old ? old.md5: */getMd5(this._path + filename));
		return this.info(filename);
	},

	/**
	 * 设置文件MAP值
	 * @param {String} filename
	 * @param {String} value
	 */
	set: function(filename, md5) {
		var key = tesla.hash(filename);
		var map = this.map[key];
		if(!map) {
      map = this.old_map[key] || { md5: md5, ver: this.ver, name: filename };
      this.map[key] = map;
		}
		if(map.md5 != md5) {
			map.md5 = md5;
			map.ver = this.ver;
			map.name = filename;
		}
	},

	getContent: function(){
		var rest = [];
		var map = this.map;
		
    for (var key in map) {
        var item = map[key];
        if(this.isFullname){
            rest.push(key + ' ' + item.ver + ' ' + item.name);
        }
        else{
            rest.push(key + ' ' + item.ver);
        }
    }
		return rest.join('\n');
	},

	/**
	 * 提交MAP文件至文件系统
	 * @param {Function} cb 执行完成回调
	 */
	save: function() {

		var map = this.map;
		var map_filename = this._path + MAP_NAME;
		var map_result = [];

		for (var i in map) {
			var item = map[i];
			map_result.push(i + ' ' + item.md5 + ' ' + item.ver + ' ' + item.name);
		}

		fsx.writeFileSync(map_filename, map_result.join('\n'));
	}
});


