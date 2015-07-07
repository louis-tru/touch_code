/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/file_content_view.js');
include('teide/touch/image_view.vx');

function resize(self){
	var main = teide.touch.MainViewport.share();
	var size = main.eastSize;
	self.scroll.table.style = {
		width : size.width + 'px',
		height : size.height + 'px',
	};
}

function init(self){

	var main = teide.touch.MainViewport.share();

	resize(self);
	main.onchangelayoutstatus.$on(resize, self);

	self.on('unload', function(){
		main.onchangelayoutstatus.off(resize, self);
	});
}

/**
 * @class teide.touch.ImageView
 * @extends teide.touch.FileContentView
 */
$class('teide.touch.ImageView', teide.touch.FileContentView, {
  
  /**
	 * @constructor
	 */
	ImageView: function(tag) {
    this.FileContentView(tag);
    this.onloadview.$on(init);
	},
	
	init: function(name){
	  this.setFilename(name);
	},
	
	/**
	 * 设置文件名称
	 */
	setFilename: function(value){
	  teide.touch.FileContentView.members.setFilename.call(this, value);
	  this.scroll.img.dom.src = 'readFile/' + value;
	}
	
});

