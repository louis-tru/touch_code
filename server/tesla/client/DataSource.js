/**
 * data source base abstract class
 * @class tesla.client.DataSource
 * @createTime 2011-09-29
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

'use strict';

include('tesla/Delegate.js');

var AUTO_SYNC_TIME = 200;

function autoSync(self) {

  if (!self.autoSync)
    return;
  tesla.clearDelay(self.m_syncTime);
  self.m_syncTime = self.sync.delay(self, AUTO_SYNC_TIME);
}

function parseData(self, data) {
  var fields = self.fields;
  if (!fields){ // 如果没有字段定义不做处理
    return data;
  }
  var newData = [];

  data.forEach(function (item) {
    if (!Array.isArray(item))
      return newData.push(tesla.filter(item, fields));

    var newItem = {};
    fields.forEach(function (field, index) {
      newItem[field] = item[index];
    });
    newData.push(newItem);
  });
  return newData;
}

function autoLoadData(self){
  if(self.autoLoad && self.m_beforeloadMark)
    self.load();
}

function beforeloadHandler(self){
	self.m_beforeloadMark = false;
}

/**
 * 标记数据的变化
 */
function mark_change(self, id){
  self.changeDataIds[id] = true;
}

Class('tesla.client.DataSource', {

  //private:
  m_syncTime: 0,
	m_beforeloadMark: true,

  //public:
  /**
   * 自动load数据
   * @type {Boolean}
   */
  autoLoad: false,
  
  /**
   * 增量加载开关.
   * 开启这个选项在载入数据时候不会清空
   * 上次加载的数据会在上次的基础上增加数据,
   * 如果关闭这选项加载数据会清空上次载入的数据.
   */
  incrementLoad: false,

  /**
   * auto sync
   * @type {Boolran}
   */
  autoSync: true,

  /**
   * @event onbeforeload
   */
  onbeforeload: null,

  /**
   * @event onload
   */
  onload: null,

  /**
   * @event onbeforesync
   */
  onbeforesync: null,

  /**
   * @event onsync
   */
  onsync: null,

  /**
   * @event onbeforeinserte
   */
  onbeforeinsert: null,

  /**
   * @event oninserte
   */
  oninsert: null,

  /**
   * @event onbeforeupdate
   */
  onbeforeupdate: null,

  /**
   * @event onupdate
   */
  onupdate: null,

  /**
   * @event onbeforedelete
   */
  onbeforedelete: null,

  /**
   * @event ondelete
   */
  ondelete: null,

  /**
   * @event onerror
   */
  onerror: null,

  /**
   * @event onerror
   */
  onabort: null,
  
  /**
   * 清空数据事件
   * @event onclear
   */
  onclear: null,

  /**
   * 变化过的数据id列表
   * @type {Object}
   */
  changeDataIds: null,

  /**
   * 原始数据id列表
   * @type {Object}
   */
  originDataIds: null,
  
  /**
   * full data
   * @type {Object}
   */
  fullData: null,

  /**
   * An inline data object readable by the reader. 
   * Typically this option, or the url option will be specified.
   * @type {Array}
   */
  data: null,

  /**
   * data total
   * @type {Number}
   */
  total: 0,

  /**
   * data fields
   * @type {String[]}
   */
  fields: null,

  /**
   * data total field
   * @type {String}
   */
  totalField: 'total',

  /**
   * data field
   * @type {String}
   */
  dataField: 'data',

  /**
   * Identifier
   * @type {String}
   */
  identifier: 'id',

  /**
   * load param
   * @type {Object}
   */
  param: null,

  /**
   * constructor function
   * @constructor
   */
  DataSource: function () {

    tesla.Delegate.def(this,
      'beforeload',
      'load',
      'beforesync',
      'sync',
      'beforeinsert',
      'insert',
      'beforeupdate',
      'update',
      'beforedelete',
      'delete',
      'error',
      'abort',
      'clear'
    );
    this.param = { };
    this.data = [];
    this.changeDataIds = {};
    this.originDataIds = {};
	  nextTick(autoLoadData, this);
  	this.onbeforeload.$once(beforeloadHandler);
  },

  /**
   * data result
   * @param  {Object} data
   * @return {Object} 
   */
  dataResult: function (inputData) {
    
    // 清空变化
    this.originDataIds = {};
    this.changeDataIds = {}; 
    
    if(!this.fullData){
      this.fullData = {};
      tesla.set(this.dataField, [], this.fullData);
      tesla.set(this.totalField, 0, this.fullData);
    }
    
    var fullData = this.fullData;

    if (!inputData){
      // 如果不为增量加载
      if(this.incrementLoad){ 
        return [];
      }
      else{
        this.total = 0;
        this.data = [];
        tesla.set(this.dataField, this.data, fullData);
        tesla.set(this.totalField, 0, fullData);
        return this.data;
      }
    }
    
    var total = tesla.get(this.totalField, inputData) || 0;
    var data = parseData(this, tesla.get(this.dataField, inputData) || []);
    
    if(this.incrementLoad){ // 增量加载
      tesla.extend(fullData, inputData);
      this.data = this.data.concat(data);
      this.total = total;
    }
    else {
      this.fullData = inputData;
      this.data = data;
      this.total = total;
    }
    
    tesla.set(this.dataField, this.data, fullData);
    tesla.set(this.totalField, this.total, fullData);

    var identifier = this.identifier;
    var originDataIds = this.originDataIds;

    this.data.forEach(function(item){
      if(item){
        var id = item[identifier];
        if(id){
          originDataIds[id] = true;
        }
      }
    });
    
    return data;
  },

  /**
   * insert records
   * @param {Object} record
   */
  insert: function (record) {
    if (!this.onbeforeinsert.emit(record))
      return;

    var identifier = this.identifier;
    var id = record[identifier];

    if(!id){
      return this.onerror.emit(new Error('Insert records no primary key'));
    }

    if (this.data.innerIndexOf(identifier, id))
      return this.onerror.emit(new Error('Primary key conflict'));

    mark_change(this, id);
    this.data.push(record);
    this.oninsert.emit(record);
    autoSync(this);
  },

  /**
   * update records
   * @param {Object} record
   */
  update: function (record) {
    if (!this.onbeforeupdate.emit(record))
      return;

    var identifier = this.identifier;
    var id = record[identifier];
    if (!id)
      return this.onerror.emit(new Error('Update records no primary key'));

    var index = this.data.innerIndexOf(identifier, id);
    if(index == -1){
      return this.onerror.emit(new Error('No need to update the data'));
    }

    mark_change(this, id);
    this.data.splice(index, 1, record);
    this.onupdate.emit(record);
    autoSync(this);
  },

  /**
   * delete records
   * @param {Object} record
   */
  deleted: function (record) {
    if (!this.onbeforedelete.emit(record))
      return;

    var identifier = this.identifier;
    var id = record[identifier];
    if (!id)
      return this.onerror.emit(new Error('Delete records no primary key'));

    var index = this.data.innerIndexOf(identifier, id);
    if(index == -1)
      return this.onerror.emit(new Error('No need to delete data'));

    mark_change(this, id);
    this.data.splice(index, 1);
    this.ondelete.emit(record);
    autoSync(this);
  },
  
  /**
   * load static data and trigger event
   * @param {Object} data
   * @param {Object} total (Optional)
   */
  loadData: function (data, total) {

    if (!this.onbeforeload.emit({ 'static': true })){
      return;
    }
    
    if(typeof total != 'number'){ // 自动设置一个total
      total = 
        (data && data.length == 'number' ? data.length : 0);
      if(this.incrementLoad){ // 增量
        total += this.total;
      }
    }

    var o = { };
    tesla.set(this.dataField, data, o);
    tesla.set(this.totalField, total, o);

    this.onload.emit(this.dataResult(o));
  },
  
  /**
   * 清空当前载入的数据
   */
  clearData: function(){
    if(this.data.length){ // 有数据才清空
      this.data = [];
      this.total = 0;
      tesla.set(this.dataField, this.data, this.fullData);
      tesla.set(this.totalField, this.total, this.fullData);
      this.onclear.emit();
    }
  },
  
  /**
   * 获取变化数据
   * @return {Object}
   */
  getChangeData: function(){
    // TODO ?

    var insert = [];
    var deleted = [];
    var update = [];

    var identifier = this.identifier;
    var data = this.data;
    var originDataIds = this.originDataIds;
    var changeDataIds = tesla.extend({}, this.changeDataIds);

    data.forEach(function(item){
      var id = item[identifier];
      if(!(id in originDataIds)){ // 新数据
        insert.push(item);
        delete changeDataIds[id];
      }
    });

    for(var id in originDataIds){
      if(data.innerIndexOf(identifier, id) == -1){
        deleted.push(id);
        delete changeDataIds[id];
      }
    }
    
    for(var id in this.changeDataIds){
      var index = data.innerIndexOf(identifier, id);
      if(index != -1){
        update.push(data[index]);
      }      
    }
    
    if(insert.length || deleted.length || update.length){
      return { insert: insert, deleted: deleted, update: update };
    }
    else{
      return null;
    }
  },

  /**
   * load data and trigger event, virtual function
   * @method load
   * @param {Object} param    load param
   */
  load: function(){
    // TODO ?
  },

  /**
   * sync server data and trigger event, virtual function
   * @method sync
   */
  sync: function(){
    // TODO ?
  },

  /**
   * @method abort
   * 取消当前load，sync请求
   */
  abort: function(){
    // TODO ?
  }

});

