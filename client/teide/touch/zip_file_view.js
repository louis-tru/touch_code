/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/file_content_view.js');
include('teide/touch/zip_file_view.vx');
include('teide/touch/button.js');
include('teide/touch/more_menu.js');

/**
 * @class teide.touch.AudioFileView
 * @extends teide.touch.FileContentView
 */
$class('teide.touch.ZIPFileView', teide.touch.FileContentView, {
  
  /**
	 * @constructor
	 */
	ZIPFileView: function(tag) {
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
	},
	
	/**
	 * 打开pdf
	 */
	m_unzip_handle: function() {
	  
	  var main = teide.touch.MainViewport.share();
	  var name = this.getFilename();
	  
	  main.res.expand_all(name, function(err, node){
	    if(err){
	      return Dialog.error('找不到文件可能已经删除');
	    }
	    if(main.res.isBusy){
	      return Dialog.alert('无法解压,当前有任务没有完成!');
	    }
	    main.res.setSelectedNode(node);
	    main.east_content.open('console.log');   // 打开控制台
	    teide.touch.MoreMenu.decompress(node); // 解压
	  });
	},
  
});

