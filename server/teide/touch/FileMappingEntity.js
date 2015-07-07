/**
 * @createTime 2015-01-05
 * @author louis.chu <louistru@live.com>
 * @copyright © 2011 louis.chu, http://mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/node.js');
include('teide/touch/TouchServer.js');
include('teide/touch/APIService.js');
include('teide/touch/Console.js'); // 控制台
include('teide/touch/RevisionControlProtocol.js');

var fs = tesla.node.fsx;
var zlib = tesla.node.zlib;
var FILE_STAT = '_#_file:stat:';

var native_util = null;
try{
  native_util = process.binding('native_util');
} catch(e){ }

// var file_info_item_test_data = {
//   '_#_file:stat:': {
//     type      : 'd',      // f/d  文件/目录
//     remote_st :  0,       // 保存的远程服务器文件时间,与服务器对比如果不相同,表示服务器发生变化
//     local_st  :  0,       // 保存本地文件时间,与本地时间对比如果不相同,表示本地发生变化
//     remote_hash      : 'hash',   // 文件的hash值
//     remote_length    :  0,       // 文件的长度
//     conflict  :  false,   // 是否与本地文件有冲突
//     // A/M/D/N/!/? 信息
//   }
// };

function formatName(self, name){
  return self.format_path(name);
}

/**
 * 通过文件名称设置信息
 */
function get(name, obj) {
	var ls = name.split('/');
	var i;
	while ((i = ls.shift())) {
		obj = obj[i];
		if (!obj){
			return obj;
		}
	}
	return obj;
}

/**
 * 通过文件名称设置信息
 */
function set(name, value, obj) {
	var ls = name.split('/');
	var pop = ls.pop();
  var i;
	while ((i = ls.shift())){
	  var o = obj[i];
	  if(!o){
	    obj[i] = o = { };
	  }
	  obj = o;
	}
	obj[pop] = value;
	return obj;
}

/**
 * 获取文件信息
 */
function get_file_info(self, name){
  if(name){
    return get(name, self.m_files);
  }
  else{
    return self.m_files;
  }
}

/**
 * 获取本地文件信息
 */
function get_local_file_info(self, name){
  if(name){
    return get(name, self.m_local_files);
  }
  else{
    return self.m_local_files;
  }
}

/**
 * 获取目录信息
 */
function get_dir_info(self, name){
  var sp = split_file_name(name);
  return get_file_info(self, sp[0].join('/'));
}

/**
 * 获取本地目录信息
 */
function get_local_dir_info(self, name){
  var sp = split_file_name(name);
  return get_local_file_info(self, sp[0].join('/'));
}

/**
 * 设置文件信息
 */
function set_file_info(self, name, value){
  self.makeChange();
  if(name){
    return set(name, value, self.m_files);
  }
  else{
    self.m_files = value;
  }
}

/**
 * 设置本地文件信息
 */
function set_local_file_info(self, name, value){
  self.makeChange();
  if(name){
    return set(name, value, self.m_local_files);
  }
  else{
    self.m_local_files = value;
  }
}

/**
 * 删除本地文件信息
 */
function del_file_info(self, name){
  self.makeChange();
  var sp = split_file_name(name);
  var dir_info = get_file_info(self, sp[0].join('/'));
  if(dir_info){
    delete dir_info[sp[1]]; // 删除
  }
}

/**
 * 删除本地文件信息
 */
function del_local_file_info(self, name){
  self.makeChange();
  var sp = split_file_name(name);
  var dir_info = get_local_file_info(self, sp[0].join('/'));
  if(dir_info){
    delete dir_info[sp[1]]; // 删除
  }
}

/**
 * 验证文件名称的合法性
 */
function verify_file_name(name){
  if(!name){
    return false;
  }
  if(/[\\:]/.test(name)){
    return false;
  }
  if(verify_is_map(name)){
    return false;
  }
  return true;
}

function verify_is_map(name){
  if(/(^|\/)\.map(\/|$)/.test(name)){
    return true;
  }
  return false;
}

function verify_file_name_error(name){
  if(!verify_file_name(name)){
    throw new Error('Illegal file name "{0}"'.format(name));
  }
}

function verify_is_map_error(name){
  if(verify_is_map(name)){
    throw new Error('.map file operation not allowed');
  }
}

/**
 * 分割文件名称与目录
 */
function split_file_name(name){
  var ls = name.split('/');
  var pop = ls.pop();
  return [ls, pop];
}

/**
 * 添加文件或文件夹信息
 */
function add(self, name){
  
  var info = get_local_file_info(self, name);
  // TODO 信息已经存在,是否要删除 ?
  if(info){
    return info;
  }
  set_local_file_info(self, name, { });
  return info;
}

/**
 * 添加文件信息
 */
function add_file(self, name){
  return add(self, name);
}

/**
 * 添加目录
 */
