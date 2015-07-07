/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/added_menu.js');
include('teide/touch/file_info_menu.vx');
include('teide/touch/dialog.js');
include('teide/touch/service.js');
include('teide/touch/resources_panel.js');
include('teide/touch/more_menu.js');

function isBusy(){
  return teide.touch.MainViewport.share().res.isBusy;
}

/**
 * 验证文件名称的合法性
 */
function verifyFileName(name) {
  if (!name) {
    return false;
  }
  return !/[\/\\:]/.test(name);
}

/**
 * 重新命名
 */
function rename(self, name, show_name) {

  Dialog.prompt('输入新的名称', show_name, function(new_name) {
    if (new_name == name || new_name === null) {
      return;
    }
    else if (!verifyFileName(new_name)) {
      return Dialog.alert('名称不能为空或特殊字符', rename.bind(null, self, name, new_name));
    }
    // OK
    var node = self.m_node;
    var path = node.path;
    var names = path.split('/');
    var new_path = new_name;
    if (names.length > 1) {
      names.pop();
      new_path = names.join('/') + '/' + new_name;
    }

    if (!node.startBusy()) {
      return Dialog.error('无法重命名,当前有任务没有完成!');
    }

    FileActionService.call('rename', [path, new_path], function(err, data) {
      node.stopBusy();
      if (err) {
        return Dialog.error(err.message, rename.bind(null, self, name, new_name));
      }

      // 这里的取消实现方法还未实现
      if (data.cancel) {
        node.info = data.info;
        return;
      }

      node.text = new_name;
      if (node.icon == 'dir') {
        node.reload();
      }
      else {
        node.icon = teide.touch.ResourcesPanel.get_icon(new_name);
      }
      node.info = data.info;
      teide.touch.MainViewport.share().east_content.rename(path, new_path);
    });
  });
}

/**
 * 初始化
 */
function init(self) {
  
  var node = self.m_node;
  
  switch (node.info.mark) {
    case 'I':
      break;
    case 'S':
      self.update_btn.show();
      if (node.icon == 'dir') {
        self.submit_btn.show();
      }
      break;
    case '!':
      self.solve_btn.show();
      break;
    case 'M':
      self.update_btn.show();
      self.submit_btn.show();
      break;
    case 'A':
      self.submit_btn.show();
      break;
    case 'D':
      self.submit_btn.show();
      self.join_btn.show();
      break;
    case '?':
      self.join_btn.show();
      break;
    case 'L':
      self.cleanup_btn.show();
    default:
      break;
  }

  if (node.icon == 'zip') {
    self.decompress_btn.show();
  }
  if(node.icon != 'dir'){
    self.send_btn.show();
  }
}

/**
 * 设置停止更新或提交
 */
function stepStopUpdateOrSubmit(node, text) {
  // 停止更新或提交
  node.root.onclickbusy.on(function() {
    tesla.gui.Control.New('teide.touch.StopAction')
      .setValue(text)
      .setClickHandle(function() {
        // stop 停止提交或更新信号
        FileActionService.call('stopUpdateOrSubmit');
      }).activateByElement(node.busy_btn);
  }, 'stopUpdateOrSubmit');
}

/**
 * 提交
 */
function submitMappingNode(node) {
  
  var isExpand = node.isExpand();
  
  if (!node.startBusy()) {
    return Dialog.error('无法提交,当前有任务没有完成!');
  }
  
  stepStopUpdateOrSubmit(node, '停止提交');
  
  FileActionService.call('submit', [node.path], function(err, info) {
    
    node.root.onclickbusy.off('stopUpdateOrSubmit');
    node.stopBusy();
    
    if (isExpand) {
      node.expand();
    }

    if (err) {
      return Dialog.error(err.message);
    }

    node.info = info;
    
    if (node.icon == 'dir') {
      node.reload(); 
    }
    else{
      node.getParentNode().reload();
    }
  });
}

/**
 * 更新映射节点
 * @private
 */
function updateMappingNode(node) {
  if (!teide.touch.MainViewport.verif_high_func()) return;
    
  var isExpand = node.isExpand();
  
  if (!node.startBusy()) {
    return Dialog.error('无法更新,当前有任务没有完成!');
  }
  
  stepStopUpdateOrSubmit(node, '停止更新');
  
  FileActionService.call('update', [node.path], function(err, info) {
    
    node.root.onclickbusy.off('stopUpdateOrSubmit');
    node.stopBusy();
    
    if (isExpand) {
      node.expand();
    }

    if (err) {
      if(err.info){
        node.info = err.info;
      }
      
      if(err.code == 201){ // 版本冲突

        // 'Update file version conflict, Do you want to see the log?'

        Dialog.confirm('更新版本冲突,是否要查看日志信息?', function(is){
          if(is){
            teide.touch.MainViewport.share().east_content.open('console.log');
          }
        });

      } else {
        Dialog.error(err.message);
      }
    } else {
      node.info = info;
    }
    
    if (node.icon == 'dir') {
      node.reload();
    }
    else{
      node.getParentNode().reload();
    }
  });
}

