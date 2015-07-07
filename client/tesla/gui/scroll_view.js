/**
 * @class tesla.gui.ScrollView
 * @extends tesla.gui.Control
 * @createTime 2013-05-12
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

/*!
 * iScroll v4.2.5 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */

'use strict';

include('tesla/gui/control.js');
include('tesla/gui/cubic_bezier.js');

//--
var getProperty         = Object.getOwnPropertyDescriptor;
var set_html            = getProperty(tesla.gui.Node.members, 'html').set;
var set_text            = getProperty(tesla.gui.Node.members, 'text').set;
var Node_append      = tesla.gui.Node.members.append;
var empty               = tesla.gui.Node.members.empty;
var parseCssName        = tesla.gui.Node.parseCssName;
var loadView            = tesla.gui.Control.loadView;
var getView             = tesla.gui.Control.view;

//--

var doc = document;
var html = $(doc.documentElement);
var math = Math;
var transform = parseCssName('transform');
var easeInOut = new tesla.gui.CubicBezier(0.3, 0.3, 0.3, 1);

// Browser capabilities
var isTouchPad = (/hp-tablet/gi).test(navigator.appVersion);
var hasTouch = 'ontouchstart' in global && !isTouchPad;

var RESIZE_EVENT = 'onorientationchange' in global ? 'orientationchange' : 'resize';
var START_EVENT = hasTouch ? 'touchstart' : 'mousedown';
var MOVE_EVENT = hasTouch ? 'touchmove' : 'mousemove';
var END_EVENT = hasTouch ? 'touchend' : 'mouseup';
var CANCEL_EVENT = hasTouch ? 'touchcancel' : 'mouseup';

var nextFrame = (function() {
  return global.requestAnimationFrame ||
	global.webkitRequestAnimationFrame ||
	global.mozRequestAnimationFrame ||
	global.oRequestAnimationFrame ||
	global.msRequestAnimationFrame ||
	function(callback) { return setTimeout(callback, 1000 / 60); };
})();
var cancelFrame = (function () {
	return global.cancelRequestAnimationFrame ||
		global.webkitCancelAnimationFrame ||
		global.webkitCancelRequestAnimationFrame ||
		global.mozCancelRequestAnimationFrame ||
		global.oCancelRequestAnimationFrame ||
		global.msCancelRequestAnimationFrame ||
		clearTimeout;
})();

//--

function _momentum(self, dist, time, maxDistUpper, maxDistLower, size) {
  var deceleration = 0.001 * self.friction,
	speed = math.abs(dist) / time,
	newDist = (speed * speed) / (2 * deceleration),
	newTime = 0, outsideDist = 0;

	// Proportinally reduce speed if we are outside of the boundaries
	if (dist > 0 && newDist > maxDistUpper) {
		outsideDist = size / (6 / (newDist / speed * deceleration));
		maxDistUpper = maxDistUpper + outsideDist;
		speed = speed * maxDistUpper / newDist;
		newDist = maxDistUpper;
	} 
  else if (dist < 0 && newDist > maxDistLower) {
		outsideDist = size / (6 / (newDist / speed * deceleration));
		maxDistLower = maxDistLower + outsideDist;
		speed = speed * maxDistLower / newDist;
		newDist = maxDistLower;
	}

	newDist = newDist * (dist < 0 ? -1 : 1);
	newTime = speed / deceleration;

	return { dist: newDist, time: math.round(newTime) };
}

function originAppend(self, el){
  self.idom = self.dom;
  Node_append.call(self, el);
  self.idom = self._atts.idom;
}

function _bind(self, type, el, bubble) {
  (el || self.scroller.dom).addEventListener(type, self, !!bubble);
}

function _unbind(self, type, el, bubble) {
	(el || self.scroller.dom).removeEventListener(type, self, !!bubble);
}

function destroy(self){
    
  var atts = self._atts;

	self.scroller.css('transform', '');

	// Remove the scrollbars
	atts.hScrollbar = false;
	atts.vScrollbar = false;
	_hScrollbar(self);
	_vScrollbar(self);

	// Remove the event listeners
	_unbind(self, RESIZE_EVENT, global);
	_unbind(self, START_EVENT);
	_unbind(self, MOVE_EVENT, global);
	_unbind(self, END_EVENT, global);
	_unbind(self, CANCEL_EVENT, global);

  if(!hasTouch){
  	_unbind(self, 'DOMMouseScroll');
  	_unbind(self, 'mousewheel');
  }

  clearInterval(atts.checkDOMTime);
}

function _offset(self, el) {
  var left = -el.offsetLeft,
	top = -el.offsetTop;
	
  while (el = el.offsetParent) {
		left -= el.offsetLeft;
		top -= el.offsetTop;
	}
	
	if (el != self.dom) {
		left *= self.scale;
		top *= self.scale;
	}

	return { left: left, top: top };
}

