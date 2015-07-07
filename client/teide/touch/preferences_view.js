/**
 * @createTime 2015-06-10
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/file_content_view.js');
include('teide/touch/preferences_view.vx');
include('teide/touch/button.js');
include('teide/touch/checkbox.js');
include('teide/touch/input.js');
include('teide/touch/number_roller.js');
include('teide/touch/overlay_panel.js');
include('teide/touch/ace_editor.js');
include('teide/touch/ace_edit_session.js');

var themelist = require('ace/ext/themelist');
var VirtualRenderer = require('ace/virtual_renderer').VirtualRenderer;
var AceEditor = teide.touch.AceEditor;
var AceEditSession = teide.touch.AceEditSession;

var preferences = null;

/**
 * 获取偏好
 */
function get_preferences() {
  
  if(preferences){
    return preferences;
  }
  
  preferences = {
    enable_line_number: false,
    font_size: 14,
    show_invisibles: false,
    indent_guides: false,
    enable_touch_focus : false,
    enable_auto_line: true,
    indent_width: 4,
    theme: 'ace/theme/vs',
    theme_name: 'Visual Studio',
  };
  
  if(ts.env.iphone || ts.env.ipod){
    preferences.enable_auto_line = false;
    preferences.indent_width = 2;
  }
  else{
    preferences.enable_auto_line = true;
    preferences.indent_width = 4;
  }
  return ts.extend(preferences, ts.storage.get('teide_preferences'));
}

/**
 * 获取偏好item
 */
function get_preferences_item(name) {
  return get_preferences()[name];
}

/**
 * 设置偏好
 */
function set_preferences(opts) {
  ts.storage.set('teide_preferences', ts.extend(get_preferences(), opts));
  PreferencesView.onpreferences_change.notice(preferences);
}

/**
 * 设置偏好item
 */
function set_preferences_item(name, value) {
  get_preferences()[name] = value;
  ts.storage.set('teide_preferences', preferences);
  PreferencesView.onpreferences_change.notice(preferences);
}

/**
 * 设置偏好取反
 */
function set_preferences_item_not(name) {
  set_preferences_item(name, !get_preferences_item(name));
}

function update_diaplay(self) {
  
  var preferences = get_preferences();
  // {@自动换行} 
  self.inl.auto_line_ch.selected = preferences.enable_auto_line;
  // {@显示行号} 
  self.inl.line_number_ch.selected = preferences.enable_line_number;
  // {@触摸焦点} 
  self.inl.touch_focus_ch.selected = preferences.enable_touch_focus;
  // {@显示制表符} 
  self.inl.invisibles_ch.selected = preferences.show_invisibles;
  // {@显示缩进向导} 
  self.inl.indent_guides_ch.selected = preferences.indent_guides;
  // {@缩进宽度} 
  self.inl.indent_width_num.value = preferences.indent_width;
  // {@字体大小} 
  self.inl.font_size_num.value = preferences.font_size;
  // 
  var editor = self.m_editor;
  // update editor
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
  
  self.inl.theme_value.text = preferences.theme_name;
}

var demo_js = [
  "// {@初始编辑器}",
  "function init_editor(self){",
  "\tvar editor_container = self.inl.editor_container;",
  "\tvar renderer = new VirtualRenderer(editor_container.dom);",
  "\tvar editor = new AceEditor(renderer, new AceEditSession(demo_js, 'demo.js'));",
  "\tif (ts.env.touch) {",
  "\t\teditor.setOption('scrollPastEnd', false);",
  "\t\teditor.setReadOnly(true); // {@设置为只读}",
  "\t}",
  "}"
];

function resize_editor(self) {
  (function(){
    self.m_editor.resize(true);
  }).delay2(200);
}

// 初始编辑器
function init_editor(self) {
  var editor_container = self.inl.editor_container;
  var renderer = new VirtualRenderer(editor_container.dom);
  var session = new AceEditSession($r(demo_js.join('\n')), 'demo.js');
  var editor = new AceEditor(renderer, session);
  editor.setOption('showFoldWidgets', !ts.env.touch); // 代码折叠快暂时禁用
  editor.setOption('highlightActiveLine', false);
  // editor.setOption('scrollPastEnd', false);
  editor.setReadOnly(true); // 设置为只读
  renderer.setShowPrintMargin(false);
  editor.setOption('autoScrollEditorIntoView', true);
  editor.setOption('maxLines', 30);
  self.m_editor = editor;
  teide.touch.MainViewport.share().onchangelayoutstatus.$on(resize_editor, self);
}

// 设置杨激活状态
function set_act_all_func_ch_on_stat(self){
  self.inl.act_all_func_ch.selected = true;
  self.inl.act_all_func_ch.disable = true;
}

