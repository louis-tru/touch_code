/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/file_content_view.js');
include('teide/touch/unknown_file_view.vx');

/**
 * @class teide.touch.UnknownFileView
 * @extends teide.touch.FileContentView
 */
$class('teide.touch.UnknownFileView', teide.touch.FileContentView, {
  
  /**
	 * @constructor
	 */
	UnknownFileView: function(tag) {
    this.FileContentView(tag);
	},
	
	init: function(name){
	  this.setFilename(name);
	},
	
	/**
	 * 设置文件名称
	 */
	setFilename: function(value){
	  teide.touch.FileContentView.members.setFilename.call(this, value);
	  //this.img.dom.src = 'documents/' + value;
	}
	
});

