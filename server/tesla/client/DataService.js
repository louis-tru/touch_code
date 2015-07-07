/**
 * @createTime 2013-10-25
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */
 
'use strict';

include('tesla/Delegate.js');

/**
 * 客户端数据服务
 * @class tesla.client.DataService
 */
Class('tesla.client.DataService', {
  
  /**
   * 服务名
   * @private
   */
  m_name: '',
  
  /**
   * 异常处理器
   * @type {Object}
   * @private
   */
  m_errorStatusHandler: null,
  
  /**
   * @event onerror
   */
  onerror: null,

  /**
   * @event onabort
   */
  onabort: null,

  /**
   * @event oncompletecall
   */
  oncompletecall: null,

  /**
   * @constructor
   * @param {String} service name
   */
  DataService: function(name){
    this.m_name = name;
    this.m_errorStatusHandler = {};
    tesla.Delegate.def(this, 'error', 'completecall', 'abort');
  },
  
  /**
   * 获取异常处理器
   */
  get errorStatusHandler(){
    return this.m_errorStatusHandler;
  },
  
  /**
   * 获取异常处理器
   */
  set errorStatusHandler(value){
    tesla.extend(this.m_errorStatusHandler, value);
  },
  
  /**
   * 获取服务名称
   */
  get name(){
    return this.m_name;
  },
  
  /**
   * call service api
   * @param  {String}   name              api name
   * @param  {Object}   args  (Optional) send paeam
   * @param  {Function} cb    (Optional) call success callback and return data
   * @return {Object}  return the access request id
   */
  call: function(){ },

  /**
   * 安全取消当前Service上的的请求,不抛出异常,只适用异步请求
   * @param {String} id 不传入参数取消全部请求
   */
  abort: function (){ }

});


