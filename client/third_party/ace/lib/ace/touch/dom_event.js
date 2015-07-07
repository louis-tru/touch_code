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

'use strict';

var event = require('./event');
var util = require('./util');
var EventDelegate = require('./event_delegate').EventDelegate;

var CSS_PREFIX =
    (util.env.trident ? 'ms' :
    util.env.presto ? 'o' :
    util.env.webkit ? 'webkit' :
    util.env.gecko ? 'moz' : ''); // CSS前缀

var EVENT = {
  animationstart: CSS_PREFIX + 'AnimationStart',
  animationiteration: CSS_PREFIX + 'AnimationIteration',
  animationend: CSS_PREFIX + 'AnimationEnd',
  transitionend: CSS_PREFIX + 'TransitionEnd',
  mousewheel: 'mousewheel',
};

if(util.env.gecko) {
  EVENT.animationstart 		= 'animationstart';
  EVENT.animationiteration 	= 'animationiteration';
  EVENT.animationend	 		= 'animationend';
  EVENT.transitionend	 		= 'transitionend';
  EVENT.mousewheel            = 'DOMMouseScroll';
}
else if(util.env.trident) {
  EVENT.animationstart 		= 'MSAnimationStart';
  EVENT.animationiteration 	= 'MSAnimationIteration';
  EVENT.animationend	 		= 'MSAnimationEnd';
  EVENT.transitionend	 		= 'MSTransitionEnd';
}

var doc  = document;
var body = doc.body;

function DOMMouseScrollHandler(self, del){
  
  //DOMMouseScroll
  
  //TODO ?
  function handler(evt) {
    
    var val = -e.detail * 3 * 12;
    evt.wheelDelta = val;

    if(evt.shiftKey){
      evt.wheelDeltaX = val;
      evt.wheelDeltaY = 0;
    }
    else{
      evt.wheelDeltaX = 0;
      evt.wheelDeltaY = val;
    }

    var returnValue = del.emit(evt);
    if (returnValue === false) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    evt._return = returnValue;
  }

  event.addListener(self.dom, 'DOMMouseScroll', handler);
  self.events.push({ name: 'DOMMouseScroll', handler: handler });
}

var custom_mouse_events = {
  click: 'click',
  dblclick: 'dblclick',
  tripleclick: 'tripleclick',
  quadclick: 'quadclick',
  longpress: 'longpress',
};

function get_delegate(self, type) {

  var on = 'on' + type;
  var del = self[on];
  
  if (del){
    return del;
  }

  self[on] = del = new EventDelegate(type, self);
  if(!self.events){
    self.events = [];
  }
  
  type = EVENT[type] || type;
  
  if(type == 'DOMMouseScroll'){
    DOMMouseScrollHandler(self, del);
    return del;
  }
  
  var dom = self.dom;
  
  if('on' + type in dom || type in custom_mouse_events){
    
    var handler = function(evt) {
	    var returnValue = del.emit(evt);
	    if (returnValue === false) {
        evt.preventDefault();
        evt.stopPropagation();
	    }
	    evt._return = returnValue;
    };
    
    event.addListener(dom, type, handler);
    self.events.push({ name: type, handler: handler });
  }
  return del;
}

function on(self, call, types, listen, scope, name) {
  if (typeof types == 'string'){
    types = [types];
  }
  for (var i = 0, l = types.length; i < l; i++){
    get_delegate(self, types[i])[call](listen, scope, name);
  }
}

var EVENT_TYPES = [
  { name: 'ontouchstart' in global ? 'TouchEvent': 'UIEvents', 
    match: /touch|longpress/, init: 'initTouchEvent' },
  { name: 'MouseEvents', match: /mouse|click/ , init: 'initMouseEvent' },
  { name: 'UIEvents', 
    match: /load|unload|abort|error|select|resize|scroll/, init: 'initUIEvent' },
  { name: 'HTMLEvents', match: /./, init: 'initEvent' }
];

