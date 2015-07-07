/**
 * @createTime 2015-01-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/FileMappingEntity.js');

var Ftp = require('ftp');

/**
 * @class teide.touch.MFTP
 * @extends teide.touch.FileMappingEntity
 */
Class('teide.touch.FTP', teide.touch.FileMappingEntity, {

  /**
   * @private
   */
  m_ftp: null,
  
  /**
   * @constructor
   */
  FTP: function(local_dir, config){
    this.FileMappingEntity(local_dir, config);
  },
  
  /**
   * 连接
   */
  connect: function(cb){
    
    if(this.m_ftp){
      // return cb(new Error('connect error'));
      return cb(new Error($t('连接到FTP服务器异常')));
    }
    
    var self = this;
    var ftp = new Ftp();
    var ready = false;
    
    this.m_ftp = ftp;
    
    ftp.on('ready', function(){

      ftp.on('end', function(){
        self.close();
      });
      
      ftp.on('close', function(){
        self.close();
      });
      
      ready = true;
      
      cb();
    });
    
    ftp.on('error', function(data){
      console.log(data);
      if(!ready){ // 还没准备
        self.close();
        cb(data); // 连接失败
      }
    });
    
    ftp.connect({
      host: this.host,
      port: this.port || 21,
      user: this.user,
      password: this.passwd,
    });
  },
  
  /**
   * 关闭
   */
  close: function(){
    teide.touch.FileMappingEntity.members.close.call(this);
    if(this.m_ftp){
      this.m_ftp.end(); // 结束连接
      this.m_ftp = null;
    }
  },
  
  /**
   * 读取服务器文件目录
   * @overwrite
   */
  readdir: function(name, cb){
    
    var self = this;
    
    this.ready(function(){
      
      self.m_ftp.list(self.dir + name, function(err, ls){
        
        if(err){
          return throwError(err, cb);
        }
        
        if(!ls.length){
          // return throwError('The directory cannot be read', cb);
          return throwError($t('目录无法读取'), cb);
        }
        
        var list = [];
        
        ls.forEach(function(item){
          var data = item;//.expected;
          if(data.name == '.' || data.name == '..'){
            return;
          }
          var stat = 
            new teide.touch.FileMappingStat(
              data.name, data.type == '-' ? 'f': 'd', data.date, data.size);
          list.push(stat);
        });
        
        cb(null, list);
      });
      
    }.cb(cb));
  },
  
  /**
   * 读取远程文件信息
   * @overwrite
   */  
  stat: function(name, cb){
    
    var self = this;
    
    this.ready(function(){
      
      var path = self.dir + name;
      
      self.m_ftp.list(path, function(err, ls){
        
        if(err){
          return throwError(err, cb);
        }
        
        if(!ls.length){
          // return throwError('Cannot find the file stat', cb);
          return throwError($t('无法读取文件属性'), cb);
        }
        
        var data = ls[0];
        
        for(var i = 0; i < ls.length; i++){
          var item = ls[i];
          if(item.name == '.'){
            var mat = path.match(/[^\/]+$/);
            data = item;
            data.name = mat ? mat[0] : '.';
            break;
          }
        }
        
        var stat = 
          new teide.touch.FileMappingStat(
            data.name, data.type == '-' ? 'f': 'd', data.date, data.size);
        cb(null, stat);
      });
      
    }.cb(cb));
  },
  
  /**
   * 从服务器读取文件
   * @overwrite
   */
  readFile: function(name, cb){

    var self = this;
    
    this.ready(function(){
      
      self.m_ftp.get(self.dir + name, function(err, socket){
        
        if(err){
          return throwError(err, cb);
        }
        if(cb){
          cb(err, socket);
        }
      });
      
    }.cb(cb));
  },
  
  /**
   * 写入文件到服务器
   * @overwrite
   */
  writeFile: function(name, input, cb){
    
    var self = this;
    
    this.ready(function(){
        
      self.m_ftp.put(input, self.dir + name, function(err){
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
      
      self.m_ftp.mkdir(self.dir + name, true, function(err){
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
   * 删除服务器文件
   * @overwrite
   */
  rm: function(name, cb){
    
    var self = this;
    
    this.ready(function(){
      
      self.m_ftp.delete(self.dir + name, function(err){
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
   * 删除目录
   * @overwrite
   */
  rmdir: function(name, cb){
    
    var self = this;
    
    this.ready(function(){
      
      self.m_ftp.rmdir(self.dir + name, true, function(err){
        if(err){
          return throwError(err, cb);
        }
        if(cb){
          cb();
        }
      });
    
    }.cb(cb));
  },
  
});




