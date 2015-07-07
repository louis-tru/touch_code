/**
 * 客户端数据
 * @class tesla.data.Data
 * @createTime 2013-11-13
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

function shiftWhere(where, dataItem) {

  var info = where.shift();
  var is;

  var keys = info.key.split('.');
  var pop_key = keys.pop();
  var data = dataItem || {};
  var key;

  while (( key = keys.shift() )) {
    data = data[key];
    if (!data){
      break;
    }
  }

  switch(info.type){
    case 0: //匹配值不存在
      is = !(pop_key in data);
      break;
    case 1: //匹配值存在
      is = pop_key in data;
      break;
    case 2: //使用正则匹配字符串
      is = info.regexp.test(String( data[pop_key] ));
      break;
    default: //使用索引匹配
      is = info.value == data[pop_key];
      break;
  }

  if (where.length === 0) {
    return is;
  }
  else {
    var char = where.shift();
    if (char == '&&') {
      return is && shiftWhere(where, dataItem);
    }
    else { // ||
      return is || shiftWhere(where, dataItem);
    }
  }
}

function newWhere(where_str) {

  if (!where_str) {
      throw new Error('Conditional expression error');
  }

  var index = where_str.indexOf('=');
  var where = {
    type: 0
    /* 0 匹配值不存在, 1 匹配值存在, 2使用正则配置字符串，3使用索引匹配*/
  };

  if (index == -1) {
    if (where_str.indexOf('not ') === 0) {
      where.key = where_str.substr(4);
    }
    else {
      where.key = where_str;
      where.type = 1;
    }
  }
  else {
    where.key = where_str.substr(0, index);

    var exp_str = where_str.substr(index + 1);
    if(exp_str.match(/^\/.+\/$/)){ // 使用正则配置
      where.type = 2;
      where.regexp = new RegExp(exp_str.substr(1, exp_str.length - 2));
    }
    else{
      where.type = 3;
      where.value = 
          /^((-?\d+(\.\d+)?((e|E)\d+)?)|true|false)$/.test(exp_str) ? EVAL(exp_str) : exp_str;
    }
  }
  return where;
}

//创建条件查询处理器
function createWhereHandler(argv){

  if(typeof argv[0] == 'function'){
      return argv[0];
  }
  var whereStr = Array.toArray(argv).join('').trim();
  var where = [];
  var reg = / *(\|\||&&) */m;
  var mat;
  while ( (mat = whereStr.match(reg)) ) {
    where.push(newWhere(whereStr.substring(0, mat.index)));
    where.push(mat[1]);
    whereStr = whereStr.substr(mat.index + mat[0].length);
  }
  where.push(newWhere(whereStr));
  
  return function(data){
    return shiftWhere(where.slice(), data);
  };
}

function shiftJoinWhere(where, left, right){

  left = left || {};
  right = right || {};
  var info = where.shift();
  var left_data = left[info.left];
  var is = ( info.left in left && left[info.left] == right[info.right] );

  if (where.length === 0) {
    return is;
  }
  else {
    var char = where.shift();
    if (char == '&&') {
      return is && shiftJoinWhere(where, left, right);
    }
    else { // ||
      return is || shiftJoinWhere(where, left, right);
    }
  }
}

function newJoinWhere(where_str){
  if (!where_str) {
    throw new Error('Conditional expression error');
  }
  var index = where_str.indexOf('=');
  return { left: where_str.substr(0, index), right: where_str.substr(index + 1) };
}

function createJoinWhereHandler(argv){

  if(typeof argv[0] == 'function'){
    return argv[0];
  }

  var whereStr = argv.join('').trim();
  var where = [];
  var reg = / *(\|\||&&) */m;
  var mat;
  while ( (mat = whereStr.match(reg)) ) {
    where.push( newJoinWhere(whereStr.substring(prev, mat.index)) );
    where.push(mat[1]);
    whereStr = whereStr.substr(mat.index + mat[0].length);
  }
  where.push( newJoinWhere(whereStr) );
  
  return function(left, right){
    return shiftJoinWhere(where.slice(), left, right);
  };
}

