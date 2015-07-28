/**
 * @createTime 2015-01-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/node.js');
include('teide/touch/KeysDataParser.js');
include('teide/touch/FTP.js');
include('teide/touch/SFTP.js');
include('teide/touch/SVN.js');
include('teide/touch/GIT.js');
include('teide/touch/Baidu.js');
include('teide/touch/Dropbox.js');
include('teide/touch/ScriptService.js');

var is_support_high = teide.touch.ScriptService.is_support_high;
var KeysDataParser = teide.touch.KeysDataParser;
var fs = tesla.node.fsx;

/**
 * 通过类型获取构造器
 */
function get_constructor(type){
  
  switch (type) {
    case 'ftp':
      return teide.touch.FTP;
    case 'sftp':
      return teide.touch.SFTP;
    case 'svn':
      if(teide.touch.SVN.is_support()){
        return teide.touch.SVN;
      } else {
        return null;
      }
    case 'git':
      // return teide.touch.GIT;
      return null;
    case 'baidu':
      // return teide.touch.Baidu;
      return null;
    case 'dropbox':
      // return teide.touch.Dropbox;
      return null;
    default: 
      return null;
  }
}

/**
 * 文件是否存在
 */
function file_exists(self, name){
  return fs.existsSync(self.documentsPath + name);
}

/**
 * 获取文件stat
 */
function fileStat(self, name){
  return fs.statSync(self.documentsPath + name);
}

/**
 * 名称是否为.map文件
 */
function verify_is_map(name){
  if (/(^|\/)\.map(\/|$)/.test(name)) {
    return true;
  }
  return false;
}

function has_error(self, entity, cb) {
  if (entity.error) {
    cb('Parser conf.keys file error, {0}'.format(entity.error.message));
    return false;
  } else {
    return true;
  }
}

/**
 * 
 * @class teide.touch.RevisionControlService
 */
