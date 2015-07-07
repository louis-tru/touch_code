/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/gui/root.js');
include('tesla/event_delegate.js');
include('teide/touch/ace_editor.js');
include('teide/touch/ace_edit_session.js');
include('teide/touch/file_content_view.js');
include('teide/touch/service.js');
include('teide/touch/dialog.js');
include('teide/touch/preferences_view.js');

var PreferencesView = teide.touch.PreferencesView;
var AceEditor = teide.touch.AceEditor;
var AceEditSession = teide.touch.AceEditSession;
var VirtualRenderer = require('ace/virtual_renderer').VirtualRenderer;
var UndoManager = require('ace/undomanager').UndoManager;
var TouchNativeTextInput = require('ace/touch/native_textinput').TouchNativeTextInput;
var TextInputDelegate = require('ace/touch/native_textinput').TextInputDelegate;

require('ace/touch/overlay_panel').tag = function(tag) {
  return $t(tag);
};

var MAX_COLUMN = 80;
var FOLDS_SAVE_DELAY_TIME = 1e4; //毫秒
var editor = null; // ace editor core
var editor_wait_container = null;

function init_text_tnput_delegate(self){
  FastNativeService.onace_text_input_focus.on(function(){
    self.input.onfocus();
  });
  FastNativeService.onace_text_input_blur.on(function(){
    self.input.onblur();
  });
  FastNativeService.onace_text_input_input.on(function(evt){
    self.input.oninput(evt.data);
  });
  FastNativeService.onace_text_input_backspace.on(function(){
    self.input.onbackspace();
  });
  FastNativeService.onace_text_input_indent.on(function(){
    self.input.onindent();
  });
  FastNativeService.onace_text_input_outdent.on(function(){
    self.input.onoutdent();
  });
  FastNativeService.onace_text_input_comment.on(function(){
    self.input.oncomment();
  });
  FastNativeService.onace_text_input_composition_start.on(function(evt){
    self.input.oncomposition_start(evt.data);
  });
  FastNativeService.onace_text_input_composition_update.on(function(evt){
    self.input.oncomposition_update(evt.data);
  });
  FastNativeService.onace_text_input_composition_end.on(function(evt){
    self.input.oncomposition_end(evt.data);
  });
}

$class('teide.touch.TextInputDelegate', TextInputDelegate, {

  m_editor: null,
  m_input: null,

  TextInputDelegate: function(editor, input){
    this.m_editor = editor;
    this.input = input;
    input.delegate = this;
    init_text_tnput_delegate(this);
  },

  focus: function(input){
    FastNativeService.call('ace_textinput_focus');
  },

  blur: function(input){
    FastNativeService.call('ace_textinput_blur');
  },
  
  set_can_delete: function(value){
    FastNativeService.call('ace_textinput_set_can_delete', [value]);
  },

});

function centerSelection(){ // 选中的在中心显示

  var pos = editor.getCursorPositionScreen();
  var line = pos.row;
  var renderer = editor.renderer;
  var top = renderer.getScrollTopRow();
  var bottom = renderer.getScrollBottomRow();

  if(line < top || line > bottom){
    editor.centerSelection();
  }
}

function update_editor() {
  var main = teide.touch.MainViewport.share();
  var size = main.eastSize;
  if (main.getLayoutStatus() == 2) { // 状态2编辑器为不可见状态
    // editor.blur();
  } else {
    // Dialog.alert('width:' + size.width + ', height:' + size.height);
    // console.nlog('width:' + size.width + ', height:' + size.height);
    $(editor.container).css('width', size.width + 'px');
    editor.resize(true); // size.width, size.height

    // 打开键盘打开时调整光标中心显示
    // if (teide.touch.MainViewport.share().is_open_soft_keyboard) {
    centerSelection();
    // } else {

    // }
  }
}

/*
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 * because the buffer-to-string conversion in `fs.readFileSync()`
 * translates it to FEFF, the UTF-16 BOM.
 */
function stripBOM(content) {
  //0xFEFF
  //0xFFFE
  var c = content.charCodeAt(0);
	if (c === 0xFEFF || c == 0xFFFE) {
		content = content.slice(1);
	}
	return content;
}

function set_editor_preferences(editor) { 
  
  var preferences = PreferencesView.get_preferences();
  
  editor.setOption('showGutter', preferences.enable_line_number);
  editor.setOption("wrap", preferences.enable_auto_line ? 'free' : 'off');
  editor.setFontSize(preferences.font_size);
  editor.session.setTabSize(preferences.indent_width);
  // {@显示制表符} 
  editor.setShowInvisibles(preferences.show_invisibles);
  // {@显示缩进向导} 
  editor.setDisplayIndentGuides(preferences.indent_guides);
  // 主题
  editor.setTheme(preferences.theme);
}

