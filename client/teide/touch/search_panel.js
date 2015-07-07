/**
 * @createTime 2014-12-15
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/gui/scroll_view.js');
include('teide/touch/search_panel.vx');
include('teide/touch/input.js');
include('teide/touch/dialog.js');
include('teide/touch/overlay_panel.js');
include('teide/touch/service.js');
include('teide/touch/tree_panel.vx');
include('teide/touch/text_editor.js');

var Range = require('ace/range').Range;

function update_SerachOption_display(self){
  
  var options = self.m_search_panel.options;
  
  if(options.search_target == 'all'){
    self.search_all_btn.addClass('on');
    self.search_select_btn.removeClass('on');
  }
  else{
    self.search_all_btn.removeClass('on');
    self.search_select_btn.addClass('on');
  }
  
  if(options.ignoring_case){
    self.ignoring_case_btn.addClass('on');
  }
  else{
    self.ignoring_case_btn.removeClass('on');
  }
  
  if(options.enable_regexp){
    self.enable_regexp_btn.addClass('on');
  }
  else{
    self.enable_regexp_btn.removeClass('on');
  }
  
  // if(options.enable_hide_file){
  //   self.enable_hide_file_btn.addClass('on');
  // }
  // else{
  //   self.enable_hide_file_btn.removeClass('on');
  // }  
  
  if(options.expand_all_results){
    self.expand_all_results_btn.addClass('on');
  }
  else{
    self.expand_all_results_btn.removeClass('on');
  }
}

function release(){
  // TODO 
}

/**
 * @class teide.touch.SerachOption
 * @extends teide.touch.OverlayPanel
 */
$class('teide.touch.SerachOption', teide.touch.OverlayPanel, {
  
  // 不脆弱,不会一点击就消失
  frail: false,
  
  /**
   * 搜索面板
   * @private
   */
  m_search_panel: null, 
  
  SerachOption: function(tag){
    this.OverlayPanel(tag);
  },
  
  get options(){
    return this.m_search_panel.options;
  },
  
  setOptions: function(opt){
    this.m_search_panel.setOptions(opt);
  },
  
  /**
   * 设置搜索面板
   */
  setSerachPanel: function(panel){
    this.m_search_panel = panel;
    update_SerachOption_display(this);
  },
  
  m_search_all_click_handle: function(){
    this.setOptions({ search_target: 'all' });
    update_SerachOption_display(this);
  },
  
  m_search_select_click_handle: function(){
    this.m_search_target = 'selected';
    this.setOptions({ search_target: 'selected' });
    update_SerachOption_display(this);
  },
  
  m_ignoring_case_click_handle: function(){
    this.setOptions({ ignoring_case: !this.options.ignoring_case });
    update_SerachOption_display(this);
  },
  
  m_enable_regexp_click_handle: function(){
    this.setOptions({ enable_regexp: !this.options.enable_regexp });
    update_SerachOption_display(this);
  },
  
  m_enable_hide_file_click_handle: function(){
    this.setOptions({ enable_hide_file: !this.options.enable_hide_file });
    update_SerachOption_display(this);
  },
  
  m_expand_all_results_click_handle: function(){
    this.setOptions({ expand_all_results: !this.options.expand_all_results });
    update_SerachOption_display(this);
  }
  
});


//**********************************************************************

function init(self){
  
  self.setOptions(tesla.storage.get('search_options'));
  self.input.value = tesla.storage.get('search_key') || '';
  self.input.onenter.$on(search, self);
  
  self.search_result.onrender.on(function(){
    if(self.m_new_search){ // 最新搜索才展开
      if(self.search_result.items.length){ // 展开第一个结果
        self.search_result.items[0].item.addClass('expand');
      }
    }
  });
  
  self.ds.onbeforeload.on(function(){
    self.load_more_btn.hide();
    self.stop_load_btn.show();
  });
  
  function handle(){
    // 已经结束,不需要更多
    if(!self.ds.fullData || self.ds.fullData.is_end){
      self.load_more_btn.hide();
    }
    else{
      self.load_more_btn.show();
    }
    self.stop_load_btn.hide();
  }
  
  self.ds.onload.on(handle);
  self.ds.onabort.on(handle);  
  self.ds.onerror.on(handle);

  // search_result
  var main = teide.touch.MainViewport.share();
  main.onchangelayoutstatus.on(function(){
    self.search_result.css('width', main.west_content.css('width'));
  });
}

function searchKey(self, key){
  
  tesla.storage.set('search_key', key); // save
  
  if(self.options.enable_regexp){ 
    // 如果启用正则匹配需要验证表达式的合法性
    try{
      new RegExp(key);
    }
    catch(err){
      return Dialog.error('查询表达式格式错误,如果只是普通查询可禁用正则表达式');
    }
  }

  //self.search_result.empty(); // 先清空原先的数据显示
  self.ds.clearData(); // 先清空原先的数据显示
  
  self.m_select_result = null;
  var path = '';
  
  if(self.options.search_target == 'selected'){
    var node = teide.touch.MainViewport.share().res.selectedNode();
    if (node) { // 把当前选中的文件做为搜索的目标
      path = node.path;
    }
    else{
      self.setOptions({ search_target: 'all' }); // 没有搜索项时搜索全部文件
    }
  }
  self.ds.load({ key: key, options: self.options, path: path, index: 0 });
  self.input.blur();
  //NativeService.call('close_soft_keyboard');
}

