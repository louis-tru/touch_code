/**
 * @createTime 2011-09-29
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis chu
 */
'use strict';

include('tesla/util.js');

var Event =

/**
 * 事件数据
 */
$class('Event', {
	
	//private:
	m_data: null,
	m_delegate: null,
	//public:
	return_value: true,
	
	/**
	 * 类型
	 */
	get type(){
		return this.m_delegate.type;
	},
	
	/**
	 * 事件数据
	 */
	get data(){
		return this.m_data;
	},
	
	/**
	 * 发送者
	 */
	get sender(){
		return this.m_delegate.sender;
	},
	
	get delegate(){
		return this.m_delegate;
	},
	
  /**
   * @constructor
   */
	Event: function(delegate){
		this.m_delegate = delegate;
	},
	
});

function add(self, original, listen, scope, name) {

  if (original) {
  	
    if(!self.m_event){
    	self.m_event = new Event(self);
    }
		
    var listens = self.m_listens || (self.m_listens = []);

  	if(typeof scope == 'string'){
  		name = scope;
  		scope = self.m_sender;
  	}
  	else{
  		scope || (scope = self.m_sender);
  		name || (name = tesla.sysid());
  	}
		
    var len = listens.length;

    if(len){

      for (var i = 0; i < len; i++) {

        var item = listens[i];

        if (item.original === original && item.scope === scope) {
          return;
        }

        if (item.name == name) {
            item.original = original;
            item.listen = listen;
            item.scope = scope;
          return;
        }
      }
    }

    listens.splice(0, 0, {
      original: original,
      listen: listen,
      scope: scope,
      name: name
    });
    
    self.m_length = listens.length;
    self.notice = notice;
  }
  else{
    throw new Error('Listener function can not be empty');
  }
}

function notice(data) {
	var listens = this.m_listens;
	var evt = this.m_event;
	evt.m_data = data; // 设置数据
	evt.return_value = true; // 重置返回值
	
	for (var i = this.m_length - 1; i > -1; i--) {
		var item = listens[i];
		item.listen.call(item.scope, evt);
	}
	return evt.return_value;
}

function empty_notice() {
  return true;
}

function notice_by_evt(self, evt) {
	if(self.notice === notice){
		var listens = self.m_listens;
		for (var i = self.m_length - 1; i > -1; i--) {
			var item = listens[i];
			item.listen.call(item.scope, evt);
		}
	}
}

function on_delegate(self, delegate) {
  add(self, delegate, function(evt){
    notice_by_evt(delegate, evt);
  }, delegate);
}

function once_delegate(self, delegate) {
  add(self, delegate, function(evt) {
    self.off(delegate, delegate);
    notice_by_evt(delegate, evt);
  }, delegate);
}

var EventDelegate = 

/**
 * @class EventDelegate
 */
$class('tesla.EventDelegate', {

  //private:
  m_type: '',
  m_sender: null,
  m_event: null,
  m_listens: null,
  m_length: 0,
  m_enable: true,
  
  //public:
  
  /**
   * 获取是否已经启用
   * @type {Boolean}
   */
  get enable() {
    return this.m_enable;
  },
	
  /**
   * 设置启用禁用
   * @type {Boolean}
   */
  set enable(value) {
    if(value){
      this.m_enable = true;
      if(this.length){
        this.notice = notice;
      }
      else{
        this.notide = empty_notice;
      }
    }
    else{
      this.m_enable = false;
      this.notice = empty_notice;
    }
  },
	
  /**
   * 事件名称
   * @type {String}
   */
  get type() {
  	return this.m_type;
  },
  
  /**
   * 事件发送者
   * @type {Object}
   */
  get sender() {
  	return this.m_sender;
  },
	
  /**
   * 添加的事件侦听数量
   * @type {Number}
   */  
  get length() {
  	return this.m_length;
  },
	
  /**
   * 事件侦听列表
   * @type {Array}
   */  
  get listens() {
  	return this.m_listens;
  },
	
  /**
   * @constructor
   * @param {String} 事件名称
   * @param {Object} 事件发起者
   */
  EventDelegate: function(type, sender) {
    this.m_type = type;
    this.m_sender = sender;
  },
  
  /**
   * 绑定一个事件侦听器(函数)
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  on: function(listen, scope, name) {
    if(listen instanceof EventDelegate){
      return on_delegate(this, listen);
    }
    add(this, listen, listen, scope, name);
  },

  /**
   * 绑定一个侦听器(函数),且只侦听一次就立即删除
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  once: function(listen, scope, name) {
    if(listen instanceof EventDelegate){
      return once_delegate(this, listen);
    }
    var self = this;
    add(this, listen, {
      call: function(scope, evt) {
        self.off(listen, scope);
        listen.call(scope, evt);
      }
    },
    scope, name);
  },

  /**
   * Bind an event listener (function),
   * and "on" the same processor of the method to add the event trigger to receive two parameters
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  $on: function(listen, scope, name) {
    if(listen instanceof EventDelegate){
      return on_delegate(this, listen);
    }
    add(this, listen, { call: listen }, scope, name);
  },
	
  /**
   * Bind an event listener (function), And to listen only once and immediately remove
   * and "on" the same processor of the method to add the event trigger to receive two parameters
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  $once: function(listen, scope, name) {
    if(listen instanceof EventDelegate){
      return once_delegate(this, listen);
    }
    var self = this;
    add(this, listen, {
      call: function(scope, evt) {
        self.off(listen, scope);
        listen(scope, evt);
      }
    },
    scope, name);
  },

  /**
   * 卸载侦听器(函数)
   * @param {Object} listen (Optional) 可以是侦听函数,也可是观察者别名,如果不传入参数卸载所有侦听器
   * @param {Object} scope  (Optional) scope
   */
  off: function(listen, scope) {
    
    var ls = this.m_listens;
    if (!ls) {
    	return;
    }
		
    if (listen) {
			
      var attr = 'original';
      
      if(listen instanceof Function){ // 要卸载是一个函数
      	
      }
      else if(listen instanceof Object){ 
      	if(listen instanceof EventDelegate){ // 卸载委托代理
      		scope = null;
      	}
      	else{ // 要卸载这个范围上所有侦听器
      		scope = listen;
      		listen = null;
      	}
      }
      else { // 卸载指定名称的侦听器
        attr = 'name';
      }
			
      for(var i = ls.length - 1; i > -1; i--){
        var item = ls[i];
        if((!listen || item[attr] === listen) && (!scope || item.scope === scope)){
          ls.splice(i, 1);
        }
      }
			
      this.m_length = this.m_listens.length;

      if (!this.m_length) {
      	this.notice = empty_notice;
      }
    }
    else {
      this.m_listens = null;
      this.m_listens = 0;
      this.notice = empty_notice;
    }
  },
	
  /**
   * 通知所有观察者
   * @method notice
   * @param  {Object} data 要发送的数据
   * @return {Object}
   */
  notice: empty_notice,
	
});

