/**
 * @createTime 2013-10-25
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */
 
'use strict';

include('tesla/event_delegate.js');

/**
 * 客户端数据服务
 * @class tesla.data.Service
 */
$class('tesla.data.Service', {
  
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
  Service: function(name){
    this.m_name = name;
    this.m_errorStatusHandler = {};
    tesla.EventDelegate.init_events(this, 'error', 'completecall', 'abort');
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


