
include('tesla/publish/Action.js');
include('tesla/node.js');

var 
action = new tesla.publish.Action();
// action.isNativeShell = true;
action.map = true;
action.excludes = [
  'extjs',
  'teide/res',
  'test',
  'third_party',
  'teide/pc',
  'teide/touch/html/touch_debug.htm',
  'Makefile',
  'CACHE.MANIFEST',
  '.app_touch.module',
  '.app_pc.module',
];
action.client($f('../client'), $f('../out/touch/client'));

action.excludes = [
  'teide/pc', 
  'teide/run',
  'teide/service',
  'teide/dao',
  'teide/BrowserBreak.js',
  'teide/BrowserService.js',
  'teide/BrowserThread.js',
  'teide/FileMap.js',
  'teide/NodeJSClient.js',
  'teide/NodeJSThread.js',
  'teide/NServer.js',
  'teide/ShellThread.js',
  'teide/Thread.js',
  'teide/TreeNode.js',
  'teide/Util.js',
  'teide/Util.sh',
  'pc.js',
  'pub_pc.js',
  'pub_pc_test.js',
  'pub_touch.js',
];
action.server($f('../server'), $f('../out/touch/server'));

tesla.node.fsx.cp($f('../client/ace-min'), $f('../out/touch/client/ace-min'), function(err){
	if(err){
		console.error(err);
	}
	else{
		console.log('发布完成,重启服务!');
	}
});