$class('teide.touch.FileInfoMenu', teide.touch.OverlayPanel, {

  /**
   * 当前的节点
   * @private
   */
  m_node: null,

	/**
	 * @constructor
	 */
	FileInfoMenu: function(tag) {
		this.OverlayPanel(tag);
	},
	
	/**
	 * 设置当前的节点
	 */
	setNode: function(node) {
	  this.m_node = node;
	  init(this);
	},

  m_rename_click_handle: function() {
    var self = this;
    
    if(isBusy()){
  	  return Dialog.error('无法重命名,当前有任务没有完成!');
    }
    rename(this, this.m_node.text, this.m_node.text);
  },

  m_clone_click_handle: function(){
  	var self = this;
  	var node = this.m_node;
  	var path = node.path;
  	
  	// TODO 克隆大文件时可能需要很长时间
  	// 在这里显示一个loading的标志
  	
  	if(!node.startBusy()){
  	  return Dialog.error('无法克隆,当前有任务没有完成!');
    }
    
    function setNode(data){
      var 
      new_node = node.root.NewNode();
      new_node.text = data.name.split('/').pop();
      new_node.icon = node.icon;
      new_node.info = data.info;
      node.after(new_node);
      new_node.leaf = node.leaf;
      new_node.root.updateNodeInfo(new_node);
    }
    
    // 停止克隆
    node.root.onclickbusy.on(function(){
      tesla.gui.Control.New('teide.touch.StopAction')
        .setValue('停止克隆')
        .setClickHandle(function(){
          // stop 克隆信号
          FileActionService.call('stopClone');
        }).activateByElement(node.busy_btn);
    }, 'stopClone');
  	
  	FileActionService.call('clone', [path], function(err, data){
  	  node.root.onclickbusy.off('stopClone');
  	  node.stopBusy();
      if (err) {
        Dialog.error(err.message);
      }
      if (data) {
        setNode(data);
      }
    });
  },

  m_delete_click_handle: function(){
    
    var self = this;
    var node = this.m_node;
    
    // type false 只删除本地
    // type true 全部删除
    function ok(type) {
      
      if(!type) return;
      
	    // TODO delete 
	    var path = node.path;
	    
	    // TODO 删除大文件时可能需要很长时间
  	  
    	if(!node.startBusy()){
    	  return Dialog.error('无法删除,当前有任务没有完成!');
      }
      
      // 停止删除
      node.root.onclickbusy.on(function(){
        tesla.gui.Control.New('teide.touch.StopAction')
          .setValue('停止删除')
          .setClickHandle(function(){
            // stop 删除信号
            FileActionService.call('stopDelete');
          }).activateByElement(node.busy_btn);
      }, 'stopDelete');
	    
	    FileActionService.call('remove', [path, type == 2], function(err, info){
	      
	      node.root.onclickbusy.off('stopDelete');
	      node.stopBusy();
	      
	      if(err){
	        return Dialog.error(err.message);
	      }
	      
	      if(info){ // 文件没有被删除,可能是被取消了,返回了新info值
          node.info = info;
          if (node.icon == 'dir') {
            node.reload(); // 重新载入数据
          }
	      }
	      else {
  	      node.remove(); // 删除节点
	      }
	      // 关闭和这个路径相似的文件
	      teide.touch.MainViewport.share().east_content.close(path); 
	    });
  	}
    
    var info = node.info;
    var msg = $t('是否要删除 {0} ?').format(node.text);
    var msg2 = $t('是否要删除 {0}, 删除本地或者全部 ?').format(node.text);
    
    // This is a mapping file, delete local or all
    
    // I S A D M L ! ?
    
    if (info.root) { // 只删除本地
      return Dialog.confirm(msg, ok);
    }
    
    switch (info.mark) {
      default:
      case 'I':
      case '?':
      case 'L': // 只需要删除本地文件
      case '!':
      case 'D':
        Dialog.confirm(msg, ok);
        break;
      case 'A':
        Dialog.confirm(msg, function(is){ is && ok(2) }); // 删除全部
        break;
      case 'S':
      case 'M':
        Dialog.delete_file_confirm(msg2, ok);
        break;
    }
  },
  
  m_search_click_handle: function(){
    
    var main = teide.touch.MainViewport.share();
    var node = this.m_node;
    //
  	node.root.setSelectedNode(node);
  	main.activateSearch(true, { search_target: 'selected' });
  	//if(node.icon != 'dir'){ // 打开文件
  	//  main.east_content.open(node.path);
  	//}
  },

  // 发送文件给好友
  m_send_click_handle: function(){
    NativeService.call('send_file', [this.m_node.path]);
  },

  m_decompress_click_handle: function(){
    teide.touch.MoreMenu.decompress(this.m_node);
  },
  
  // 加入映射
  m_join_click_handle: function(){
    
    var node = this.m_node;
    
    if(node.info.mark != '?'){
      return;
    }
    
    var isExpand = node.isExpand();
    
    if(!node.startBusy()){
      return Dialog.error('无法加入,当前有任务没有完成!');
    }
    
    // TODO 这里的加入可能遇到大文件夹时,速度也会变慢
    // TODO 可能需要在这里添加一个停止加入按钮
    
    FileActionService.call('join', [node.path], function(err, info){
      
      node.stopBusy();
      
      if(isExpand){
        node.expand();
      }
      
      if(err){
        return Dialog.error(err.message);
      }
      node.info = info;
      
      if(node.icon == 'dir'){
        node.reload();
      }
    });
  },
  
  m_update_click_handle: function(){
    updateMappingNode(this.m_node); // 更新映射节点
  },
  
  // 提交
  m_submit_click_handle: function(){
    if (!teide.touch.MainViewport.verif_high_func()) return;

    var node = this.m_node;

    if(!node.startBusy()){
      return Dialog.error('无法提交,当前有任务没有完成!');
    }
    
    var self = this;
    
    // 先查询是否有冲突
    FileActionService.call('conflict_list', [node.path], function(err, data){
      node.stopBusy();
      
      if(err){
        return Dialog.error(err.message);
      }
      
      // var msg = !data.length ? '确定要将变化提交到服务器吗?' : // 没有冲突
      //   $t('当前还有{0}个冲突没有解决,确定要将变化提交到服务器吗?').format(data.length);

      var msg = !data.length ? '确定要将变化提交到服务器吗?' : // 没有冲突
        $t('无法提交,当前有{0}个冲突没有解决,是否查看冲突日志?').format(data.length);
      
      Dialog.confirm(msg, function(is){
        if(is){
          if(data.length){ // 有冲突,查看日志
            teide.touch.MainViewport.share().east_content.open('console.log');
          } else {
            submitMappingNode(node); // 提交
          }
        }
      });
    });
  },
  
  // 解决冲突
  m_solve_click_handle: function(){
    
    var node = this.m_node;
    
    if(node.info.mark != '!'){
      return;
    }
    
    if(isBusy()){
      return Dialog.error('无法解决冲突,当前有任务没有完成!');
    }
    
    FileActionService.call('resolved', [node.path], function(err, info){
      if(err){
        return Dialog.error(err.message);
      }
      // var reg = new RegExp('^' + node.text + '\.(mine|r\\d+)$');
      var text = node.text;
      var reg = /^\.(mine|r\d+)$/;

      // 删除无用的临时文件显示，
      var ls = node.getParentNode().children();
      for(var i = 0; i < ls.length; i++){
        var item = ls[i];
        var item_text = item.text;
        if(item_text != text && 
          item_text.indexOf(text) === 0 && 
          reg.test(item_text.substr(text.length))){
          item.remove(); // 删除节点
        }
      }

      node.info = info;
    });
  },

  // 解锁
  m_unlock_click_handle: function(){

    var node = this.m_node;

    if(node.info.mark != 'L'){
      return;
    }

    if(!node.startBusy()){
      return Dialog.error('无法解锁,当前有任务没有完成!');
    }

    FileActionService.call('unlock', [node.path], function(err, info){
      node.stopBusy();

      if(err){
        return Dialog.error(err.message);
      }
      node.info = info;
      if (node.icon == 'dir') {
        node.reload();
      }
    });
  },

  // 清理
  m_cleanup_click_handle: function(){

    var node = this.m_node;

    if(node.info.mark != 'L'){
      return;
    }

    if(!node.startBusy()){
      return Dialog.error('无法清理,当前有任务没有完成!');
    }

    FileActionService.call('cleanup', [node.path], function(err, info){
      node.stopBusy();

      if(err){
        return Dialog.error(err.message);
      }
      node.info = info;
      if (node.icon == 'dir') {
        node.reload();
      }
    });
  },

}, {
  
  /**
   * @static
   */
  verifyFileName: function(name){
    return verifyFileName(name);
  },
  
  /**
   * 更新映射节点
   */
  updateMappingNode: updateMappingNode  

});
