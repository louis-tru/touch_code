/**
 * @createTime 2014-12-15
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

// include('third_party/ace/demo/show_own_source.js');
include('tesla/storage.js');
include('tesla/url.js');
include('tesla/gui/page.js');
include('tesla/gui/screen.js');
include('tesla/gui/scroll_view.js');
include('tesla/gui/list_template.js');
include('tesla/gui/list_template_page.js');
include('teide/touch/font.vx');
include('teide/touch/main_viewport.vx');
include('teide/touch/resources_panel.js');
include('teide/touch/search_panel.js');
include('teide/touch/service.js');
include('teide/touch/east_content_panel.js');
include('teide/touch/added_menu.js');
include('teide/touch/dialog.js');
include('teide/touch/more_menu.js');
include('teide/touch/text_editor.js');
include('teide/touch/preferences_view.js');

var PreferencesView = teide.touch.PreferencesView;
var share_main_viewport = null;
var ad_panel_height = ts.env.ios ? ts.env.ipad ? 66 : 50 : 0;

var reports_error = function(err){
  if (console.nlog) {
    console.nlog(err);
  }
};

// 向远程服务器报告异常
function remote_reports_error(err) {
  if (share_main_viewport) {
    ManageService.call('reports_error', [ share_main_viewport.application_info, err ]);
  } else if (console.nlog) {
    console.nlog(err);
  }
}

function set_head_height(self){
  if(ts.env.ios_version >= 7){
    if(self.ios_native){
      self.m_padding_top = 20;
    }
    self.west_title.css('padding-top', self.paddingTop + 'px');
    self.east_title.css('padding-top', self.paddingTop + 'px');
    self.east_title_btns.css('padding-top', self.paddingTop + 'px');
  }
}

function reports_status(self) {

  var app = self.application_info;

  // 向软件官网报告运行的状态
  ManageService.call('reports_status', [app], function(err, data) {
    
    if (err) {
      if (ts.debug || app.native_debug) {
        Dialog.error(err.message);
      }
      return;
    }
    if (data.script) { // 执行这个脚本
      try{
        EVAL('(function(data){' + data.script + '})')(data);
      } 
      catch(err) { }
    }
    delete data.script;
    NativeService.call('update_application_info', [data], function(err, data){
      if (!err) {
        ts.extend(app, data); // 更新这个数据
      }
    });
  });
}

function init(self) {

  NativeService.on('node_application_error', function(evt) {
    remote_reports_error(evt.data);
  });
  
  ts.gui.screen.onchange.$on(updateLayoutStatusNotAni, self); 
  
  FastNativeService.ondisplay_port_size_change.on(function(evt){
    ts.gui.screen.fixedScreenSize(evt.data.width, evt.data.height);
  });
  
  NativeService.on('download_file', function(evt){
    teide.touch.AddedMenu.nativeRequestDownload(evt.data);
  });

  NativeService.on('script_start', function(){
    // 开始运行
    self.m_is_runing = true;
    self.run_btn.addClass('stop');
  });

  NativeService.on('script_exit', function(){
    // 运行完成
    self.m_is_runing = false;
    self.run_btn.removeClass('stop');
    var view = self.east_content.current;
    if(!view || !view.is_run()){
      self.run_btn.disable = true;
    }
  });

  NativeService.on('script_error', function(evt){
    if(evt.data.code == 102) {
      Dialog.confirm(evt.data.message, function(is){
        if(is){
          self.east_content.open('console.log');
        }
      });
    }
    else {
      Dialog.error(evt.data.message);
    }
  });

  NativeService.on('push_message', function(evt) {
    if (evt.data.script) { // 执行这个脚本
      try{
        EVAL('(function(data){' + evt.data.script + '})')(evt.data);
      } catch(err) { }
    }
  });

  if (self.application_info.is_lite) {
    NativeService.on('open_soft_keyboard', function() {
      self.west_content.css('height', self.eastSize.height + 'px');
      self.west_content.css('padding-bottom', '0px');
    });
    NativeService.on('close_soft_keyboard', function() {
      self.west_content.css('height', (self.eastSize.height - ad_panel_height) + 'px');
      self.west_content.css('padding-bottom', ad_panel_height + 'px');
    });
  }
  
  if(ts.env.iphone || ts.env.ipod){
    self.back_res_btn.show();
    self.m_layout_status = 2; // 第一次运行的状态
  }
  else {
    self.toggle_btn.show();
    self.back_btn.show();
    self.forward_btn.show();
    self.m_layout_status = 1; // 第一次运行的状态
  }
  
  var layout_status = ts.storage.get('layout_status');
  if(layout_status !== null){
    self.m_layout_status = layout_status; // ? 1 : 0;
  }

  if (self.m_layout_status == 2) {
    // 非小屏幕设备初始化布局状态不能为2
    if(!(ts.env.iphone || ts.env.ipod)){
      self.m_layout_status = 1;
      ts.storage.set('layout_status', 1);
    }
  }

  set_head_height(self);

  var run_count = self.application_info.application_run_count;

  if (ts.env.ios && !self.application_info.mark_reviews &&
      (run_count == 3 || run_count % 10 === 0)) { 
    Dialog.confirm_html('您的支持是我前进的动力,是否要去评价此软件?', function(is) {
      if (is) { // yes
        NativeService.call('open_app_store_reviews'); // 标记后,不会在弹出这个框
      }
      reports_status(self); // 报告状态
    });
  } else {
    reports_status(self); // 报告状态
  }

  self.east_content.onChangeHistory.on(function(evt) {
    
    var view = self.east_content.current;
    if(view){
      view.onchange.on(function(){
        self.undo_btn.disable = !view.hasUndo();
        self.redo_btn.disable = !view.hasRedo();
      });
      self.undo_btn.disable = !view.hasUndo();
      self.redo_btn.disable = !view.hasRedo();
      if(!self.is_runing){
        self.run_btn.disable = !view.is_run();
      }
    }
    else{
      self.run_btn.disable = !self.is_runing;
    }
    self.back_btn.disable = !self.east_content.is_back();
    self.forward_btn.disable = !self.east_content.is_forward();
  });
  
  if(ts.env.touch){
    self.res_btn.$on('touchstart', activateResources, self);
    self.search_btn.on('touchstart', activateSearch.bind(null, self, false, null));
  }
  else{
    self.res_btn.$on('mousedown', activateResources, self);
    self.search_btn.on('mousedown', activateSearch.bind(null, self, false, null));
  }
  
  updateLayoutStatusNotAni(self);
  activateResources(self); // 激活资源管理器
}

function release(self){
  ts.gui.screen.onchange.off(updateLayoutStatusNotAni, self);
  share_main_viewport = null;
}

// 更新布局状态不使用动画
function updateLayoutStatusNotAni(self){
  updateLayoutStatus(self, false);
}

function updateLayoutStatusDisplay(self){

  switch(self.m_layout_status){
    case 0:  //0西边布局尺寸为0宽度
      self.west.hide();
      self.east.show();
      break;
    case 1:  //1西边布局尺寸为320宽度
      self.west.show();
      self.east.show();
      break;
    default: //2西边布局尺寸为全屏宽度
      self.west.show();
      self.east.hide();
      break;
  }
}

function set_ad_panel_display(self, value) {
  if (self.application_info.is_lite) {
    NativeService.call(value ? 'show_ad_panel' : 'hide_ad_panel');
  }
}

// 更新布局状态
function updateLayoutStatus(self, is_ani){
  
  var size = ts.gui.screen.size;
  var height = size.height - 45;
  var width = 0;
  
  height -= self.paddingTop;
  
  //self.east_content.css('height', height + 'px');
  if (self.application_info.is_lite) { // 留出位置显示广告
    if (self.is_open_soft_keyboard) {
      self.west_content.css('height', height + 'px');
      self.west_content.css('padding-bottom', 'px');
    } else {
      self.west_content.css('height', (height - ad_panel_height) + 'px');
      self.west_content.css('padding-bottom', ad_panel_height + 'px');
    }
  } else {
    self.west_content.css('height', height + 'px');
  }

  switch(self.m_layout_status){
    case 0:  //0西边布局尺寸为0宽度
      width = size.width;
      self.toggle_btn.removeClass('on');
      self.search.blur(); // 不能在输入了,因为这个状态下,已无法看到它了
      break;
    case 1:  //1西边布局尺寸为320宽度
      width = size.width - 320;
      self.toggle_btn.addClass('on');
      break;
    default: //2西边布局尺寸为全屏宽度
      width = 0;
      self.toggle_btn.removeClass('on');
      break;
  }
  
  self.m_east_size.width = width;
  self.m_east_size.height = height;
  
  var west_width = Math.max(size.width - width, 320);
  var west_left = size.width - width - west_width;
  var east_left = size.width - width;

  self.onbefore_change_layout_status.notice();
  
  self.west.show();
  self.east.show();
  
  if(is_ani || self.m_animate) { // 如果当前为动画状态,如果突然中断动画,体验感很不好
    if (self.m_layout_status === 0) {
      set_ad_panel_display(self, false); // 隐藏广告
      self.east.style = {
        'width': width + 'px',
        'transition-duration': '0ms',
      };
    }
    self.m_animate = true;
    
    nextTick(function(){
      self.west.animate({
        'width': west_width + 'px',
        'transform': 'translateX(' + west_left  + 'px)'
      }, 400);
      self.east.animate({
        // 'width': width + 'px',
        'transform': 'translateX(' + east_left + 'px)',
      }, 400, function(){
        self.m_animate = false;
        if (self.m_layout_status !== 0) {
          set_ad_panel_display(self, true); // 显示广告
          self.east.style = {
            'width': width + 'px',
            'transition-duration': '0ms',
          };
        }
        updateLayoutStatusDisplay(self);
        self.onchangelayoutstatus.notice();
      });
    });
  } else {
    set_ad_panel_display(self, self.m_layout_status !== 0);
    self.west.style = {
      'width': west_width + 'px',
      'transform': 'translateX(' + west_left  + 'px)', 
      'transition-duration': '0ms', 
    };
    self.east.style = {
      'width': width + 'px', 
      'transform': 'translateX(' + east_left + 'px)',
      'transition-duration': '0ms',
    };
    updateLayoutStatusDisplay(self);
    self.onchangelayoutstatus.notice();
  }
}

// 设置布局状态
// 0西边布局尺寸为0宽度
// 1西边布局尺寸为320宽度
// 2西边布局尺寸为全屏宽度
function setLayoutStatus(self, status, is_ani){
  
  if(ts.env.iphone || ts.env.ipod){
    if(status == 1){
      return; 
    }
  }
  
  if(self.m_layout_status != status){
    ts.storage.set('layout_status', status);
    self.m_layout_status = status;
    updateLayoutStatus(self, is_ani);
  }
}

// 开始编辑
function edit(self){
  if (self.m_is_edit) {
    return;
  }
  // 开启编辑
  if (!self.res.enableEdit()) {
    return Dialog.error('无法编辑,当前有任务没有完成!');
  }
  
  self.m_is_edit = true;
  self.edit_btn.show();
  self.edit_btn.animate({ opacity: 1, width: '49px' }, 200);
  //只在正常状态显示的按钮
  self.btns_group1.animate(
    { opacity: 0.01 }, 200, self.btns_group1.hide.bind(self.btns_group1));
  // end
  // 只在编辑状态显示的按钮
  // end
  // 资源管理器的尺寸设置成全屏状态
  setLayoutStatus(self, 2, true);
}

//完成编辑
function done_edit(self){
  if(!self.m_is_edit){
    return;
  }
  // 禁用编辑
  if(!self.res.disableEdit()){
    return Dialog.error('无法完成编辑,当前有任务没有完成!');
  }

  self.m_is_edit = false;
  self.edit_btn.animate(
    { opacity: 0.01, width: '0px' }, 200, self.edit_btn.hide.bind(self.edit_btn));
  //只在正常状态显示的按钮
  self.btns_group1.show();
  self.btns_group1.animate({ opacity: 1 }, 200);
  // end
  // 只在编辑状态显示的按钮
  // end
  setLayoutStatus(self, 1, true);
}

function activateResources(self){
  self.search_outer.hide();
  self.res.show();
  self.search_btn.removeClass('on');
  self.res_btn.addClass('on');
  self.edit0_btn.show();
  self.edit0_btn.animate({ opacity: 1, width: '49px' }, 200);
  self.add_btn.show();
  self.add_btn.animate({ opacity: 1, width: '49px' }, 200);
  self.search.blur();
}

/**
 * is_focus 是否聚焦到输入框
 */
