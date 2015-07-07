/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/tree_panel.js');
include('teide/touch/file_info_menu.js');
include('teide/touch/dialog.js');
include('teide/touch/service.js');

function get_icon(name){
  var mat = name.match(/\.([^\.]+)$/);
  if(mat){
    return mat[1].replace(/\+/g, 'p').toLowerCase();
  }
  return '';
}

var is_find = true;

function log_handle(self){
  if(is_find){ // 可以查找
    is_find = false; // 设置为不可查找,1秒后恢复
    (function(){ is_find = true; }).delay2(1000);
    var node = self.find('console.log');
    if(!node){
      // 如果没有这个文件节点创建一个
      node = self.NewNode();
      node.leaf = true;
      node.text = 'console.log';
      node.icon = 'log';
      self.append(node);
    }
  }
}

function init_ResourcesPanel(self){
  
  FileActionService.$on('console_log', log_handle, self);
  FileActionService.$on('console_error', log_handle, self);
  
  FileActionService.on('downloadprocess', function(evt){
    var node = self.find(evt.data.save);
    if(node){
      node.setBusyProgress(evt.data.progress);
    }
    else{
      console.nlog('Error: Download process');
    }
  });
  
  FileActionService.on(['compressprocess', 'decompressprocess'], function(evt){
    var node = self.find(evt.data.target);
    if(node){
      node.setBusyProgress(evt.data.progress);
    }
    else{
      console.nlog('Error: compressprocess and decompressprocess process');
    }
  });

  NativeService.on('open_external_file', function(evt){
    var path = evt.data;
    // console.nlog('nolg open_external_file', path);

    var node = self.find('external');
    if(!node){
      node = self.NewNode();
      node.text = 'external';
      node.icon = 'dir';
      
      var ns = self.children();
      for(var i = 0; i < ns.length; i++){
        var item = ns[i];
        if(item.icon != 'dir'){
          item.before(node);
          break;
        }
      }
      if(i == ns.length){
        node.append(node);
      }
    }
    node.reload(function(){
      nextTick(self, self.expand_all, path, function(err, node){
        if (err) return Dialog.error(err.message);
        self.setSelectedNode(node);
        teide.touch.MainViewport.share().east_content.open(path);
      });
    });
  });
  
  //decompress
  
  self.onrequest.on(function(evt){
    
    var node = evt.data.node;

    FileActionService.call('readFilesList', [node.path], function(err, data) {
      if(err){
        return Dialog.error(err.message);
      }
      node.loadData(data);
		});
  });
  
  self.onnodeclick.on(function(evt){
    var node = evt.data.node;
    if (node.leaf && 
        node.icon != 'dir' &&    // 
       !node.isBusy()            // 是否忙碌
      ){
      nextTick(function(){
        var main = teide.touch.MainViewport.share();
        main.east_content.open(node.path);
      });
    }
  });
  
  self.onclickinfo.on(function(evt){
    var menu = tesla.gui.Control.New('teide.touch.FileInfoMenu');
    menu.setNode(evt.data.node);
    menu.activateByElement(evt.data.node.info_btn);
  });
  
  // 拖拽移动文件位置
  self.ondrag.on(function(evt){
    var old_parent = evt.data.oldParent;
    var node = evt.data.node;
    var parent = node.getParentNode();

    if(old_parent !== parent){

      var old_path = (old_parent === node.root ? '' : old_parent.path + '/') + node.text;

      var children = parent.children();
      for(var i = 0; i < children.length; i++){
        var item = children[i];
        if(item.text == node.text && item !== node){
          // 名称重复,需要改名
          node.text = node.text.replace(/(_\d+)?(\.[^\.\/]+$|$)/, '_' + tesla.sysid() + '$2');
          break;
        }
      }

      if (!node.startBusy()) {
        return Dialog.error('无法移动,当前有任务没有完成!');
      }
      
      var new_path = node.path;

      FileActionService.call('rename', [old_path, new_path], function(err, data){
        node.stopBusy();

        if(err){
          return Dialog.error(err.message);
        }
        node.info = data.info;

        if(node.icon == 'dir'){
          node.reload();
        }
        teide.touch.MainViewport.share().east_content.rename(old_path, new_path);
      });
    }
  });
  
  FileActionService.on('uploadfile', function(evt){ // 监听上传文件事件

    var data = evt.data.data;
    var parent = self.find(evt.data.dir);
    
    if(parent !== self){
      if(!parent || !parent.isLoadData){ // 如果还没有载入数据
        return;
      }
    }
    
    for(var i = 0; i < data.length; i++){
      var item = data[i];
      var node = self.NewNode();
      node.leaf = item.leaf;
      node.icon = item.icon;
      node.text = item.text;
      node.info = item.info;
      var old_node = parent.find(item.text);
      if(old_node){
        old_node.remove();
      }
      parent.append(node);
    }
  });
  
  // 载入
  self.reload();

  self.onloaddata.once(function(){
    NativeService.call('complete_load_notice');
  });
}

/**
 * 也可叫根节点
 * @class teide.touch.TreePanel
 * @extends teide.touch.TreePanel
 */
$class('teide.touch.ResourcesPanel', teide.touch.TreePanel, {

	/**
	 * @constructor
	 */
	ResourcesPanel: function(){
		this.TreePanel();
		this.onloadview.$on(init_ResourcesPanel);
	},
	
	/**
	 * 更新节点info
	 */
	updateNodeInfo: function(node){
	  FileActionService.call('readFileInfo', [node.path], function(err, data) {
      if(err){
        return Dialog.error(err.message);
      }
      node.info = data;
		});
	}

}, {

  /**
   * 通过文件名称获取icon
   */
  get_icon: get_icon

});