function init(self){

  // Normalize
	self.hScrollbar = self.hScroll && self.hScrollbar;
	self.vScrollbar = self.vScroll && self.vScrollbar;

  self.scroller
    .css('transform', 'translate(' + self._atts.x + 'px,' + self._atts.y + 'px)');

  refresh(self);

	_bind(self, RESIZE_EVENT, global);
	_bind(self, START_EVENT);

	if (!hasTouch) {
		if (self.wheelAction != 'none') {
			_bind(self, 'DOMMouseScroll');
			_bind(self, 'mousewheel');
		}
	}
    
  var atts = self._atts;

  atts.checkDOMTime = setInterval(function () {
  
    if(self.scrollWidth === 0 || self.scrollHeight === 0){
      // 没有显示
      return;
    }

    if(atts.moved || atts.zoomed || atts.animating){
      return;
    }
    checkDOMChanges(self);
	}, 100);

  self.$on('unload', destroy);
}

function checkDOMChanges(self) {
  var atts = self._atts;
  if(atts.scrollerW != self.scrollWidth ||
    atts.scrollerH != self.scrollHeight ||
    atts.wrapperW != self.dom.clientWidth ||
    atts.wrapperH != self.dom.clientHeight) {
    refresh(self);
  }
}

function _resize(self) {
  setTimeout(function () { refresh(self); }, tesla.env.android ? 200 : 0);
}

function _hScrollbar(self) {
    
  var atts = self._atts;
  var wrapper = atts.hScrollbarWrapper;

  if (!atts.hScrollbar) {
  	if (wrapper) {
      wrapper.remove();
      atts.hScrollbarWrapper = null;
      atts.hScrollbarIndicator = null;
  	}
  	return;
  }

  var bar = atts.hScrollbarIndicator;

	if (!wrapper) {
		// Create the scrollbar wrapper
		wrapper = $('div');

		if (self.scrollbarClass) {
      wrapper.attr('class', self.scrollbarClass + 'H');
		}
		else {
		  
      wrapper.style = {
        'position' : 'absolute',
        'z-index'  : '100',
        'height'   : '4px',
        'bottom'   : '1px',
        'left'     : '2px',
        'right'    : atts.vScrollbar ? '4px' : '2px'
      };
		}

    wrapper.style = {
      //'transform-style': 'preserve-3d',
      'pointer-events': 'none',
      'transition-property': 'opacity',
      'transition-duration': '350ms',
      'overflow': 'hidden',
      'opacity': 0
    };

    originAppend(self, wrapper);
    atts.hScrollbarWrapper = wrapper;

		// Create the scrollbar indicator
		bar = $('div');

		if (!self.scrollbarClass) {

      var fine = false;
      if (ts.env.ios && ts.env.ios_version >= 8.2 && ts.env.ios_version < 10) {
        fine = true;
      }

      bar.style = {
        'position': 'absolute',
        'z-index' : '100', 
        'background': 'rgba(0,0,0,0.35)',
        'border': fine ? '0.5px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.3)',
        'background-clip': 'padding-box',
        'box-sizing': 'border-box',
        'border-radius': '4px',
        'height': '100%'
      };
		}

    bar.style = {
      //'transform-style': 'preserve-3d',
      //'backface-visibility': 'hidden',
      'pointer-events': 'none',
      'transform': 'translate(0,0)'
    };

    bar.appendTo(wrapper);
    atts.hScrollbarIndicator = bar;
	}

	var hScrollbarSize = wrapper.dom.clientWidth;

	atts.hScrollbarIndicatorSize = 
    math.max(math.round(math.pow(hScrollbarSize, 2) / atts.scrollerW), 10);

	atts.hScrollbarMaxScroll = hScrollbarSize - atts.hScrollbarIndicatorSize;
	atts.hScrollbarProp = atts.hScrollbarMaxScroll / atts.maxScrollX;
	// Reset position
	_hScrollbarPos(self);
}