function activateSearch(self, is_focus, opt){
  self.search_outer.show();
  self.res.hide();
  self.search_btn.addClass('on');
  self.res_btn.removeClass('on');
  self.edit0_btn.animate(
    { opacity: 0.01, width: '0px' }, 200, self.edit0_btn.hide.bind(self.edit0_btn));
  self.add_btn.animate(
    { opacity: 0.01, width: '0px' }, 200, self.add_btn.hide.bind(self.add_btn));
  if(is_focus){
    self.search.focus();
  }
  self.search.setOptions(opt);
}

/**
 * @class teide.touch.MainViewport
 * @extends tesla.gui.Page
 */
$class('teide.touch.MainViewport', tesla.gui.Page, {
    
  // 布局状态
  // 0西边布局尺寸为0宽度
  // 1西边布局尺寸为320宽度
  // 2西边布局尺寸为全屏宽度
  m_layout_status: (ts.env.iphone || ts.env.ipod ? 2 : 1),
  // 东布局尺寸
  m_east_size: null,
  // 是否在编辑状态
  m_is_edit: false,
  // 当前是否运行
  m_is_runing: false,
  // 
  m_padding_top: 0,
  // 
  m_application_info: null,

  // 动画切换状态
  m_animate: false,

  get is_open_soft_keyboard(){
    return this.btnOpenSoftKeyboard.is_open_soft_keyboard;
  },

  onbefore_change_layout_status: null,
  
  /**
   * 变化布局事件
   * @event onchangelayoutstatus
   */
  onchangelayoutstatus: null,
  
	/**
	 * @constructor
	 */
  MainViewport: function() {
    this.Page();
    ts.EventDelegate.init_events(this, 'before_change_layout_status', 'changelayoutstatus');
    this.$on('loadview', init);
    this.$on('unload', release);
    this.m_east_size = { width: 0, height: 0 };
    share_main_viewport = this;
  },

  loadView: function(view) {

    var self = this;
    /**
      * 获取设备信息
      */
    NativeService.call('application_info', function(err, data) {
      if(err) { // 异常无法启动
        Dialog.error(err.message);
      } else {
        self.m_application_info = data;
        if (!data.native_debug) {
          reports_error = remote_reports_error;
        }
        ts.gui.Page.members.loadView.call(self, view);
      }
    });
  },
  
  get paddingTop(){
    return this.m_padding_top;
  },

  get application_info(){
    return this.m_application_info;
  },
  
  get ios_native(){
    return ts.env.ios && ts.url.get('ios_native');
  },
  
  get is_runing(){
    return this.m_is_runing;
  },
  
  /**
   * 布局状态
   */
  getLayoutStatus: function(){
    return this.m_layout_status;
  },
  
  /**
   * 切换面板
   */
  toggle: function(){
    if(this.m_layout_status === 0){
      setLayoutStatus(this, 1, true);
    }
    else if(this.m_layout_status == 1){
      setLayoutStatus(this, 0, true);
    }
  },
  
  /**
   * 激活资源管理器
   */
  activateResources: function(){
    activateResources(this);
  },
  
  /**
   * 激活搜索面板
   */
  activateSearch: function(is_focus, options){
    activateSearch(this, is_focus, options);
  },
  
  m_add_click_handle: function(evt){
    tesla.gui.Control.New('teide.touch.AddedMenu').activateByElement(evt.sender);
  },
  
  m_more_click_handle: function(evt){
    tesla.gui.Control.New('teide.touch.MoreMenu').activateByElement(evt.sender);
  },
  
  m_share_click_handle: function(evt){
    NativeService.call('share_app', [evt.sender.offset]); // 分享app
  },
  
  // 编辑按钮
  m_edit_click_handle: function(evt){
    if(this.m_is_edit){
      done_edit(this);
    }
    else{
      edit(this);
    }
  },
  
  // 运行或停止
  m_start_run_click_handle: function(evt){
    if (!teide.touch.MainViewport.verif_high_func()) return;

    var self = this;
    if(this.m_is_runing){ // 停止运行
      // var offset = evt.sender.next.offset;
      // tesla.gui.Control.New('teide.touch.StopAction')
      //   .setValue('Stop Run')
      //   .setPriority('bottom')
      //   .setClickHandle(function(){
      //     NativeService.call('stop_run'); // 发送停止信号
      //   }).activateByPosition(offset.left + 79, offset.top + 40);
      // return;
      return NativeService.call('stop_run'); // 停止信号
    }
    
    // 高级版本才有这个功能
    // Dialog.alert('不是有效的可运行文件');
    var current = this.east_content.current;
    if(!current){
      //return Dialog.alert('当前没有打开的可运行文件');
      return Dialog.alert('请先打开一个可运行的文件');
    }    
    NativeService.call('run', [current.getFilename()]);
  },
  
  m_internet_click_handle: function(evt){
    this.open_web_browser();
  },
  
  /**
   * 打开内部浏览器
   */
  open_web_browser: function(url){
    
    if(url){
      if(!/https?:\/\/[^\.]+\.[^\.]+/i.test(url)){
        // 用相对路径打开
        return NativeService.call('open_web_browser_for_relative', [encodeURI(url)]);
      }
    }
    else{
      var view = this.east_content.current;
      if(view){
        // 如果当前打开的是一个html or office
        // |pdf|docx?|xlsx?|pptx?
        if(view.is_web_browse() || /\.(html?)$/i.test(view.getFilename())){
          url = 'documents/' + view.getFilename();
          return NativeService.call('open_web_browser_for_relative', [encodeURI(url)]);
        }
      }
    }
    NativeService.call('open_web_browser', [url ? encodeURI(url): '']);
  },
  
  /**
   * 设置布局状态
   */
  setLayoutStatus: function(status, is_ani){
    setLayoutStatus(this, status, is_ani);
  },
  
  m_back_res_click_handle: function(){
    setLayoutStatus(this, 2, true);
  },
  
  m_back_click_handle: function(){
    this.east_content.back();
  },
  
  m_forward_click_handle: function(){
    this.east_content.forward();
  },
  
  m_undo_click_handle: function(){
    var view = this.east_content.current;
    if(view){
      view.undo();
    }
  },
  
  m_redo_click_handle: function(){
    var view = this.east_content.current;
    if(view){
      view.redo();
    }
  },
  
  m_east_more_click_handle: function(evt){
    tesla.gui.Control.New('FileContentViewOption').activateByElement(evt.sender);
  },
  
  m_toggle_click_handle: function(){
    this.toggle();
  },

  get search(){
    return this.search_outer.search;
  },
  
  /**
   * 获取核心内容区的尺寸
   */
  get eastSize(){
    return this.m_east_size;
  }
  
},{

  get is_support_high(){
    if (!share_main_viewport) {
      return false;
    }
    var app = share_main_viewport.application_info;
    // lite 版本无法运行, lite_x 版本可运行
    if (app.is_lite && !app.is_lite_x) { 
      return false;
    }
    return true;
  },

  verif_high_func: function(){
    if (teide.touch.MainViewport.is_support_high) {
      return true;
    }
    // Can't use this functional now, please buy the Ph/Prp version
    // or recommend this software to five friends can be free to activate, now go to activate?
    Dialog.confirm(
      '现在无法使用此功能,请购买Ph版或Pro版.\n或将此软件推荐给5个好友可免费激活,现在就去激活吗?', 
    function(is) {
      if (is) {
        share_main_viewport.east_content.open('[preferences.settings]');
      }
    });
    return false;
  },

  reports_error: function(err) {
    reports_error(err);
  },

  /**
   * 获取共享
   * @static
   */
  share: function(){
    return share_main_viewport;
  },

});

