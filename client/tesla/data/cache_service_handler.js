/**
 * 缓存数据服务处理器
 * @class tesla.data.CacheDataServiceHandler
 */

'use strict';

var classList = { };

$class('tesla.data.CacheServiceHandler', {

  // _cache: null,
  
  //缓存数据服务
  _cache_service: null,

  /**
   * 本地数据服务
   * @type {tesla.data.CacheDataService}
   */
  get service(){
    return this._cache_service;
  },
  
  /**
   * 初始化
   * @param {tesla.data.CacheService}
   * @constructor
   */
  init: function(cacheService){
    this._cache_service = cacheService;
  },
  
  /**
   * 调用服务查询
   * @param  {String}   name      api name
   * @param  {Object}   param send paeam
   * @param  {Function} cb send success callback and return data
   * @param {Array|tesla.data.Data}  joinTable 要连接的表数据
   * @param {String|Function} joinWhere 连接条件
   * @return {Object} return the request id
   */
  query: function(name, param, cb, joinTable, joinWhere){
    return this.service.query(name, param, cb, joinTable, joinWhere);
  },

  /**
   * 调用服务api
   * @param  {String}   name                 api name
   * @param  {Object}   param     (Optional) send paeam
   * @param  {Function} cb        (Optional) send success callback and return data
   * @return {Object} return the request id
   */
  call: function(name, param, cb){
    return this.service.call(name, param, cb);
  },

  /**
   * 调用动作
   * @param  {String}   api                 api name
   * @param  {Object}   param     (Optional) send paeam
   * @param  {Function} cb        (Optional) send success callback and return data, not incoming use sync
   * @return {Object} if sync access immediately return the data ,if async access return the request id
   */
  action: function(api, param, cb){
    if(api in this){
      return this[api](param, cb);
    }
    throw new Error('Did not find api');
  }

}, {
    
  /**
   * 定义服务名称与class映射
   * @param {String} name
   * @param {Class} _class
   */
  def: function(name, _class){
    if(name in classList){
      throw new Error('"{0}" duplicate definition of'.format(name));
    }
    classList[name] = _class;
  },

  /**
   * 通过服务名称获取处理器class
   * @param  {String} name
   * @return {Class} 
   */
  get_class: function(name) {
    return classList[name];
  }
});

