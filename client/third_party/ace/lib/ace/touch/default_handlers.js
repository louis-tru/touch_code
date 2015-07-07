/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var oop = require('../lib/oop');
var Range = require('ace/range').Range;
var TouchMenu = require('./overlay_panel').TouchMenu;
var screen = require('./screen');
var event = require('./event');
var $ = require('./element').create;

function DefaultHandlers(touchHandler) {
  var editor = touchHandler.editor;
  editor.setDefaultHandler("touchstart", this.onTouchStart.bind(touchHandler));
  editor.setDefaultHandler("touchmove", this.onTouchMove.bind(touchHandler));
  editor.setDefaultHandler("touchend", this.onTouchEnd.bind(touchHandler));
  editor.setDefaultHandler("click", this.onClick.bind(touchHandler));
  editor.setDefaultHandler("dblclick", this.onDoubleClick.bind(touchHandler));
  editor.setDefaultHandler("tripleclick", this.onTripleClick.bind(touchHandler));
  editor.setDefaultHandler("quadclick", this.onQuadClick.bind(touchHandler));
  editor.setDefaultHandler("longpress", this.onLongPress.bind(touchHandler));
  
  editor.on("touchdragselectstart", this.onTouchDragSelectStart.bind(touchHandler));
  editor.on("touchdragselectend", this.onTouchDragSelectEnd.bind(touchHandler));
  editor.on("touchdragselect", this.onTouchDragSelect.bind(touchHandler));
  editor.on("touchscroll", this.onTouchScroll.bind(touchHandler));
  editor.on('change', this.onTextChange.bind(touchHandler));
  
  event.on(document.body, 'touchstart', this.removeMenu.bind(touchHandler));
  
  oop.mixin(touchHandler, this);
}