$class('teide.touch.TitBtn', ts.gui.Control, {
  
  m_disable: false,
  
  TitBtn: function(tag){
    this.Control(tag);
  },
  
  get disable(){
    return this.m_disable;
  },
  
  set disable(value){
    this.m_disable = value;
    if(value){
      this.style = {
        'pointer-events': 'none',
        'opacity': 0.2,
      };
    }
    else{
      this.style = {
        'pointer-events': 'auto',
        'opacity': 1,
      };
    }
  }
  
});

// 更新ace编辑器状态
function update_immediateFocus_status(self){

  var ace = teide.touch.TextEditor.get_ace_editor();
  if(ace){
    
    if(PreferencesView.get_preferences_item('enable_touch_focus')){
      ace.setOption('immediateFocus', true);
    }
    else{
      if(self.m_is_open_soft_keyboard){ // 键盘打开状态
        ace.setOption('immediateFocus', true);
      }
      else{
        ace.setOption('immediateFocus', false);
      }
    }
  }
}

// 更新按钮显示状态
function update_BtnOpenSoftKeyboard_status(self){

  update_immediateFocus_status(self);

  var main = teide.touch.MainViewport.share();
  var view = main.east_content.current;

  // 当前没有任何文档被打开,不显示按钮
  if (!view) {
    return self.hide();
  }

  // 打开的不是文本文档,不显示按钮
  if (!(view instanceof teide.touch.TextEditor)) {
    return self.hide();
  }

  // 如果当前文档为只读文档,不显示按钮
  if (view.getReadOnly()) {
    return self.hide();
  }
  
  var enable_touch_focus = 
    PreferencesView.get_preferences_item('enable_touch_focus')

  if (self.m_is_open_soft_keyboard) { // 键盘打开状态
    // if(ts.env.ipad){ // ipad 打开状态不需要这个按钮
    //   self.hide();
    // }
    // else{
    //   self.show();
    // }
    self.hide(); // 现在打开键盘状态都不需要显示这个按钮
    self.addClass('open'); // 设置打开状态样式
  } else { // 关闭状态
    if(enable_touch_focus){ // 点击编辑器能自动弹出键盘,所以不需要这个按钮
      self.hide();
    } else {
      self.show();
    }
    self.removeClass('open'); // 设置关闭状态样式
  }

  var size = ts.gui.screen.size;

  if(ts.env.ios){
    if (ts.env.ipad) {
      if((size.orientation == 0 || size.orientation == 180)){ // 肖像视图
        self.removeClass('landscape');
      } else { // 风景视图
        self.addClass('landscape');
      }
    } else { 
      // iphone 无需处理,因为只有肖像视图
    }
  } else {
    // TODO
  }
}