function init(self) {
  if (ts.env.ios && ts.env.ios_version >= 8.2 && ts.env.ios_version < 10) {
    self.addClass('fine');
  }
  var app = teide.touch.MainViewport.share().application_info;
  self.inl.my_id.text = app.id.toUpperCase();
  PreferencesView.onpreferences_change.$on(update_diaplay, self);
  init_editor(self);
  update_diaplay(self);
  self.$on('unload', release);
  
  if (app.introducer_id) {
    self.m_introducer_setting_done_status(app.introducer_id);
  } else {
    self.m_introducer_init_status();
  }

  self.inl.share_count.text = app.share_count;

  if (app.is_lite) {
    self.inl.act_lite_x_panel.show();
    if (app.is_lite_x) {
      set_act_all_func_ch_on_stat(self);
    }
  }
}

function release(self) {
  PreferencesView.onpreferences_change.off(update_diaplay);
  teide.touch.MainViewport.share().onchangelayoutstatus.off(resize_editor);
}

/**
 * @class teide.touch.AudioFileView
 * @extends teide.touch.FileContentView
 */
var PreferencesView = 

$class('teide.touch.PreferencesView', teide.touch.FileContentView, {
  
  m_editor: null,
  
  m_introducer_setting_done_status_var: 1,
  
  /**
	 * @constructor
	 */
	PreferencesView: function(tag) {
    this.FileContentView(tag);
	},
	
	init: function(name){
	  this.setFilename(name);
	  init(this);
	},

  m_my_id_click_handle: function(evt){

    var self = this;
    var menu = ts.gui.Control.New('teide.touch.StopAction');

    menu.setValue('Copy').setClickHandle(function() {
      NativeService.call('set_clipboard_data', [self.inl.my_id.text]);
    });

    menu.priority = 'top';
    menu.activateByElement(evt.sender);
  },

  m_introducer_init_status: function(){
    if (this.inl && this.m_introducer_setting_done_status_var != 4) {
      this.inl.introducer_id_text.hide(); 
      this.inl.introducer_id_input.hide(); 
      this.inl.introducer_panel.attr('class', 'action arrow');
      this.m_introducer_setting_done_status_var = 1;
    }
  },
  
  m_introducer_editor_status: function() {
    if (this.m_introducer_setting_done_status_var != 4) {
      this.inl.introducer_id_text.hide();
      this.inl.introducer_id_input.show();
      this.inl.introducer_id_input.clear();
      this.inl.introducer_id_input.focus();
      this.inl.introducer_panel.attr('class', ''); //disable_events
      this.m_introducer_setting_done_status_var = 2;
    }
  },
  
  m_introducer_editor_load_status: function(text) {
    if (this.m_introducer_setting_done_status_var != 4) {
      this.inl.introducer_id_text.text = text;
      this.inl.introducer_id_text.show();
      this.inl.introducer_id_input.hide();
      this.inl.introducer_panel.attr('class', 'loading');
      this.m_introducer_setting_done_status_var = 3;
    }
  },
  
  m_introducer_setting_done_status: function(text) {
    this.inl.introducer_id_text.text = text;
    this.inl.introducer_id_text.show();
    this.inl.introducer_id_input.hide();
    this.inl.introducer_panel.attr('class', ''); // disable_events
    this.m_introducer_setting_done_status_var = 4;
  },
    
  m_introducer_panel_click_handle: function() {
    if (this.m_introducer_setting_done_status_var == 1) {
      var app = teide.touch.MainViewport.share().application_info;
      if (app.introducer_id) {
        this.m_introducer_setting_done_status(app.introducer_id);
      } else {
        this.m_introducer_editor_status();
      }
    }
  },
  
  m_error: function(err){
    this.m_introducer_init_status();
    Dialog.error(err.message);
  },
  
  m_introducer_input_enter_handle: function(evt) { 
    
    var app = teide.touch.MainViewport.share().application_info;
    if (app.introducer_id) {
      this.m_introducer_setting_done_status(app.introducer_id);
      return;
    }

    var self = this;
    var value = this.inl.introducer_id_input.value.toUpperCase();
    this.inl.introducer_id_input.blur();

    if (value == app.id.toUpperCase()) {
      Dialog.error('不能将自己设置为推荐人');
      return;
    }

    if (!/^([A-F0-9]{6,12})$/.test(value)) {
      Dialog.error('你的输入不正确,标识长度应不小于6并且不大于12的16进制字符串');
      return;
    }

    this.m_introducer_editor_load_status(value);
    Dialog.confirm($t('推荐人ID设置后不能更改,确定要设置为"{0}"?').format(value), function(is) {
      if (!is) return self.m_introducer_init_status();
      // 调用管理服务
      ManageService.call('set_introducer', [app, value], function(err, data) {
        if (err) return self.m_error(err);
        value = data.introducer_id;
        
        // 成功后保存这个值到本地
        NativeService.call('update_application_info', [data], function(err, data){
          if (err) return self.m_error(err);
          ts.extend(app, data);
          self.m_introducer_setting_done_status(value);
          self.inl.share_count.text = app.share_count;
        });
      });
    });
  },
  
  m_act_all_func_handle: function(evt) {

    var self = this;
    var app = teide.touch.MainViewport.share().application_info;

    if (!evt.sender.selected || app.is_lite_x) {
      return;
    }

    self.inl.act_all_func_ch.disable = true;
    self.inl.share_count.addClass('ani');
    self.inl.share_count.text = '-';

    // 激活lite_x,返回激活lite_x的序列号
    ManageService.call.delay2(ManageService, 2000, 
      'activate_lite_x', [app], function(err, data) {
      // 
      self.inl.act_all_func_ch.disable = false;
      self.inl.share_count.removeClass('ani');
      if (err) {
        self.inl.share_count.text = app.share_count;
        self.inl.act_all_func_ch.selected = false;
        return Dialog.error(err.message);
      }

      // 成功后保存这个值到本地
      NativeService.call('update_application_info', [data], function(err, data){
        if (err) {
          self.inl.share_count.text = app.share_count;
          self.inl.act_all_func_ch.selected = false;
          return Dialog.error(err.message);
        }

        ts.extend(app, data);

        self.inl.share_count.text = app.share_count;
        if (app.is_lite_x) {
          set_act_all_func_ch_on_stat(self);
        } else {
          self.inl.act_all_func_ch.selected = false;
        }
      });
    });
  },
	
  //自动换行
  m_auto_line_handle: function(evt){
    set_preferences_item('enable_auto_line', evt.data);
  },
  
  //@显示行号
  m_line_number_handle: function(evt){
    set_preferences_item('enable_line_number', evt.data);
  },
  
  //@触摸焦点
  m_auto_touch_focus_hand: function(evt){
    set_preferences_item('enable_touch_focus', evt.data);
  },
  
  //显示制表符
  m_invisibles_handle: function(evt){
    set_preferences_item('show_invisibles', evt.data);
  },
  
  //显示缩进向导
  m_indent_guides_handle: function(evt){
    set_preferences_item('indent_guides', evt.data);
  },
  
  m_indent_width_handle: function(evt){
    set_preferences_item('indent_width', evt.data);
  },
  
  m_font_size_handle: function(evt){
    set_preferences_item('font_size', evt.data);
  },
  
  m_select_theme_handle: function(evt){
    ts.gui.Control.New('teide.touch.SelectTheme').set_target(this.inl.arrow);
  },
  
}, {
  
  onpreferences_change: new ts.EventDelegate('preferences_change'),
  
  /**
   * 获取偏好
   */
  get_preferences: get_preferences,
  
  /**
   * 获取偏好item
   */
  get_preferences_item: get_preferences_item,
  
  /**
   * 设置偏好
   */
  set_preferences: set_preferences,
  
  /**
   * 设置偏好item
   */
  set_preferences_item: set_preferences_item,
    
  /**
   * 设置偏好取反
   */
  set_preferences_item_not: set_preferences_item_not,
  
});

