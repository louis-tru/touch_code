/**
 * @class tesla.gui.Screen 屏幕管理
 * @createTime 2013-05-20
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 * @singleton
 */

'use strict';

include('tesla/event_delegate.js');
include('tesla/gui/node.js');

var size;
var getType = function (){
  var orientation = global.orientation || 0;
  var type = (orientation === 0 || orientation == 180 ? 'vertical' : 'horizontal');
  return type;
};

var setWidth = function(val){
  //TODO ?
};

if(tesla.env.mobile){
    
  //ratio = global.outerWidth / global.outerHeight;

  var viewport = tesla.gui.Node.find('meta[name=viewport]');
  if(!viewport){
    viewport = $('meta');
    viewport.attr('name', 'viewport');
    viewport.appendTo($(document.head));
  }

  setWidth = function(val){
    
    if(val < 100){ // 不能小于100像素
      //TODO ?
      return;
    }
    
    var type = getType();
    var screen = global.screen;
    
    if(size){
      
      var data = size[type];
      var initWidth = data.initWidth;
      var ratio2 = val / screen.width;
      var val2 = Math.round(screen.height * ratio2);
  
      data.width = val;
      data.height = Math.round(val / data.ratio);
      
      data = size[type == 'vertical' ? 'horizontal': 'vertical'];
      data.width = val2;
      data.width = Math.round(val2 / data.ratio);
  
      if(tesla.env.android){
         viewport.attr('content', 'target-densitydpi=' + (160 * val / initWidth) +
        ',initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no');
      }
      else if(tesla.env.ios){
        viewport.attr('content', 
            'initial-scale={0},minimum-scale={0},maximum-scale={0}'
            .format(initWidth / val));
      }
      else{
        //TODO ?
        // windows phone
      }
    }
    else if(tesla.env.android){
  
      viewport.attr('content', 
      'target-densitydpi=160,initial-scale=1,\
minimum-scale=1,maximum-scale=1,user-scalable=no');
      size = {};
      var width = global.outerWidth;
      var height = global.outerHeight;
  
      if(height < global.innerHeight / 1.5){ // 魅族UC BUG, 怎么可能小呢？
        height = global.innerHeight * width / global.innerWidth;
      }
  
      var ratio = width / height;
      var ratio2 = val / screen.width;
      var val2 = Math.round(screen.height * ratio2);
      var data = {
        ratio: ratio,
        width: val,
        height: Math.round(val / ratio)
      };
      
      size[type] = data;
  
      ratio = 
        screen.height / 
        (screen.width * height / width + screen.width - screen.height);
      var data2 = {
        ratio: ratio,
        width: val2,
        height: Math.round(val2 / ratio)
      };
      
      size[type == 'vertical' ? 'horizontal': 'vertical'] = data2;

      nextTick(function(){
  
        var initWidth = global.innerWidth;
        data.initWidth = initWidth;
        data2.initWidth = initWidth * screen.height / screen.width;
  
        viewport.attr('content', 
        'target-densitydpi=' + (160 * val / initWidth) + 
        ',initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no');
      });
    }
    else if(tesla.env.ios){
        
      // TODO ios
      viewport.attr('content', 'initial-scale=1,minimum-scale=1,maximum-scale=1');
      //var div = $('<div style="position: absolute; left: 0; top: 0; height: ' + 
      //    (global.innerHeight + 150) + 'px; width: 1px; "/>');
      
      //div.appendTo($(document.body));
      //document.body.scrollTop = 1;
      
      size = {};
      var width = global.innerWidth;
      var height = width / tesla.__screen_width__ * tesla.__screen_height__; //global.innerHeight;
      var screenWidth = type == 'vertical' ? screen.width : screen.height;
      var screenHeight = type == 'vertical' ? screen.height : screen.width;
      var ratio = width / height;
      var ratio2 = val / screenWidth;
      var val2 = Math.round(screenHeight * ratio2);
      
      delete tesla.__screen_width__;
      delete tesla.__screen_height__;
  
      size[type] = {  
        initWidth: width,
        ratio: ratio,
        width: val,
        height: Math.round(val / ratio)
      };
  
      ratio = 
        screenHeight / (screenWidth * height / width + screenWidth - screenHeight);                
      size[type == 'vertical' ? 'horizontal': 'vertical'] = {
        initWidth: width * screenHeight / screenWidth,
        ratio: ratio,
        width: val2,
        height: Math.round(val2 / ratio)
      };
      
      viewport.attr('content', 
        'initial-scale={0},minimum-scale={0},maximum-scale={0}'
        .format(width / val));
      //div.remove();
      //$('#ios_div').remove();
    }
    else{
      // windows phone
      // TODO other
    }
  };
}

var exports = null;
var timeoutid = 0;

// var m_on_orientation_change;

tesla.on(global, tesla.env.mobile ? 'orientationchange': 'resize', function(evt){
  
  exports = null;
  
  Screen.onchange.notice(Screen.size);
  
  if(ts.env.ios){
    
    if(timeoutid){
      Function.undelay(timeoutid);
    }
    
    timeoutid = (function(){
      timeoutid = 0;
      Screen.onchange.notice(Screen.size); 
    }).delay(400);
  }
});

var Screen = 

$class('tesla.gui.screen', null, {

  /**
   * 屏幕变化事件
   * @event onscreenchange
   */
  onchange: new tesla.EventDelegate('change'),

  /**
   * 
   */
  fixedScreenSize: function(width, height, orientation){
    exports = { 
      width: width, 
      height: height, 
      orientation: typeof orientation == 'number' ? orientation : global.orientation || 0 ,
    };
    Screen.onchange.notice(Screen.size);
  },

  /**
   * 
   */
  cancelFixedScreenSize: function(){
    exports = null;
    Screen.onchange.notice(Screen.size);
  },
  
  /**
   * 设置屏幕宽度
   * @param {Number} 屏幕宽度,0为自动宽度 
   */
  set width (val){
    setWidth(val);
  },

  /**
   * 获取屏幕尺寸信息,信任屏幕宽度
   * @return {Object}
   */
  get size(){

    if(exports){
      return {
        orientation: exports.orientation,
        width: exports.width,
        height: exports.height
      };
    }

    if(tesla.env.mobile && size){
      
      var data = size[getType()];
      return {
        orientation: global.orientation || 0,
        width: data.width,
        height: data.height,
      };
    }
    else{
      return {
        orientation: global.orientation || 0,
        width: global.innerWidth,
        height: global.innerHeight
      };
    }
  }
});