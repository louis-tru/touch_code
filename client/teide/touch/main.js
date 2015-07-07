
include('tesla/gui/root.js');
include('tesla/url.js');

var MainViewport = null;

ts.onerror.on(function(err) {
  if (MainViewport) {
    MainViewport.reports_error(err);
  } else {
    MainViewport = ts.get('teide.touch.MainViewport');
    if (MainViewport) {
      MainViewport.reports_error(err);
    } else if (console.nlog) {
      console.nlog(err);
    }
  }
});

var application_token = ts.url.get('application_token');

if(!ts.debug && !application_token) {
  $('<div>Illegal connections</div>').appendTo($('body'));
  // $('body').html = '<div>Illegal connections</div>';
} else {
	// 载入这个requirejs模块
	require(['ace/ace'], function() {
	  
	  require("ace/config").loadModule(["ext", 'ace/ext/themelist'], function(){
	    
      var language = 'teide/touch/local/en.js';
      if (!/^en(_|-)?.*$/.test(ts.language)) {
        language = {
          'en': 'teide/touch/local/en.js',
          'zh-cn': 'teide/touch/local/zh-cn.js',
          'zh-tw': 'teide/touch/local/zh-tw.js',
        }[ts.language] || 'teide/touch/local/en.js';
      }
      
  	  // 安装tesla模块
  	  insmod('teide/touch/main_viewport.js,' + language, function(err) {
        ts.gui.root.share().append(ts.gui.Page.New('teide.touch.MainViewport'));
  	  });
	  });
	});
}
