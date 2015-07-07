/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/file_content_view.js');
include('teide/touch/video_file_view.vx');

/**
 * @class teide.touch.VideoFileView
 * @extends teide.touch.FileContentView
 */
$class('teide.touch.VideoFileView', teide.touch.FileContentView, {
  
  /**
	 * @constructor
	 */
	VideoFileView: function(tag) {
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
	  this.video.dom.src = 'readFile/' + value;
	}
	
});