function _vScrollbar(self) {
    
  var atts = self._atts;
  var wrapper = atts.vScrollbarWrapper;

  if (!atts.vScrollbar) {
  	if (wrapper) {
      wrapper.remove();
      atts.vScrollbarWrapper = null;
      atts.vScrollbarIndicator = null;
  	}
  	return;
  }

  var bar = atts.vScrollbarIndicator;

	if (!wrapper) {
		// Create the scrollbar wrapper
		wrapper = $('div');

		if (self.scrollbarClass) {
      wrapper.attr('class', self.scrollbarClass + 'H');
		}
		else {
      wrapper.style = {
        'position' : 'absolute',
        'z-index'  : '100',
        'width' : '4px',
        'top' : '2px',
        'right' : '1px',
        'bottom' : atts.hScrollbar ? '4px' : '2px'
      };
		}

    wrapper.style = {
      //'transform-style': 'preserve-3d',
      'pointer-events': 'none',
      'transition-property': 'opacity',
      'transition-duration': '350ms',
      'overflow': 'hidden',
      'opacity': 0
    };

    originAppend(self, wrapper);
    atts.vScrollbarWrapper = wrapper;

		// Create the scrollbar indicator
		bar = $('div');

		if (!self.scrollbarClass) {

      var fine = false;
      if (ts.env.ios && ts.env.ios_version >= 8.2 && ts.env.ios_version < 10) {
        fine = true;
      }
            
      bar.style = {
        'position': 'absolute',
        'z-index' : '100', 
        'background': 'rgba(0,0,0,0.35)',
        'border': fine ? '0.5px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.3)',
        'background-clip': 'padding-box',
        'box-sizing': 'border-box',
        'border-radius': '4px',
        'width': '100%'
      };
		}

    bar.style = {
      //'transform-style': 'preserve-3d', 
      //'backface-visibility': 'hidden',
      'pointer-events': 'none',
      'transform': 'translate(0,0)'
    };

    bar.appendTo(wrapper);
    atts.vScrollbarIndicator = bar;
	}
	
	var vScrollbarSize = wrapper.dom.clientHeight;

	atts.vScrollbarIndicatorSize = 
    math.max(math.round(math.pow(vScrollbarSize, 2) / atts.scrollerH), 10);
  
	atts.vScrollbarMaxScroll = vScrollbarSize - atts.vScrollbarIndicatorSize;
	atts.vScrollbarProp = atts.vScrollbarMaxScroll / atts.maxScrollY;
	// Reset position
	_vScrollbarPos(self);
}

function _hScrollbarPos(self) {
  
  var atts = self._atts;
  
  if (!atts.hScrollbar) 
    return;
  
  var bar = atts.hScrollbarIndicator;
  var pos = atts.x * atts.hScrollbarProp;
  var size = atts.hScrollbarIndicatorSize;

	if (pos < 0) {
	  
		size = atts.hScrollbarIndicatorSize + math.round(pos * 3);
		
		if (size < 10)
      size = 10;
		pos = 0;
	}
  else if (pos > atts.hScrollbarMaxScroll) {

		size = atts.hScrollbarIndicatorSize - math.round((pos - atts.hScrollbarMaxScroll) * 3);
      
		if (size < 10) {
      size = 10;
		}
		pos = atts.hScrollbarMaxScroll + atts.hScrollbarIndicatorSize - size;
	}
	
  atts.hScrollbarWrapper.style = { 'transition-delay': '0', 'opacity': '1' };
  bar.style = {
    width: size + 'px',
    transform: 'translate(' + pos + 'px,0)'
  }; 
}

function _vScrollbarPos(self) {
    
  var atts = self._atts;
  
  if (!atts.vScrollbar)
    return;
  
  var bar = atts.vScrollbarIndicator;
  var pos = atts.y * atts.vScrollbarProp;
  var size = atts.vScrollbarIndicatorSize;

	if (pos < 0) {
	  
		size = atts.vScrollbarIndicatorSize + math.round(pos * 3);
		
		if (size < 10)
      size = 10;
		pos = 0;
	}
  else if (pos > atts.vScrollbarMaxScroll) {

		size = atts.vScrollbarIndicatorSize - math.round((pos - atts.vScrollbarMaxScroll) * 3);
      
		if (size < 10) {
      size = 10;
		}
		pos = atts.vScrollbarMaxScroll + atts.vScrollbarIndicatorSize - size;
	}
	
  atts.vScrollbarWrapper.style = { 'transition-delay': '0', 'opacity': '1' };
  bar.style = {
    height: size + 'px',
    transform: 'translate(0,' + pos + 'px)'
  }; 
}

function _pos(self, x, y, scale){
  
  var atts = self._atts;

  x = atts.hScroll ? x : 0;
  y = atts.vScroll ? y : 0;

  self.scroller.css(
    'transform', 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')');

  var pos = atts.x != x || atts.y != y;
  atts.x = x;
  atts.y = y;

  if(scale != self.scale){
    self.scale = scale;
    self.onzoom.notice();
  }

  if(pos){
    self.onscroll.notice();   
  }

	_hScrollbarPos(self);
	_vScrollbarPos(self);
}

function resetData(self, x, y, scale){

  var atts = self._atts;
  var resetScale = 
      math.min(math.max(self.zoomMin, scale), self.zoomMax);

  var scrollerW = self.idom.offsetWidth * resetScale;
  var scrollerH = self.idom.offsetHeight * resetScale;
  var maxScrollX = atts.wrapperW - scrollerW;
  var maxScrollY = atts.wrapperH - scrollerH;

  var resetX = x >= 0 ? 0 : x < maxScrollX ? maxScrollX : x;
	var resetY = y >= 0 ? 0 : y < maxScrollY ? maxScrollY : y;

  return { 
    x: math.round(resetX), 
    y: math.round(resetY), 
    scale: resetScale,
    maxScrollX: maxScrollX,
    maxScrollY: maxScrollY,
  };
}