function emitDOMEvent(self, type, msg){
  
  msg = msg || {};

  var name = 'HTMLEvents';

  for(var i = 0; i < 4; i++){
    var item = EVENT_TYPES[i];
    if(item.match.test(type)){
      name = item.name;
      break;
    }
  }

  var evt = doc.createEvent(name);

  switch(name){
    case 'TouchEvent':
      evt.initTouchEvent(
        type, 
        true, 
        true, 
        doc.defaultView, 
        msg.detail || 0,
        msg.screenX || 0, 
        msg.screenY || 0, 
        msg.clientX || 0, 
        msg.clientY || 0, 
        msg.ctrlKey || false, 
        msg.altKey || false, 
        msg.shiftKey || false, 
        msg.metaKey || false, 
        msg.touches || [], 
        msg.targetTouches || [], 
        msg.changedTouches || [], 
        msg.scale || 1, 
        msg.rotation || 0);
      break;
    case 'MouseEvents':
      evt.initMouseEvent(
        type, 
        true, 
        true, 
        doc.defaultView, 
        msg.detail || 0,
        msg.screenX || 0, 
        msg.screenY || 0, 
        msg.clientX || 0, 
        msg.clientY || 0, 
        msg.ctrlKey || false, 
        msg.altKey || false, 
        msg.shiftKey || false, 
        msg.metaKey || false, 
        msg.button || 0, 
        msg.relatedTarget || null);
      break;
    case 'UIEvents':
      evt.initUIEvent(type, false, true, doc.defaultView, msg.detail || 0);
      break;
    default:
      evt.initEvent(type, true, true);
      break;
  }
  
  util.extend(evt, msg)._return = true;

  self.dom.dispatchEvent(evt);
  return evt;
}

var DOMEvent = util.class({

  /**
   * event list
   * @type {Array}
   */
  events: null,

  /*
   * 文档元素
   * @type {HTMLElement}
   */
  dom: null,

  /**
   * 添加事件监听器(函数)
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听器函数
   * @param {Object}   scope     (Optional) 重新指定侦听器函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  on: function(types, listen, scope, name) {
    on(this, 'on', types, listen, scope, name);
    return this;
  },

  /**
   * 添加事件监听器(函数),消息触发一次立即移除
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听器函数
   * @param {Object}   scope     (Optional) 重新指定侦听器函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  once: function(types, listen, scope, name) {
    on(this, 'once', types, listen, scope, name);
    return this;
  },

  /**
   * Bind an event listener (function),
   * and "on" the same processor of the method to
   * add the event trigger to receive two parameters
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  $on: function(types, listen, scope, name) {
    on(this, '$on', types, listen, scope, name);
    return this;
  },

  /**
   * Bind an event listener (function),
   * And to listen only once and immediately remove
   * and "on" the same processor of the method to add the event trigger to
   * receive two parameters
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  $once: function(types, listen, scope, name) {
    on(this, '$once', types, listen, scope, name);
    return this;
  },

  /**
   * 卸载事件监听器(函数)
   * @param {String} type                事件名称
   * @param {Object} listen (Optional)
   * 可以是侦听器函数值,也可是侦听器别名,如果不传入参数卸载所有侦听器
   * @param {Object} scope  (Optional) scope
   */
  off: function(type, listen, scope) {
    var del = this['on' + type];
    if (del)
      del.unon(listen, scope);
    return this;
  },
  
  unon: function(type, listen, scope){
    return this.off(type, listen, scope);
  },
  
  /**
   * 通知
   * @param  {Object} type      事件名称
   * @param  {Object} msg       要发送的消息
   * @return {Object}
   */
  notice: function(type, msg){
    type = EVENT[type] || type;
    
    if ('on' + type in this.dom || type in custom_mouse_events) {
      return emitDOMEvent(this, type, msg)._return;
    }
    var del = this['on' + type];
    return del ? del.emit(msg) : true;
  },
  
  emit: function(type, msg) {
    return this.notice(type, msg);
  }
});

exports.DOMEvent = DOMEvent;
exports.CSS_PREFIX = CSS_PREFIX;

});