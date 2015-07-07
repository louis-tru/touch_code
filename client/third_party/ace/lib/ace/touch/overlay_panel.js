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
//"use strict";

var util = require('./util');
var screen = require('./screen');
var dom = require('../lib/dom');
var event = require('./event');
var el = require('./element');
var css = require("../requirejs/text!./touch.css");
var EventDelegate = require('./event_delegate').EventDelegate;

var $ = el.create;

dom.importCssString(css, "touch.css");

// 箭头的尺寸
var arrowSize = { width: 22, height: 10 };

/**
 * 获取left
 * @private
 */
function getLeft(self, x, offset_x){
  
  x -= 10; // 留出10像素边距
  var screen_width = screen.size.width - 20;
  var width = self.dom.clientWidth;
  
  if(screen_width < width){
    return (screen_width - width) / 2 + 10;
  }
  else{
    var left = x + offset_x / 2 - width / 2;
    if(left < 0){
      left = 0;
    }
    else if(left + width > screen_width){
      left = screen_width - width;
    }
    return left + 10;
  }
}

/**
 * 获取top
 * @private
 */
function getTop(self, y, offset_y){

  y -= 10; // 留出10像素边距
  var screen_height = screen.size.height - 20;
  var height = self.dom.clientHeight;
  
  if(screen_height < height){
    return (screen_height - height) / 2 + 10;
  }
  else{
    var top = y + offset_y / 2 - height / 2;
    if(top < 0){
      top = 0;
    }
    else if(top + height > screen_height){
      top = screen_height - height;
    }
    return top + 10;
  }
}

/**
 * 获取arrowtop
 * @private
 */
function getArrowTop(self, top, y, offset_y){
  var height = self.dom.clientHeight;
  y += offset_y / 2;
  var min = 8 + arrowSize.width / 2;
  var max = height - 8 - arrowSize.width / 2;
  if(min > max){
    return height / 2;
  }
  return Math.min(Math.max(min, y - top), max);
}

/**
 * 获取arrowleft
 * @private
 */
function getArrowLeft(self, left, x, offset_x){
  var width = self.dom.clientWidth;
  x += offset_x / 2;
  var min = 8 + arrowSize.width / 2;
  var max = width - 8 - arrowSize.width / 2;
  if(min > max){
    return width / 2;
  }
  return Math.min(Math.max(min, x - left), max);
}

/**
 * 尝试在目标的top显示
 * @private
 */
function attempt_top(self, x, y, offset_x, offset_y, force){

  var height = self.dom.clientHeight;
  var top = y - height - arrowSize.height;
  
  if (top - 10 > 0 || force){
    var left = getLeft(self, x, offset_x);
    var arrow_left = getArrowLeft(self, left, x, offset_x) - arrowSize.width / 2;
    self.panel.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: 'auto', 
      bottom: '-{0}px'.format(arrowSize.height), 
      right: 'auto', 
      left: arrow_left + 'px',
      transform: 'rotateZ(180deg)'
    };
    return true;
  }
  return false;
}

/**
 * 尝试在目标的right显示
 * @private
 */
function attempt_right(self, x, y, offset_x, offset_y, force){
  
  var size = screen.size;
  var width = self.dom.clientWidth;
  
  var left = x + offset_x + arrowSize.height;
  
  if (left + width + 10 <= size.width || force){
    var top = getTop(self, y, offset_y);
    var arrow_top = getArrowTop(self, top, y, offset_y) - arrowSize.height / 2;
    self.panel.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: arrow_top + 'px', 
      bottom: 'auto', 
      right: 'auto',
      left: '-{0}px'.format(arrowSize.width / 2 + arrowSize.height / 2),
      transform: 'rotateZ(-90deg)'
    };
    return true;
  }
  return false;
}

/**
 * 尝试在目标的bottom显示
 * @private
 */
