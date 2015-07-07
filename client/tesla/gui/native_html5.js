/**
 * @createTime 2015-06-26
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/event_delegate.js');
include('tesla/url.js');
include('tesla/gui/resources.js');
include('tesla/gui/root.js');

//static private:
var url = tesla.gui.url;
var Control = tesla.gui.Control;
var resources = tesla.gui.resources;
var EventDelegate = tesla.EventDelegate;
var Control_view = tesla.gui.Control.view;
var vxviews = ts.vx.views;
var Node_remove = tesla.gui.Node.members.remove;
var Control_loadView = tesla.gui.Control.members.loadView;

var current_web_panel = null;

global.__nh5__ = {
  
  get current_web_panel(){
    return current_web_panel;
  },
  
  callback: function(cb_id, error, data) {
    if (global.webkit && global.webkit.messageHandlers) { // ios8 新webview
      global.webkit.messageHandlers.callback_handle
        .postMessage({ cb_id: cb_id, error: error, data: data });
    } else {
      
    }
  },
  
  call_net_service: function(name, args, cb) {
    // 
  },
};

function get_module_name(name) {

	var names = name.split('.');
	var mod_name = names.join('/') + '.js';
	var mod = ts.modules[mod_name];
	if (mod) {
		return { module: mod, name: mod_name };
	}
	
	names.push(names.pop().replace(/([A-Z][a-z])/, '_$1').replace(/^_/, '').toLowerCase());
	mod_name = names.join('/') + '.js';
	mod = ts.modules[mod_name];
	if (mod) {
		return { module: mod, name: mod_name };
	}
  
	names.pop();
	mod_name = names.join('/') + '.js';
	mod = ts.modules[mod_name];
	if (mod) {
		return { module: mod, name: mod_name };
	}
  return null;
}

//安装模块
function _insmod(name, cb) {
  
  function load(){
    if(resources.progress == 1){
      next_tick(cb);
    } else {
      resources.onload.once(cb);
    }
  }
  
	var mod = get_module_name(name);
	if(!mod || mod.module.loaded) {
		return load();
	}
	
  //使用场景包
  insmod(mod.name, function(err) {
    
    if (!err) {
      var klass = ts.get(name);
      if (!klass)
        err = name + ',undefined';
    }
    
    if(err){
      console.error(err);
      return throw_err(err, cb);
    }
    load();
  });
}

next_tick(function(){
  
  var name = ts.url.get_hash('nh5_web_panel');
  if (name) { // 创建容器
  
    name = decodeURIComponent(name);
    var args = ts.url.get_hash('nh5_web_panel_args');
    if (args) {
      args =JSON.parse(decodeURIComponent(args));
    }
    
    _insmod(name, function(err) {
      
      if (err) {
        throw err;
      }
      
      var klass = ts.get(name);
      if (!klass) {
        throw new Error(name + ', undefined, Type error');
      }
      
      var panel = new klass();
      panel.args = args;
  	  var view = panel.view || klass.fullName;
  
      if (resources.progress == 1) {
        panel.loadView(view);
      }
      else {
        resources.onload.once(panel.loadView.bind(panel, view));
      }
    });
  }
});

//var native_service_call = 
(function () {
  
  'use strict';
  
  var XHR = typeof window == 'object' ? XMLHttpRequest : null;
  
  function ios_old_call(data) {
    
    if (!XHR) throw 'not supported';
    
    var xhr = new XHR();
    
    xhr.open('POST', 'http://127.0.0.1/__nh5_call_native__/', false);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(encodeURIComponent(JSON.stringify(data)));
    
    if (status == 200) { //
      return JSON.parse(xhr.responseText);
    } else {
      throw 'Call error: ' + xhr.responseText;
    }
  }
  
  function ios_new_call(data){
    return JSON.parse(prompt( '__nh5_service_call__' + JSON.stringify(data)));
  }
  
  function android_call(data) {
    // TODO ?
  }
  
  if (ts.env.ios) {
    if (global.webkit && global.webkit.messageHandlers) { // ios8 new webview (wkwebview)
      return ios_new_call;
    } else {
      return ios_old_call;
    }
  } else if(ts.env.android)  {
    return android_call;
  } else {
    return function (){ };
  }
})();

// 
ts.gui.nh5 = {
  
  /**
    * 调用native share service
    */
  call: function(name, args) {
    return native_service_call({ name: name, args: args, is_global: 'yes' });
  },
  
  /**
    * 创建native容器
    */
  new_native_panel: function(public_name, args) {
    return ts.gui.nh5.call('nh5_util_service.new_native_panel', args);
  },
  
};

/**
  * @class tesla.gui.NH5WebPanel
  * @extends tesla.gui.Control
  */
$class('tesla.gui.NH5WebPanel', tesla.gui.Control, {
  
  /**
   * @event onbefore_loadview
   */
  onbefore_loadview: null,
  
  /**
   * @event onunload
   */
  onunload: null,
  
  /**
    * 从上一个页发送过来的参数
    */
  args: null,
  
  /**
    * @constructor
    */
  NH5WebPanel: function(tag) {
    if (current_web_panel) { // 一个网页只能创建一个实例
      throw Error('error');
    }
    current_web_panel = this;
    
    var view = vxviews[this.view || this.constructor.fullName];
    this.Control(tag || view && view.tagName);
    this.onbefore_loadview = new EventDelegate('before_loadview', this);
    this.onunload = new EventDelegate('unload', this);
    // 
    this.style = {
      width: '100%',
      height: '100%',
    };
    ts.gui.root.share().append(this);
  },
  
  /**
    * 准备数据模型
    * 默认为一个空对像,子类重写这个函数
    */
  ready_model: function(cb) {
    cb(null, { }); 
  },
  
  //重写
	loadView: function(view) {
    if (this.onbefore_loadview.notice()) {
      this.call('onbefore_loadview_notice');
      var self = this;
      this.ready_model(function(err, model) {
        if (err) {
          throw err;
        }
        self.model = model;
        self.empty(); // 载入前先清空
        Control_loadView.call(self, view);
        self.call('onloadview_notice');
      });
    }
	},
	
  /**
   * 复位当前模块
   */
  reset: function() {
    this.empty();
    var view = Control_view(this.view || this.constructor.fullName);
    this.loadView(view);
  },
  
  /**
    * 向native容器发送调用请求
    */
  call: function (name, args) {
    return native_service_call({ name: name, args: args, is_global: 'no' });
  },
  
  // Navigation
  nav_go: function(name, args) {
    this.call('nav_go', [name, args, true]);
  },
  
  /**
    * 只有被Navigation包裹才会有这个api
    */
  nav_back: function() {
    this.call('nav_back', [true]);
  },
  
}, {
  
  share: function () {
    return current_web_panel;
  }
});