function add_dir(self, name){
  
  if(!verify_file_name(name)){ // 名称不合法,不加入
    return;
  }
  
  if(exists(name + '/.map')){ // 如果当前目录是在其它的映射管理之下,不加入
    return;
  }
  
  // 目录存在删除旧的
  del_local_file_info(self, name);
  
  var info = add(self, name, 'd');
  
  var path = self.m_local_dir + name;
  var ls = fs.readdirSync(path);
  
  for(var i = 0; i < ls.length; i++){
    var stat = fs.statSync(path + '/' + ls[i]);
    if(stat.isFile()){
      add_file(self, name + '/' + ls[i]);
    }
    else{
      add_dir(self, name + '/' + ls[i]);
    }
  }
  
  return info;
}

/**
 * 通过名称判断是否为文本文件
 */
function is_text(name){
  var suffix = name.match(/[^\.\/]+$/)[0].toLowerCase();
  var support_find_suffix = teide.touch.APIService.support_find_suffix;
  return support_find_suffix.indexOf(suffix) != -1;
}

function gen_old_name(self, name) {
  var i = 0;
  var old_name = null;
  do {
    old_name = name.replace(/(_old\d+)?(\.[^\.\/]+$|$)/, '_old' + i + '$2');
    i++;
  } while(exists(self, old_name));
	return old_name;
}

/**
 * 合并文件并写入
 * @return 
 * 0 不需要合并
 * 1 合并有冲突
 * 2 完成合并
 */
function mergeFile(self, name, path, hash){
  
  // TODO 咋样合并呢？
  
  if(is_text(name)){
    // 读取现有的本地文件
    // var local_buff = fs.readFileSync(this.m_local_dir + name);
    // TODO 文件合并
    // TODO 暂时改名,等有时间了加上
    rename(self, self.m_local_dir + name, gen_old_name(self, name));
    rename(self, path, name);
    return 0;
  }
  else {
    // 不是文本文件把当前文件改名+ old 
    rename(self, self.m_local_dir + name, gen_old_name(self, name));
    rename(self, path, name);
  }
  return 0; // 不需要合并
}

/**
 * 获取本地文件stat
 */
function local_stat(self, name){
  return fs.statSync(self.m_local_dir + name);
}

function local_stat_async(self, name, cb){
  return fs.stat(self.m_local_dir + name, cb);
}

/**
 * 本地是否有文件
 */
function exists(self, name){
  return fs.existsSync(self.m_local_dir + name);
}

/**
 * 获取临时文件路径
 */
function gen_tmp_file_path(){
  return teide.touch.TouchServer.share().temp + tesla.guid();
}

/**
 * 更新写入文件到本地
 */
function writeFile(self, name, buff){
  fs.writeFileSync(self.m_local_dir + name, buff);
}

/**
 * 重新命名
 */
function rename(self, path, name){
  fs.renameSync(path, self.m_local_dir + name);
}

/**
 * 删除本地文件与文件夹
 */
function rm(self, name){
	fs.rmSync(self.m_local_dir + name);
	teide.touch.Console.share().log('D', formatName(self, name));
}

/**
 * 安全删除文件与文件夹
 * 只删除那些后来没有改动过的文件
 */
function safeRm(self, name){
  
  var stat = local_stat(self, name);
  
  if(stat.isFile()){ // 文件
  
    // 检查是否要删除文件
    // 文件如果后来被改动过,就不保留文件
    
    var info = get_file_info(self, name);
    if(info){
      if(info[FILE_STAT].local_st == stat.mtime.valueOf()){ // 时间相同没有变化过,删除
        fs.unlinkSync(self.m_local_dir + name);
        teide.touch.Console.share().log('D', formatName(self, name));
        return 0;
      }
      else{
        // 保留文件
        return 1;
      }
    }
    else{ // 没有记录,保留文件
      return 1;
    }
  }
  else if(!stat.isDirectory()){
    return 0;
  }
  
	var ls = fs.readdirSync(self.m_local_dir + name);
	var retain_count = 0; // 保留的文件数量
	
	for(var i = 0; i < ls.length; i++){
	  retain_count += safeRm(self, name + '/' + ls[i]);
	}
	
	if(!retain_count){ // 如果保留的文件为0就可删除文件夹,否则保留文件夹
	  fs.rmdirSync(self.m_local_dir + name); // 删除目录
	  teide.touch.Console.share().log('D', formatName(self, name));
	}
	
	return retain_count;
}

/**
 * 创建目录
 */
function mkdir(self, name){
  fs.mkdirSync(self.m_local_dir + name);
}

var I64BIT_TABLE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('');

var init_hash = 5381;

function update_hash(hash, input){
	var i = input.length - 1;
	for (; i > -1; i--)
		hash += (hash << 5) + input[i];
	return hash;
}

function digest_hash(hash){
  
  var value = hash & 0x7FFFFFFF;
	var retValue = '';
	do{
		retValue += I64BIT_TABLE[value & 0x3F];
	}
	while(value >>= 6);
	
	return retValue;
}

/**
 * 从服务更新文件
 */ 
