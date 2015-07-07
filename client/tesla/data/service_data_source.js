/**
 * @class tesla.data.ServiceDataSource service data source
 * @extends tesla.data.DataSource
 * @createTime 2011-09-29
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/data/data_source.js');
include('tesla/data/http_service.js');

$class('tesla.data.ServiceDataSource', tesla.data.DataSource, {

  //延时请求句柄id
  m_delaysid: null,

  //public:
  /**
   * 请求延时(毫秒)
   * @type {Number}
   */
  delayRequest: 0,

  /**
   * query name
   * @type {String}
   */
  loadName: 'load',

  /**
   * query name
   * @type {String}
   */
  syncName: 'sync',

  /**
   * tesla.data.DataService
   * @type {tesla.data.DataService} 
   */
  m_service: null,

  /**
   * constructor function
   * @param {tesla.data.DataService} service data souect
   * @constructor
   */
  ServiceDataSource: function() {
    this.DataSource();
    this.m_delaysid = {};
  },
  
  /**
   * 获取数据服务
   */
  get service(){
    return this.m_service;
  },
  
  /**
   * 通过名称创建新数据服务
   */
  NewService: function(name){
    return new tesla.data.HttpService(name);
  },
  
  /**
   * 获取数据源数据服务名称
   */
  get name(){
    if(this.m_service){
      return this.m_service.name;
    }
    return '';
  },
  
  /**
   * 设置数据源数据服务名称
   */
  set name(value){
    if(value != this.name){
      this.m_service = this.NewService(value);
    }
  },
  
  /**
   * 加载数据
   * @orewrite
   */
  load: function(param) {

    param = param || {};
    if(!this.onbeforeload.notice(param)) 
      return;

    param = tesla.extend(this.param, param);

    var self = this;

    function callback(err, data){
      if(err)
        return self.onerror.notice(err);
      data = self.dataResult(data);
      self.onload.notice(data);
    }

    var delay = this.delayRequest;
    if(!delay){
      return this.m_service.call(this.loadName, param, callback);
    }

    var delaysid = this.m_delaysid;
    var id = this.m_service.call.delay(
      this.m_service, delay, this.loadName, param, function(err, data){
      delete delaysid[id];
      callback(err, data);
    });
    delaysid[id] = true;
  },

  /**
   * 同步数据
   * @orewrite
   */
  sync: function() {
    var self = this;

    var changeData = this.getChangeData();
    if(!changeData){
      return;
    }

    if(!this.onbeforesync.notice(param)) 
      return;

    var identifier = this.identifier;
    
    function callback(err) {

      if(err)
        return self.onerror.notice(err);

      self.originDataIds = { }; // 重置数据
      self.updateDataIds = { }; // 重置数据
      
      var originDataIds = self.originDataIds;
      
      self.data.forEach(function(item){
        if(item){
          var id = item[identifier];
          if(id){
            originDataIds[id] = true;
          }
        }
      });

      self.onsync.notice();
    }
    
    var delay = this.delayRequest;
    if(!delay){
      return this.m_service.call(this.syncName, changeData, callback);
    }

    var delaysid = self.m_delaysid;
    var id = this.m_service.call.delay(
      this.m_service, delay, this.syncName, changeData, function(err, data){
      delete delaysid[id];
      callback(err, data);
    });
    delaysid[id] = true;
  },
  
  /**
   * 取消加载与同步
   * @orewrite
   */
  abort: function(){
    for(var id in this.m_delaysid){
      Function.undelay(id);
    }
    this.m_service.abort();
    this.onabort.notice();
  }

});

