/**
 * @class tesla.data.HttpService
 * @extend tesla.data.DataService
 * @createTime 2011-09-29
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/url.js');
include('tesla/data/service.js');

var url_util = tesla.url;

global.g_jsonp = {};

// cross-domain jsonp
function request_jsonp(cthis, url, key, callback, err) {

  var jsonp = '_' + key.replace(/-/g, '__');
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');

  function cb(data, m, evt) {

    if(script.parentNode){ 
      head.removeChild(script);
    }
    delete g_jsonp[jsonp];

    if (m == 'err') {
      evt.stopPropagation();
      err.message = data;
      callback(err);
    }
    else
      callback(null, data);
  }
  
  url = url_util.set('jsonp', 'g_jsonp.' + jsonp, url);
  url = url_util.set('_', tesla.sysid(), url);

  head.appendChild(script);
  g_jsonp[jsonp] = cb;
  script.onerror = cb.bind(null, 'Network error', 'err');
  //
  script.src = url;
  script.jsonp = jsonp;
  return script;
}

// request
function request(self, url, name, args, callback, opt) {
  
  var data = 'args=' + encodeURIComponent(JSON.stringify(args));
  var jsonp_url = url + (url.match(/\?/) ? '&' : '?') + data;
  var key = tesla.hash(jsonp_url);

  //记录当前请求
  var requests = self.m_requests;
  if (requests[key]) { //current param of request is no complete
    self.onerror.notice({ name: name, syscode: 1 });
    return new Error('Request has been issued');
  }
  
  var cb = function(err, result) {

    //是否已经取消
    if(!(key in requests)){ // 
      return;
    }
    delete requests[key];
    
    //game factory protocol
    //TODO If result.err equal \ u0000 \ ufff said that this was a mistake
    if (result && result.err == '\u0000\ufffd') {
      delete result.err;
      err = result;
      err.status = 200;
    }
    
    if (!err){
      self.oncompletecall.notice({
        url: url,
        name: name, 
        args: args,
        callback: callback,
        result: result
      });
      return callback ? callback(err, result) : result;
    }
    
    err.name = name;
    err.args = args;
    err.callback = callback;

    //TODO error ?
    if(!self.onerror.notice(err)){
      return;
    }
    
    var errorStatusHandler = self.errorStatusHandler;
    var error_code = (err.code || err.rc);

    if(errorStatusHandler && error_code) {
      
      var handler = errorStatusHandler.all; //使用通用错误

      for(var i in errorStatusHandler){

        if(i.match('(^|,)' + error_code + '(,|$)')){
          handler = errorStatusHandler[i];
          break;
        }
      }
      if(handler){
        handler.call(self, err);
        if(!callback){
          throw err;
        }
        return;
      }
    }
    throwError(err, callback);
  };

  //是否使用jsonp访问
  if (self.jsonp && url_util.host(url).toLowerCase() != url_util.host().toLowerCase()) {

    var err = {
      message: 'ajax-jsonp asyn mode only',
      url: url,
      args: args,
      jsonp: true,
    };

    if (!callback){
      return throwError(err, cb);
    }

    //Can not use the browser cache
    requests[key] = request_jsonp(self, jsonp_url, key, cb, err);
    return key;
  }
  
  var option = {
    type: 'POST',
    url: url_util.set('_', tesla.sysid(), url),
    data: data,
    dataType: 'json',
    onopen: function(xhr) {
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }
  };

  if(callback){
    requests[key]  = tesla.ajax(option, cb);
    return key;
  }
  else{
    requests[key] = { };
    var rest;
    try{
      rest = tesla.ajax(option);
    }
    catch(err){ 
      return cb(err);
    }
    return cb(null, rest);
  }
}

function abort(self, id){
    
  var requests = self.m_requests;
  var req = requests[id];
  if(req){
    
    delete requests[id];
    if(req instanceof global.HTMLElement){
      req.src = 'about:blank';
      req.parentNode.removeChild(req);
      delete g_jsonp[req.jsonp];
    }
    else{
      req.abort();
    }
    self.onabort.notice(req);
  }
}

var HttpService = 
$class('tesla.data.HttpService', tesla.data.Service, {

  /**
   * @private
   */
  m_requests: null, //current request item
  
  /**
   * service path config
   * @type {String}
   * @private
   */
  m_path: tesla.dir,

  /**
   * is use jsonp
   * @type {Boolean}
   */
  jsonp: true,

  /**
   * constructor function
   * @param {String} name
   * @param {String} path (Optional) service path config
   * @constructor
   */
  HttpService: function(name, path) {
    this.Service(name);
    this.m_requests = {};
    if(path){
      this.m_path = url_util.remove('method', $f(path));
    }
  },
  
  /**
   * 获取服务路径
   */
  get path(){
    return m_path;
  },

  /**
   * call api
   * @param  {String}   api                api name
   * @param  {Object}   args     (Optional) call args
   * @param  {Function} cb        (Optional) call success callback and return data
   * @return {Number} return the request id
   */
  call: function(name, args, cb) {

    if (typeof args == 'function') {
      cb = args;
      args = [];
    }
    
    name = this.name ? this.name + '.' + name : name;
    args = args ? Array.isArray(args) ? args : [args] : [];
    var mat = this.m_path.match(/^([^\?]+)(\?([^\#]+))?/);
    var url = mat[1] + '?method=' + name + (mat[3] ? '&' + mat[3] : '');
    return request(this, url, name, args, cb || function(){ });
  },
  
  /**
   * sync call api
   * @param  {String}   api                api name
   * @param  {Object}   args     (Optional) call args
   * @return {Object} return the request data
   */
  callSync: function(name, args){
    name = this.name ? this.name + '.' + name : name;
    args = args ? Array.isArray(args) ? args : [args] : [];
    var mat = this.m_path.match(/^([^\?]+)(\?([^\#]+))?/);
    var url = mat[1] + '?method=' + name + (mat[3] ? '&' + mat[3] : '');
    return request(this, url, name, args);
  },
  
  /**
   * 安全取消当前Service上的的请求,不抛出异常,只适用异步请求
   * @param {String} id 不传入参数取消全部请求
   */
  abort: function(id){

    if(id){
      abort(this, id);
    }
    else{
      for(var i in this.m_requests){
        abort(this, i);
      }
    }
  }
});