//数据列处理器
function columnsHandler(exps, data){
  
  //var exps = 'sectionid:/^(.+)\\d{2}$/:1 && ...';
  
  var rest = '';
  data = data || {};

  for(var i = 0, len = exps.length; i < len; i++){
    var exp = exps[i];
    var field = exp.field in data ? String( data[exp.field] ): null;

    if(field){
      if(exp.type !== 0){ //基本取字段
        //exp.reg 
        var mat = field.match(exp.reg);
        if(mat && mat[exp.index]){
          field = mat[exp.index];
        }
      }
      rest += field;
    }
  }
  return rest;
}

//创建数据列处理器
function createColumnsHandler(argv){

  if(typeof argv[0] == 'function'){
    return argv[0];
  }

  var expStr = Array.toArray(argv).join('').trim();
  var expls = expStr.split(/ *&& */);
  var exps = [];
  
  for(var i = 0, len = expls.length; i < len; i++){
    var item = expls[i].split(/ *:\/ *| *\/: */);
    exps.push({ 
      type: item.length > 1 ? 1: 0, /* 0 基本取字段, 1 正则查询 */
      field: item[0], 
      reg: item[1] ? new RegExp(item[1]): null, 
      index: item[2] ? item[2]: 0
    });
  }

  return function(data){
    return columnsHandler(exps, data);
  };
}


var Data = 

