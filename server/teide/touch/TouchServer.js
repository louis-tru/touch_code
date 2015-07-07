/**
 * @createTime 2014-12-18
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

// console.log(new Date().toString('yyyy-MM-dd hh:mm:ss.fff'), 'TEST 0');
include('tesla/web/Server.js');
// console.log(new Date().toString('yyyy-MM-dd hh:mm:ss.fff'), 'TEST 1');
include('teide/touch/APIService.js');
// console.log(new Date().toString('yyyy-MM-dd hh:mm:ss.fff'), 'TEST 2');
include('teide/touch/FileActionService.js');
// console.log(new Date().toString('yyyy-MM-dd hh:mm:ss.fff'), 'TEST 3');
include('teide/touch/NativeService.js');
// console.log(new Date().toString('yyyy-MM-dd hh:mm:ss.fff'), 'TEST 4');
//include('teide/touch/test.js');

var native_util = null;
var server = null;

try{
  native_util = process.binding('native_util');
}catch(err){ }

var language = 'teide/touch/local/en.js';
var lang = native_util ? native_util.request_get_system_language() : te.language;

if (!/^en(_|-)?.*$/.test(lang)) {
  language = {
    'en': 'teide/touch/local/en.js',
    'zh-cn': 'teide/touch/local/zh-cn.js',
    'zh-tw': 'teide/touch/local/zh-tw.js',
  }[lang] || 'teide/touch/local/en.js';
}

insmod(language); // 安装模块

var test_documentsPath = 
  $f(te.APP_CONF.server.documentsPath || '../out/documents/').replace(/\/?$/, '/');

/**
 * @class teide.touch.TouchServer
 * @extends tesla.web.Server
 */
Class('teide.touch.TouchServer', tesla.web.Server, {

	mHasIOSNative: false,
  
  // private:
  // 文档目录
  m_documentPath: '',

  // public:
	/**
	 * constructor function
	 * @constructor
	 */
	TouchServer: function() {
	  
	  //console.log(process);
    
		if(process.platform == 'ios' || 
		   process.config.variables.OS == 'ios' ||
		   process.env.platform == 'ios'){

			this.mHasIOSNative = true;
      
      var opt = te.extend({ }, te.APP_CONF.server);
      // TODO 设置为沙盒文件系统中的temp目录
      opt.temp = process.env.HOME + '/tmp/';
		  // TODO 在ios系统中运行时这个路径设置为app沙盒文件系统的文档目录
		  this.m_documentPath = process.env.HOME + '/Documents/';
      // TODO 沙盒系统中的路径
		  // this.root = '';
      this.Server(opt);
		} else {
      this.Server(te.APP_CONF.server);
      
		  this.m_documentPath = test_documentsPath;
  		// create test dir
  		tesla.node.fsx.mkdirSync(this.m_documentPath);
		}

		var self = this;

		process.on('ApplicationDidEnterBackground', function(){
			if(self.isRun){
				self.stop();
			}
		});

		process.on('ApplicationWillEnterForeground', function(){
			if(!self.isRun){
				self.start();
			}
		});
	},
	
	start: function(){
	  tesla.web.Server.members.start.call(this);
	  if(native_util){ // 通知native
	    nextTick(function(){
	      native_util.request_notify_start_server();
	    });
	  }
	},
	
	/**
	 * 获取文档根目录
	 */
	getDocumentsPath: function(){
	  return this.m_documentPath;
	},
	
	// 系统言语
	get_language: function(){
		return lang;
	},

	get hasIOSNative(){
		return this.mHasIOSNative;
	}
	
}, {
  
  /**
   * 获取共享服务器
   */
  share: function(){
    if(!server){
      server = new teide.touch.TouchServer();
    }
    return server;
  }
});

