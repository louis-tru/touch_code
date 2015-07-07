/**
 * @createTime 2014-12-19
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */
 
include('tesla/gui/control.js');
include('teide/touch/tab_panel.vx');
include('tesla/event_delegate.js');

function init_TabButton(self){
  self.more_btn.on(te.env.touch ? 'touchstart' : 'mousedown', function(evt){
    evt.return_value = false;
  });
}

/**
 * @class teide.touch.TabButton
 * @extends tesla.gui.Control
 */
$class('teide.touch.TabButton', tesla.gui.Control, {
  
  // 面板
  m_tab: null,
  
  /**
	 * @constructor
	 */
  TabButton: function(){
    this.Control();
    this.onloadview.$on(init_TabButton);
  },
  
  setTab: function(tab){
    this.m_tab = tab;
  },
  
  setLebel: function(text){
    this.label.text = text;
  },
  
  // 更多按钮点击处理
  m_more_btn_click_handle: function(evt){
    //evt.return_value = false;
  },
  
  // 关闭按钮处理器
  m_close_btn_click_handle: function(){
    this.m_tab.remove();
  }
  
});


//--------------------------------------

/**
 * 激活tab
 */
function activateTab(self){
  self.top.activate(self);
}

function init(self){
  if(ts.env.touch){
    self.m_tab_button.$on('touchstart', activateTab, self);
  }
  else{
    self.m_tab_button.$on('mousedown', activateTab, self);
  }
}

/**
 * @class teide.touch.Tab
 * @extends tesla.gui.Control
 */
$class('teide.touch.Tab', tesla.gui.Control, {
  
  // private:
  m_name: '',         // 标签名称
  m_tab_button: null, // 标签按钮
  
  /**
   * 激活标签事件
   * @event onactivate
   */
  onactivate: null,
  
  /**
   * 标签沉默事件
   * @event onreticent
   */
  onreticent: null,
  
  /**
	 * @constructor
	 */
  Tab: function(tag){
    this.Control(tag);
    tesla.EventDelegate.init_events(this, 'activate', 'reticent');
    this.m_tab_button = tesla.gui.Control.New('teide.touch.TabButton');
    this.m_tab_button.setTab(this);
    init(this);
  },
  
  get tab_button(){
    return this.m_tab_button;
  },
  
  /**
   * 获取标签的名称
   */
  get name(){
    return m_name;
  },
  
  /**
   * 设置标签的名称
   */
  set name(value){
    this.m_name = value;
    this.m_tab_button.setLebel(value);
  },
  
  /**
   * 返回面板
   */
  get tab_panel(){
    return this.top;
  },
  
  /** 
   * 删除标签
   */
  remove: function(){
    this.m_tab_button.remove(); // 删除
    tesla.gui.Node.members.remove.call(this);
  },
  
  /**
   * 重写
   */
  appendTo: function(parent, id){
    
    if(parent.parent instanceof teide.touch.TabPanel){
      if(id){
        this.id = id;
      }
      parent.parent.add(this); // 加入到面板
    }
    else{
      throw new Error('tab 标签只能加入到TabPanel中');
    }
  }
  
});


//----------------------------------------

function changelayoutstatus(self){
  self.content.css('height', self.parent.eastSize.height + 'px');
  if(self.parent.getLayoutStatus() == 1){
    self.toggle_btn.addClass('on');
  }
  else{
    self.toggle_btn.removeClass('on');
  }
  update(self);
}

function init_TabPanel(self){
  changelayoutstatus(self);
  self.parent.onchangelayoutstatus.$on(changelayoutstatus, self);
}

function release_TabPanel(self){
  self.parent.onchangelayoutstatus.off(changelayoutstatus, self);
}

/**
 * tab 标签事件处事器
 * @private
 */
function release_TabEventHandle(self, evt){

  var tabs = self.m_tabs;
  var index = tabs.indexOf(evt.sender);
  
  if(evt.sender === self.m_active_tab){
    self.m_active_tab.onreticent.notice();
    self.m_active_tab = null;
  }
  
  tabs.removeVal(evt.sender);
  
  if(tabs.length){
    if(tabs.length > index){
      self.activate(tabs[index]);
    }
    else if(index > 0){
      self.activate(tabs[index - 1]);
    }
  }
  
  self.ontabchange.notice();
}

/**
 * 更新面板状态
 */
