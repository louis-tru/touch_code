/**
 * @createTime 2014-12-20
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/gui/control.js');
include('teide/touch/search_panel.vx');
include('teide/touch/file_content_view.vx');

function get_base_filename(name) {
  return name.match(/[^\/\\]+$/)[0];
}

/**
 * @class teide.touch.FileContentView
 * @extends tesla.gui.Control
 */
$class('teide.touch.FileContentView', tesla.gui.Control, {
  
  // 文件名称
  m_filename: '',
  
  // public:
	onchange: null,     // 文本变化事件

  /**
	 * @constructor
	 */
  FileContentView: function(tag){
    this.Control(tag);
    this.css('height', '100%');
    ts.EventDelegate.init_events(this, 'change');
  },
  
  /**
   * 初始化
   */
  init: virtual,
  
	/**
	 * 获取文件名称
	 */
  getFilename: function(){
    return this.m_filename;
  },
  
  /**
	 * 设置文件名称
	 */
	setFilename: function(value){
	  this.m_filename = value;
	  this.name = get_base_filename(value);	  
	},
	
	/**
	 * 是否可运行
	 */
	is_run: function(){
	  return false;
	},
  
  /**
   * 撤销更改
   */
  undo: function(){
    
  },
  
  /**
   * 反撤销更改
   */
  redo: function(){
    
  },
  
  /**
   * 是否可撤销
   */
  hasUndo: function(){
    return false;
  },
  
  hasRedo: function(){
    return false;
  },
  
  /**
   * 是否可用 web browse
   */ 
  is_web_browse: function(){
    return false;
  }
  
});

function get_preferences(){
  return teide.touch.PreferencesView.get_preferences();
}

function set_preferences(value){
  return teide.touch.PreferencesView.set_preferences(value);
}

function get_preferences_item(name){
  return teide.touch.PreferencesView.get_preferences_item(name);
}

function set_preferences_item(name, value){
  return teide.touch.PreferencesView.set_preferences_item(name, value);
}

function set_preferences_item_not(name){
  return teide.touch.PreferencesView.set_preferences_item_not(name);
}

function update_FileContentOption_display(self){
  
  var preferences = get_preferences();

  if(preferences.enable_line_number){
    self.enable_line_number_btn.addClass('on');
  }
  else{
    self.enable_line_number_btn.removeClass('on');
  }
  
  if(preferences.enable_auto_line){
    self.enable_auto_line_btn.addClass('on');
  }
  else{
    self.enable_auto_line_btn.removeClass('on');
  }
  
  if(preferences.font_size == 16){
    self.use_16_font_btn.addClass('on');
  }
  else{
    self.use_16_font_btn.removeClass('on');
  }
  
  if(preferences.indent_width == 2){
    self.use_2_indent_btn.addClass('on');
  }
  else{
    self.use_2_indent_btn.removeClass('on');
  }  
  if(preferences.enable_touch_focus){
    self.enable_touch_focus_btn.addClass('on');
  }
  else{
    self.enable_touch_focus_btn.removeClass('on');
  }
  
  var editor = teide.touch.TextEditor.get_ace_editor();
  if (editor && editor.session.isFoldsData()) {
    self.fold_unfold_all_btn.addClass('on');
  } else {
    self.fold_unfold_all_btn.removeClass('on');
  }
}

$class('teide.touch.FileContentViewOption', teide.touch.OverlayPanel, {
  
  // 不脆弱,不会一点击就消失
  frail: false,
  
  FileContentViewOption: function(tag){
    this.OverlayPanel(tag);
    this.onloadview.$on(update_FileContentOption_display);
  },
  
  m_enable_number_click_handle: function(){
    set_preferences_item_not('enable_line_number');
    update_FileContentOption_display(this);
  },
  m_enable_auto_line_click_handle: function(){
    set_preferences_item_not('enable_auto_line');
    update_FileContentOption_display(this);
  },
  m_use_16_font_click_handle: function(){
    set_preferences_item('font_size', get_preferences_item('font_size') == 16 ? 14 : 16);
    update_FileContentOption_display(this);
  },
  m_use_2_indent_click_handle: function(){
    set_preferences_item('indent_width', get_preferences_item('indent_width') == 2 ? 4 : 2);
    update_FileContentOption_display(this);
  },
  m_enable_touch_focus_click_handle: function(){
    set_preferences_item_not('enable_touch_focus');
    update_FileContentOption_display(this);
  },
  m_fold_unfold_all_click_handle: function(){
    var editor = teide.touch.TextEditor.get_ace_editor();
    if (editor) {
      if (editor.session.isFoldsData()) {
        editor.session.unfold();
      } else {
        editor.session.foldAll();
      }
      update_FileContentOption_display(this);
    }
  },
  
});