function _startAni(self) {

  var atts = self._atts;

  if (atts.animating) 
    return;

  var startX = atts.x; 
  var startY = atts.y;
  var startScale = self.scale;
	var startTime = Date.now();
	var step;
  var y;

	if (!atts.steps.length) {
		_resetPos(self, 300, 'ease-in-out');
		return;
	}

	step = atts.steps.shift();
  atts.curstep = step;
	
	if (step.x == startX && step.y == startY) 
    step.time = 0;
        
  if(step.scale != self.scale){
    atts.zoomed = true;
  }

	atts.animating = true;
	atts.moved = true;
  
  function nextFrameBack(){
      
    var now = Date.now();
		var newX;
		var newY;
		var newScale;
  
  	if (now >= startTime + step.time) {
  
  		_pos(self, step.x, step.y, step.scale);
  		atts.animating = false;
      atts.curstep = null;
  
  		_startAni(self);
  		return;
  	}
  
    if(step.curve == 'ease-in-out'){ //ease-in
      y = easeInOut.solve((now - startTime) / step.time, 0.04);
    }
    else{ //ease-out
      now = (now - startTime) / step.time - 1;
      y = math.sqrt(1 - now * now);
    }
  
  	newX = (step.x - startX) * y + startX;
  	newY = (step.y - startY) * y + startY;
    newScale = (step.scale - startScale) * y + startScale;
  	_pos(self, newX, newY, newScale);
  
  	if (atts.animating)
      atts.aniTime = nextFrame(nextFrameBack);
  }
  
  nextFrameBack();
}

//--------------------

function scrollTo(self, x, y, time, scale, curve){

  var steps = x, i, l;
  var atts = self._atts;

  stopScroll(self);

	if (!steps.length) {
    steps = [{ x: x, y: y, time: time, curve: curve, scale: scale }];
	}

	for (i=0, l = steps.length; i < l; i++) {
    var step = steps[i];

    step.time = step.time || 0;
    step.scale = step.scale || self.scale;
    step.curve = step.curve || 'ease-out';
    atts.steps.push(step);
	}

	_startAni(self);
}

function stopScroll(self) {
    
  var atts = self._atts;

  if(atts.animating){
    
    cancelFrame(atts.aniTime);
    atts.steps = [];
    atts.moved = false;
    atts.animating = false;
    atts.zoomed = false;
  }
}

function _resetPos(self, time, curve) {

  var atts = self._atts;
  var data = resetData(self, atts.x, atts.y, self.scale);
  var catchX = self.catchX;
  var catchY = self.catchY;
  
  //捕获位置
  var x = math.round(data.x / catchX) * catchX;
  if(x < data.maxScrollX){
    x += catchX;
  }
  var y = math.round(data.y / catchY) * catchY;
  if(y < data.maxScrollY){
    y += catchY;
  }
    
	if (x == atts.x && y == atts.y && data.scale == self.scale) {

    atts.moved = false;

    if(atts.zoomed){
      atts.zoomed = false;
      checkDOMChanges(self);
    }

    var style = { 'transition-delay': '50ms', 'opacity': '0' };

		if (atts.hScrollbar) {
      atts.hScrollbarWrapper.style = style;
		}

		if (atts.vScrollbar) {
      atts.vScrollbarWrapper.style = style;
		}

		return;
	}

	scrollTo(self, x, y, time, data.scale, curve);
}

function refresh(self) {
  
  var offset,
	    i, l,
	    els,
	    pos = 0,
	    page = 0;
  var atts = self._atts;

	if (self.scale < self.zoomMin) {
    self.scale = self.zoomMin;
	}

	atts.wrapperW = self.dom.clientWidth || 1;
	atts.wrapperH = self.dom.clientHeight || 1;
    
	atts.scrollerW = self.scrollWidth;
	atts.scrollerH = self.scrollHeight;
    
	atts.maxScrollX = atts.wrapperW - atts.scrollerW;
	atts.maxScrollY = atts.wrapperH - atts.scrollerH;
	atts.dirX = 0;
	atts.dirY = 0;

	atts.hScroll = self.hScroll && atts.maxScrollX < 0;
	atts.vScroll = 
    self.vScroll && 
    (!self.bounceLock && !atts.hScroll || 
    atts.scrollerH > atts.wrapperH);

	atts.hScrollbar = atts.hScroll && self.hScrollbar;
	atts.vScrollbar = 
    atts.vScroll && self.vScrollbar && atts.scrollerH > atts.wrapperH;

	offset = _offset(self, self.dom);
	atts.wrapperOffsetLeft = -offset.left;
	atts.wrapperOffsetTop = -offset.top;

	// Prepare the scrollbars
	_hScrollbar(self);
	_vScrollbar(self);

	_resetPos(self, 300);
}