function getTextEditor() {
  
	if (editor) return editor;
  
  var main = teide.touch.MainViewport.share();
	var container = $('div');
	container.style = { width: main.eastSize.width + 'px', height: '100%' };
	editor_wait_container = $('div');
	editor_wait_container.css('display', 'none');
	editor_wait_container.append(container);
	editor_wait_container.appendTo($(tesla.gui.root.share()));
	
	var renderer = new VirtualRenderer(container.dom);
  if(main.ios_native){
    editor = new AceEditor(renderer, new AceEditSession('', ''), TouchNativeTextInput);
    new teide.touch.TextInputDelegate(editor, editor.textInput);
  }
  else{
    editor = new AceEditor(renderer, new AceEditSession('', '')); 
  }
	editor.setFontSize(14);
	editor.setOption('showFoldWidgets', !ts.env.touch); // 代码折叠快暂时禁用
	editor.setOption('highlightActiveLine', false);
	renderer.setPrintMarginColumn(MAX_COLUMN);
  
  main.onbefore_change_layout_status.on(function(){
    var status = main.getLayoutStatus();
    if(status == 2){ // 状态2编辑器为不可见状态
      editor.blur();
    } else if(status === 0) {
      update_editor();
    }
  });
	main.onchangelayoutstatus.on(update_editor);
	
	PreferencesView.onpreferences_change.$on(set_editor_preferences, editor);

	set_editor_preferences(editor);
  
  NativeService.on('clipboard_data_change', function(evt){
    editor.setOption('clipboardData', evt.data); // 更新剪贴板
  });
  
  editor.on('activate_touch_magnifier', function(evt){
  	// NativeService.call('activate_touch_magnifier', [evt.x, evt.y]);
    FastNativeService.call('ace_touch_magnifier_start', [evt.x, evt.y]);
  });
  
  editor.on('stop_touch_magnifier', function(){
    //NativeService.call('stopTouchMagnifier');
    FastNativeService.call('ace_touch_magnifier_stop');
  });
  
  editor.on('touch_magnifier_move', function(evt){
    FastNativeService.call('ace_touch_magnifier_move', [evt.x, evt.y]);
  });
  
  // 设置是否立即捕获焦点
  editor.setOption('immediateFocus', 
    PreferencesView.get_preferences_item('enable_touch_focus'));
    
  editor.on('open_url', function(url){
    // alert(url);
    main.open_web_browser(url);
  });
  
  // console.nlog('ace editor init');
  
	editor.commands.addCommands([{
    name: "copy",
    readOnly: true,
    exec: function(editor) {
      var range = editor.getSelectionRange();
      editor._emit("copy", range);
      if(!range.isEmpty()){
      	NativeService.call('set_ace_clipboard_data', [editor.getOption('clipboardData')]);
    	}
  	},
    scrollIntoView: "cursor",
    multiSelectAction: "forEach"
	},{
    name: "cut",
    exec: function(editor) {
      var range = editor.getSelectionRange();
      editor._emit("cut", range);
      if (!range.isEmpty()) {
				NativeService.call('set_ace_clipboard_data', [editor.getOption('clipboardData')]);
				editor.clearSelection();
        editor.session.remove(range);
      }
    },
    scrollIntoView: "cursor",
    multiSelectAction: "forEach"
	}]);

	return editor;
}

function savingFolds(self) {
	if(!self.m_is_ready){
	  return;
	}
	var folds = self.session.getTransformFolds();
	FileActionService.call('saveTextFolds', [self.getFilename(), folds], noop);
}

function saveFolds(self) {
	cancelSaveFolds(self);
	self.m_folds_save_timeout_id = 
	  savingFolds.delay2(FOLDS_SAVE_DELAY_TIME, self);
}

function cancelSaveFolds(self) {
	Function.undelay(self.m_folds_save_timeout_id);
}

var IgnoreChange = false;

function sessionChangeEventHandle(self, evt) {
  if(!IgnoreChange){
    self.m_is_change = true;
    (function(){ self.onchange.notice(); }.delay(20));
  }
}

function sessionChangeBreakpointEventHandle(self, evt) {
  if(!self.m_is_ready){
	  return;
	}
  var breakpoints = self.m_session.getTransformBreakpoints();
	FileActionService.call('saveTextBreakpoints', [self.getFilename(), breakpoints], noop);
}

/**
 * 所有的UndoManager
 * @static
 * @private
 */
var undos = [];