function attempt_bottom(self, x, y, offset_x, offset_y, force){
  
  var size = screen.size;
  var height = self.dom.clientHeight;
  
  var top = y + offset_y + arrowSize.height;
  
  if (top + height + 10 <= size.height || force){
    var left = getLeft(self, x, offset_x);
    var arrow_left = getArrowLeft(self, left, x, offset_x) - arrowSize.width / 2;
    self.panel.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: '-{0}px'.format(arrowSize.height),
      bottom: 'auto', 
      right: 'auto',
      left: arrow_left + 'px',
      transform: 'rotateZ(0deg)'
    };
    return true;
  }
  return false;
}

/**
 * 尝试在目标的left显示
 * @private
 */
function attempt_left(self, x, y, offset_x, offset_y, force){

  var width = self.dom.clientWidth;
  var left = x - width - arrowSize.height;
  
  if (left - 10 > 0 || force){
    var top = getTop(self, y, offset_y);
    var arrow_top = getArrowTop(self, top, y, offset_y) - arrowSize.height / 2;
    self.panel.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: arrow_top + 'px',
      bottom: 'auto', 
      right: '-{0}px'.format(arrowSize.width / 2 + arrowSize.height / 2),
      left: 'auto',
      transform: 'rotateZ(90deg)'
    };
    return true;
  }
  return false;
}

function init(self){
  
  screen.onchange.on(self.remove, self);
  
  self.on('click', function(){
    if(self.frail){
      self.remove();
    }
  });
}

function release(self){
  screen.onchange.off(self.remove, self);
}

var OverlayPanel = util.class(el.Element, {
  
  /**
   * 很脆弱
   * 默认为点击就会消失掉
   */
  frail: true,
  
  x: 0, 
  y: 0, 
  offset_x: 0,
  offset_y: 0,
  activate: false,
  
  /**
   * 优先显示的位置
   */
  priority: 'bottom', // top | right | bottom | left
  
  /**
	 * @constructor
	 */
  constructor: function(){
    el.Element.call(this, document.createElement('div'));
    this.hide();
    el.body.append(this);
    
    this.addClass('ace_overlay');
    
    this.panel = this;
    this.arrow = $({ tag: 'div' }).appendTo(this.panel, 'arrow');
    this.$on('loadview', init);
    this.$on('unload', release);
    this.loadview();
  },
  
  loadview: function(){
    this.emit('loadview');
  },
  
  /**
   * 通过Element 激活 OverlayPanel
   * @param {Element} target 参数可提供要显示的位置信息
   * @param {Object} offset 显示目标位置的偏移
   */
  activateByElement: function(target){
    var offset = target.offset;
    this.activateByPosition(offset.left, offset.top, offset.width, offset.height);
  },
  
  /**
   * 通过位置激活
   */
  activateByPosition: function(x, y, offset_x, offset_y){

    var self = this;
    var size = screen.size;
    
    x = Math.max(0, Math.min(size.width, x));
    y = Math.max(0, Math.min(size.height, y));
    
    offset_x = offset_x || 0;
    offset_y = offset_y || 0;
    
    self.show();
    
    this.x = x;
    this.y = y;
    this.offset_x = offset_x;
    this.offset_y = offset_y;
    
    switch (self.priority) {
      case 'top':
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y, true);
        break;
      case 'right':
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y, true);
        break;
      case 'bottom':
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y, true);
        break;
      default:
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y, true);
        break;
    }
    
    if (!self.activate) {
      // util.next_tick
      (function() {
        self.style = {
          'opacity': 1,
          'transition-duration': '200ms',
        };
      }).delay2(10);
    }
    this.activate = true;
  },
  
  /**
   * 重新激活
   */
  reset: function(){
    if(this.activate){
      this.activateByPosition(this.x, this.y, this.offset_x, this.offset_y);
    }
  },
  
  /**
   * @overwrite
   */
  appendTo: function(parent, id){
    if(parent === el.body){
      el.Element.members.appendTo(parent, id);
    }
    else{
      throw new Error('Error');
    }
  },
  
  remove: function (){
    this.css('opacity', 0.01);
    el.Element.members.remove.delay2(this, 200);
  }
});