$class('tesla.data.Data', {
    
  //private:
  _data: null,
  _total: 0,
  _index: 0,
  _indexs: null, // 索引

  /**
   * 数据对像
   * @type {Array}
   * @get
   */
  get data(){
    return this._data;
  },
  
  /**
   * 数据总长度
   * @get
   */
  get total(){
    return this._total;
  },
  
  /**
   * 数据范围的开始位置
   * @type {Number}
   * @get
   */
  get index(){
    return this._index;
  },
    
  /**
   * 数据范围的长度
   * @type {Number}
   * @get
   */
  get length(){
    return this._data.length;
  },

  /**
   * constructor function
   * @param {Array} data
   * @constructor
   */
  Data: function(data){
    if(Array.isArray(data)){
      this._data = data;
    }
    else if(data !== null && typeof data == 'object'){
      this._data = [];
      for(var i in data){
        this._data.push(data[i]);
      }
    }
    else{
      this._data = [];
    }
    this._total = this._data.length;
  },

  /**
   * 克隆数据对像
   * @return {tesla.data.Data}
   */
  clone: function(){
    return new Data(tesla.clone(this._data));
  },

  /**
   * <code>
   *      selectByParam({ 
   *              where: 'key1=^value$ || key2=value$ && key3=value || not key5 && key7'
   *              index: 0, 
   *              length: 10, 
   *              asc: 'uid', 
   *              desc: 'uid',
   *              group: 'key1.kk,key2',
   *              alignment: false     //该参数默认为false
   *           });
   * </code>
   * 通过参数查询数据
   * @param {Object} param 查询条件
   * @return {tesla.data.Data}
   * @static
   */
  selectByParam: function(param){
      
    var newData = new tesla.data.Data(this._data.slice());

    if(param.group){
      newData = newData.group.apply( newData, param.group.split(',') );
    }

    var whereStr = 
        Array.isArray(param.where) ? param.where.join(''): 
        param.where ? String(param.where).trim() : null;
    if (whereStr) { // where 查询条件
      newData = newData.select(whereStr);
    }
    
    newData.sort(param); //排序

    var index = 'index' in param ? param.index: 0;
    var length = 'length' in param ? param.length: newData.length;

    newData = newData.range(index, length, param.alignment);
    
    return newData;
  },

  /**
   * 测试查询,至少查询到一条数据或者能够连接一条数据,否则返回false
   * @param  {Array|tesla.data.Data} right (Optional) 连接条件,使用连接测试
   * @param  {String} where 测试条件
   * @param  {String} where ... 测试条件
   * @return {Boolean}
   */
  test: function(right) {
    
    if(this.length === 0){
      return false;
    }

    if(typeof right == 'object'){
          
      if(right instanceof Data){
        right = right.data;
      }
      
      if(right.length === 0){
        return false;
      }
      
      var handler = createJoinWhereHandler(Array.toArray(arguments).slice(1));
      var data = this._data;
      for(var i = 0, len = data.length; i < len; i++){
        var leftItem = data[i];
        
        for(var j = 0, len2 = right.length; j < len2; j++){
          var rightItem = right[j];
          if( handler(leftItem, rightItem) ){
            return true;
          }
        }
      }
    }
    else{
      var handler = createWhereHandler(arguments);
      var data = this._data;
      for (var i = 0, len = data.length; i < len; i++) {
        if ( handler(data[i]) ) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * 测试查询,必需匹配全部数据或者左表数据全部连接成功,否则返回false
   * @param  {Array|tesla.data.Data} right (Optional) 连接条件,使用连接测试
   * @param  {String} where 查询条件
   * @param  {String} where ... 测试条件
   * @return {Boolean}
   */
  tests: function(right){
      
    if(typeof right == 'object'){
            
      if(right instanceof Data){
        right = right.data;
      }
        
      if(this.length !== 0 && right.length === 0){
        return false;
      }

      var handler = createJoinWhereHandler(Array.toArray(arguments).slice(1));
      var data = this._data;
      for(var i = 0, len = data.length; i < len; i++){
        var leftItem = data[i];

        for(var j = 0, len2 = right.length; j < len2; j++){
          var rightItem = right[j];
          if( handler(leftItem, rightItem) ){
            j = -1;
            break;
          }
        }
        if(j != -1){
          return false;
        }
      }
    }
    else {
        
      var handler = createWhereHandler(arguments);
      var data = this._data;
      for (var i = 0, len = data.length; i < len; i++) {
        if ( !handler(data[i]) ) {
          return false;
        }
      }
    }
    return true;
  },

  /**
   * <code>
   *      data.select('key1=^value$ || key2.aa=value$ && key3=value || not key5 && key7')
   *      data.select(function(item){ return item.a < 10; })
   * </code>
   * 选择数据
   * @param  {String} where ... 查询条件
   * @return {tesla.data.Data}
   */
  select: function(){
      var handler = createWhereHandler(arguments);
      var data = this._data;
      var newData = [];
      for (var i = 0, len = data.length; i < len; i++) {
        var dataItem = data[i];
        if ( handler(dataItem) ) {
          newData.push(dataItem);
        }
      }
      return new Data(newData);
  },
  
  /**
   * <code>
   *      data.select('key1=^value$ || key2.aa=value$ && key3=value || not key5 && key7')
   *      data.select(function(item){ return item.a < 10; })
   * </code>
   * 选择一条数据返回
   * @param  {String} where ... 查询条件
   * @return {Object}
   */
  selectObject: function(){
    var handler = createWhereHandler(arguments);
    var data = this._data;
    for (var i = 0, len = data.length; i < len; i++) {
      var dataItem = data[i];
      if ( handler(dataItem) ) {
        return dataItem;
      }
    }
    return null;
  },

  /**
   * 查询数据量
   * @param  {String} where ... 查询条件
   * @return {Number}
   */
  count: function(){
    var handler = createWhereHandler(arguments);
    var data = this._data;
    var num = 0;
    for (var i = 0, len = data.length; i < len; i++) {
      var dataItem = data[i];
      if ( handler(dataItem) ) {
        num++;
      }
    }
    return num;
  },

  /**
   * 连接数据表
   * @param {Array|tesla.data.Data} right
   * @prram {String} joinWhere ... 连接条件
   * @return {tesla.data.Data}
   */
  join: function(right){
      
    if(right instanceof Data){
      right = right.data;
    }

    var handler = createJoinWhereHandler(Array.toArray(arguments).slice(1));
    var data = this._data;
    var newData = [];
    
    for(var i = 0, len = data.length; i < len; i++){
      var leftItem = data[i];

      for(var j = 0, len2 = right.length; j < len2; j++){
        var rightItem = right[j];
        if( handler(leftItem, rightItem) ){
          leftItem = tesla.extend(tesla.extend({}, leftItem), rightItem);
          break;
        }
      }
      newData.push(leftItem);
    }
    return new Data(newData);
  },

  /**
   * 内连接数据
   * @param {Array|tesla.data.Data} right
   * @prram {String} joinWhere ... 连接条件
   * @return {tesla.data.Data}
   */
  innerJoin: function(right){

    if(right instanceof Data){
      right = right.data;
    }

    var handler = createJoinWhereHandler(Array.toArray(arguments).slice(1));
    var data = this._data;
    var newData = [];

    for(var i = 0, len = data.length; i < len; i++){
      var leftItem = data[i];

      for(var j = 0, len2 = right.length; j < len2; j++){
        var rightItem = right[j];
        if( handler(leftItem, rightItem) ){
          newData.push(tesla.extend(tesla.extend({}, leftItem), rightItem));
          break;
        }
      }
    }
    return new Data(newData);
  },

  /**
   * <code>
   *      data.group('key1.kk', 'key2');
   * </code>
   * @分组数据
   * @param  {String} argv ... 分组字段
   * @return {tesla.data.Data}
   */
  group: function(){

    var argv = Array.toArray(arguments);
    var argc = argv.length;
    var data = this._data;
    var keys = { };
    var newData = [];

    for(var i = 0, len = data.length; i < len; i++){
      var key = [];
      var item = data[i];
      for(var j = 0; j < argc; j++){
        key.push( tesla.get(argv[j], item) );
      }
      
      key = key.join('');
      if( !(key in keys) ){
        keys[key] = true;
        newData.push(item);
      }
    }
    return new Data(newData);
  },

  /**
   * 添加数据列
   * @param {String} name  数据列名称
   * @param {String|Function} value ... 值
   * @return {tesla.data.Data}
   */
  addColumns: function(name){ //value
    var handler = createColumnsHandler(Array.toArray(arguments).slice(1));
    this._data.forEach(function(item){
      if(item)
        item[name] = handler(item);
    });
    return this;
  },

  /**
   * 以某个字段排序
   * @param {String} field
   * @return {tesla.data.Data}
   */
  asc: function(field){
    //冒泡排序
    var data = this._data;
    var len = data.length;
    for (var i = data.length - 1; i > 0; i--) {
      for (var j = 0; j < i; j++) {
        var a = data[j];
        var b = data[j + 1];
        if (a[field] > b[field]) {
          data[j] = b;
          data[j + 1] = a;
        }
      }
    }
    return this;
  },

  /**
   * 以某个字段倒序
   * @param {String} field
   * @return {tesla.data.Data}
   */
  desc: function(field){
    var data = this._data;
    var len = data.length;
    for (var i = data.length - 1; i > 0; i--) {
      for (var j = 0; j < i; j++) {
        var a = data[j];
        var b = data[j + 1];
        if (a[field] < b[field]) {
          data[j] = b;
          data[j + 1] = a;
        }
      }
    }
    return this;
  },
    
  /**
   * @param {Object} param
   */
  sort: function(param){
    if(param.asc){
      return this.asc(param.asc);
    }
    else if(param.desc){
      return this.desc(param.desc);
    }
    else{
      return this;
    }
  },

  /**
   * 数据范围
   * @param {Number} index
   * @param {Number} length
   * @param {Boolean} alignment
   * @return {tesla.data.Data}
   */
  range: function(index, length, alignment){

    var data = this._data;
    var total = data.length;
    

    if(alignment){

      if(alignment === 1){
        if(index >= total){
          index = Math.max(index - length, 0);
        }
        data = data.slice(index, length + index);
        this._index = data.length ? index: 0;
        this._length = data.length;
        this._data = data;
      }
      else{
        var num = total - index - length;
        index = Math.max(index + num, 0);
        length = Math.min(length, total);
        this._data = data.slice(index, _length + index);
        this._index = index;
        this._length = length;
      }
    }
    else{
      data = data.slice(index, length + index);
      this._index = data.length ? index: 0;
      this._length = data.length;
      this._data = data;
    }
    return this;
  },

  /**
   * 提取一列数据
   * @param {String} field
   * @return {Array}
   */
  extract: function(field){
    var data = this._data;
    var rest = [];
    for(var i = 0, len = data.length; i < len; i++){
      rest.push(data[i][field]);
    }
    return rest;
  },
    
  /**
   * 包装数据
   * @param {String} field
   * @return {tesla.data.Data}
   */
  pack: function(field){
    var data = this._data;
    var newData = [];
    for(var i = 0, len = data.length; i < len; i++){
      var item = {};
      item[field] = data[i];
      newData.push(item);
    }
    return new Data(newData);
  },

  /**
   * 转换为数组
   * @param  {String} field ... 要转换的数据列不传入参数返回全部列
   * @return {Array}
   */
  toArray: function(){

    var argv = Array.toArray(arguments);
    var argc = argv.length;
    var data = this._data;

    if(argv.length){
      var rest = [];
      for(var i = 0, len = data.length; i < len; i++){
        var item = data[i];
        var newItem = {};
        for(var j = 0; j < argc; j++){
          var key = argv[j];
          newItem[ key ] = item[ key ];
        }
        rest.push(newItem);
      }
      return rest;
    }
    return data;
  }
});