function search(self){
  self.m_new_search = true;
  var key = self.input.value;
  if(!key){
    return;
  }
  self.input.dom.blur();
  searchKey(self, key);
}

/**
 * @class teide.touch.SearchPanel
 * @extends tesla.gui.ScrollView
 */
$class('teide.touch.SearchPanel', ts.gui.Control,/* tesla.gui.ScrollView,*/ {
  
  /**
   * 选择的搜索结果
   * @private
   */
  m_select_result: null,
  
  // 新的搜索,点击继续搜索按钮,
  // 这个状态会设置成false,点击搜索设置成true
  m_new_search: true,
  
  /**
   * 搜索选项
   * @private
   */
  m_options: null,
  
	/**
	 * @constructor
	 */
  SearchPanel: function() {
    this.Control();
    this.onloadview.$on(init);
    
    this.m_options = {
      search_target: 'all', // all | selected
      ignoring_case: true,
      enable_regexp: false,
      enable_hide_file: false,
      expand_all_results: true // 查询的结果全部展开
    };
  },
  
  get options() {
    return this.m_options;
  },
  
  setOptions: function (opt) {
    tesla.extend(this.m_options, opt);
    tesla.storage.set('search_options', this.m_options); // save
  },
  
  /**
   * is_focus 是否聚焦到输入框
   */
  focus: function() {
    // var self = this;
    // (function(){
    //  self.input.focus();
    // }).delay(100);
  },

  /**
   * 取消焦点
   */
  blur: function() {
    this.input.blur();
  },
  
  /**
   * 搜索
   */
  search: function(key) {
    searchKey(this, key);
  },
  
  m_select_btn_click_handle: function(evt) {
    var opt = tesla.gui.Control.New('SerachOption');
    opt.setSerachPanel(this);
    opt.activateByElement(evt.sender);
  },
  
  m_select2_btn_click_handle: function() {
    search(this);
  },
  
  m_input_entrt_handle: function() {
    search(this);
  },
  
  m_item_node_click_handle: function(evt) {
    evt.sender.parent.toggleClass('expand');
  },
  
  m_result_click_handle: function(evt) {
    
    if(this.m_select_result){
      this.m_select_result.removeClass('on');
    }
    this.m_select_result = evt.sender;
    this.m_select_result.addClass('on');

    var sender = evt.sender;
    var path = sender.top.attr('path');
    var name = (path ? path + '/': '') + sender.top.attr('name');
    var start_row = parseInt(sender.attr('row'));
    var start_column = parseInt(sender.attr('start'));
    var length = parseInt(sender.attr('length'));
    
    var view = teide.touch.MainViewport.share().east_content.open(name);
    if(view && view instanceof teide.touch.TextEditor){
      // 成功打开文本文件
      var ace_session = view.session;
      var ace_selection = ace_session.getSelection();
      var ace_document = ace_session.getDocument();
      
      var end_row = start_row;
      var end_column = start_column + length;
      var line_length = ace_document.getLength();
      
      for(var i = start_row; i < line_length; i++){
        var row_length = ace_document.getLine(i).length;
        if(end_column <= row_length){
          break;
        }
        else{
          end_row++; // 增加一行
          end_column = end_column - row_length - 2; // 两个字符分别是 \r\n
        }
      }
      var range = new Range(start_row, start_column, end_row, end_column);
      nextTick(function(){
        ace_selection.setRange(range); // 选中代码
        view.ace.centerSelection(); 
      });
    }
  },
  
  // 载入更多
  m_load_more_btn_click_handle: function() {
    // TODO ?
    if(this.ds.param.key){ // 没有key时不用理会
      var index = this.ds.fullData.index; 
      this.m_new_search = false;
      this.ds.load({ options: this.options, index: index });
    }
  },
  
  // 停止载入
  m_stop_load_btn_click_handle: function(){
    this.ds.abort(); // 取消数据载入
    //APIService.call('stopFind');
  },
  
});


//********************************************

function init_SearchOuterPanel(self){
  // search
  self.search.on('scroll', function(){
    // TODO ? setting top btn 
    // console.nlog(self.search.dom.scrollTop);
    var value = Math.min(0.7, Math.max(0, (self.search.dom.scrollTop - 500) / 500));
    set_return_top_btn_lightness(self, value);
  });
}

// 设置按钮明亮度
function set_return_top_btn_lightness(self, value){

  if(value == self.m_return_top_btn_lightness){
    return;
  }
  
  if(value === 0){ // 从影藏到显示
    self.return_top_btn.show();
  }
  else if(self.m_return_top_btn_lightness === 0){ // 从显示到影藏
    self.return_top_btn.show();
  }
  
  self.m_return_top_btn_lightness = value;
  self.return_top_btn.css('opacity', value);
}

/**
 * @class teide.touch.SearchOuterPanel
 * @extends tesla.gui.Control
 */
$class('teide.touch.SearchOuterPanel', tesla.gui.Control, {
  
  m_return_top_btn_lightness: 0.0,
  
	/**
	 * @constructor
	 */
  SearchOuterPanel: function(){
    this.Control();
    this.onloadview.$on(init_SearchOuterPanel);
  },
  
  m_return_top_click_handle: function(){
    this.search.dom.scrollTop = 0;
  }
  
});