function _wheel(self, e) {

  var	wheelDeltaX; 
  var wheelDeltaY;
	var	deltaX;
  var deltaY;
	var deltaScale;
  var atts = self._atts;

	if ('wheelDeltaX' in e) {
		wheelDeltaX = e.wheelDeltaX / 12 * 4;
		wheelDeltaY = e.wheelDeltaY / 12 * 4;
	} 
  else if('wheelDelta' in e) {
		wheelDeltaX = wheelDeltaY = e.wheelDelta / 12 * 4;
	} 
  else if ('detail' in e) {
    var val = -e.detail * 3 * 4;

    if(e.shiftKey){
      wheelDeltaX = val;
      wheelDeltaY = 0;
    }
    else{
      wheelDeltaX = 0;
      wheelDeltaY = val;
    }
	} 
  else {
		return;
	}
    
  if(self.wheelReverse){
    var x = wheelDeltaX;
    wheelDeltaX = wheelDeltaY;
    wheelDeltaY = x;
  }
  
  var curstep = atts.curstep;

	if (self.wheelAction == 'zoom') {
  
  	deltaScale = 
      (curstep ? curstep.scale: self.scale) * 
      math.pow(2, 1/2 * (wheelDeltaY ? wheelDeltaY / math.abs(wheelDeltaY) : 0));
  
  	if (deltaScale != self.scale) {
      centerZoom(self, deltaScale, 200);
  	}
  
  	return;
	}

  deltaX = (curstep ? curstep.x: atts.x) + wheelDeltaX;
  deltaY = (curstep ? curstep.y: atts.y) + wheelDeltaY;
  set(self, deltaX, deltaY, null, 200);
}

//------------------------

function _start(self, e) {

  var atts = self._atts;
  if (!atts.enabled)
    return;
    
  var	point = hasTouch ? e.touches[0] : e;
	var	matrix, x, y;
	var	c1, c2;

	atts.moved = false;
	atts.distX = 0;
	atts.distY = 0;
	atts.absDistX = 0;
	atts.absDistY = 0;
	atts.dirX = 0;
	atts.dirY = 0;

	// Gesture start
	if (self.isZoom && hasTouch && e.touches.length > 1) { //缩放

    c1 = e.touches[0].pageX - e.touches[1].pageX;
		c2 = e.touches[0].pageY - e.touches[1].pageY;
		atts.touchesDistStart = math.sqrt(c1 * c1 + c2 * c2);

    atts.startScale = self.scale;
		atts.originX = 
      math.abs(e.touches[0].pageX + e.touches[1].pageX - atts.wrapperOffsetLeft * 2) / 
      2 - atts.x;
		atts.originY = 
      math.abs(e.touches[0].pageY + e.touches[1].pageY - atts.wrapperOffsetTop * 2) / 
      2 - atts.y;
	}
    
  if(!atts.zoomed || hasTouch && e.touches.length > 1)
    stopScroll(self); //停止动画

	atts.absStartX = atts.x;	// Needed by snap threshold
	atts.absStartY = atts.y;

	atts.startX = atts.x;
	atts.startY = atts.y;
	atts.pointX = point.pageX;
	atts.pointY = point.pageY;

	atts.startTime = e.timeStamp || Date.now();

  //绑定事件
  _bind(self, MOVE_EVENT, tesla.env.mobile ? self.dom: global);
	_bind(self, END_EVENT, global);
	_bind(self, CANCEL_EVENT, global);
}

function _move(self, e) {

	var atts = self._atts;
	var	point = hasTouch ? e.touches[0] : e;
	var deltaX = point.pageX - atts.pointX;
	var deltaY = point.pageY - atts.pointY;
	var newX = atts.x + deltaX;
	var newY = atts.y + deltaY;
	var c1;
  var c2; 
  var scale;
	var timestamp = e.timeStamp || Date.now();

	// Zoom
	if (self.isZoom && hasTouch && e.touches.length > 1) {

		c1 = e.touches[0].pageX - e.touches[1].pageX;
		c2 = e.touches[0].pageY - e.touches[1].pageY;
		atts.touchesDist = math.sqrt(c1 * c1 + c2 * c2);

		atts.zoomed = true;
    atts.touchZoomed = true;

		scale = 1 / atts.touchesDistStart * atts.touchesDist * atts.startScale;

		if (scale < self.zoomMin) 
      scale = 0.5 * self.zoomMin * math.pow(2.0, scale / self.zoomMin);

		else if (scale > self.zoomMax) 
      scale = 2.0 * self.zoomMax * math.pow(0.5, self.zoomMax / scale);

		atts.lastScale = scale / atts.startScale;

		newX = atts.originX - atts.originX * atts.lastScale + atts.startX,
		newY = atts.originY - atts.originY * atts.lastScale + atts.startY;

    _pos(self, newX, newY, scale);
		return;
	}

  if(atts.zoomed){ //正在缩放
    return;
  }

	atts.pointX = point.pageX;
	atts.pointY = point.pageY;

	// Slow down if outside of the boundaries
	if (newX > 0 || newX < atts.maxScrollX) {
		newX = 
      self.bounce ? 
      atts.x + (deltaX / 2) : 
      newX >= 0 || atts.maxScrollX >= 0 ? 0 : atts.maxScrollX;
	}
	if (newY > 0 || newY < atts.maxScrollY) {
		newY =
      self.bounce ? 
      atts.y + (deltaY / 2) : 
      newY >= 0 || atts.maxScrollY >= 0 ? 0 : atts.maxScrollY;
	}

	atts.distX += deltaX;
	atts.distY += deltaY;
	atts.absDistX = math.abs(atts.distX);
	atts.absDistY = math.abs(atts.distY);

	if (atts.absDistX < 6 && atts.absDistY < 6) {
		return;
	}

	// Lock direction
	if (self.lockDirection) {
    
    if(atts.lockY){
		  newY = atts.y;
	    deltaY = 0;
    }
    else if(atts.lockX){
  		newX = atts.x;
  	  deltaX = 0;       
    }
    else if (atts.absDistX > atts.absDistY + 5) {
    	newY = atts.y;
    	deltaY = 0;
      if(self.lockDirection == 2){
        atts.lockY = true;
      }
    }
    else if (atts.absDistY > atts.absDistX + 5) {
    	newX = atts.x;
    	deltaX = 0;
      if(self.lockDirection == 2){
        atts.lockX = true;
      }
		}
	}

	atts.moved = true;
	atts.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
	atts.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

	if (timestamp - atts.startTime > 300) {
		atts.startTime = timestamp;
		atts.startX = atts.x;
		atts.startY = atts.y;
	}
    
  _pos(self, newX, newY, self.scale);
}

