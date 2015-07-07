/**
 * @createTime 2015-01-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/FileMappingEntity.js');

var ssh2 = require('ssh2-connect');

/**
 * @private
 */
function readdir(self, path, cb){
  
  self.m_sftp.readdir(self.dir + path, function(err, ls){
    
    if(err){
      return throwError(err, cb);
    }
    
    cb(null, ls.map(function(item){
      var data = item.attrs;
      var stat = 
        new teide.touch.FileMappingStat(
          item.filename, data.isDirectory() ? 'd': 'f', new Date(data.mtime * 1000), data.size);
      return stat;
    }));
  });
}

/**
 * @private
 */
function stat(self, name, cb){
  
  var path = self.dir + name;
  
  self.m_sftp.stat(path, function(err, data){
    if(err){
      return throwError(err, cb);
    }
    
    var mat = path.match(/[^\/]+$/);
    var stat = 
      new teide.touch.FileMappingStat(
        mat ? mat[0] : '.', data.isDirectory() ? 'd': 'f', new Date(data.mtime * 1000), data.size);
    cb(null, stat);
  });
}

function mkdir(self, path, cb){
  
	var sftp = self.m_sftp;
	var absPath = self.dir + path;
	
	sftp.exists(absPath, function(exists){
    
		if (exists){
			return cb && cb();
		}
		
		var prefix = absPath.match(/^\/?/)[0];
		var ls = absPath.substr(prefix.length).split('/');
		
		function handle(){
      
			if (!ls.length){
				return cb && cb();
			}

			prefix += ls.shift() + '/';
			sftp.exists(prefix, function(exists) {
        
				if (exists){
					return handle();
				}
				sftp.mkdir(prefix, handle.cb(cb));
			});
		}
		
		handle();
	});
}

/**
 * @private
 */
function rm(self, path, cb){
  
  self.m_sftp.unlink(self.dir + path, function(err){
    if(err){
      return throwError(err, cb);
    }
    if(cb){
      cb();
    }
  });
}

/**
 * @private
 */
function rmdir(self, path, cb){

  var sftp = self.m_sftp;
  var ls = null;
  
  function handle(err){

    if(err){
      return throwError(err, cb);
    }

		if (!ls.length){
			return sftp.rmdir(path, cb);
		}
		
		var stat = ls.shift();
		var new_path = path + '/' + stat.filename;
		
		if(stat.attrs.isFile()){
      // console.log('test del file', new_path);
		  sftp.unlink(new_path, handle);
		}
		else if(stat.attrs.isDirectory()){
      // console.log('test del dir', new_path);
		  rmdir(self, new_path, handle);
		}
		else{
      return throwError('error', cb);
		}
  }
  
	//dir
	sftp.readdir(path, function(err, data){
    ls = data;
    handle(err);
  });
}

/**
 * @class teide.touch.MSFTP
 * @extends teide.touch.FileMappingEntity
 */
Class('teide.touch.SFTP', teide.touch.FileMappingEntity, {
  
  // private:
  m_ssh: null,
  m_sftp: null,
  
  /**
   * @constructor
   */
  SFTP: function(local_dir, config){
    this.FileMappingEntity(local_dir, config);
  },
  
  /**
   * 连接
   */
  connect: function(cb){
    
    var self = this;
    
    ssh2({
      host: this.host,
      username: this.user,
      password: this.passwd,
      port: this.port || 22,
      //compress: true,
    }, function(err, ssh){
      
      if(err){
        return cb(err);
      }
      
      self.m_ssh = ssh;
      
      ssh.sftp(function(err, sftp){
        
        if(err){
          cb(err);
          self.close();
          return;
        }
        
        ssh.on('end', function () {
          self.close();
        });
        
        ssh.on('close', function () {
          self.close();
        });
        
        self.m_sftp = sftp;
        
        cb();
      });
    });
  },
  
  /**
   * 关闭
   */
  close: function(){
    teide.touch.FileMappingEntity.members.close.call(this);
    if(this.m_ssh){
      this.m_ssh.end();
      this.m_ssh = null;
      this.m_sftp = null;
    }
  },
  
  /**
   * 读取服务器文件目录
   * @overwrite
   */
  readdir: function(name, cb){
    var self = this;
    this.ready(function(){
      readdir(self, name, cb);
    }.cb(cb));
  },
  
  /**
   * 读取远程文件信息
   * @overwrite
   */  
  stat: function(name, cb){
    var self = this;
    this.ready(function(){
      stat(self, name, cb);
    }.cb(cb));
  },
  
  /**
   * 从服务器读取文件
   * @overwrite
   */
  readFile: function(name, cb){
    var self = this;
    this.ready(function(){
      var stream = self.m_sftp.createReadStream(self.dir + name);
      cb(null, stream);
    }.cb(cb));
  },
  
  /**
   * 写入文件到服务器
   * @overwrite
   */
  writeFile: function(name, input, cb){
    var self = this;
    
    this.ready(function(){
      
      self.m_sftp.fastPut(input, self.dir + name, function(err){
        if(err){
          return throwError(err, cb);
        }
        if(cb){
          cb();
        }
      });
      
    }.cb(cb));
  },
  
  /**
   * 在服务器创建目录
   * @overwrite
   */
  mkdir: function(name, cb){
    var self = this;
    this.ready(function(){
      mkdir(self, name, cb);
    }.cb(cb));
  },
  
  /**
   * 删除服务器文件
   * @overwrite
   */
  rm: function(name, cb){
    var self = this;
    this.ready(function(){
      rm(self, name, cb);
    }.cb(cb));
  },
  
  /**
   * 删除目录
   * @overwrite
   */
  rmdir: function(name, cb){
    var self = this;
    this.ready(function(){
      rmdir(self, self.dir + name, cb);
    }.cb(cb));
  },
  
});