// 
function center_add(self, call, types, listen, scope, name) {
  
	if (typeof types == 'string'){
		types = [types];
	}
	for (var i = 0, type; (type = types[i]); i++) {
		var delegate = self['on' + type];
		if (!delegate){
			self['on' + type] = delegate = new EventDelegate(type, self);
		}
		delegate[call](listen, scope, name);
	}
}

var EventDelegateCenter =

/**
 * @class EventDelegateCenter
 */
$class('tesla.EventDelegateCenter', {
	
	/**
   * 添加事件监听器(函数)
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听器函数
   * @param {Object}   scope     (Optional) 重新指定侦听器函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
	on: function(types, listen, scope, name) {
		center_add(this, 'on', types, listen, scope, name);
	},
	
  /**
   * 添加事件监听器(函数),消息触发一次立即移除
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听器函数
   * @param {Object}   scope     (Optional) 重新指定侦听器函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
	once: function(types, listen, scope, name) {
		center_add(this, 'once', types, listen, scope, name);
	},

  /**
   * Bind an event listener (function),
   * and "on" the same processor of the method to add the event trigger to receive two parameters
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
	$on: function(types, listen, scope, name) {
		center_add(this, '$on', types, listen, scope, name);
	},

  /**
   * Bind an event listener (function), And to listen only once and immediately remove
   * and "on" the same processor of the method to add the event trigger to receive two parameters
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
	$once: function(types, listen, scope, name) {
		center_add(this, '$once', types, listen, scope, name);
	},

  /**
   * 卸载事件监听器(函数)
   * @param {String} type                事件名称
   * @param {Object} listen (Optional)   可以是侦听器函数值,也可是侦听器别名,如果不传入参数卸载所有侦听器
   * @param {Object} scope  (Optional) scope
   */
	off: function(type, listen, scope) {
		
		if (type instanceof Object) { // 卸载这个范围上的所有侦听器
			var all = exports.all_deletage(this);
			for(var i = 0; i < all.length; i++){
				all[i].off(type);
			}
		} else {
			var delegate = this['on' + type];
			if (delegate) {
				delegate.off(listen, scope);
			}
		}
	},
	
  /**
   * 通知所有观察者
   * @param  {Object} type      事件名称
   * @param  {Object} data      要发送的消数据
   */
	notice: function(type, data){ 
		var delegate = this['on' + type];
		if (delegate) {
			return delegate.notice(data);
		}
		return true;
	},
	
});


/**
 * init event delegate
 * @param {Object} self
 * @param {String} argus...    event name
 * @static
 */
EventDelegate.init_events = function(self){
  var args = Array.toArray(arguments);
  for (var i = 1, name; (name = args[i]); i++){
    self['on' + name] = new EventDelegate(name, self);
  }
};


/**
 * get all event delegate
 * @param {Object} self
 * @return {Array}
 * @static
 */
EventDelegate.all_delegate = function(self){
	
  var result = [];
  var reg = /^on/;
	
  for (var i in self) {
    if (reg.test(i)) {
      var de = self[i];
      if(de instanceof EventDelegate){
        result.push(de);
      }
    }
  }
  return result;
};
