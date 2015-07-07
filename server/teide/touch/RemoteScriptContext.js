/**
 * @createTime 2015-03-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/Delegate.js');
include('tesla/node.js');
include('teide/touch/KeysDataParser.js');
include('teide/touch/ScriptContext.js');

var ssh2 = require('ssh2-connect');
var exec = require('ssh2-exec');
var fs = tesla.node.fsx;

/**
 * @class teide.touch.RemoteScriptContext
 * @extends teide.touch.ScriptContext
 */
Class('teide.touch.RemoteScriptContext', teide.touch.ScriptContext, {
  
  /**
   * @private
   */
  m_config: null,
  //
  m_child: null,
  m_is_run: false,
  
  /**
   * @constructor
   */
  RemoteScriptContext: function(name){
    this.ScriptContext(name);
    var code = fs.readFileSync(this.path).toString('utf-8');
    this.m_config = teide.touch.KeysDataParser.parse(code);
  },
  
  /**
   * @overwrite
   */
  run: function(){
    
    if(this.m_is_run){
      throw new Error($t('已经开始运行'));
    }
    
    var self = this;
    var config = this.m_config;
    
    if(config.type != 'ssh'){
      throw new Error($t('暂时只支持SSH类型协议'));
      //return this.onerror.notice('暂时只支持ssh类型协议');
    }
    
    this.m_is_run = true;
    
    ssh2({
      host: config.host || 'localhost',
      username: config.user || 'anonymous',
      password: config.passwd || 'anonymous@',
      port: config.port || 22,
      //compress: true,
    }, function(err, ssh){

      if(err){
        self.onerror.notice(err);
        self.onexit.notice({ code: 0, signal: null });
        return;
      }

      if(!self.m_is_run){ // 已经结束
        ssh.end();
        self.onexit.notice({ code: 0, signal: 'KILL' });
        return;
      }

      var command = config.command.join('\n');
      self.m_child = exec({ cmd: command, ssh: ssh, end: true });
      self.m_child.stdout.on('data', function(data){
        data = data.toString('utf-8');
        if(data[data.length - 1] == '\n'){
          data = data.substr(0, data.length -1);
        }
        self.onstdout.notice(data);
      });

      var is_stderr = false;
      self.m_child.stderr.on('data', function(data){
        data = data.toString('utf-8');
        if(data[data.length - 1] == '\n'){
          data = data.substr(0, data.length -1);
        }
        is_stderr = true;
        self.onstderr.notice(data);
      });

      self.m_child.on('error', function(data){
        self.onerror.notice(data);
        // (function(){
        //   if(self.m_is_run){
        //     self.m_is_run = false;
        //     self.onexit.notice({ code: 0, signal: null });
        //   }
        // }.delay2(1000));
      });

      self.m_child.on('exit', function(code, signal){
        // if(self.m_is_run){
        //   self.m_is_run = false;
        if(is_stderr){
          self.onerror.notice('Error: stderr');
        }
        self.onexit.notice({ code: code, signal: signal });
        // }
      });

    });
    
    self.onstdout.notice('Connection ' + config.host);
  },
  
  /**
   * @overwrite
   */
  stop: function(){
    this.m_is_run = false;
    if(this.m_child){
      this.m_child.kill(); // 杀死
    }
  }
  
});

