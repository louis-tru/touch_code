/**
 * 本地数据服务
 * @class tesla.data.CacheService
 * @extends tesla.data.Service
 */

'use strict';

include('tesla/data/http_service.js');
include('tesla/data/cache_service_handler.js');
include('tesla/data/cache_service_storage.js');
include('tesla/data/data.js');
include('tesla/event_delegate.js');

var CacheServiceHandler = tesla.data.CacheServiceHandler;
var Data = tesla.data.Data;

function select(data, param, joinTable, joinWhere) {

  param = param || {};
  if (joinTable && joinWhere) { //需要连接查询
    var _data = data.data;
    var newData = [];
    for(var i = 0, len = _data.length; i < len; i++){
      newData.push(tesla.extend({}, _data[i]));
    }
    data = new Data(newData).join(joinTable, joinWhere);
  }
  return data.selectByParam(param);
}

//更新并且验证缓存
function updataVerifyCache(_this, data){

  // 缓存数据需要特定格式,否则出错,格式如下
  // var data = {
  //     cache_ver: 'xxx',
  //     cache: {
  //         "user.username": {
  //             "all": "楚学文",
  //             "ver": "h4xaa"
  //         },
  //         "card.cards": {
  //             "all": {
  //                 "30153_ef3ff": {
  //                     "cid": 9130
  //                 },
  //                 "51053_ef3ff": {
  //                     "cid": 9133
  //                 },
  //                 "56053_ef3ff": {
  //                     "cid": 9172
  //                 }
  //             },
  //             "ver": 139,
  //             "is_table": 1
  //         }
  //     },
  //     data: null
  // };

  var cache_ver = data.cache_ver;
  var cache = data.cache;
  var storage = _this._storage;

  for (var name in cache){
    var new_item = cache[name];
    var new_all = new_item.all;

    if(new_item.is_table){ //表结构类型
        
      if(new_all){
        for(var sysid in new_all){
          new_all[sysid].sysid = sysid;
        }
      }
      else{
        var old_item = storage.read(name) || { };
        var old_all = old_item.all = old_item.all || {};
        old_item.ver = new_item.ver;

        var d = new_item.d; //删除记录,数组
        var a = new_item.a; //添加记录,字典
        var m = new_item.m; //更新记录,字典

        if(d){ //有删除记录
          for(var i = 0, len = d.length; i < len; i++){
            delete old_all[d[i]];
          }
        }
        for(var key in a){
          var item = a[key];
          item.sysid = key;
          old_all[key] = item;
        }
        for(var key in m){
          var item = m[key];
          item.sysid = key;
          old_all[key] = item;
        }
        new_item = old_item;
      }
    }
    
    else if( //为简单字符串与数字数组
      Array.isArray(new_all) && 
      new_all.length && 
      /number|string/.test(typeof new_all[0]) ){ 
      for(var i = 0, len = new_all.length; i < len; i++){
        new_all[i] = { sysid: new_all[i] };
      }
    }
    storage.write(name, new_item);
    _this.onchange.notice(name); //事件变化
  }

  if(storage.version() == cache_ver){ //总版本不一样,需要同步数据
    _this.sync(noop); //同步数据
  }
}

function formatData(data){

  if(data.is_table){ //表结构类型
    var dic = data.all;
    data = [];
    for(var key in dic){
      data.push(dic[key]);
    }
  }
  else{
    data = data.all;
  }
  return data;
}

//查询数据
function query(_this, name, param, cb, joinTable, joinWhere){
    
  var data = _this._storage.read(name); // TODO ?
  if (data) { //命中缓存

    data = formatData(data);

    if(Array.isArray(data)){ //是否为数组结构
      //选择数据
      data = select(new Data(data), param, joinTable, joinWhere);
    }
    _this.oncompletecall.notice({ name: name,  param: param, cb: cb, result: data });
    return cb ? cb(null, data): data;
  }
  
  var callback = function(data){
    // 处理缓存
    // 更新并且验证缓存
    updataVerifyCache(_this, data);
    data = data.data || (data.cache && data.cache[name] ? formatData(data.cache[name]): null);

    if(Array.isArray(data)){ 
      data = select(new Data(data), param, joinTable, joinWhere);
    }
    return cb ? cb(null, data): data;
  };

  //if(cb){
  return _this._base_service.call( name, param, callback.cb(cb || ts.noop) );
  // }
  // else{
  //   return callback( _this._base_service.call(name, param) );
  // }
}

//获取代理处理器
function getProxyHandler(_this, service_name){

  var proxy_handler = _this._proxy_handler;
  if(service_name in proxy_handler){
    return proxy_handler[service_name];
  }

  var handler = null;
  var handlerClass = CacheServiceHandler.getClass(service_name);
  if(handlerClass){
    handler = new handlerClass();
    handler.init(_this);
  }
  proxy_handler[service_name] = handler;
  return handler;
}