(function() {

  // 长按会激活光标移动
  this.activate_longpress_cursor_move = false;
  this.activate_3_touch_point_select = false;
  this.multiClickTimer = 0;
  this.long_press_pos = { x: 0, y: 0 };
  this.long_press_selection = null;
  this.isScrollMove = 0;
  
  this.menu = null;
  this.menu_timer = 0;
  this.menu_history_page = 0;
  
  function focusEditor(self) {
    if(self.$immediateFocus){
      if(self.editor.getReadOnly()){
        return;
      }
      // because we have to call event.preventDefault() any window on ie and iframes 
      // on other browsers do not get focus, so we have to call window.focus() here
      if (!document.hasFocus || !document.hasFocus())
          window.focus();
      self.editor.focus();
    }
  }
  
  function menu_touchstart(self, evt){
    evt.returnValue = false;
  }
  
  function copy(self){
    self.$clipboardData = self.editor.getCopyText();
    self.editor.onCopy();
    self.showMenu(40);
  }
  
  function cut(self){
    var editor = self.editor;
    var range = editor.getSelectionRange();
    if(!range.isEmpty()){
      self.$clipboardData = editor.getCopyText();
      self.editor.onCut();
      self.editor.clearSelection();
    }
    self.removeMenu();
  }
  
  function paste(self){
    if(self.$clipboardData){
      self.editor.onPaste(self.$clipboardData, { });
    }
    self.removeMenu();
  }
  
  function getSelectWordRange(self) {
    
    var editor = self.editor;
    var session = editor.session;
    var pos = editor.getSelectionRange().end;
    
    var range = session.getBracketRange(pos);
    if (range) {
      if (range.isEmpty()) {
        range.start.column--;
        range.end.column++;
      }
    } else {
      range = editor.selection.getWordRange(pos.row, pos.column);
    }
    return range;
  }
  
  function select(self) {
    var range = getSelectWordRange(self);
    self.editor.session.selection.setRange(range);
    self.showMenu(40);
  }
  
  function select_line(self) {
    var editor = self.editor;
    var session = editor.session;
    var pos = editor.getSelectionRange().start;
    var range = editor.selection.getLineRange(pos.row);
    editor.session.selection.setRange(range);
    self.showMenu(40);
  }
  
  function select_all(self) {
    self.editor.selectAll();
    self.showMenu(40);
  }
  
  function find_word(self) {
    
  }
  
  // 打开url
  function open_url(self) {
    self.editor._signal('open_url', self.editor.getSelectedText().trim());
    self.removeMenu();
  }
  
  function prev_word(self) {
    self.editor.findPrevious();
    self.editor.centerSelection();
    self.showMenu(40);
  }
  
  function next_word(self) {
    self.editor.findNext();
    self.editor.centerSelection();
    self.showMenu(40);
  }
  
  function get_fold(self) {
    var range = self.editor.getSelectionRange();
    var foldLine = self.editor.session.getFoldLine(range.start.row);
    if(foldLine){
      return foldLine.folds[0];
    }
    return null;
  }
  
  function get_fold_range(self){
    var editor = self.editor;
    var session = editor.session;
    if (!session.getFoldWidgetRange) return null;
    
    var range = editor.getSelectionRange();
    var fold_range = session.getFoldWidgetRange(range.start.row);
    
    if (fold_range &&
        fold_range.isMultiLine() &&
        fold_range.end.row >= range.end.row) {
      return fold_range;
    }
    fold_range = session.getCommentFoldRange(range.start.row);
    if(fold_range && fold_range.end.row >= range.end.row){
      return fold_range;
    }
    return null;
  }
  
  function fold(self){
    var range = get_fold_range(self);
    if (range) {
      try {
        // addFold can change the range
        self.editor.session.addFold('...', range);
      } catch(e) { }
    }
    self.showMenu(40);
  }
  
  function unfold(self) {
    var fold = get_fold(self);
    if (fold) {
      self.editor.session.expandFold(fold);
    }
    self.showMenu(40);
  }

  function isEmptyLine(self, row){
    var line = self.editor.session.getDocument().getLine(row);
    return line.length === 0;
  }
  
  function isAllLine(self, range){
    if(range.start.row === 0 && range.start.column === 0){
      var doc = self.editor.session.getDocument();
      var pos = range.end;
      var row_len = doc.getLength();
      if(pos.row + 1 >= row_len){
        var column_len = doc.getLine(pos.row).length;
        if(pos.column + 1 >= column_len){
          return true;
        }
      }
    }
    return false;
  }
  
  function push_page_char(menu_values){
    if (menu_values.indexOf('-') == -1) {
      // if (menu_values.length >= 4) {
      menu_values.push('-');
      // }
    }
  }
  
  function bindMenuEvent(self) {
    self.menu.$on('touchstart', menu_touchstart, self);
    self.menu.$on('menu_copy', copy, self);
    self.menu.$on('menu_cut', cut, self);
    self.menu.$on('menu_paste', paste, self);
    self.menu.$on('menu_select', select, self);
    self.menu.$on('menu_select_line', select_line, self);
    self.menu.$on('menu_select_all', select_all, self);
    self.menu.$on('menu_find_word', find_word, self);
    self.menu.$on('menu_open', open_url, self);
    self.menu.$on('menu_prev', prev_word, self);
    self.menu.$on('menu_next', next_word, self);
    self.menu.$on('menu_fold', fold, self);
    self.menu.$on('menu_unfold', unfold, self);
  }
  
  // show menu start
  
  function showMenu(self) {
    
    self.menu_timer = 0;
    
    var editor = self.editor;
    var session = editor.session;
    var selection = session.selection;
    var ace_document = session.getDocument();
    var range = editor.getSelectionRange();
    var pos = range.start;
    var values = [];
    var select = false;
    
    if(!editor.getReadOnly()){ // 是否为只读文件
      // TODO ? 检测剪贴板是否有数据
      if(self.$clipboardData){
        values.push('paste');
      }
    }
    
    if(range.isEmpty()){
      if(!isEmptyLine(self, pos.row)){ // 不为空行
        values.push('select'); 
        values.push('select_line');
        select = true;
      }
    } else {
      
      var text = editor.getSelectedText();
      
      if(/^\s*https?:\/\/?[a-z0-9_\-\$]+\.[a-z0-9_\-\$]+.*$/i.test(text)){
        values.push('open');
      }
      
      values.push('copy');
      if(!editor.getReadOnly()){ // 是否为只读文件
        values.push('cut');
      }
      
      if(values.length < 4){
        if(!range.isMultiLine()){
          var range2 = getSelectWordRange(self);
          if(range.isEqual(range2)){ 
            values.push('select_line');
          } else { // 还没有选择一个词语
            values.push('select'); 
          }
          select = true;
        }
      }
    }
    
    if (values.length < 4 && 
        !isAllLine(self, range) && 
        !select){ // 还没有选择全部
      values.push('select_all');
    }
    
    var fold = get_fold(self);
    if (fold) {
      push_page_char(values);
      values.push('unfold');
    } else {
      var fold_range = get_fold_range(self);
      if (fold_range) {
        push_page_char(values);
        values.push('fold');
      }
    }
    
    if (!range.isEmpty()) { // 第二页显示
      var find_range = 
        editor.find({ preventScroll: true, backwards: false, skipCurrent: true });
       
      if(!range.isEqual(find_range)){ // 不相同,表示可以查找
        push_page_char(values);
        values.push('prev');
        values.push('next');
      }
    }
    
    if(!values.length){
      return;
    }
    
    var size = screen.size;
    var x = -1, y, offset_x = 0, offset_y = 0;
    var lineHeight = editor.renderer.lineHeight;
    var offset = $(self.editor.renderer.scroller).offset;
    
    if(range.isMultiLine()){
      
      for(var i = range.start.row; i <= range.end.row; i++){
        
        var column = (range.start.row == i ?  range.start.column: 0);
        var pix = editor.renderer.textToScreenCoordinates(i, column);
        if(pix.pageY >= offset.top - 10 && pix.pageY <= size.height){
          
          column = (i == range.end.row ? 
              range.end.column : ace_document.getLine(range.start.row).length);
          var pix2 = editor.renderer.textToScreenCoordinates(range.start.row, column);
          
          x = (Math.max(pix.pageX, 0) + Math.min(pix2.pageX, size.width)) / 2;
          
          if(x > 0 && x < size.width){
            y = pix.pageY - 10;
            break;
          }
        }
      }
    }
    else{
      var pix = editor.renderer.textToScreenCoordinates(range.start.row, range.start.column);
      var pix2 = editor.renderer.textToScreenCoordinates(range.end.row, range.end.column);
      x = (Math.max(pix.pageX, 0) + Math.min(pix2.pageX, size.width)) / 2;
      y = pix.pageY - 10;
    }
    
    offset_y = lineHeight + 20;
    
    // 超出范围不显示
    if(x < 0 || x > size.width || y < -10 || y > size.height){
      return self.removeMenu();
    }
    
    if(!self.menu){
      self.menu = new TouchMenu(self.menu_history_page);
      bindMenuEvent(self);
    }
    self.menu.set_menu(values);
    self.menu.activateByPosition(x, y, offset_x, offset_y);
  }
  
  // show menu end
  
  this.showMenu = function(delay){
    if(this.menu_timer){
      Function.undelay(this.menu_timer);
      this.menu_timer = 0;
    }
    if(delay === 0){
      showMenu(this);
    }
    else{
      this.menu_timer = showMenu.delay2(delay || 200, this);
    }
  };
  
  this.removeMenu = function(){
    if(this.menu_timer){
      Function.undelay(this.menu_timer);
      this.menu_timer = 0;
    }
    if(this.menu){
      // 如果有菜单才删除
      this.menu_history_page = this.menu.page;
      this.menu.remove();
      this.menu = null;
    }
  };
  
  this.clearMultiClickTimer = function(){
    if(this.multiClickTimer){
      Function.undelay(this.multiClickTimer);
      this.multiClickTimer = 0;
    }
  };
  
  this.startMultiClickTimer = function(){
    var self = this;
    this.clearMultiClickTimer();
    this.multiClickTimer = function(){
      var range = self.editor.getSelectionRange();
      if(range && !range.isEmpty()){
        // 有选中的文本,显示菜单
        self.showMenu(0);
      }
      self.multiClickTimer = 0;
    }.delay2(400);
  };
  
  this.onTouchScroll = function(){
    var self = this;
    if(this.isScrollMove){
      Function.undelay(this.isScrollMove);
    }
    this.isScrollMove = function(){
      self.isScrollMove = 0;
      var range = self.editor.getSelectionRange();
      if(!range.isEmpty()){ // 不为空时,显示编辑菜单
        self.showMenu();
      }
    }.delay2(200);
  };

  this.onTextChange = function(){
    this.removeMenu();
  };
  
  this.onTouchDragSelectStart = function(evt) {
    // 这个事件可由native程序处理
    // 激活touch放大镜
    this.editor._signal('activate_touch_magnifier', evt);
    this.removeMenu();
  };
  
  this.onTouchDragSelectEnd = function(evt) {
    this.editor._signal('stop_touch_magnifier'); // 停止touch放大镜
    this.showMenu();
  };

  this.onTouchDragSelect = function(evt) {
    this.editor._signal('touch_magnifier_move', evt); // touch放大镜移动
  };
  
  this.onTouchStart = function(evt) {
    
    if(this.activate_longpress_cursor_move){
      this.activate_longpress_cursor_move = false;
      this.editor._signal('stop_touch_magnifier', { x: evt.x0, y: evt.y0 });
    }
    
    var editor = this.editor;
    var touches = evt.domEvent.touches;
    var x, y;
    
    this.removeMenu(); // 删除菜单
    
    if(touches.length == 1){
      x = evt.x0;
      y = evt.y0;
    }
    else if(touches.length == 2){
      x = (touches[0].clientX + touches[1].clientX) / 2;
      y = (touches[0].clientY + touches[1].clientY) / 2;
    }
    /*
    else if(touches.length > 2){
      // 开始
      return;
    }*/
    
    /*
    var range = editor.getSelectionRange();
    
    if(range.isEmpty()){
      
      var offset = $(editor.renderer.scroller).offset;
      var pos = editor.renderer.screenToTextCoordinates(x, y);
      var pix2 = editor.renderer.textToScreenCoordinates(pos.row, pos.column);
      
      if(pix2.pageX >= offset.left){ // 如果光标在显示范围外边,不选择
      
        range = new Range(pos.row, pos.column, pos.row, pos.column);
        editor.session.selection.setRange(range);
      }
    }*/
  };
  
  this.onTouchMove = function(evt) {
    
    var editor = this.editor;
    var touches = evt.domEvent.touches;
    var x, y, pos;
    
    if(!this.activate_3_touch_point_select && 
      (touches.length == 2 || this.activate_longpress_cursor_move)) { // 两指移动光标
      evt.domEvent.preventDefault();
      
      if(touches.length == 2){
        x = (touches[0].clientX + touches[1].clientX) / 2;
        y = (touches[0].clientY + touches[1].clientY) / 2;
      }
      else{
        x = evt.x;
        y = evt.y;
        editor._signal('touch_magnifier_move', { x: x, y: y }); //
      }
      
      pos = editor.renderer.screenToTextCoordinates(x, y);
      var range = new Range(pos.row, pos.column, pos.row, pos.column);
      editor.session.selection.setRange(range);
    }
    else if(touches.length > 2) { // 移动光标选择,三指选择
      evt.domEvent.preventDefault();
      this.activate_3_touch_point_select = true;
      x = (touches[0].clientX + touches[1].clientX) / 2;
      y = (touches[0].clientY + touches[1].clientY) / 2;
      pos = editor.renderer.screenToTextCoordinates(x, y);
      editor.session.selection.selectToPosition(pos);
    }
  };
  
  this.onTouchEnd = function(evt) {
    
    // if(this.activate_3_touch_point_select){ // 已激活三指选择
    //   if(evt.domEvent.touches.length < 3){
    //     this.activate_3_touch_point_select = false; // 取消三指选择
    //   }
    // }
    
    if (!evt.domEvent.touches.length &&       // 已没有任何触点
        this.activate_3_touch_point_select) { // 已激活三指选择
      this.activate_3_touch_point_select = false; // 取消三指选择
    }
    
    if (this.activate_longpress_cursor_move) {
      
      this.activate_longpress_cursor_move = false;
      
      this.editor._signal('stop_touch_magnifier');
      
      var long_press_selection = this.long_press_selection;
      if (long_press_selection) {
        this.showMenu();
        return;
      }
    }
    
    if(!evt.domEvent.touches.length && !this.multiClickTimer && !this.isScrollMove){
    
      var range = this.editor.getSelectionRange();
      
      if(!range.isEmpty()){ // 不为空时,显示编辑菜单
        this.showMenu();
      }
    }
  };
  
  this.onLongPress = function(evt) { // 长按事件
    this.activate_longpress_cursor_move = true;
    var pos = this.editor.renderer.screenToTextCoordinates(evt.x, evt.y);
    var range = new Range(pos.row, pos.column, pos.row, pos.column);
    this.long_press_selection = range;
    this.editor.session.selection.setRange(range);
    this.editor._signal('activate_touch_magnifier', { x: evt.x, y: evt.y });
  };
  
  this.onClick = function(evt) {
    
    if (this.multiClickTimer) return;
    
    focusEditor(this); // 捕获焦点
    
    var editor = this.editor;
    var pos = evt.getDocumentPosition();
    var range = this.editor.getSelectionRange();
    var range2 = new Range(pos.row, pos.column, pos.row, pos.column);
    
    if(range){
      if(range.isEmpty()){
        // 如果当前是一个空的范围
        // 同一个地方+-5重复点击!那就显示出菜单.
        if(range.start.row == range2.start.row &&
          Math.abs(range.start.column - range2.start.column) < 5){
          this.showMenu();
        } else {
          this.removeMenu();
        }
      } else {
        // 如果点击在选择的范围内部显示出菜单,并且当前只选择了一行.
        // 选择范围不发生变化,并显示出菜单
        if (range.start.row     == range.end.row && 
            range2.start.row    == range.start.row &&
            range2.start.column > range.start.column &&
            range2.end.column   < range.end.column) {
          this.showMenu();
          range2 = range;
        } else{
          this.removeMenu();
        }
      }
    } else {
      this.removeMenu();
    }
    editor.session.selection.setRange(range2);
  };
  
  this.onDoubleClick = function(evt) {
    var editor = this.editor;
    var session = editor.session;
    var pos = evt.getDocumentPosition();
    var range = session.getBracketRange(pos);
    
    if (range) {
      if (range.isEmpty()) {
        range.start.column--;
        range.end.column++;
      }
      session.selection.setRange(range);
    } else {
      range = editor.selection.getWordRange(pos.row, pos.column);
      session.selection.setRange(range);
    }
    this.startMultiClickTimer();
  };

  this.onTripleClick = function(evt) {
    var editor = this.editor;
    var pos = evt.getDocumentPosition();
    var range = this.editor.getSelectionRange();
    
    if (range && range.isMultiLine() && range.contains(pos.row, pos.column)) {
      var selection = editor.selection.getLineRange(range.start.row);
      selection.end = editor.selection.getLineRange(range.end.row).end;
      editor.session.selection.setRange(selection);
    } else {
      range = editor.selection.getLineRange(pos.row);
      editor.session.selection.setRange(range);
    }
    this.startMultiClickTimer();
  };

  this.onQuadClick = function(ev) {
    this.editor.selectAll();
    this.startMultiClickTimer();
  };

}).call(DefaultHandlers.prototype);

exports.DefaultHandlers = DefaultHandlers;

});