Class('teide.touch.RevisionControlService', {
  
  m_file_action_handle: null,
  
  /**
	 * 文档根路径
	 */
  m_documentsPath: '',
  
  /**
   * 
   */
  m_mapping_entity: null,
  
  /**
   * @constructor
   */
  RevisionControlService: function(documentsPath) {
    this.m_documentsPath = documentsPath;
    this.m_mapping_entity = { };
    this.m_file_action_handle = { };
  },
  
  /**
   * 获取文档根路径
   */
  get documentsPath() {
    return this.m_documentsPath;
  },
  
  /**
   * 通过文件名称获取文件所属的控制器
   * 如果文件不在控制器内部,返回null
   * @return {teide.touch.FileMappingEntity}
   */
  get_revision_control: function(name) {
    
    if (!name || verify_is_map(name)) return null;
    
    if (file_exists(this, name)) {
      name = name.replace(/\/?$/, fileStat(this, name).isDirectory() ? '/' : '');
    } else {
      name = name.replace(/\/?$/, '');
    }
    
    var mapping_entity = this.m_mapping_entity;
    var ls = name.split('/');
    
    while (ls.length) {
      ls.pop();
      var path = ls.join('/') + (ls.length ? '/' : '');
      var entity = mapping_entity[path];
      var name2 = name.substr(path.length);
      if (entity) { // 查找缓存
        return { entity: entity, name: name2 };
      }
      
      var keys_path = path + '.map/conf.keys';
      
      if (file_exists(this, keys_path)) {
        var conf = null;
        try {
          conf = KeysDataParser.parseFile(this.documentsPath + keys_path);
        } catch (err) { // 解析异常
          return { error: err, name: name2 };
        }
        var constructor = get_constructor(conf.type);
        if (constructor) {
          entity = new constructor(this.documentsPath + path, conf);
          mapping_entity[path] = entity;
          return { entity: entity, name: name2 };
        }
      }
    }
    return null;
  },
  
  /**
   * 文件状态代码
   */
  stat_code: function(name) {
    var entity = this.get_revision_control(name);
    
    if (entity) {
      if (entity.error) { // 解析异常
        return { mark: 'S', root: entity.name == '' };
      }
      var code = entity.entity.stat_code(entity.name);
      var rev = { mark: code == '?' && entity.name == '' ? 'S' : code };
      if (entity.name == '') { // 根目录
        rev.root = true;
      }
      return rev;
    } else {
      return { mark: 'I' };
    }
  },
  
  /**
   * 添加文件
   */
  add: function(name, cb) {
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.add(entity.name, cb);
      }
    } else {
      cb && cb(); 
    }
  },
  
  /**
   * 重命名文件
   */
  rename: function(old_name, new_name, cb) {
    
    var old_entity = this.get_revision_control(old_name);
    var new_entity = this.get_revision_control(new_name);
    var root = this.documentsPath;
    
	  if (old_entity && !old_entity.error &&
	      new_entity && !new_entity.error &&
	      old_entity.entity === new_entity.entity) {
      if (old_entity.entity.stat_code(old_entity.name) == '?') { // 文件不在控制范围
        fs.rename(root + old_name, root + new_name, cb);
      } else {
        new_entity.entity.rename(old_entity.name, new_entity.name, cb);
      }
	  } else {
      // 如果不在一个实体中可直接改名,不做任何处理
	    fs.rename(root + old_name, root + new_name, cb);
    }
  },
  
  /**
   * 删除文件
   */
  remove: function(name, cb) {
    var entity = this.get_revision_control(name);
    
    if (entity && !entity.error) {
      entity.entity.remove(entity.name, cb);
    } else {
      var self = this;
      var id = tesla.guid();
      this.m_file_action_handle[id] = 
      fs.rm(this.documentsPath + name, function(err, data, cancel){
        delete self.m_file_action_handle[id];
        cb && cb(err, data, cancel);
      });
    }
  },
  
  /**
   * 解决冲突
   */
  resolved: function(name, cb) {
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.resolved(entity.name, cb);
      }
    } else {
      cb && cb();
    }
  },
  
  /**
   * 通过名称查询冲突
   */
  conflict_list: function(path, cb) {
    var entity = this.get_revision_control(path);
    if (entity && !entity.error) {
      entity.entity.conflict_list(entity.name, cb);
    } else {
      cb(null, []);
    }
  },
  
  /**
   * 更新文件或文件夹
   */
  update: function(name, cb) {
    if (!is_support_high()) {
      return cb && cb({ message: $t('只有Ph与Pro版本才有此功能'), code: 109 });
    }
    
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.update(entity.name, cb);
      }
    } else {
      cb && cb();
    }
  },
  
  /**
   * 将变化提交到服务器
   */
  submit: function(name, cb) {
    if (!is_support_high()) {
      return cb && cb({ message: $t('只有Ph与Pro版本才有此功能'), code: 109 });
    }
    
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.commit(entity.name, cb);
      }
    } else {
      cb && cb();
    }
  },
  
  /**
   * 测试当前映射是否有效
   */
  test: function(name, cb) {
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.test(cb);
      }
    } else {
      cb(null, false);
    }
  },

  unlock: function(name, cb){
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.unlock(entity.name, cb);
      }
    } else {
      cb && cb();
    }
  },

  cleanup: function(name, cb){
    var entity = this.get_revision_control(name);
    if (entity) {
      if (has_error(this, entity, cb)) {
        entity.entity.cleanup(entity.name, cb);
      }
    } else {
      cb && cb();
    }
  },
  
  /**
   * 释放管理器并把变更的数据保存
   */
  release: function() {
    for (var i in this.m_mapping_entity) {
      this.m_mapping_entity[i].release(); // 释放
    }
    this.cancel();
  },
  
  /**
    * 取消所有操作
    */
  cancel: function() {
    var mapping_entity = this.m_mapping_entity;
    var file_action_handle = this.m_file_action_handle;
    
    for (var i in mapping_entity) {
      mapping_entity[i].cancel(); // 取消
    }
    for (var i in file_action_handle) {
      file_action_handle[i].cancel(); // 取消
    }
    this.m_mapping_entity = { }; // 清空
    this.m_file_action_handle = { }; // 清空
  },
  
});