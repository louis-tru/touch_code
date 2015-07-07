/**
 * @class tesla.gui.DOMEvent
 * @createTime 2013-05-13
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/event_delegate.js');

var EventDelegate = tesla.EventDelegate;
var CSS_PREFIX =
    (tesla.env.trident ? 'ms' :
    tesla.env.presto ? 'o' :
    tesla.env.webkit ? 'webkit' :
    tesla.env.gecko ? 'moz' : ''); // CSS前缀

var EVENT = {
    animationstart: CSS_PREFIX + 'AnimationStart',
	animationiteration: CSS_PREFIX + 'AnimationIteration',
	animationend: CSS_PREFIX + 'AnimationEnd',
	transitionend: CSS_PREFIX + 'TransitionEnd',
    mousewheel: 'mousewheel',
    click: 'click'
};

if(tesla.env.gecko) {
    EVENT.animationstart 		= 'animationstart';
    EVENT.animationiteration 	= 'animationiteration';
    EVENT.animationend	 		= 'animationend';
    EVENT.transitionend	 		= 'transitionend';
    EVENT.mousewheel            = 'DOMMouseScroll';
}
else if(tesla.env.trident) {
    EVENT.animationstart 		= 'MSAnimationStart';
    EVENT.animationiteration 	= 'MSAnimationIteration';
    EVENT.animationend	 		= 'MSAnimationEnd';
    EVENT.transitionend	 		= 'MSTransitionEnd';
}

if(tesla.env.touch){
    EVENT.click = '_click';
}

var doc  = document;
var body = doc.body;

/*
说明
该方法将创建一种新的事件类型，该类型由参数 eventType 指定。注意，该参数的值不是要创建的事件接口的名称，而是定义那个接口的 DOM 模块的名称。
下表列出了 eventType 的合法值和每个值创建的事件接口：
参数    事件接口	初始化方法
HTMLEvents	HTMLEvent	iniEvent()
UIEvents    UIEvent	iniUIEvent()
MouseEvents	MouseEvent	initMouseEvent()
TouchEvents    TouchEvent	initTouchEvent()
用该方法创建了 Event 对象以后，必须用上表中所示的初始化方法初始化对象。关于初始化方法的详细信息，请参阅 Event 对象参考。
该方法实际上不是由 Document 接口定义的，而是由 DocumentEvent 接口定义的。如果一个实现支持 Event 模块，那么 Document 对象就会实现 DocumentEvent 接口并支持该方法。
*/

//initEvent
/*
Summary

The initEvent method is used to initialize the value of an event created using document.createEvent.

Syntax

event.initEvent(type, bubbles, cancelable);
type
The type of event.
bubbles
A boolean indicating whether the event should bubble up through the event chain or not (see bubbles).
cancelable;
A boolean indicating whether the event can be canceled (see cancelable).
Example

1
2
3
// create a click event that bubbles up and 
// cannot be canceled 
event.initEvent("click", true, false);
The page on dispatchEvent has a more useful example.

Notes

Events initialized in this way must have been created with the document.createEvent method. initEvent must be called to set the event before it is dispatchEvent.


*/

//initUIEvent
/*
Summary

Initializes a UI event once it's been created.

Syntax

event.initUIEvent(type, canBubble, cancelable, view, detail) 
Parameters

type 
The type of event.
canBubble 
A boolean indicating whether the event should bubble up through the event chain or not (see bubbles).
cancelable 
A boolean indicating whether the event can be canceled (see cancelable).
view 
The AbstractView associated with the event.
detail 
A number specifying some detail information about the event, depending on the type of event. For mouse events, it indicates how many times the mouse has been clicked on a given screen location (usually 1).
Example

var e = document.createEvent("UIEvents");
// creates a click event that bubbles, can be cancelled,
// and with its view and detail property initialized to window and 1,
// respectively
e.initUIEvent("click", true, true, window, 1);
Specification

DOM Level 2 Events - method of UIEvent object
*/


//initMouseEvent
/*
Summary

Intializes the value of a mouse event once it's been created (normally using document.createEvent method).

Syntax

event.initMouseEvent(
    type, 
    canBubble, 
    cancelable, 
    view, 
    detail, 
    screenX, 
    screenY, 
    clientX, 
    clientY, 
    ctrlKey, 
    altKey, 
    shiftKey, 
    metaKey, 
    button, 
    relatedTarget);

type 
the string to set the event's type to. Possible types for mouse events include: click, mousedown, mouseup, mouseover, mousemove, mouseout.
canBubble 
whether or not the event can bubble. Sets the value of event.bubbles.
cancelable 
whether or not the event's default action can be prevented. Sets the value of event.cancelable.
view 
the Event's AbstractView. You should pass the window object here. Sets the value of event.view.
detail 
the Event's mouse click count. Sets the value of event.detail.
screenX 
the Event's screen x coordinate. Sets the value of event.screenX.
screenY 
the Event's screen y coordinate. Sets the value of event.screenY.
clientX 
the Event's client x coordinate. Sets the value of event.clientX.
clientY 
the Event's client y coordinate. Sets the value of event.clientY.
ctrlKey 
whether or not control key was depressed during the Event. Sets the value of event.ctrlKey.
altKey 
whether or not alt key was depressed during the Event. Sets the value of event.altKey.
shiftKey 
whether or not shift key was depressed during the Event. Sets the value of event.shiftKey.
metaKey 
whether or not meta key was depressed during the Event. Sets the value of event.metaKey.
button 
the Event's mouse event.button.
relatedTarget 
the Event's related EventTarget. Only used with some event types (e.g. mouseover and mouseout). In other cases, pass null.
*/