//--------------

function _end(self, e) {

	if (hasTouch && e.touches.length !== 0) 
    return;

  var atts = self._atts;
	var	point = hasTouch ? e.changedTouches[0] : e;
	var target;
  var ev;
	var momentumX = { dist: 0, time: 0 };
	var momentumY = { dist: 0, time: 0 };
	var duration = (e.timeStamp || Date.now()) - atts.startTime;
	var newPosX = atts.x;
	var newPosY = atts.y;
	var distX;
  var distY;
	var newDuration;
	var snap;
	var scale;

    //解绑事件
	_unbind(self, MOVE_EVENT, tesla.env.mobile ? self.dom: global);
	_unbind(self, END_EVENT, global);
	_unbind(self, CANCEL_EVENT, global);
  atts.lockX = false;
  atts.lockY = false;

	if (atts.touchZoomed) {
        
    atts.touchZoomed = false;

		scale = atts.startScale * atts.lastScale;
		scale = math.max(self.zoomMin, scale);
		scale = math.min(self.zoomMax, scale);
		atts.lastScale = scale / atts.startScale;

		var x = atts.originX - atts.originX * atts.lastScale + atts.startX;
    var y = atts.originY - atts.originY * atts.lastScale + atts.startY;

    scrollTo(self, x, y, 200, scale);
        
		return;
	}

  //没有滚动,双击缩放
  if (!atts.moved) {
  
    if (self.isZoom) {
            
  		if (atts.doubleTapTimer) {
  			// Double tapped
        clearTimeout(atts.doubleTapTimer);
  			atts.doubleTapTimer = null;
        centerZoom(self, self.scale == 1 ? self.doubleTapZoom : 1, 200);
  		}
      else{
        atts.doubleTapTimer = setTimeout(function () {
          atts.doubleTapTimer = null;
        }, 250);
      }
  	}
        
    if(!atts.zoomed)
      _resetPos(self, 200);
		return;
	}

    //计算惯性
	if (duration < 300) {

    if(self.momentum){
  
  		momentumX = 
        newPosX ? 
        _momentum(self,
          newPosX - atts.startX, duration, -atts.x, 
          atts.scrollerW - atts.wrapperW + atts.x, 
          self.bounce ? atts.wrapperW / 2 : 0
        ) : 
        momentumX;
  
  		momentumY = 
        newPosY ? 
        _momentum(self, 
          newPosY - atts.startY, duration, -atts.y, 
          atts.scrollerH - atts.wrapperH + atts.y, 
          self.bounce ? atts.wrapperH / 2 : 0
        ) : 
        momentumY;
  
  		newPosX = atts.x + momentumX.dist;
  		newPosY = atts.y + momentumY.dist;
  
  		if ((atts.x > 0 && newPosX > 0) || 
        (atts.x < atts.maxScrollX && newPosX < atts.maxScrollX)){
        momentumX = { dist: 0, time: 0 };
      }

  		if ((atts.y > 0 && newPosY > 0) || 
        (atts.y < atts.maxScrollY && newPosY < atts.maxScrollY)) {
          momentumY = { dist: 0, time: 0 };
      }
    }
    
    //捕获位置   
    newPosX = math.round(newPosX);
    newPosY = math.round(newPosY);
    
    var catchX = self.catchX;
    var catchY = self.catchY;
    var modX = newPosX % catchX;
    var modY = newPosY % catchY;

    if(newPosX < 0 && newPosX > atts.maxScrollX && modX !== 0){

      if(atts.x - atts.startX < 0){
        distX = catchX + modX;
      }
      else{
        distX = modX;
      }
      newPosX -= distX;
      momentumX.time = 
      math.max(momentumX.time, math.min(math.abs(distX) * 10, 300));
    }

    if(newPosY < 0 && newPosY > atts.maxScrollY && modY !== 0){
        
      if(atts.y - atts.startY < 0){
        distY = catchY + modY;
      }
      else{
        distY = modY;
      }
      newPosY -= distY;
      momentumY.time = 
      math.max(momentumY.time, math.min(math.abs(distY) * 10, 300));
    }
	}

  //****************************************************************

	if (momentumX.time || momentumY.time) {
		newDuration = math.max(math.max(momentumX.time, momentumY.time), 10);
		scrollTo(self, newPosX, newPosY, newDuration);
		return;
	}
	
	_resetPos(self, 200);
}

