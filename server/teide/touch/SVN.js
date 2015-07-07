/**
 * @createTime 2015-06-06
 * @author louis.chu <louistru@live.com>
 * @copyright © 2011 louis.chu, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/Console.js');
include('tesla/node.js');
include('teide/touch/RevisionControlProtocol.js');

var fs = tesla.node.fsx;
var Subversion = null;

try {
  Subversion = process.binding('native_svn').Subversion;
} catch(err) { }

function init_user_and_passwd(self){
	if(self.m_init_user) return;
	self.m_init_user = true;
  self.m_svn.set_user(self.user);
  self.m_svn.set_passwd(self.passwd);
}

function is_checkout_and_error(self, cb){
  if (fs.existsSync(self.local_dir + '.map/wc.db')) { // 没有这个文件需要checkout
    return false;
  }
  if(cb){
  	cb($t('无法完成操作,请先更新svn根目录.'));
  }
  return true;
}

// teide.touch.SVN 因为在调用过程中没有对像拥有它, 这个对像很有可能很快被释放,
// 所以给这个对像这一个全局挂载点, 
var all_svn = { };

function init(self){
  self.m_svn = new Subversion(self.path, self.local_dir);
  self.m_sysid_id = tesla.guid();
  all_svn[self.m_sysid_id] = self;

  var m_console = teide.touch.Console.share();

	self.m_svn.onconsole_log_handle = function(mark, log, path){
		if(mark == '.'){
			m_console.log('.');
		} else{
			m_console.log(mark, log + (path !== null ? self.format_path(path) : ""));
		}
	};
}

/**
  * @class teide.touch.SVN
  * @extends teide.touch.RevisionControlProtocol
  */
Class('teide.touch.SVN', teide.touch.RevisionControlProtocol, {

	m_svn: null,
	m_init_user: false,
	m_sysid_id: 0, 
  
  /**
    * @constructor
    */
  SVN: function(local_dir, config) {
    this.RevisionControlProtocol(local_dir, config);
    init(this);
  },
  
  /** 
    * @virtual
    */
	add: function(path, cb) {
	  this.m_svn.add(path, cb);
	},
	
  /** 
    * @virtual
    */
	update: function(path, cb) {
		init_user_and_passwd(this);
	  if (path == '' && is_checkout_and_error(this)) { // 没有这个文件需要checkout
	    return this.m_svn.checkout(cb);
	  }
	  // update
	  this.m_svn.update(path, function(err, data, cancel){
	  	if(err) {
	  		err.message = $t(err.message);
	  		// console.log('update err', err.message, err.code);
	  	}
	  	cb && cb(err, data, cancel);
	  });
	},
	
  /** 
    * @virtual
    */
	commit: function(path, cb) { 
		if(is_checkout_and_error(this, cb)) return;
		init_user_and_passwd(this);
	  this.m_svn.commit(path, function(err, data, cancel){
	  	if(err) {
	  		err.message = $t(err.message);
	  	}
	  	cb && cb(err, data, cancel);
	  });
	},
	
  /** 
    * @virtual
    */
	remove: function(path, cb) { 
	  this.m_svn.remove(path, cb);
	},

  /** 
    * @virtual
    */
	rename: function(path, new_path, cb) {
		var self = this;
	  this.m_svn.rename(path, new_path, function(err, data, cancel){
	  	if(err) 
	  		return throwError(err, cb);
	  	if (cancel) {
	  		cb && cb(null, data, cancel);
	  	} else {
	  		fs.rename(self.local_dir + path, self.local_dir + new_path, cb);
	  	}
	  });
	},

  /** 
    * @virtual
    */
	cleanup: function(path, cb) {
	  this.m_svn.cleanup(path, cb);
	},

  /**
    * @virtual
    * 解决冲突
    */
	resolved: function(path, cb) {
	  this.m_svn.resolved(path, cb);
	},
	
  /** 
    * @virtual
    */
	revert: function(path, cb) { 
	  this.m_svn.revert(path, cb);
	},
	
  /** 
    * @virtual
    */
	status: function(path, cb) {
	  this.m_svn.status(path, cb);
	},
	
  /** 
    * @virtual
    */
	unlock: function(path, cb) { 
	  this.m_svn.unlock(path, cb);
	},
	
  /** 
    * 释放对像
    * 如果当前还有操作没有完成,必须马上完成且回调参数中标识为取消
    * @virtual
    */
	release: function() { 
		delete all_svn[this.m_sysid_id]; // 删除全局挂载点
	  this.m_svn.release();
	},

	// 取消操作
	cancel: function(){
		this.m_svn.cancel();
	},
	
	/**
	  * 获取文件状态码
	  *  @virtual
	  */
	stat_code: function(path) {
	  return this.m_svn.stat_code(path);
	},
	
	/**
	  * 查询冲突列表
	  *  @virtual
	  */
	conflict_list: function(path, cb) { 
		if(is_checkout_and_error(this, cb)) return;
		var self = this;
	  this.m_svn.conflict_list(path, 10, function(err, data, cancel){
	  	if(err){
	  		return cb(err);
	  	}
	  	var m_console = teide.touch.Console.share();
	  	if(data.length){
	  		m_console.log('Conflict list:');
	  	}
	  	for(var i = 0; i < data.length; i++){
	  		data[i] = self.format_path(data[i]);
				m_console.log('!', data[i]);
	  	}
	  	cb(null, data || [], cancel);
	  });
	},
	
	/**
	  * 查询是否存在冲突
	  *  @virtual
	  */
	is_conflict: function(path, cb) { 
		if(is_checkout_and_error(this, cb)) return;
	  this.m_svn.conflict_list(path, 1, function(err, data, cancel){
	  	if(err){
	  		return cb(err);
	  	}
	  	cb(null, data && data.length != 0, cancel);
	  });
	},
	
	/** 
	  * 测试配置的有效性
	  * @virtual
	  */
	test: function(cb) {
		this.m_svn.test(cb);
	},
  
}, {
  is_support: function() {
    return !!Subversion;
  },
});


