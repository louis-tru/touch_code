/**
 * @class teide.touch.AceEditor
 * extends ace.Editor
 * @createTime 2012-01-29
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/storage.js');

var Editor = require('ace/editor').Editor;
var THEME_CHEAE_NAME = 'EDITOR_THEME';
var FONT_SIZE = '12px';
var DEFAULT_THEME = 'ace/theme/vs';
//var DEFAULT_THEME = 'ace/theme/textmate';

// require("ace/config").loadModule(["ext", 'ace/ext/language_tools']);

$class('teide.touch.AceEditor', Editor, {
  
  /**
   * 编辑器失去焦点事件
   */
  onblur: null,

  /**
   * constructor function
   * @param {ace.VirtualRenderer} renderer
   * @param {ace.EditSession}     session    (Optional)
   * @constructor
   */
	AceEditor: function(renderer, session, text_input_class) {
		Editor.call(this, renderer, session, text_input_class);
		this.onblur = new tesla.EventDelegate('blur', this);
		var self = this;
		
		this.on('blur', function(){
		  self.onblur.notice();
		});
		
		this.setTheme();
		this.setFontSize(FONT_SIZE);
		if(tesla.env.touch){
	    this.setOptions({
	      enableSnippets: true,
	      scrollPastEnd: true,
	    });
  	} else {
	    this.setOptions({
	      enableBasicAutocompletion: true,
	      enableLiveAutocompletion: true,
	      enableSnippets: true,
	      scrollPastEnd: true,
	    });
  	}
    this.setSelectionStyle('text');
	},

	/**
	 * set theme
	 * @method setTheme
	 * @param {String} name
	 */
	setTheme: function(theme) {
		theme = theme || tesla.storage.get(THEME_CHEAE_NAME) || DEFAULT_THEME;
		tesla.storage.set(THEME_CHEAE_NAME, theme);
		Editor.prototype.setTheme.call(this, theme);
	},

// 	/**
// 	 * 设置大小
// 	 * @param {Numbrt} w
// 	 * @param {Numbrt} h
// 	 */
// 	resize: function (w, h){
// 		var container = this.container;
// 		container.style.width = w + 'px';
// 		container.style.height = h + 'px';
// 		this.renderer.onResize();
// 	},

	setSession: function(session){

		if(this.session){
			this.session.removeEventListener("debugbreak", this.$onDebugBreak);
		}
		this.$onDebugBreak = this.onDebugBreak.bind(this);
		session.addEventListener("debugbreak", this.$onDebugBreak);

		Editor.prototype.setSession.call(this, session);
		this.onDebugBreak();
	},

	onDebugBreak: function() {

		var data = this.session.getDebugBreak();
		var row = data.row;

		if (row !== -1)
			this.gotoLine(row + 1, data.startColumn);
	}

});