function update_file(self, name, stat, cb){
  
  var info = get_file_info(self, name);
  var add_info = 'A'; //recovery

  if(info){
    // if(info.conflict){ // 如果之前的冲突没有解决
    //   return cb('There are conflicts need to be resolved "{0}".'.format(name));
    // }
    // 远程文件时间与本地保存的远程时间相等
    // 表示远程服务器文件没有变化
    if(stat.mtime.valueOf() == info[FILE_STAT].remote_st){
      if(exists(self, name) ||                // 本地文存在
        !get_local_file_info(self, name)) {   // 已标记为删除
        return cb(); // 不需要更新
      } else { // 恢复文件
        add_info = 'R';
      }
    } else {
      // 本地的保存的类型如果为f
      if(info[FILE_STAT].type == 'f'){
        var local = get_local_file_info(self, name);
        if(!local){ // 本地文件已经删除
          info[FILE_STAT].remote_st = stat.mtime.valueOf(); // 更新远程时间
          self.makeChange(); // 标记
          // 直接退出
          return cb();
        }
      }
    }
  }
  
  // 下载文件完成调用
  function download_ok(path, hash, size){
    
    var new_info = { };
    
    new_info[FILE_STAT] = {
      type          : 'f',
      remote_st     : stat.mtime.valueOf(),  // 更新远程时间
      local_st      : info ? info[FILE_STAT].local_st.valueOf() : 0, // 不修改保存的本地时间
      remote_hash   : hash,
      remote_length : size
    };
    set_file_info(self, name, new_info);
    set_local_file_info(self, name, { });
    
    // 本地有文件
    if(exists(self, name)){
      // 本地的文件
      var l_stat = local_stat(self, name);
      if(l_stat.isFile()){
        
        if(info && info[FILE_STAT].local_st == l_stat.mtime.valueOf()){
          // 时间相同,表示本地没发生过任何改变,可直接替换
          // 重新命名文件
          rename(self, path, name);
          // 更新本地时间
          new_info[FILE_STAT].local_st = local_stat(self, name).mtime.valueOf();
        }
        else{ // 本地文件被修改过或第一次更新,需合并文件
          var rest = mergeFile(self, name, path, hash); 
          if(rest === 0){  
            // 不需要合并,表示当前文件与线上件相同,也不需要提交变化,所以保存相同的本地时间
            new_info[FILE_STAT].local_st = local_stat(self, name).mtime.valueOf();
          }
          else if(rest == 1) { // 合并有冲突
            new_info[FILE_STAT].conflict = true;
          }
          else { // 完成合并
            
          }
        }
        teide.touch.Console.share().log('U', formatName(self, name));
        return cb();
      }
      else{ // 
        if(info && info[FILE_STAT].type == 'd'){
          // 如果原来的线上也是文件夹，就可以直接删除
          // 暂时还没有想到其它办法(也许可以改名本地的这个文件夹)
          rm(self, name);
          teide.touch.Console.share().log('D', formatName(self, name));
        }
        else{
          // 悲剧,原来的位置是一个文件夹,不在管理中
          // 只能异常退出
          var error = $r('{@无法合并本地目录与线上文件,请先删除本地目录}"{0}"').format(name)
          teide.touch.Console.share().error('Error', error);
          return cb(error);
        }
      }
    }
    
    // recovery
    
    teide.touch.Console.share().log(add_info, formatName(self, name));
    
    // 重新命名文件
    rename(self, path, name);
    // 更新本地时间
    new_info[FILE_STAT].local_st = local_stat(self, name).mtime.valueOf();
    cb();
  }
  
  // 开始下载文件内容
  self.readFile(name, function(err, socket){
    
    if(err){
      teide.touch.Console.share().error('Error', formatName(self, name));
      return cb(err);
    }
    
    var error = null;
    var size = 0;
    var tmp_path = gen_tmp_file_path();
    var write_stream = fs.createWriteStream(tmp_path);
    
    function error_handle(err){
      if(write_stream){
        write_stream.destroy();
        if(exists(tmp_path)){
          fs.rmSync(tmp_path); // 删除
        }
      }
      error = err;
      if(socket.destroy){
        socket.destroy();
      }
      return cb(err);
    }
    
    write_stream.on('error', error_handle);
    
    var hash = init_hash;
    
    socket.on('data', function(buff){
      write_stream.write(buff);
      if(!native_util){ // 
        hash = update_hash(hash, buff);
      }
      size += buff.length;
    });
    
    socket.on('end', function(){
      if(!error){
        write_stream.end();
        nextTick(function(){
          hash = native_util ? // 使用native获取hash,速度更快
            native_util.request_get_file_hash(tmp_path) : digest_hash(hash);
          download_ok(tmp_path, hash, size);
        });
      }
    });
    
    socket.on('error', error_handle);
  });
}

/** 
 * 从服务器更新目录
 */