$class('tesla.data.CacheService', tesla.data.Service, {

  _base_service: null,
  _storage: null,
  _proxy_handler: null,
  
  /**
   * 缓存数据改变事件
   * @event onchange
   */
  onchange: null,

  /**
   * 同数据api名称
   * @type {String}
   */
  syncName: 'data.sync',

  /**
   * 获取错误状态处理器
   * @type {Object}
   * @get
   */
  get errorStatusHandler() {
    if (this._base_service)
      return this._base_service.errorStatusHandler;
    return null;
  },

  /**
   * 设置错误状态处理器
   * @type {Object}
   * @set
   */
  set errorStatusHandler(value) {
    if (this._base_service)
      this._base_service.errorStatusHandler = value;
  },

  /**
   * 获取基础服务
   * @type {tesla.data.Service}
   * @get
   */
  get baseService() {
    return this._base_service;
  },

  /**
   * 设置基础服务
   * @type {tesla.data.Service}
   * @set
   */
  set baseService(value) {
    if(this._base_service){
      this._base_service.onerror.off();
      this._base_service.oncompletecall.off();
      this._base_service.onabort.off();
    }
    this.onerror.shell(value.onerror);
    this.oncompletecall.shell(value.oncompletecall);
    this.onabort.shell(value.onabort);
    this._base_service = value;
  },

  /**
   * 获取内部存储接口
   * @type {tesla.data.CacheServiceStorage}
   * @get
   */
  get storage() {
    return this._storage;
  },

  /**
   * 设置内部存储接口
   * @type {tesla.data.CacheServiceStorage}
   * @set
   */
  set storage(value) {
    this._storage = value;
  },

  /**
   * 够造函数
   * @param {tesla.data.CacheServiceStorage} storage (Optional) 内部存储接口
   * @param {tesla.data.Service} base_service (Optional)        基础服务
   * @constructor
   */
  CacheService: function(storage, base_service) {
    this.Service('');
    this._storage = storage || new tesla.data.CacheServiceStorage();
    this.baseService = base_service || new tesla.data.HttpService();
    this._proxy_handler = {};
    tesla.EventDelegate.init_events(this, 'change');
  },

  /**
   * <code>
   *      query('user.get', 
   *          { 
   *              where: 'key1=^value$ || key2.aa=value$ && key3=value || not key5 && key7'
   *              index: 0, 
   *              length: 10, 
   *              asc: 'uid', 
   *              desc: 'uid'
   *              group: 'key1.kk,key2',
   *              alignment: true     //该参数默认为false
   *           });
   * </code>
   * 查询本地数据,如果本地找不到数据,从服务器获取
   * @param  {String}     name       api name
   * @param  {Object}     param      (Optional) send paeam
   * @param  {Function}   cb         (Optional) send success callback and return data
   * @param  {Array|tesla.data.Data}      joinTable    (Optional) 要连接的表数据
   * @param  {String|Function}     joinWhere    (Optional) 连接条件
   * @return {Object} return the request id
   */
  query: function(name, param, cb, joinTable, joinWhere) {
      
    if (typeof param == 'function') {
      joinName = joinTable;
      joinTable = cb;
      cb = param;
      param = {};
    }
    param = param || {};

    return query(this, name, param, cb, joinTable, joinWhere);
  },

  //重写
  call: function(name, param, cb) {

    if (typeof param == 'function') {
      cb = param;
      param = {};
    }
    param = param || {};

    // TODO ?
    //查询服务代理处理器 CacheServiceHandler
    //交给query处理

    var names = name.split('.');
    var service = names[0];
    var api = names[1];
    var handler = getProxyHandler(this, service);
      
    if(!handler || !(api in handler)){ //找不到代理处理器,使用查询
      return query(this, name, param, cb);
    }

    var _this = this;
    var callback = function(err, data){
        
      if(!err){
        return cb ? cb(err, data) : data;
      }

      err.name = name;
      err.param = param;
      err.cb = cb;
      if(!_this.onerror.notice(err)){
        return;
      }
      var errorStatusHandler = _this.errorStatusHandler;
      if(errorStatusHandler) {

        var error_code = (err.code || err.rc) + '';
        var handler = errorStatusHandler.all; //使用通用错误

        for(var i in errorStatusHandler){

          if(i.match('(^|,)' + error_code + '(,|$)')){
            handler = errorStatusHandler[i];
            break;
          }
        }

        if(handler){
          return handler.call(_this, err, cb);
        }
      }
      throwError(err, cb);
    };

    //if(cb){
    return handler.action(api, param, callback);
    // }
    // else{
    //   try{
    //     return callback( null, handler.action(api, param) );
    //   }
    //   catch(err) {
    //     return callback(err);
    //   }
    // }
  },

  //重写
  abort: function(id) {
    // TODO ?
    this._base_service.abort(id);
  },

  /**
   * 同步本地数据
   * @param {Function} cb (Optional)
   */
  sync: function(cb) {
    query(this, this.syncName, this._storage.subVersionList(), cb);
  }
});