function getUndoManager(self, name) {
  
  var index = undos.innerIndexOf('name', name);
  if(index != -1){
    return undos[index].undo;
  }

  if(undos.length > 50){
    // 最多可以保存50个对像
    undos.shift();
  }
  
  var undo = new UndoManager();
  undos.push({ name: name, undo: undo });
  return undo;
}

/**
 * 所有的session
 * @static
 * @private
 */
var sessions = [];

var isInitConsoleLogMonitor = false;

function initConsoleLogMonitor() {
  isInitConsoleLogMonitor = true;
  
  // 监控日志,如果当前缓存的session被更新,需更新缓存的session
  FileActionService.on('console_log', function(evt){
    
    var log = evt.data;
    var type = { 'U ': 'U', 'D ': 'D'/*, '! ': 'U'*/ }[log.substr(0, 2)];
    if(!type) return;

    // 有文件被更新或删除
    var name = log.substr(2).replace(/^\s*local\s+/, '');
    
    // 更新session
    for(var i = 0; i < sessions.length; i++){
      var session = sessions[i];

      if(type == 'U'){
        if(session.name == name){
          if(editor.session === session.session){
            // 更新重新加载文件内容
            APIService.call.delay2(APIService, 500, 
              'readFileAsText', [name], function(err, data){
              if (err){
                return Dialog.error(err.message);
              }
              IgnoreChange = true;
              editor.session.setValue(stripBOM(data.code)); // 
              IgnoreChange = false;
            });
          } else{
            sessions.splice(i, 1); // 删除
            session.session.destroy(); // 删除session
            i--;
          }
        }
      } else if (session.name.indexOf(name) === 0) {
        sessions.splice(i, 1); // 删除
        session.session.destroy(); // 删除session
        i--;
      }
    }
  });
}

function getSession(self, name) {
  
  var index = sessions.innerIndexOf('name', name);
  if(index != -1){
    self.ready();
    var session = sessions[index].session;
    self.setReadOnly(session.readonly);
    return session;
  }
  
  try{
    
    if(!isInitConsoleLogMonitor) {
      initConsoleLogMonitor();
    }
    
    var data = APIService.callSync('readFileAsText', [name]);
    
    // 最多可以保存5个对像
    if(sessions.length > 5){
      sessions.shift().session.destroy();
    }
    
    var session = new AceEditSession(stripBOM(data.code), name);
    session.setUndoManager(new UndoManager());
    session.setBreakpoints(data.breakpoints);
    session.addFoldsByRange(data.folds);
  	sessions.push({ name: name, session: session });
  	session.readonly = data.readonly;
  	session.is_run = data.is_run;
  	
  	self.setReadOnly(session.readonly);
  	
  	self.ready();
  	
  	return session;
  }
  catch(err){
    // console.nlog('====================', name, err.message);
    return new AceEditSession('', name);
  }
}

function onblur_handle(self) {
  self.save(true); // 强制保存
}

function init(self, name) {

  var editor = self.ace;
  var session = self.getSession(name);
	self.m_session = session;
	
	self.m_sessionChangeEventHandle = sessionChangeEventHandle.bind(null, self);  
	session.on('change', self.m_sessionChangeEventHandle);
	
	self.m_saveFolds = saveFolds.bind(null, self);
	session.on('changeFold', self.m_saveFolds);
	
	self.m_sessionChangeBreakpointEventHandle = 
	  sessionChangeBreakpointEventHandle.bind(null, self);
	session.on('changeBreakpoint', self.m_sessionChangeBreakpointEventHandle);
  
  self.$on('unload', release);
  self.append($(editor.container));
  editor.setSession(session);
  editor.onblur.$on(onblur_handle, self);
  
	//editor.focus();
	update_editor(self);

  var preferences = PreferencesView.get_preferences();
  
  session.setTabSize(preferences.indent_width);
  // session.setUseSoftTabs(false); // 不使用软tab
  session.setUseSoftTabs(true); // 使用软tab
  session.setOption("wrap", preferences.enable_auto_line ? 'free' : 'off');
  
	self.m_save_timeout_id = setInterval(self.save.bind(self), 5000); // 定时5秒保存
}

function release(self){
  
  clearInterval(self.m_save_timeout_id);
  self.save(); // 保存
  
  var editor = self.ace;
  editor.onblur.off(onblur_handle, self);
  
  if (!self.m_rm_hold_blur) { // 保持焦点
    editor.blur(); 
  }
  
  var session = self.m_session;
  session.off('change', self.m_sessionChangeEventHandle);
  session.off('changeFold', self.m_saveFolds);
  session.off('changeBreakpoint', self.m_sessionChangeBreakpointEventHandle);
  
  editor.setSession(new AceEditSession());
  if(editor_wait_container){
    editor_wait_container.append($(editor.container));
  }
}

