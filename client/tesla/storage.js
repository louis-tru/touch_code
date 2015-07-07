/**
 * @class tesla.Storage 本地存储
 * @createTime 2012-06-08
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton 
 */

'use strict';

var CACHE_MARK_NAME = 'OF6U%;';
var LOCAL_STORAGE = localStorage;

function removeName(names, name) {
  names = names.replace(new RegExp('(^|,)' + name + '(,|$)', 'g'), 
  function(all, start, end) {
    return start == end ? start : '';
  });
  return names;
}

function getData(name){
  return LOCAL_STORAGE.getItem(tesla.hash(name));
}

function setData(name, val){
  var key = tesla.hash(name);
  var names = LOCAL_STORAGE.getItem(CACHE_MARK_NAME);
  try {

    LOCAL_STORAGE.setItem(key, val);
    names = names ? key + ',' + removeName(names, key) : key;
    LOCAL_STORAGE.setItem(CACHE_MARK_NAME, names);
  }
  catch (e_) {
    if (names) {
      LOCAL_STORAGE.removeItem(CACHE_MARK_NAME);
      _removeData(names, names.match(/[^,]+$/)[0]);
      setData(name, val);
    }
  }
}

function _removeData(names, name){
  LOCAL_STORAGE.removeItem(name);
  if (names)
    LOCAL_STORAGE.setItem(CACHE_MARK_NAME, removeName(names, name));
}

function removeData(name){
  if (name) {
    var names = LOCAL_STORAGE.getItem(CACHE_MARK_NAME);
    _removeData(names, tesla.hash(name));
  }
}

//******************LOCAL_STORAGE End***************

tesla.storage = {

  /**
   * 获取本地数据
   * @param  {String} name 名称
   * @return {Object}
   * @static
   */
  get: function(name) {
    return JSON.parse(getData(name) || 'null');
  },

  /**
   * 设置本地数据
   * @param {String} name 数据键
   * @param {Object} val 值
   * @static
   */
  set: function(name, val) {
    setData(name, JSON.stringify(val));
  },

  /**
   * 删除本地数据
   * @param {String} key 数据键
   * @static
   */
  remove: function(name) {
    removeData(name);
  },

  /**
   * 删除所有本地数据
   * @static
   */
  clear: function() {
    LOCAL_STORAGE.clear();
  },
  
};
