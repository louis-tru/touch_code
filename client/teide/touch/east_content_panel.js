/**
 * @createTime 2014-12-15
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/storage.js');
include('teide/touch/ace_edit_session.js');
include('teide/touch/east_content_panel.vx');
include('teide/touch/text_editor.js');
include('teide/touch/image_view.js');
include('teide/touch/console_view.js');
include('teide/touch/unknown_file_view.js');
include('teide/touch/audio_file_view.js');
include('teide/touch/video_file_view.js');
include('teide/touch/pdf_file_view.js');
include('teide/touch/zip_file_view.js');
include('teide/touch/preferences_view.js');

function get_suffix(name){
  var mat = name.match(/([^\.\/]+)$/);
  if(mat){
    return mat[1].replace(/\+/g, 'p').toLowerCase();
  }
  return '';
}

function is_svn_conflict(name) {
	return /\.(mine|r\d+)$/.test(name);
}

function update_layout(self){

  var main = teide.touch.MainViewport.share();

  if (main.getLayoutStatus() == 2) {  // 当前内容视图为不可见状态
  	// 在小屏幕IOS手机与ipod上运行时,为节省性能.
  	// 内容视图如果切换走,关闭当前打开的文件
	  if(ts.env.iphone || ts.env.ipod){
	  	self.close_current();
	  }
  }
  else{
  	self.css('height', main.eastSize.height + 'px');
  }
}

function open_file(self, name){

	var view = null;
	
	//teide/touch/AceEditSession.js
	
	switch (get_suffix(name)) {
		case 'jpg':
		case 'jpeg':
		case 'png':
		case 'gif':
		case 'tiff':
		case 'tif':
		case 'tga':
		case 'pvr':
		case 'ico':
		case 'jpf':
		  view = tesla.gui.Control.New('teide.touch.ImageView');
		  break;
		case 'mp3':
		case 'ogg':
		case 'wma':
		case 'acc':
		  view = tesla.gui.Control.New('teide.touch.AudioFileView');
		  break;
		case 'zip':
		  view = tesla.gui.Control.New('teide.touch.ZIPFileView');
		  break;
		case 'docx':
		case 'doc':
		case 'xls':
		case 'xlsx':
		case 'ppt':
		case 'pptx':
		case 'pdf':
		  view = tesla.gui.Control.New('teide.touch.PDFFileView');
		  break;
		case 'mp4':
		case 'avi':
		case 'rmvb':
		case 'rm':
		case 'mov':
		case 'wmv':
		case '3gp':
		case 'm4v':
		case 'mpg':
		  view = tesla.gui.Control.New('teide.touch.VideoFileView');
		  break;
		default:     //Only supports the code editor
		
		  if (is_console_log(name)) {
		    view = new teide.touch.ConsoleView();
		  }
		  else if (is_preferences_view(name)) {
		    view = tesla.gui.Control.New('teide.touch.PreferencesView');
		  }
			else if (is_svn_conflict(name)) {
				view = new teide.touch.TextEditor();
			}
		  else if(teide.touch.AceEditSession.is_text(name)){
		    view = new teide.touch.TextEditor();
		  }
		  else{
	      view = tesla.gui.Control.New('teide.touch.UnknownFileView');
		  }
			break;
	}
	
  var current = self.current;
  if(current){
     // 删除当前
    if (current instanceof teide.touch.TextEditor && 
        view instanceof teide.touch.TextEditor) {
      current.remove_hold_blur(); // 删除但不卸载焦点
    } else {
      current.remove();
    }
  }
  
	// debugger;
	view.init(name);
	view.$on('unload', releaseview, self);
	self.append(view);
	self.m_current = view;
	
	self.onopenview.notice(view);
  if(ts.env.iphone || ts.env.ipod){ // 切换到代码视图
    teide.touch.MainViewport.share().setLayoutStatus(0, true);
  }
	return view;
}

function save_history(self){
  ts.storage.set('teide_open_file_history', self.history);
  ts.storage.set('teide_open_file_history_index', self.m_history_index);
  self.onChangeHistory.notice();
}

function file_exists(self, name, cb){
  if(is_preferences_view(name)){
    cb(null, true);
  }
  else{
    FileActionService.call('exists', [name], cb);
  }
}

function init(self) {
  var app = teide.touch.MainViewport.share().application_info;
  var default_open = [ app.is_lite ? 'example/index.html' : 'example/node.js' ];
  self.m_history = ts.storage.get('teide_open_file_history') || default_open;
  self.m_history_index = ts.storage.get('teide_open_file_history_index') || 0;
  save_history(self);

  // 监控日志,如果当前显示的文件被删除,关闭文件
  FileActionService.on('console_log', function(evt){
    var log = evt.data;
    if(log.substr(0, 2) == 'D '){ // 有文件被删除
      self.close(log.substr(2)); // 尝试关闭相似文件
    }
  });

  var main = teide.touch.MainViewport.share();
  update_layout(self);
  main.onchangelayoutstatus.$on(update_layout, self);

  nextTick(function(){ // 等待 MainViewport 初始化完成
  
	  if(main.getLayoutStatus() != 2){
	  	// 当前内容为可见状态,初始化打开一个历史文件

		  var name = self.history[self.m_history_index];
		  
		  file_exists(self, name, function(err, exists){

		    if(exists){
		      open_file(self, name);
		    }
		    self.onChangeHistory.notice();
		  });
		}
	});
}

function releaseview(self, evt){
	if(evt.sender === self.m_current){
		// console.nlog('sender ok');
		self.m_current = null;
	}
  self.onreleaseview.notice(evt.sender);
}

/**
 * console.log
 */
