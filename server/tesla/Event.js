/**
 * @createTime 2011-11-16
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Delegate.js');

function add(self, call, types, listen, scope, name){
  
	if (typeof types == 'string'){
		types = [types];
	}
	for (var i = 0, type; (type = types[i]); i++) {
		var del = self['on' + type];
		if (!del){
			self['on' + type] = del = new tesla.Delegate(self, type);
		}
		del[call](listen, scope, name);
	}
}

/**
 * @class tesla.Event event handle
 */
Class('tesla.Event', {

	/**
   * 添加事件监听器(函数)
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听器函数
   * @param {Object}   scope     (Optional) 重新指定侦听器函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
	on: function(types, listen, scope, name) {
		add(this, 'on', types, listen, scope, name);
	},

  /**
   * 添加事件监听器(函数),消息触发一次立即移除
   * @param {Object}   types                事件名称或者事件名称列表
   * @param {Function} listen               侦听器函数
   * @param {Object}   scope     (Optional) 重新指定侦听器函数this
   * @param {name}     name      (Optional) 侦听器别名,在删除时,可直接传入该名称
   */
	once: function(types, listen, scope, name) {
		add(this, 'once', types, listen, scope, name);
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
		add(this, '$on', types, listen, scope, name);
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
		add(this, '$once', types, listen, scope, name);
	},

  /**
   * 卸载事件监听器(函数)
   * @param {String} type                事件名称
   * @param {Object} listen (Optional)   可以是侦听器函数值,也可是侦听器别名,如果不传入参数卸载所有侦听器
   * @param {Object} scope  (Optional) scope
   */
	off: function(type, listen, scope) {
		var del = this['on' + type];
		if (del){
			del.unon(listen, scope);
		}
	},
	
	unon: function(type, listen, scope){
	  this.off(type, listen, scope);
	},

  /**
   * 发射事件
   * @param  {Object} type      事件名称
   * @param  {Object} msg       要发送的消息
   */
	emit: function(type, msg) {
		var del = this['on' + type];
		if (del){
			return del.emit(msg);
		}
		return true;
	},

	notice: function(type, data){ 
		return this.emit(type, data); 
	},

});