function set(self, x, y, scale, time){

  if(self._atts.zoomed){
    return;
  }

  stopScroll(self);
  checkDOMChanges(self);

  var data = resetData(self, x, y, scale || self.scale);
  scrollTo(self, data.x, data.y, time, data.scale);
}

function centerZoom(self, scale, time){

  var atts = self._atts;
  var width = self.viewWidth;
  var height = self.viewHeight;

  var centerX = -atts.x + width / 2;
  var centerY = -atts.y + height / 2;

  //TODO ?
  var data = resetData(self, 0, 0, scale);
  var changScale = data.scale / self.scale;

  var changWidth = centerX * changScale;
  var changHeight = centerY * changScale;

  var x = math.round(atts.x - (changWidth - centerX));
  var y = math.round(atts.y - (changHeight - centerY));

  set(self, x, y, scale, time);
}

$class('tesla.gui.ScrollView', tesla.gui.Control, {

  //private attributes
  _atts: null,

  //public:
  /**
   * 只读
   * @type {tesla.gui.Node}
   */
  scroller: null,

  /**
   * @type {Number}
   */
  scale: 1,

  /**
   * 滑动摩擦力
   * @type {Number}
   */
  friction: 1,

  /**
   * X轴捕捉尺寸,为0时自动为视口宽度
   * @type {Number}
   */
  get catchX(){
    return this._atts.catchX || this.dom.clientWidth;
  },

  /**
   * Y轴捕捉尺寸,为0时自动为视口高度
   * @type {Number}
   */
  get catchY(){
    return this._atts.catchY || this.dom.clientHeight;
  },

  set catchX(val){
    this._atts.catchX = val;
  },

  set catchY(val){
    this._atts.catchY = val;
  },
    
  /**
   * 是否使用水平滚动
   * @type {Boolean}
   */
	hScroll: true,
    
  /**
   * 是否使用垂直滚动
   * @type {Boolean}
   */
	vScroll: true,

  /**
   * 是否使用回弹
   * @type {Boolean}
   */
	bounce: true,
    
  /**
   * 是否锁定回弹
   * @type {Boolean}
   */
	bounceLock: true,
    
  /**
   * 是否使用惯性
   * @type {Boolean}
   */
  momentum: true,
    
  /**
   * 是否滚动锁定方向 0|1|2
   * 0 不锁定方向
   * 1 锁定方向
   * 2 完全锁定方向
   * @type {Number}
   */
	lockDirection: 1,

  /**
   * 是否显示水平滚动条
   * @type {Boolean}
   */
	hScrollbar: true,

  /**
   * 是否显示垂直滚动条
   * @type {Boolean}
   */
	vScrollbar: true,

  /**
   * 滚动条 class name
   * @type {String}
   */
	scrollbarClass: '',

  /**
   * 是否使用缩放
   * @type {Boolean}
   */
  isZoom: false,

  /**
   * 最小缩放限制
   * @type {Number}
   */
	zoomMin: 1,

  /**
   * 最大缩放限制
   * @type {Number}
   */
	zoomMax: 4,

  /**
   * 鼠标双击缩放尺寸
   * @type {Number}
   */
	doubleTapZoom: 2,
    
  /**
   * 鼠标滚轮使用的动作  scroll | zoom
   * @type {String}
   */
	wheelAction: 'scroll',
    
  /**
   * 逆转鼠标滚轮
   * @type {Boolean}
   */
  wheelReverse: false,

	// Events
  /**
   * @event onscroll
   */
  onscroll: null,

  /**
   * @event onzoom
   */
	onzoom: null,

  /**
   * @constructor
   */
  ScrollView: function(){

    this.Control('div');
    tesla.EventDelegate.init_events(this, 'scroll', 'zoom');

    this.scroller = $('div');
    this.idom = this.scroller.dom;
    this._atts = {
      idom: this.idom,
      enabled: true,
      steps: [],
      x: 0,
      y: 0,
      currPageX: 0,
      currPageY: 0,
      pagesX: [], 
      pagesY: [],
      aniTime: null,
      wheelZoomCount: 0,
      sliceWidth: 0,
      sliceHeight: 0,
      catchX: 1,
      catchY: 1,
      scale: 1,
    };

    this.style = { 'position': 'relative', 'overflow': 'hidden' };
    originAppend(this, this.scroller);

    if(tesla.env.ios){ 
      if(ts.env.ios_version < 6){
        //修复ios系统触控中闪跳BUG
        originAppend(this, $('<div class="te_ani_test"/>'));
      }
      this.scroller.addClass('te_ios5_down_3d');
    }
    else if(tesla.env.androis){
      this.scroller.addClass('te_android_3d');
    }
    
    // Set some default styles
    this.scroller.style = {
      //'transform-style': 'preserve-3d', 
      // 'position': 'absolute',
      'position': 'relative',
      'display': 'inline-block',
      'transform-origin': '0 0',
      'min-width': '100%',
      'min-height': '100%'
    };
    this.onloadview.$on(init);
  },

	handleEvent: function(e){

		switch(e.type) {
			case START_EVENT:

				if (!hasTouch && e.button !== 0) 
          return;

        if(START_EVENT == 'mousedown'){
    
          var id = tesla.sysid();
          
          html.on('dragstart', function(evt){
            evt.return_value = false;
          }, null, id);

          html.once('mouseup', function(evt){
            html.off('dragstart', id);
          });
        }

				_start(this, e);
				break;

			case MOVE_EVENT: 
        // TODO ?
        if(MOVE_EVENT == 'touchmove') 
            e.preventDefault();
        _move(this, e);
        break;
			case END_EVENT:
			case CANCEL_EVENT: _end(this, e); break;
			case RESIZE_EVENT: _resize(this); break;
			case 'DOMMouseScroll': 
      case 'mousewheel': 
        _wheel(this, e);
        break;
		}
	},

  /**
   * 是否启用滚动 (默认为启用)
   * @type {Boolean}
   */
	get enabled(){
    return this._atts.enabled;
	},

  set enabled(value){
    if(value){
      this._atts.enabled = true;
    }
    else{
      stopScroll(this);
      _resetPos(this, 0);
      this._atts.enabled = false;

      // If disabled after touchstart we make sure cthis there are no left over events
      _unbind(this, MOVE_EVENT, global);
      _unbind(this, END_EVENT, global);
      _unbind(this, CANCEL_EVENT, global);
    }
  },

  /**
   * 设置滚动的参数
   * @param {Number} x        x轴
   * @param {Number} y        y轴
   * @param {Number} scale    缩放
   * @param {Number} time     到目标参数的动画时间，默认为没有动画为零
   */
  set: function(x, y, scale, time){
    set(this, -x, -y, scale, time);
  },

  /**
   * 设置滚动位置
   * @param {Number} x    x轴
   * @param {Number} y    y轴
   */
  scrollTo: function(x, y){
    var atts = this._atts;
    var d = math.sqrt(math.pow(atts.x - x, 2) + math.pow(atts.y - y, 2));
    set(this, -x, -y, null, d < 400 ? 200: 0);
	},
    
  /**
   * 设置内容缩放比例
   * @param {Number} scale
   */
	zoom: function(scale){
    centerZoom(this, scale, math.abs(this.scale - scale) > 1.2 ? 0: 200);
	},

  //---------

  /**
  * 获取与设置水平滚动条,设置值会返回自身
  * @return {Number}
  */
  get scrollLeft() {
    return -this._atts.x;
  },

  /**
   * 设置水平滚动位置
   * @param {Number} x 要设置的值
   */
  set scrollLeft(x){
    this.scrollTo(x, -this._atts.y);
  },

  /**
   * 获取垂直滚动位置
   * @return {Number}
   */
  get scrollTop() {
    return -this._atts.y;
  },

  /**
   * 设置垂直滚动位置
   * @param {Number} val 要设置的值
   */
  set scrollTop(y){
    this.scrollTo(-this._atts.x, y);
  },

  /**
   * 获取滚动宽度
   * @return {Number}
   */
  get scrollWidth() {
    return math.round(this.idom.offsetWidth * this.scale);
  },

  /**
   *获取滚动高度
   * @return {Number}
   */
  get scrollHeight() {
    return math.round(this.idom.offsetHeight * this.scale);
  },
    
  /**
   * 视图宽度
   * @type {Number}
   */
  get viewWidth(){
    return this.dom.clientWidth;
  },

  /**
   * 视图高度
   * @type {Number}
   */
  get viewHeight(){
    return this.dom.clientHeight;
  },

  //重写
  set html(val){
    set_html.call(this, val);
    checkDOMChanges(this);
  },

  //重写
  set text(val){
    set_text.call(this, val);
    checkDOMChanges(this);
  },

  //重写
  empty: function(){
    empty.call(this);
    checkDOMChanges(this);
  }
});

global.ScrollView = tesla.gui.ScrollView;
