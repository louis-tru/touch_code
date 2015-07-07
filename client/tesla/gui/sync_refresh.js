/**
 * Sync screen refresh
 * 同步屏幕刷新
 * @class tesla.gui.SyncRefresh
 * @createTime 2013-04-10
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */
 
'use strict';

include('tesla/event_delegate.js');

var syncList = [];
var syncTime = 0;

function eachSyncList(time){
  
  SyncRefresh.onsync.notice(time);

  syncTime = time;

	for(var i = syncList.length - 1 ;i > -1; i--){
		var item = syncList[i];
		var st = item.time - syncTime;

		if(st < 8){
			syncList.splice(i, 1);
			var self = item.self;
			self.$sync = false;
			item.cb(self, st);
		}
	}
}

if(tesla.env.ios){
  setInterval(function(){
    eachSyncList(Date.now());
  }, 1000 / 60);
}
else{

  var requestAnimationFrame =
      global.requestAnimationFrame ||
      global.oRequestAnimationFrame ||
      global.msRequestAnimationFrame ||
      global.mozRequestAnimationFrame ||
      global.webkitRequestAnimationFrame;

  var mat = navigator.userAgent.match(/(Android|Adr) (\d)/);
	if(mat && mat[2] == 4){

		//修复 Android 4.x 触控后 css transform 屬性过渡动画失灵 BUG
		var num = 0;
		var div = document.createElement('div');
		document.body.appendChild(div);
		div.style.top = '-100px';
		div.style.position = 'absolute';
		div.style.fontSize = '1px';
        
    if(requestAnimationFrame){
        
      var requestFn = function(evt){
        requestAnimationFrame(requestFn);
        div.innerHTML = num++;
        eachSyncList(evt);
      };
      requestAnimationFrame(requestFn);
    }
    else{
      setInterval(function(){
        div.innerHTML = num++;
        eachSyncList(Date.now());
      }, 1000 / 60);
    }
	}
	else{
    if(requestAnimationFrame){
      
      var requestFn = function(evt){
        requestAnimationFrame(requestFn);
        eachSyncList(evt);
      };
      requestAnimationFrame(requestFn);
    }
    else{
      setInterval(function(){
        eachSyncList(Date.now());
      }, 1000 / 60);
    }
	}
}

var SyncRefresh = 

$class('tesla.gui.SyncRefresh', null, {
    
  onsync: new tesla.EventDelegate('sync'),

	/**
	 * 延时同步屏幕
	 * @param {Function} cb
	 * @param {Object}   self
	 * @param {Number}   time
	 */
	delay: function(cb, self, time){
		self.$sync = true;
		syncList.push({ self: self, cb: cb, time: syncTime + time });
	},

	/**
	 * 清除屏幕同步
	 * @param {Object} self
	 */
	clear: function(self){

		if(self.$sync){
			for(var i = syncList.length - 1 ;i > -1; i--){
				var item = syncList[i];
				if(item.self === self){
					item.$sync = false;
					syncList.splice(i, 1);
					return;
				}
			}
		}
	}
});