function update_dir(self, name, cb, end_cb){
  
  var info = get_file_info(self, name);
  var local = get_local_file_info(self, name);
  
  if(info){
    // 本地的保存的类型如果为d
    if(info[FILE_STAT].type == 'd'){
      if(!local){
        // 文件夹已经删除
        // 直接退出
        return cb();
      }
    }
  }
  
  var ls;
  
  function callback(err){
    
    if(err){
      // 处理异常
      return end_cb(err);
    }
    if(!ls.length){
      return cb();
    }
    
    var stat = ls.shift();
    // 文件夹
    var path = (name ? name + '/' + stat.name : stat.name);
    
    if(stat.isFile()){
      update_file(self, path, stat, callback);
    }
    else{
      
      mkdir(self, path); // 创建本地目录
      
      //if(exists(path + '/.map/conf.keys')){ // 这个目录存在冲突
      if(exists(path + '/.map')){ // 这个目录存在冲突
        end_cb($r('"{0}" {@目录存在冲突,这个目录被其它映射占用无法更新}').format(path));
      }
      else{
        update_dir(self, path, callback, end_cb);
      }
    }
  }
  
  self.readdir(name, function(err, data){
    
    if(err){
      return end_cb(err);
    }
    
    ls = data;
    
    if(info){
      
      if(info[FILE_STAT].type == 'd'){
        
        for(var j in info){
          if(j != FILE_STAT){
            if(ls.innerIndexOf('name', j) == -1){ 
              // 没有找到,表示已经服务器删除
              
              var path = (name ? name + '/' + j : j);
              
              if(exists(self, path)){ 
                // 这些文件是否要删除
                // 如果某些文件后来被改动过,可以不用删除
                safeRm(self, path); // 安全删除
              }
              
              del_file_info(self, path);
              del_local_file_info(self, path);
            }
          }
        }
      }
    }
    else{
      set_file_info(self, name, { '_#_file:stat:': { type : 'd', remote_st: 0 } });
    }
    
    if(!local){ // 
      set_local_file_info(self, name, { });
    }
    
    callback();
  });
}

/**
 * 遍历Obj
 */
function eachObj(name, obj, cb){

  if(cb(name, obj) === false){
    // 不进入内部
    return;
  }
  for(var key in obj){
    if(key != FILE_STAT){
      var n_name = (name ? name + '/' + key : key);
      var ch_obj = obj[key];
      eachObj(n_name, ch_obj, cb);
    }
  }
}

/**
 * 遍历
 */
function each(self, name, cb){
  var obj = get_file_info(self, name);
  if(obj){
    eachObj(name, obj, cb);
  }
}

/**
 * 遍历本地
 */
function eachLocal(self, name, cb){
  var obj = get_local_file_info(self, name);
  if(obj){
    eachObj(name, obj, cb);
  }
}

/**
 * @class teide.touch.FileMappingStat
 */
Class('teide.touch.FileMappingStat', {
  
  /**
   * @private
   */
  m_type: 'f', // f|d
  
  /**
   * @private
   */
  m_name: '',
  
  /**
   * @private
   */
  m_mtime: null,
  
  /**
   * @private
   */
  m_size: 0,
  
  /**
   * @constructor
   */
  FileMappingStat: function(name, type, mtime, size){
    this.m_type = type;
    this.m_name = name;
    this.m_mtime = mtime;
    this.m_size = size;
  },
  
  get type(){
    return this.m_type;
  },
  
  get name(){
    return this.m_name;
  },
  
  get mtime(){
    return this.m_mtime;
  },
  
  get size(){
    return this.m_size;
  },
  
  /**
   * 是否为文件
   */
  isFile: function(){
    return this.m_type == 'f';
  },
  
  /**
   * 是否为目录
   */
  isDirectory: function(){
    return this.m_type == 'd';
  }
  
});

/**
 * 文件stat读取器
 * @class FileMappingStatReader
 */
var FileMappingStatReader = Class('FileMappingStatReader', {
  
  /**
   * @private
   */
  m_cache: null,
  
  /**
   * @private
   */
  m_mapping_entity: null,
  
  /**
   * @constructor
   */
  FileMappingStatReader: function(mapping_entity){
    this.m_cache = { };
    this.m_mapping_entity = mapping_entity;
  },
  
  /**
   * 读取文件stat
   */
  stat: function(name, cb){
    
    if(!verify_file_name(name)){
      return cb(new Error($r('{@非法文件名} "{0}"').format(path)));
    }
    
    var sp = split_file_name(name);
    var dir = sp[0].join('/');
    var cache = this.m_cache;
    var obj = cache[dir];
    
    if(obj){
      return cb(null, obj[sp[1]]);
    }
    
    var self = this;
    
    /**
     * 读取目录信息
     */
    this.m_mapping_entity.readdir(dir, function(err, ls){
      if(err){
        //return cb(err);
        ls = [];
      }
      var obj = { };
      for(var i = 0; i < ls.length; i++){
        var item = ls[i];
        obj[item.name] = item;
      }
      cache[dir] = obj;
      cb(null, obj[sp[1]]);
    });
  }
});

/**
 * 查询冲突
 */
function query_conflict(self, name, out, count){
  
  var info = get_file_info(self, name);
  
  if(info[FILE_STAT].conflict){ // 有冲突
    out.push(name);
  }
  
  if(info[FILE_STAT].type == 'd'){ // 文件夹
    
    for(var i in info){
      
      if(i != FILE_STAT){
        query_conflict(self, name ? name + '/' + i : i, out, count);
        
        if(out.length > count){
          return;
        }
      }
    }
  }
}

/**
 * 获取本地文件hash与长度还有时间
 */
