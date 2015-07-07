/**
 * @createTime 2011-09-29
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

//'use strict';

function add(self, original, listen, scope, name) {

  if (original) {

    self._event || (self._event = {
        sender: self.sender,
        type: self.type,
        returnValue: true,
        delegate: self
    });

    var listens = self.listens || (self.listens = []);

    if(typeof scope == 'string'){
      name = scope;
      scope = self._event.sender;
    }
    else{
      scope || (scope = self._event.sender);
      name || (name = tesla.guid());
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

    self.length = listens.length;
    self.emit = emit;
  }
  else{
    throw new Error('Listener function can not be empty');
  }
}

function emit(data) {

  var listens = this.listens;
  var event = this._event;
  event.data = data;
  event.returnValue = true;

  for (var i = this.length - 1; i > -1; i--) {
    var item = listens[i];
    item.listen.call(item.scope, event);
  }
  return event.returnValue;
}

function empty_emit() {
  return true;
}

function on_delegate(self, delegate){
  add(self, delegate, function(evt){
    evt.returnValue = delegate.notice(evt.data);
  }, delegate);
}

function once_delegate(self, delegate){
  add(self, delegate, function(evt){
    self.off(delegate, delegate);
    evt.returnValue = delegate.notice(evt.data);
  }, delegate);
}

/**
 * @class tesla.Delegate event delegate
 */
var Delegate = Class('tesla.Delegate', {

  //private:
  _event: null,
  
  /**
   * 是否已经启用
   * @private
   */
  _enable: true,

  //public:
  /**
   * 事件侦听列表
   * @type {Array}
   */
  listens: null,

  /**
   * 事件类型
   * @type {String}
   */
  type: '',

  /**
   * 事件发送者
   * @type {Object}
   */
  sender: null,

  /**
   * 添加的事件侦听数量
   * @type {Number}
   */
  length: 0,

  /**
   * 构造函数
   * @constructor
   * @param {Object} sender 事件发起者
   * @param {String} type   事件类型标示
   */
  Delegate: function(sender, type) {
    this.sender = sender;
    this.type = type;
  },

  /**
   * 绑定一个事件侦听器(函数)
   * @param {Function} listen               侦听函数
   * @param {Object}   scope     (Optional) 重新指定侦听函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
  on: function(listen, scope, name) {
    if(listen instanceof Delegate){
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
    if(listen instanceof Delegate){
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
    if(listen instanceof Delegate){
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
    if(listen instanceof Delegate){
      return once_delegate(this, listen);
    }
    var self = this;
    add(this, listen, {
      call: function(scope, evt) {
        self.unon(listen, scope);
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
    
    var ls = this.listens;
    if (!ls) return;

    if (listen) {

      var key = typeof listen == 'string' ? 'name' : 'original';
      if(listen instanceof Delegate){
        scope = null;
      }

      for(var i = ls.length - 1; i > -1; i--){
        var item = ls[i];
        if(item[key] === listen && (!scope || item.scope === scope)){
          ls.splice(i, 1);
        }
      }

      this.length = this.listens.length;

      if (!this.length) this.emit = empty_emit;
    }
    else {
      this.listens = null;
      this.length = 0;
      this.emit = empty_emit;
    }
  },
  
  /**
   * 卸载侦听器
   */
  unon: function(listen, scope){
    this.off(listen, scope);
  },
  
  /**
   * 获取是否已经启用
   * @type {Boolean}
   */
  get enable(){
    return this._enable;
  },

  /**
   * 设置启用禁用
   * @type {Boolean}
   */
  set enable(value){

    if(value){
      this._enable = true;
      if(this.length){
        this.emit = emit;
      }
      else{
        this.emit = empty_emit;
      }
    }
    else{
      this._enable = false;
      this.emit = empty_emit;
    }
  },
    
  /**
   * 发射消息,通知所有侦听器
   * @method emit
   * @param  {Object} data 要发送的数据
   * @return {Object}
   */
  emit: empty_emit,
  
  // 通知
  notice: function(data){ 
    return this.emit(data); 
  },

  /**
   * Old Will be deleted
   * 设置为外壳代理
   * @param {tesla.Delegate}
   */
  shell: function(del){
    this.on(del);
  },

}, {
  /**
   * define event delegate
   * @param {Object} self
   * @param {String} argus...    event name
   * @static
   */
  def: function(self) {
    var argu = Array.toArray(arguments);
    for (var i = 1, name; (name = argu[i]); i++){
      self['on' + name] = new Delegate(self, name);
    }
  },
  
  /**
   * get all event delegate
   * @param {Object} _this
   * @return {tesla.Delegate[]}
   * @static
   */
  all: function(self) {
    var result = [];
    var reg = /^on/;

    for (var i in self) {
      if (reg.test(i)) {
        var de = self[i];
        if(de instanceof Delegate)
          result.push(de);
        //tesla.is(de, Delegate) && result.push(de);
      }
    }
    return result;
  }
});

