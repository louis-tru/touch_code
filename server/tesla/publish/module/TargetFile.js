/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

/**
 * 经过分析得到的目标文件
 * @class tesla.publish.module.TargetFile
 */
Class('tesla.publish.module.TargetFile', {

	source_filenames: null,
	m_filename: '',
	key: '',

  /**
   * @constructor
   */
	TargetFile: function(key){
		this.key = key;
		this.source_filenames = [];
	},

  /**
   * 添加目标文件包含的源文件名称
   */
	addSourceFileName: function(filename){
		if(!this.exist(filename)){
			this.source_filenames.push(filename);
		}
	},
	
	/**
	 * 源文件是否存在
	 */
	exist: function(filename){
	  return this.source_filenames.indexOf(filename) != -1;
	},

	get filename(){
		if(!this.m_filename)
			this.m_filename = 'bin/' +
				tesla.hash(this.source_filenames.concat().sort().join('')) + '.js';
		return this.m_filename;
	}

});