function get_file_hash_length_mtime(self, name, cb){
  
  if(native_util){
    // 使用native获取hash,速度更快
    var hash = native_util.request_get_file_hash(self.m_local_dir + name);
    var stat = local_stat(self, name);
    return cb(null, { hash: hash, length: stat.size, mtime: stat.mtime });
  }
  
  var read = fs.createReadStream(self.m_local_dir + name);
  var hash = init_hash;
  
  read.on('data', function(buff) {
		hash = update_hash(hash, buff);
	});
	
	read.on('end', function() {
		hash = digest_hash(hash);
		var stat = local_stat(self, name);
		cb(null, { hash: hash, length: stat.size, mtime: stat.mtime });
	});
	
	read.on('error', function error(err) {
		read.destroy();
		cb(err);
	});
}

/**
 * 更新文件info信息
 */
function update_file_info(self, name, local_data, cb){
  
  function callback(err, data){

    if(err){
      return cb(err);
    }

    // console.log('test update_file_info', data, data.mtime);
    
    var info = { '_#_file:stat:': {
      type          : 'f',
      remote_st     : 0,
      local_st      : data.mtime.valueOf(),
      remote_hash   : data.hash,
      remote_length : data.length
    } };
    
    // 读取远程文件信息
    self.stat(name, function(err, stat){
      if(err){
        return cb(err);
      }
      info[FILE_STAT].remote_st = stat.mtime.valueOf(); // 更新远程时间
      set_file_info(self, name, info);
      cb();
    });
  }
  
  if(local_data){
    callback(null, local_data);
  }
  else{
    get_file_hash_length_mtime(self, name, callback);
  }
}

/**
 * 写入文件到服务器
 */
function writeFileToServer(self, name, cb){
  self.writeFile(name, self.m_local_dir + name, cb);
}

/**
 * 提交添加的新文件到服务器
 * @private
 */
function submit_add(self, add, stat_reader, cb){

  function shift(err){
    
    if(err){
      return cb(err);
    }
    if(!add.length){
      return cb();
    }
    
    var item = add.shift();
    var name = item.name;
    var info = item.info;
    
    if(!exists(self, name)){ // 检查本地文件是否存在
      // 文件不存在
      del_local_file_info(self, name); // 删除
      //teide.touch.Console.share().log('The file does not exist', formatName(self, name));
      teide.touch.Console.share().log($t('文件不存在'), formatName(self, name));
      return shift();
    }
    
    var stat = local_stat(self, name);

    teide.touch.Console.share().log('Adding', formatName(self, name));
    
    if(stat.isDirectory()){ // 创建新文件夹
      
      self.mkdir(name, function(err){
        if(err){
          return cb(err);
        }
        // 设置
        set_file_info(self, name, { '_#_file:stat:': { type : 'd', remote_st: 0 } }); 
        shift();
      });
      return;
    }
    
    // teide.touch.Console.share().log('Adding', formatName(self, name));
    
    // put文件
    stat_reader.stat(name, function(err, stat){
      
      if(err){
        return cb(err);
      }
      
      if(stat){
        // 服务器上有这个文件
        // 抛出异常,需要先更新文件
        var msg = 
          $r('{@写入文件到服务错误,服务器有新版本请先更新这个文件} {0}')
          .format(formatName(self, name));
        cb(msg);
      }
      else{ // 服务器上没有这个文件
        // 先尝试写入文件,如果失败在尝试创建一个文件夹
        writeFileToServer(self, name, function(err){
          
          if(!err){
            // 写入成功
            // 更新信息
            return update_file_info(self, name, null, shift);
          }
          
          var sp = split_file_name(name);
          var dir = sp[0].join('/');
          
          if(!dir){
            // 没有目录没法创建目录
            return cb(err); // 异常退出
          }
          
          self.mkdir(dir, function(err){
            if(err){
              // 创建目录失败
              return cb(err);
            }
            // 在次尝试写入文件
            writeFileToServer(self, name, function(err){
              if(err){
                return cb(err);
              }
              // 更新信息
              update_file_info(self, name, null, shift);
            });
          });
        });
      }
    });
  }
  
  shift();
}

/**
 * 提交更新的文件到服务器
 * @private
 */
function submit_up(self, up, stat_reader, cb){
  
  function shift(err){
    
    if(err){
      return cb(err);
    }
    if(!up.length){
      return cb();
    }
    
    var item = up.shift();
    var name = item.name;
    var info = item.info;
    
    // 读取文件hash
    get_file_hash_length_mtime(self, name, function(err, data){
      
      if(err){
        return cb(err);
      }
      
      if(info[FILE_STAT].remote_hash == data.hash){ // 文件hash相同
        // 不需要更新
        info[FILE_STAT].local_st = data.mtime.valueOf(); //
        self.makeChange();
        shift();
        return;
      }
      
      teide.touch.Console.share().log('Sending', formatName(self, name));
      
      // 开始写入到服务器
      // 先检查服务器是否有改动
      // 如果服务器有改动,抛出异常告诉用户需要先更新文件
      // 读取服务器文件stat信息
      stat_reader.stat(name, function(err, stat){
        
        if(err){
          return cb(err);
        }
        
        if(stat){
          
          if(info[FILE_STAT].remote_st != stat.mtime.valueOf()){
            // 服务器上保存的文件时间与本地不相同
            // 服务器上文件已更改过请先更新文件,抛出异常告诉用户先更新
            var msg = 
              $r('{@写入文件到服务错误,服务器文件已更改过请先更新文件} {0}')
              .format(formatName(self, name));
            cb(msg);            
          }
          else{
            // 服务器没有改动过,可以提交.
            // 写入文件到服务器
            writeFileToServer(self, name, function(err){
              if(err){
                return cb(err);
              }
              // 更新信息
              update_file_info(self, name, data, shift);
            });
          }
        }
        else{
          // 服务器上没有这个文件
          // 文件已经删除了,抛出异常告诉用户先更新
          var msg = 
            $r('{@写入文件到服务错误,服务器文件已被删除请更新文件所在的目录} {0}')
            .format(formatName(self, name));
          cb(msg);
        }
      });
    });
  }
  
  shift();
}