var all_menu = [
  { name: 'copy', value: 'Copy' },
  { name: 'cut', value: 'Cut' },
  { name: 'paste', value: 'Paste' },
  { name: 'select', value: 'Select' },
  { name: 'select_line', value: 'Select Line' },
  { name: 'select_all', value: 'Select All' },
  { name: 'fold', value: 'Fold' },
  { name: 'unfold', value: 'Unfold' },
  { name: 'find_word', value: 'Find Word' },
  { name: 'open', value: 'Open' },
  { name: 'prev', value: 'Prev' },
  { name: 'next', value: 'Next' },
  { name: 'more', value: '...' },
];

function handle(name){
  return function(self, evt){
    self.notice('menu_' + name);
  };
}

// 替换标签
function $t(tag){
  return exports.tag(tag);
}

function split_arr(arr, sp){
  
  var ls = [];
  var prev = 0, index;
  
  while ( (index = arr.indexOf(sp, prev)) != -1 ) {
    ls.push(arr.slice(prev, index));
    prev = index + 1;
  }
  ls.push(arr.slice(prev));
  return ls;
}

// 下一页,更多菜单
function menu_more_handle(self){
  var page = self.page;
  self.page++;
  if (self.page >= self.m_pages.length) {
    self.page = 0;
  }
  if (page != self.page) {
    set_menu(self);
    self.reset();
  }
}

function set_menu(self) {
  
  var data = self.m_pages[self.page].slice(0);
  
  if (self.m_pages.length > 1) {
    data.push('more');
  }

  var start = '';
  var end = '';
  
  for(var i = 0; i < all_menu.length; i++){
    var name = all_menu[i].name;
    var el_name = 'm_' + name;
    var el = self[el_name];
    
    el.attr('m', 'no');
    
    if (data.indexOf(name) == -1) { // 不需要显示
      el.hide();
    } else { 
      el.show();
      if(!start){
        start = el_name;
      }
      end = el_name;
    }
  }
  
  if(!start) return;
  
  if(start == end){
    self[start].attr('m', 'start end');
  } else {
    self[start].attr('m', 'start');
    self[end].attr('m', 'end');
  }
}

var TouchMenu = util.class(OverlayPanel, {
  // private:
  m_values: null,
  m_pages: null,
  
  // public:
  // 不脆弱
  frail: false,
  // 优先显示方向
  priority: 'top',
  // 当前显示的页码
  page: 0,
  
  /**
   * @constructor
   */
  constructor: function(page){
    OverlayPanel.call(this);
    this.page = page || 0;
    this.m_values = [];
  },
  
  /**
   * overwrite
   */
  loadview: function(){
    var menu = this.menu = $({ class: 'ace_menu' }).appendTo(this.panel);
    for(var i = 0; i < all_menu.length; i++) {
      var item = all_menu[i];
      this['m_' + item.name] = $({ html: $t(item.value) })
        .appendTo(menu).$on('click', handle(item.name), this);
    }
    this.$on('menu_more', menu_more_handle, this);
    this.set_menu();
    OverlayPanel.members.loadview.call(this);
  },
  
  /**
    * 设置菜单项
    */
  set_menu: function(values){
    
    this.m_values = !values || !values.length ? 
                    'paste|select|select_line'.split('|') : values;
    var page = this.page;
    var pages = split_arr(this.m_values, '-');
    
    // 设置分页
    if (page >= pages.length) {
      this.page = page = pages.length - 1;
    }
    this.m_pages = pages;
    
    set_menu(this);
  },
});

// 替换标签
exports.tag = function(tag) { return tag };
exports.all_menu = all_menu;
exports.OverlayPanel = OverlayPanel;
exports.TouchMenu = TouchMenu;

});