/**
 * @class teide.touch.TextEditor
 * @extends teide.touch.FileContentView
 */
$class('teide.touch.TextEditor', teide.touch.FileContentView, {
  
  // private:
	m_folds_save_timeout_id: 0,
	m_save_timeout_id: 0, // 定时保存句柄
	m_saved: false,       // 是否正在保存中
	m_session: null,
	m_ace: null,
	m_is_change: false,
	m_is_ready: false,  // 如果这个没有准备好,不能保存
	m_modify: false,    // 文件最终是否变更过
	m_rm_hold_blur: false, // 删除保持焦点
	
  /**
	 * @constructor
	 */
	TextEditor: function() {
    this.FileContentView();
    this.m_ace = getTextEditor();
	},
	
	/**
	 * 初始化
	 */
	init: function(name){
	  init(this, name);
	  this.setFilename(name);
	},
	
	/**
	 * 准备
	 */
	ready: function(){
	  this.m_is_ready = true;
	},
	
	/**
	 * 是否变化
	 */
	get modify(){
	  return this.m_modify;
	},
	
  /**
	 * 获取文本编辑 session
	 */
  get session(){
    return this.m_session;
  },
  
  // overwrite
  is_run: function(){
    return !!this.session.is_run;
  },
  
  // overwrite
  undo: function(){
    return this.session.getUndoManager().undo();
  },
  
  // overwrite
  redo: function(){
    return this.session.getUndoManager().redo();
  },
  
  // overwrite
  hasUndo: function(){
    return this.session.getUndoManager().hasUndo();
  },
  
  // overwrite
  hasRedo: function(){
    return this.session.getUndoManager().hasRedo();
  },
  
	/**
	* 设置运行调式断点
	*/
	setDebugBreak: function(data) {
		this.m_session.setDebugBreak(data.row, data.startColumn, data.endColumn);
	},
  
	/**
	 * 清除运行调式断点
	 */
	clearDebugBreak: function() {
		this.m_session.clearDebugBreak();
	},
	
	get ace(){
	  return this.m_ace;
	},
  
	/**
	 * 是否为只读
	 */
	getReadOnly: function(){
		return this.ace.getReadOnly();
	},
	
	setReadOnly: function(val){
    if(val){
      this.ace.blur();
    }
	  this.ace.setReadOnly(val);
	},
  
	/**
	* save file
	* @param {boolean} force save
	*/
	save: function(force) {

	  if(!this.m_is_change){ // 只有发生了变化才需要保存
	    return;
	  }
	  
	  if(!this.m_is_ready){ // 没有准备好文件
	    return;
	  }
	  
	  if(!force && this.m_saved){ // 正在保存中
	    return;
	  }

		cancelSaveFolds(this);
    
		var self = this;
		var session = this.m_session;
		var code = session.getValue();
		var breakpoints = session.getTransformBreakpoints();
		var folds = session.getTransformFolds();
		var data = [this.getFilename(), code, { breakpoints: breakpoints, folds: folds }];
		
		this.m_saved = true;
		this.m_is_change = false;
		
		FileActionService.call('saveFileAsText', data, function(err, info) {
		  self.m_saved = false;
		  if (err){
  			return Dialog.error(err.message);
		  }
		  var res = teide.touch.MainViewport.share().res;
		  var path = self.getFilename();
		  var node = res.find(path);
		  if(node){
		    node.info = info;
		  }
		  self.m_modify = true;
		});
	},
	
	getSession: function(name){
	  return getSession(this, name);
	},
  
	/**
	 * 设置文件名称
	 */
	setFilename: function(value){
	  teide.touch.FileContentView.members.setFilename.call(this, value);
	  var mode = AceEditSession.getModeByFileName(value);
	  if(this.m_session.getMode() != mode){
	    this.m_session.setMode(mode);
	  }
	},
	
	// 捕获焦点
	focus: function(){
    // because we have to call event.preventDefault() any window on ie and iframes 
    // on other browsers do not get focus, so we have to call window.focus() here
    if (!document.hasFocus || !document.hasFocus())
        window.focus();
		this.ace.focus();
	},

	// 
	blur: function(){
		this.ace.blur();
	},
	
	/**
	  * 删除并持有焦点
	  */
	remove_hold_blur: function(){
	  this.m_rm_hold_blur = true;
	  this.remove();
	},
	
	/**
	* 设置编辑器主题
	* @param {String} name
	*/
	setTheme: function(name) {
		this.ace.setTheme(name);
	}
  
}, {

  stripBOM: stripBOM,

  /**
   * 获取ace
   */
  get_ace_editor: function(){
    return editor;
  }

});