/**
 * 提交删除的文件到服务器
 */
function submit_del(self, del, stat_reader, cb){
    
  function shift(err){
    
    if(err){
      return cb(err);
    }
    if(!del.length){
      return cb();
    }
    
    var item = del.shift();
    var name = item.name;
    var info = item.info;
    
    teide.touch.Console.share().log('Deleting', formatName(self, name));
    
    // 先读取服务器文件stat信息
    stat_reader.stat(name, function(err, stat){
      if(err){
        return cb(err);
      }
      
      if(stat){
        
        var is_dir1 = stat.isDirectory();
        var is_dir2 = info[FILE_STAT].type == 'd';
        
        if(is_dir1 === is_dir2){ // 本地与服务器的文件类型必需相同
          
          self[is_dir1 ? 'rmdir': 'rm'](name, function(err){
            if(err){
              return cb(err);
            }
            del_file_info(self, name); // 删除信息
            shift();
          });
        }
        else{ // 否则抛出异常
          var msg = 
            $r('{@删除服务器文件错误,文件已改变请更新文件所在的目录} {0}').format(name);
          cb(msg);
        }
      }
      else{
        // 文件不存在,不用理会
        del_file_info(self, name); // 删除信息
        shift();
      }
    });
  }
  
  shift();
}

/**
 * 创建安全cb
 * 对像如果释放后不会调用cb
 * @private
 */
function create_safe_callback(self, cb){
  
  var id = tesla.guid();
  var cb2 = function(err, data, candel) {

    if (!self.m_action_handle_cb[id]) return;
    delete self.m_action_handle_cb[id];

    if (candel) {     // 取消
      return cb && cb(null, null, true);
    }
    if (err) {
      return throwError(err, cb);
    }
    if (cb) {
      cb.apply(null, arguments);
    }
  };
  
  self.m_action_handle_cb[id] = cb2;
  return cb2;
}

/**
 * @class teide.touch.FileMappingEntity
 */
