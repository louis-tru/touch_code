/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/file_content_view.js');
include('teide/touch/pdf_file_view.vx');
include('teide/touch/button.js');

/**
 * @class teide.touch.AudioFileView
 * @extends teide.touch.FileContentView
 */
$class('teide.touch.PDFFileView', teide.touch.FileContentView, {
  
  /**
	 * @constructor
	 */
	PDFFileView: function(tag) {
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
	m_openPDF_handle: function(){
	  var url = 'documents/' + this.getFilename();
	  teide.touch.MainViewport.share().open_web_browser(url);
	},
	
  /**
   * 是否可用 web browse
   */ 
  is_web_browse: function(){
    return true;
  }
  
});