function is_console_log(name){
  return /console\.log$/.test(name);
}

function is_preferences_view(name) {
  return /^\[preferences\.settings\]$/.test(name);
  // return /^app_setting\.conf$/.test(name);
}

/**
 * @class teide.touch.EastContentPanel
 * @extends tesla.gui.Control
 */
$class('teide.touch.EastContentPanel', tesla.gui.Control, {
  
  /**
   * 当前打开的文件
   * @private
   */
  m_current: null,
  
  /**
   * 历史
   */
  m_history: null,
  
  /**
   * 历史位置
   */
  m_history_index: -1,
  
  /**
   * 打开view 事件
   */
  onopenview: null,
  
  /***/
  onreleaseview: null,
  
  /**
   * 历史变化
   */
  onChangeHistory: null,
  
  /**
	 * @constructor
	 */
  EastContentPanel: function(){
    this.Control();
    tesla.EventDelegate.init_events(this, 'openview', 'releaseview', 'ChangeHistory');
    this.onloadview.$on(init);
  },
  
  /**
   * 当前打开的文件
   * FileContentView
   */
  get current() {
    return this.m_current;
  },
  
	/**
	 * 打开文件
	 */
	open: function(name) {
	  
    if(this.current && name == this.current.getFilename()){
      if(ts.env.iphone || ts.env.ipod){
        teide.touch.MainViewport.share().setLayoutStatus(0, true);
      }
      return this.current;
    }
    
    var view = open_file(this, name);
    var index = this.m_history_index + 1;
    var history = this.history;
	  var len = history.length - index;
	  
	  this.history.splice(index, len, name);
	  len = history.length - 25;
	  if(len > 0){
	    this.history.splice(0, len); // 最多25个历史记录
	  }
	  this.m_history_index = history.length - 1;
	  
	  save_history(this);
	  
	  return view;
	},
	
	get history(){
	  return this.m_history;
	},
	
	back: function(){
	  if(this.is_back()){
	    
	    this.m_history_index--;
	    
	    var self = this;
	    var name = this.history[this.m_history_index];
	    
	    file_exists(this, name, function(err, exists){

	      if(exists){ // 文件存在
	        open_file(self, name); 
	        save_history(self);
	      }
	      else{ // 继续后退
	        self.history.splice(self.m_history_index, 1); // 删除无效记录
	        save_history(self);
	        self.back();
	      }
	    });
	  }
	},
	
	forward: function(){
	  
	  if(this.is_forward()){
	    
	    this.m_history_index++;
	    
	    var self = this;
	    var name = this.history[this.m_history_index];
	    
	    file_exists(this, name, function(err, exists){

	      if(exists){ // 文件存在
	        open_file(self, name);
	        save_history(self);
	      }
	      else{ // 继续前进
	        self.history.splice(self.m_history_index, 1); // 删除无效记录
	        save_history(self);
	        self.forward();
	      }
	    });
	  }
	},
	
	is_back: function(){
	  return this.m_history_index > 0;
	},
	
	is_forward: function(){
	  return this.m_history_index < this.history.length - 1;
	},
	
	/**
	 * 关闭与当前相似的文件
	 * 如果传入的路径与当前文件路径相似,关闭
	 */
	close: function(path){
	  if(this.m_current && this.m_current.getFilename().indexOf(path) === 0){
	    this.m_current.remove();
	  }
	},

	/**
	 * 关闭当前文件
	 */
	close_current: function(){
		if(this.m_current){
	    this.m_current.remove();
		}
	},
	
	/**
	 * 改名相似的文件
	 */
	rename: function(old_path, new_path){
	  if(this.m_current){
	    var name = this.m_current.getFilename();
	    var index = name.indexOf(old_path);
  	  if(index === 0){ // 
  	    //路径相似
        name = name.replace(old_path, new_path);
	      open_file(this, name);
  	    this.history[this.m_history_index] = name; // 修改历史
  	    save_history(this);
  	  }
	  }
	}

});