Class('teide.touch.FileMappingEntity', teide.touch.RevisionControlProtocol, {
  
  /**
   * 是否尝试连接中
   * @private
   */  
  m_connect: false,

  /**
   * ready status
   * @type Boolean
   */
  m_is_ready: false,
  
  /**
   * 
   */
  m_ready_cb: null,
  
  /**
   * 实体
   */
  m_entity: null,
  
  /**
   * 文件信息
   */
  m_files: null,
  
  /**
   * 本地的文件信息
   */
  m_local_files: null,

  /**
   * 是否变化
   */
  m_change: false,
  
  m_file_action_handle: null,
  m_action_handle_cb: null,
  
  /**
   * @constructor
   * @param {String} local_dir
   * @param {String} config
   */
  FileMappingEntity: function(local_dir, config){
    this.RevisionControlProtocol(local_dir, config);
    this.m_file_action_handle = { };
    this.m_action_handle_cb = { };
    
    try {
      this.m_entity = 
        JSON.parse(fs.readFileSync(this.local_dir + '.map/entity').toString('utf-8'));
    } catch(err) {
      this.m_entity = {
        files: { '_#_file:stat:': { type : 'd', remote_st: 0 } },
        local_files: { }
      };
    }
    this.m_files = this.m_entity.files;
    this.m_local_files = this.m_entity.local_files;
    this.m_ready_cb = [];
  },
  
  /**
   * 做出改变
   * 标记变化,释放对像时会保存实体文件
   */
  makeChange: function(){
    this.m_change = true;
  },
  
  /**
   * 获取是否准备
   */
  get isReady() {
    return this.m_is_ready;
  },
  
  /**
   * 保存到本地
   */
  save: function(){
    
    if(!this.m_change){
      return;
    }
    //
    var map_dir = this.m_local_dir + '.map';
    var entity_path = this.m_local_dir + '.map/entity';
    //
    fs.mkdirSync(map_dir);
    fs.writeFileSync(entity_path, JSON.stringify(this.m_entity));
    
    this.m_change = false;
  },
  
  /**
   * 查询变更
   */
  query_modify: function(name){
    
    if(name !== ''){ // 更新根目录
      if(!verify_file_name(name)){
        return { add: [], del: [], up: [] };
      }
    }
    
    var add = [];
    var del = [];
    var up = [];
    var self = this;
    
    // 删除
    each(this, name, function(name, info){
      
      if(!get_local_file_info(self, name)){
        // 被删除了
        del.push({ name: name, info: info });
        return false;
      }
    });
    
    // 添加
    eachLocal(this, name, function(name, info){
      // 添加新的
      if(!get_file_info(self, name)){
        add.push({ name: name, info: info });
      }
    });
    
    // 更新
    each(this, name, function(name, info){
      if(info[FILE_STAT].type == 'f'){ //
      
        if(get_local_file_info(self, name) && exists(self, name)){ // 文件要存在才能叫更改
          var stat = local_stat(self, name);
          if(info[FILE_STAT].local_st != stat.mtime.valueOf()){
            // 时间不相同需要进一步验证是不是有改变
            up.push({ name: name, info: info });
          }
        }
      }
    });
    
    return { add: add, del: del, up: up };
  },
  
  /**
   * 通过文件名称查询信息
   */
  info: function(name){
    return get_file_info(this, name);
  },
  
  /**
   * 通过文件名称查询本地信息
   */
  localInfo: function(name){
    return get_local_file_info(this, name);
  },
  
  /**
   * 添加文件或目录
   */
  add: function(path, cb){
    
    if(!verify_file_name(path)){
      return throwError($r('{@非法文件名} "{0}"').format(path), cb);
    }
    
    path = path.replace(/\/?$/, '');
    
    if(!get_local_dir_info(this, path)){ // 如果没有目录信息,直接退出
      return cb && cb();
    } 
    
    try{
      var stat = fs.statSync(this.m_local_dir + path);
      if(stat.isFile()){
        add_file(this, path);
      }
      else{
        add_dir(this, path);
      }
    }
    catch(err){
      teide.touch.Console.share().error(err);
    }
    cb && cb();
  },
  
  /**
    * 从服务器更新
    */
  update: function(path, cb){
    
    cb = create_safe_callback(this, cb);
    
    // TODO 
    if(path !== ''){ // 更新根目录
      if(!verify_file_name(path)){
        return throwError($r('{@非法文件名} "{0}"').format(path), cb);
      }
    }
    
    var self = this;

    function callback(err, data){
      
      if(err){
        teide.touch.Console.share().error('Error', formatName(self, path));
        return cb(err);
      }
      if(cb){
        teide.touch.Console.share().log('Done', formatName(self, path));
        cb(err, data);
      }
    }
    
    path = path.replace(/\/?$/, '');
    
    teide.touch.Console.share().log('Start update', formatName(self, path));
    
    local_stat_async(self, path, function(err, stat){
      
      if(err){
        return callback(err);
      }
      
      if(stat.isFile()){
        if(path === ''){
          callback($t('目标不是目录'));
        }
        else{
          self.stat(path, function(stat){ // 远程文件信息
            update_file(self, path, stat, callback);
          }.cb(cb));
        }
      }
      else{
        update_dir(self, path, callback, callback);
      }
    });
  },
  
  /**
    * 将变化提交到服务器
    */
  commit: function(path, cb){
    
    cb = create_safe_callback(this, cb);
    
    var self = this;
  
    // TODO 
    teide.touch.Console.share().log('Start submit', formatName(self, path));
    
    var data = self.query_modify(path);
    var stat_reader = new FileMappingStatReader(self);

    submit_add(self, data.add, stat_reader, function(err){

      if(err){
        teide.touch.Console.share().error('Error', err);
        return cb(err);
      }
      
      submit_up(self, data.up, stat_reader, function(err){

        if(err){
          teide.touch.Console.share().error('Error', err);
          return cb(err);
        }
        
        submit_del(self, data.del, stat_reader, function(err){

          if(err){
            teide.touch.Console.share().error('Error', err);
            return cb(err);
          }
          
          teide.touch.Console.share().log('Done');
          cb();
        });
      });
    });
  },
  
  /**
    * 删除文件或目录
    */
  remove: function(path, cb){
    
    if(!verify_file_name(path)){
      return throwError($r('{@非法文件名} "{0}"').format(path), cb);
    }
    
    var info = get_local_file_info(this, path);
    // 文件信息存在,可删除
    if(info){
      del_local_file_info(this, path);
    }
    
    var self = this;
    var id = tesla.guid();
    this.m_file_action_handle[id] = fs.rm(this.local_dir + path, function(err, data, cancel){
      delete self.m_file_action_handle[id];
      cb && cb(err, data, cancel);
    });
  },
  
  /**
    * 重命名文件或目录
    */
  rename: function(path, new_path, cb){
    
    if(!verify_file_name(path) || !verify_file_name(new_path)){
      return throwError($r('{@非法文件名} "{0}"').format(path), cb);
    }
    
    var old_info = get_local_file_info(this, path);
    
    if(old_info){ // 只有存在才能改名
    
      del_local_file_info(this, path); // 删除原来位置
      
      var new_info = get_local_file_info(this, new_path);
      
      // 新位置如果原来就有,不做处理
      if(!new_info){
        set_local_file_info(this, new_path, old_info);
      }
      else{
        teide.touch.Console.share().error('Unknown error');
      }
    }
    fs.rename(this.local_dir + path, this.local_dir + new_path, cb);
  },
  
  /**
    * 清理
    */
	cleanup: function(path, cb){
    cb && cb();
	},
	
  /**
    * 解决冲突
    */
	resolved: function(path, cb){
    var info = get_file_info(this, path);
    if(info[FILE_STAT].conflict){
      delete info[FILE_STAT].conflict;
    }
    cb && cb();
	},
	
  /**
    * 恢复文件
    */ 
	revert: function(path, cb) {
    cb && cb();
	},
  
  /** 
    * 状态信息
    */
	status: function(path, cb){ 
    cb && cb();
	},
  
  /**
    * 解锁
    */
	unlock: function(path, cb) {
    cb && cb();
	},
  
	/**
	  * 释放对像
	  */
	release: function() {
    this.save();
    this.cancel();
	},

  // 取消操作
  cancel: function() {

    this.close();

    for(var i in this.file_action_handle){
      this.m_file_action_handle[i].cancel(); // 取消
    }
    for(var i in this.m_action_handle_cb){
      this.m_action_handle_cb[i](null, null, true); // 取消
    }
    this.m_action_handle_cb = { };
    this.m_file_action_handle = { };
  },
	
  /**
    * 通过文件名称获取文件状态码
    */
  stat_code: function (path) {
    
    if(verify_is_map(path)){
      return 'I';
    }

    var info = get_file_info(this, path);
    var local_info = get_local_file_info(this, path);

    if(info){
      
      if(info[FILE_STAT].conflict){
        return '!'; // 冲突标识
      }
      
      if(local_info){
        // 查询变更
        if(info[FILE_STAT].type == 'f'){ //
          var stat = local_stat(this, path);
          if(info[FILE_STAT].local_st != stat.mtime.valueOf()){
            return 'M'; // 变更标识
          }
        }
        return 'S';
      }
      else{
        return 'D'; // 删除标识
      }
    }
    else if(local_info){
      return 'A'; // 添加标识
    }
    
    return '?'; // 没有管理的标识
  },
	
	/**
	  * 查询冲突列表
	  */
	conflict_list: function(path, cb){
	  
    if(path !== ''){ // 更新根目录
      if(!verify_file_name(path)){
        return throwError($r('{@非法文件名} "{0}"').format(path), cb);
      }
    }
    
    var self = this;
    var data = [];
    var info = get_file_info(this, path);
    
    if(info){
      query_conflict(this, path, data, 10); // 查询最多10个冲突
    }

    var m_console = teide.touch.Console.share();
    if(data.length){
      m_console.log('Conflict list:');
    }
    for(var i = 0; i < data.length; i++){
      data[i] = self.format_path(data[i]);
      m_console.log('!', data[i]);
    }
    cb(null, data);
	},
	
	/**
	  * 查询是否存在冲突
	  */
	is_conflict: function(path, cb){
    if(path !== ''){ // 更新根目录
      if(!verify_file_name(path)){
        return throwError($r('{@非法文件名} "{0}"').format(path), cb);
      }
    }
    var data = [];
    var info = get_file_info(this, path);
    
    if(info){
      query_conflict(this, path, data, 1);
    }
    cb(null, data.length > 0);
	},
	
  /**
    * 测试当前映射的连接是否有效
    */
  test: function(cb){
    cb = create_safe_callback(this, cb);
    this.ready(function(err){
      cb(err, !err);
    });
  },
  
  /**
    * 准备
    */
  ready: function(cb){
    // 
    if(this.m_is_ready){
      return cb && cb();
    }
    
    if(cb){
      this.m_ready_cb.push(cb);
    }
    
    if(this.m_connect){ // 正在连接中
      return;
    }
    
    var self = this;
    this.m_connect = true;
    
    // 连接
    this.connect(function(err){
      
      var cb = self.m_ready_cb;
      
      self.m_connect = false;
      self.m_is_ready = !err;
      self.m_ready_cb = [];
      
      for(var i = 0; i < cb.length; i++){
        cb[i](err);
      }
    });
  },
  
  /**
    * 关闭
    */
  close: function(){
    this.m_is_ready = false;
    this.m_connect = false;
  },
  
  /**
    * 连接到服务器
    */
  connect: function(cb){ },
  
  /**
    * 读取服务器文件目录
    * @virtual
    */
  readdir: function(name, cb){ },
  
  /**
    * 读取服务器文件信息
    * @virtual
    */
  stat: function(name, cb){ },
  
  /**
    * 从服务器读取文件
    * @virtual
    */
  readFile: function(name, cb){ },
  
  /**
    * 写入文件到服务器
    * @virtual
    */
  writeFile: function(name, input, cb){ },
  
  /**
    * 在服务器创建目录
    * @virtual
    */
  mkdir: function(name, cb){ },
  
  /**
    * 删除服务器文件
    * @virtual
    */
  rm: function(name, cb){ },
  
  /**
    * 删除目录
    * @virtual
    */
  rmdir: function(name, cb){ },
  
});