//initTouchEvent
/*
initTouchEvent
Initializes a newly created TouchEvent object.

void initTouchEvent (
    in DOMString type, 
    in boolean canBubble, 
    in boolean cancelable, 
    in DOMWindow view, 
    in long detail, 
    in long screenX, 
    in long screenY, 
    in long clientX, 
    in long clientY, 
    in boolean ctrlKey, 
    in boolean altKey, 
    in boolean shiftKey, 
    in boolean metaKey, 
    in TouchList touches, 
    in TouchList targetTouches, 
    in TouchList changedTouches, 
    in float scale, 
    in float rotation);

Parameters
type
The type of event that occurred.
canBubble
Indicates whether an event can bubble. If true, the event can bubble; otherwise, it cannot.
cancelable
Indicates whether an event can have its default action prevented. If true, the default action can be prevented; otherwise, it cannot.
view
The view (DOM window) in which the event occurred.
detail
Specifies some detail information about the event depending on the type of event.
screenX
The x-coordinate of the event’s location in screen coordinates.
screenY
The y-coordinate of the event’s location in screen coordinates.
clientX
The x-coordinate of the event’s location relative to the window’s viewport.
clientY
The y-coordinate of the event’s location relative to the window’s viewport.
ctrlKey
If true, the control key is pressed; otherwise, it is not.
altKey
If true, the alt key is pressed; otherwise, it is not.
shiftKey
If true, the shift key is pressed; otherwise, it is not.
metaKey
If true, the meta key is pressed; otherwise, it is not.
touches
A collection of Touch objects representing all touches associated with this event.
targetTouches
A collection of Touch objects representing all touches associated with this target.
changedTouches
A collection of Touch objects representing all touches that changed in this event.
scale
The distance between two fingers since the start of an event as a multiplier of the initial distance. The initial value is 1.0. If less than 1.0, the gesture is pinch close (to zoom out). If greater than 1.0, the gesture is pinch open (to zoom in).
rotation
The delta rotation since the start of an event, in degrees, where clockwise is positive and counter-clockwise is negative. The initial value is 0.0.
Discussion
Use this method to programmatically create a TouchEvent object.

Availability
Available in iOS 2.0 and later.
*/

// KeyboardEvents
// initKeyboardEvent
/* void initKeyboardEvent(
in DOMString typeArg, 
in boolean canBubbleArg, 
in boolean cancelableArg, 
in views::AbstractView viewArg, 
in DOMString charArg, 
in DOMString keyArg, 
in unsigned long locationArg, 
in DOMString modifiersListArg, 
in boolean repeat, 
in DOMString localeArg);

//    var evt = document.createEvent('KeyboardEvents');
//  evt.initKeyboardEvent(
//    "keydown" // in DOMString typeArg
//    , false // in boolean canBubbleArg
//    , false // in boolean cancelableArg
//    , window // in views::AbstractView viewArg
//    , '' // [test]in DOMString keyIdentifierArg | webkit event.keyIdentifier | IE9 event.key
//    , '' // [test]in unsigned long keyLocationArg | webkit event.keyIdentifier | IE9 event.location
//    , false // [test]in boolean ctrlKeyArg | webkit event.shiftKey | old webkit event.ctrlKey | IE9 event.modifiersList
//    , false // [test]shift | alt
//    , false // [test]shift | alt
//    , false // meta
//    , false // altGraphKey
//  );
*/