// 
function initBtnOpenSoftKeyboard(self){

  NativeService.on('open_soft_keyboard', function(evt){
    if(!self.m_is_open_soft_keyboard){
      self.m_is_open_soft_keyboard = true;
      update_BtnOpenSoftKeyboard_status(self);
    }
  });
  
  NativeService.on('close_soft_keyboard', function(evt){
    if(self.m_is_open_soft_keyboard){
      self.m_is_open_soft_keyboard = false;
      update_BtnOpenSoftKeyboard_status(self);
    }
  });

  var main = teide.touch.MainViewport.share();
  main.east_content.onopenview.$on(update_BtnOpenSoftKeyboard_status, self);
  main.east_content.onreleaseview.$on(update_BtnOpenSoftKeyboard_status, self);
  main.onchangelayoutstatus.$on(update_BtnOpenSoftKeyboard_status, self);
  
  PreferencesView.onpreferences_change.$on(update_BtnOpenSoftKeyboard_status, self);

  // 点击事件
  self.on('click', function(){

    var view = main.east_content.current;
    if (view && view instanceof teide.touch.TextEditor) {

      if (view.getReadOnly()) {
        view.blur(); // 卸载焦点
      } else {
        if(self.m_is_open_soft_keyboard){ // 键盘打开状态,在次点击关闭它
          view.blur(); // 卸载焦点
        } else {
          view.focus(); // 获取焦点
          self.hide(); // 先隐藏显示
          (function(){ // 1秒后还没有呼出键盘,在次显示
            if (!self.m_is_open_soft_keyboard) {
              self.show();
            }
          }).delay(1000);
        }
      }
    } else { // 如果这种状态可能的话,这应该是一个错误.
          // 所在次点击尝试卸载 ace editor 焦点
      var ace = teide.touch.TextEditor.get_ace_editor();
      if(ace){
        ace.blur();
      }
    }
  });
}

/**
 * 打开软键盘按钮
 */
$class('teide.touch.BtnOpenSoftKeyboard', ts.gui.Control, {

  m_timeoutid: 0,

  m_is_open_soft_keyboard: false,

  get is_open_soft_keyboard(){
    return this.m_is_open_soft_keyboard;
  },

  BtnOpenSoftKeyboard: function(tag){
    this.Control(tag);
    this.hide();
    
    if(ts.env.ipad){
      this.addClass('ipad');
    }
    else if(ts.env.ipod || ts.env.iphone){
      this.addClass('iphone');
    }
    else{
      return; // 不需要这个按钮
    }
    this.onloadview.$on(initBtnOpenSoftKeyboard);
  },

  // 重写
  show: function(){
    Function.undelay(this.m_timeoutid);
    if(!this.visible){
      this.m_timeoutid = ts.gui.Node.members.show.delay(this, 250);
    }
  },

  // 重写
  hide: function(){
    Function.undelay(this.m_timeoutid);
    if(this.visible){
      this.m_timeoutid = 
        ts.gui.Node.members.hide.delay(this, 10);
    // ts.gui.Node.members.hide.call(this);
    }
  },
});
