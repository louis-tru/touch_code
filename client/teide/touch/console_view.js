/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/text_editor.js');
include('teide/touch/service.js');
include('tesla/storage.js');

var UndoManager = require('ace/undomanager').UndoManager;
var AceEditSession = teide.touch.AceEditSession;

// var old_navigateTo = 0;

function log_handle(self, evt){

  var ace_document = self.session.getDocument();
  var line = ace_document.getLength();
  ace_document.insertLines(line - 1, [evt.data]);
  self.ace.navigateTo(line, 0);
  tesla.storage.set('ace_console_log_serollTop', self.session.getScrollTop());
}

function centerSelection(self){
  
  var editor = self.ace;
  var pos = editor.getCursorPositionScreen();
  var line = pos.row;
  var renderer = editor.renderer;
  var top = renderer.getScrollTopRow();
  var bottom = renderer.getScrollBottomRow();

  if(line - 1 < top || line + 1 > bottom){
    editor.centerSelection();
  }
}

/**
 * @private
 */
function init(self){

  FileActionService.$on('console_log', log_handle, self);
  FileActionService.$on('console_error', log_handle, self);
  self.setReadOnly(true); // 设置为只读

  var old = tesla.storage.get('ace_console_log_serollTop');
  if(old){
    self.session.setScrollTop(old);
  }

  var i = 0;

  function init_navigate(){
    if(i++ > 7 || self.ace.session !== self.session){
      return self.ace.renderer.off('afterRender', init_navigate);
    }
    self.ace.navigateTo(self.session.getDocument().getLength() - 1, 0);
    centerSelection(self);
    var scrollTop = self.session.getScrollTop();
    tesla.storage.set('ace_console_log_serollTop', scrollTop);
  }

  self.ace.renderer.on('afterRender', init_navigate);
  (function(){ self.ace.renderer.off('afterRender', init_navigate); }.delay(500));
  
  self.$on('unload', unload);
}

/**
 * @private
 */
function unload(self){
  FileActionService.off('console_log', log_handle);
  FileActionService.off('console_error', log_handle);
}

/**
 * @class teide.touch.ConsoleView
 * @extends teide.touch.TextEditor
 */
$class('teide.touch.ConsoleView', teide.touch.TextEditor, {
  
  /**
	 * @constructor
	 */
	ConsoleView: function() {
    this.TextEditor();
	},
	
	init: function(name){
	  teide.touch.TextEditor.members.init.call(this, name);
	  init(this);
	},
	
	/**
	 * @overwrite
	 */
	getSession: function(name){
    
    try{
      var data = APIService.callSync('readFileAsText', [name]);
      var session = new teide.touch.AceEditSession(data.code, name);
      return session;
    }
    catch(err){
      return new teide.touch.AceEditSession('', name);
    }
	},
	
  // overwrite
  undo: function(){
    
  },
  
  // overwrite
  redo: function(){
    
  },
  
  // overwrite
  hasUndo: function(){
    return false;
  },
  
  // overwrite
  hasRedo: function(){
    return false;
  },
  
	
	/**
	 * 保存
	 * @overwrite
	 */
	save: function(force) {
	  // EMPTY
	}
	
});