function update(self){
  
  var tabs = self.m_tabs;
  
  if(!tabs.length){
    return;
  }
  var total_btns_width = self.parent.eastSize.width - 44; // 总宽度
  var min_tab_button_width = 70; // 最小 tab button 宽度
  var more = false; // 是否要显示more按钮
  
  // 当前显示的按钮数量,最少也需要显示一个按钮
  var display_tab_btn_count = 
    Math.max(Math.floor(total_btns_width / min_tab_button_width), 1);
  
  // 大于实际按钮大于可显示的数量
  if(tabs.length > display_tab_btn_count){ 
    more = true; // 这里需要显示more按钮
    total_btns_width -= 30; // 这30像素用来显示more按钮
    self.btns.css('margin-left', '30px');
  }
  else{
    display_tab_btn_count = tabs.length;
    self.btns.css('margin-left', '0px');
  }
  
  // 实际按钮宽度,最小也要不能小于 min_tab_button_width 
  var tab_btn_width = 
    Math.max(total_btns_width / display_tab_btn_count, min_tab_button_width); 
  var tab_btn_width_percent = 100 / display_tab_btn_count;
  // 
  self.m_display_tab_btn_count = display_tab_btn_count;
  self.m_tab_btn_width = tab_btn_width;
  //
  
  var active_tab = self.m_active_tab;
  var active_tab_index = tabs.indexOf(active_tab);
  // 如果当前激活的标签超出显示范围,强制调整为可显示范围
  if(active_tab_index >= display_tab_btn_count){
    tabs.splice(active_tab_index, 1);
    tabs.splice(display_tab_btn_count - 1, 0, active_tab);
  }
  
  for(var i = 0; i < display_tab_btn_count; i++){
    var tab = tabs[i];
    tab.tab_button.style = {
      width: tab_btn_width_percent + '%', 
      right: tab_btn_width_percent * i + '%'
    };
    tab.hide();
    tab.tab_button.removeClass('on');
    tab.tab_button.removeClass('more');
    tab.tab_button.show();
  }
  
  // 隐藏不需要显示的标签
  for(var i = display_tab_btn_count; i < tabs.length; i++){
    var tab = tabs[i];
    tab.hide();
    tab.tab_button.hide();
  }
  
  // 显示更多
  if(more){
    tabs[display_tab_btn_count - 1].tab_button.addClass('more');
  }
  
  active_tab.tab_button.addClass('on');
  active_tab.show();
}

/**
 * @class teide.touch.TabPanel
 * @extends tesla.gui.Control
 */
$class('teide.touch.TabPanel', tesla.gui.Control, {
  
  // private:
  m_active_tab            : null,   // 当前激活的标签
  m_tabs                  : null,   // 当前面板中的所有标签
  m_display_tab_btn_count : 0,      // 当前显示的按钮数量
  m_tab_btn_width         : 0,      // 当前tab btn 的宽度
  
  /**
   * @tab变化事件
   * @event ontabchange
   */
  ontabchange: null,
  
  /**
	 * @constructor
	 */
  TabPanel: function(){
    this.Control();
    this.ontabchange = new tesla.EventDelegate('tabchange', this);
    this.onloadview.$on(init_TabPanel);
    this.$on('unload', release_TabPanel);
    this.m_tabs = [];
  },
  
  /**
   * 添加一个标签
   */
  add: function(tab){
    
    if(this.m_tabs.indexOf(tab) == -1){
      this.m_tabs.push(tab);

      // 添加 title item
      tab.tab_button.appendTo(this.btns);
      
      // 添加 content
      this.content.append(tab);
      tab.$on('unload', release_TabEventHandle, this); //添加事件侦听
      
      if(this.m_active_tab){ 
        update(this);
      }
      else{
        // 如果当前没有激活的标签激活它
        this.activate(tab);        
      }
    }
    else{
      throw new Error('标签已经添加过了');
    }
  },
  
  /**
   * 激活一个标签
   */
  activate: function(tab){
    
    if(tab instanceof teide.touch.Tab){
      if(tab !== this.m_active_tab){
        if(this.m_active_tab){
          this.m_active_tab.onreticent.notice(); //触发沉默事件
        }
        this.m_active_tab = tab;
        update(this);
        tab.onactivate.notice(); //触发激活事件
        this.ontabchange.notice();
      }
    }
    else{
      throw new Error('只能激活 teide.touch.Tab ');
    }
  },
  
  /**
   * 当前激活的标签
   */
  getActiveTab: function(){
    return this.m_active_tab;
  },
  
  /**
   * 获取标签列表
   */
  get tabs(){
    return this.m_tabs;
  },
  
  /**
   * 切换
   */
  m_toggle_click_handle: function(){
    this.parent.toggle();
  }
  
});