function init_SelectTheme(self){
  if (ts.env.touch) {
    if (ts.env.ipad) {
      self.frail = false;
    } else {
      self.frail = true;
    }
  } else {
    self.frail = false;
  }
}

/**
  * @class teide.touch.SelectTheme
  */
$class('teide.touch.SelectTheme', teide.touch.OverlayPanel, {
  
  frail: true,
  
  /**
    * @constructor
    */
  SelectTheme: function(tag){
    this.OverlayPanel(tag);
    this.onloadview.$on(init_SelectTheme);
  },
  
  set_target: function(target){
    var self = this;
    
    // caption: "Chrome"
    // isDark: false
    // name: "chrome"
    // theme: "ace/theme/chrome"
    
    var size = tesla.gui.screen.size;
    var cur_theme = get_preferences_item('theme');
    
    this.scroll.css('max-height', size.height - 20 + 'px');
    
    var y = 0;
    
    this.scroll.ls.dataSource = themelist.themes.map(function(item, index){
      if(item.theme == cur_theme){
        item.class_str = 'on';
        y = index;
      } else {
        item.class_str = ''; 
      }
      // item.class_str += item.isDark ? ' dark' : '';
      return item;
    });
    
    this.scroll.ls.onrender.on(function(){
      
      if(size.width <= 320){
        var offset = target.offset;
        self.activateByPosition(offset.left + 22, offset.top, 0, offset.height);
      } else {
        self.activateByElement(target);
      }
      // self.scroll.set(0, y * 46 - (size.height - 20) / 2 + 70, 1, 0);
      self.scroll.dom.scrollTop = y * 46 - (size.height - 20) / 2 + 70;
    });
  },
  
  m_select_click_handle: function(evt){
    var theme = evt.sender.attr('theme');
    var theme_name = evt.sender.attr('theme_name');
    set_preferences({ theme: theme, theme_name: theme_name });
    
    var ls = evt.sender.parent.children();
    for(var i = 0; i < ls.length; i++){
      ls[i].removeClass('on');
    }
    evt.sender.addClass('on');
  },
  
});