function touchClickHandler(self, del){

  var x = 0;
  var y = 0;
  var dom = self.dom;
  var events = self.events;

  function touchstart(evt){
    
    if(evt._complete){
      return;
    }
    evt._complete = true;

    var touche = evt.changedTouches[0];
    x = touche.pageX - body.scrollLeft;
    y = touche.pageY - body.scrollTop;
  }

  function touchend(evt) {
      
    if(evt._complete){
      return;
    }
    evt._complete = true;

    if(!evt.touches.length){

      var touche = evt.changedTouches[0];
      var w = Math.abs(touche.pageX - body.scrollLeft - x);
      var h = Math.abs(touche.pageY - body.scrollTop - y);
      var s = Math.sqrt(w * w + h * h);

      if(s < 20){ //移动超过20px不认为是click事件
        nextTick(emitDOMEvent, self, EVENT.click, {  
          detail: evt.detail,
          screenX: touche.screenX,
          screenY: touche.screenY,
          clientX: touche.clientX,
          clientY: touche.clientY
        });
      }
    }
  }
  
  function click(evt){
    if('_return' in evt){
      var return_value = del.notice(evt);
	    if (return_value === false) {
        evt.preventDefault();
        evt.stopPropagation();
	    }
	    evt._return = return_value;
      // console.nlog('click');
      return;
    }
    //stop default event
    evt.preventDefault();
    evt.stopPropagation();
  }
  
  tesla.on(dom, 'touchstart', touchstart);
  tesla.on(dom, 'touchend', touchend);
  tesla.on(dom, EVENT.click, click);
  events.push({ name: 'touchstart', handler: touchstart });
  events.push({ name: 'touchend', handler: touchend });
  events.push({ name: EVENT.click, handler: click });
}

function clickHandler(self, del){

  var x = 0;
  var y = 0;
  var dom = self.dom;
  var events = self.events;

  function mousedown(evt){
      x = evt.pageX - body.scrollLeft;
      y = evt.pageY - body.scrollTop;
  }

  function click(evt){

    //移动超过20px不认为是click事件
    if(
      '_return' in evt || 
      Math.sqrt(Math.pow(Math.abs(evt.pageX - body.scrollLeft - x), 2) + 
      Math.pow(Math.abs(evt.pageY - body.scrollTop - y), 2)) < 20
    ){
      var return_value = del.notice(evt);
      if (return_value === false) {
        evt.preventDefault();
        evt.stopPropagation();
      }
	    evt._return = return_value;
    }
    else{ //stop click event
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  tesla.on(dom, 'mousedown', mousedown);
  tesla.on(dom, 'click', click);
  events.push({ name: 'mousedown', handler: mousedown });
  events.push({ name: 'click', handler: click });
}

function DOMMouseScrollHandler(self, del){

  //DOMMouseScroll

  //TODO ?
  var handler = function(evt) {

      //TODO ? change evt data 
      //
      //

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

    var return_value = del.notice(evt);
    if (return_value === false) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    evt._return = return_value;
  };

  tesla.on(self.dom, 'DOMMouseScroll', handler);
  self.events.push({ name: 'DOMMouseScroll', handler: handler });
}

function getDelegate(self, type) {

  var on = 'on' + type;
  var del = self[on];
  if (del)
    return del;

  self[on] = del = new EventDelegate(type, self);
  if(!self.events){
    self.events = [];
  }

  var rep = EVENT[type];

  if(type == 'click'){
    if(tesla.env.touch){
      touchClickHandler(self, del); 
    }
    else{
      clickHandler(self, del);
    }
    return del;
  }
  else if(rep == 'DOMMouseScroll'){
    DOMMouseScrollHandler(self, del);
    return del;
  }

  var dom = self.dom;
  var reptype = rep || type;

  if('on' + reptype in dom || rep){

    var handler = function(evt) {
	    var return_value = del.notice(evt);
	    if (return_value === false) {
        evt.preventDefault();
        evt.stopPropagation();
	    }
	    evt._return = return_value;
    };

    tesla.on(dom, reptype, handler);
    self.events.push({ name: reptype, handler: handler });
  }
  return del;
}

function on(self, call, types, listen, scope, name) {
  if (typeof types == 'string')
    types = [types];

  for (var i = 0, l = types.length; i < l; i++)
    getDelegate(self, types[i])[call](listen, scope, name);
}

var EVENT_TYPES = [
  { name: 'ontouchstart' in window ? 'TouchEvent': 'UIEvents', 
    match: /touch/, init: 'initTouchEvent' },
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
        msg.touches || null, 
        msg.targetTouches || null, 
        msg.changedTouches || null, 
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
      evt.initUIEvent(type, true, true, doc.defaultView, msg.detail || 0);
      break;
    default:
      evt.initEvent(type, true, true);
      break;
  }
  
  tesla.extend(evt, msg)._return = true;

  self.dom.dispatchEvent(evt);
  return evt;
}


$class('tesla.gui.DOMEvent', {

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
      del.off(listen, scope);
  },
  
  /**
   * 发送通知
   * @param  {Object} type      事件名称
   * @param  {Object} msg       要发送的消息
   * @return {Object}
   */
  notice: function(type, msg){
    var rep = EVENT[type];
    var reptype = rep || type;

    if ('on' + reptype in this.dom || rep) {
      return emitDOMEvent(this, reptype, msg)._return;
    }

    var del = this['on' + type];
    return del ? del.notice(msg) : true;
  },

}, {
  /**
   * CSS前缀
   * @type {String}
   * @static
   */
  CSS_PREFIX: CSS_PREFIX
});


