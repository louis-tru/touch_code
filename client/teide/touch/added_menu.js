/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/overlay_panel.js');
include('teide/touch/added_menu.vx');
include('teide/touch/dialog.js');
include('teide/touch/file_info_menu.js');
include('tesla/url.js');
include('teide/touch/more_menu.js');

function isBusy(){
  return teide.touch.MainViewport.share().res.isBusy;
}

/**
 * 获取当前选择的节点
 */
function get_select_directory_node(){
  var resource_panel = teide.touch.MainViewport.share().res;
  var selectedNode = resource_panel.selectedNode();
  if(selectedNode){
    if(selectedNode.icon != 'dir'){
      return selectedNode.getParentNode();
    }
  }
  else{
    return resource_panel;
  }
  return selectedNode;
}

// 创建新的下载目录
function new_downloads(cb){
  
  var root = teide.touch.MainViewport.share().res;
  
  FileActionService.call('mkdir', ['downloads'], function(err, info){
    
    if(err){
      return cb(err);
    }

    var 
    new_node = root.NewNode();
    new_node.text = 'downloads';
    new_node.leaf = true;
    new_node.info = info;
    new_node.icon = 'dir';
    
    var children = root.children();
    for(var i = 0; i < children.length; i++){
      var item = children[i];
      if(item.icon != 'dir'){
        item.before(new_node);
        break;
      }
    }
    if(i == children.length){
      root.append(new_node);
    }
    
    root.setSelectedNode(new_node); // 选择节点
    
    cb(null, new_node);
  });
}

/**
 * 添加
 */
function add(self, name, title, api, cb){
  
  if(isBusy()){
    return Dialog.error('无法添加,当前有任务没有完成!');
  }
  
  Dialog.prompt(title, name, function(new_name){
    
    if(new_name === null){ // 取消
      return;
    }
    else if(!teide.touch.FileInfoMenu.verifyFileName(new_name)){
      return Dialog.alert('名称不能为空或特殊字符', 
        add.bind(null, self, new_name, title, api, cb));
    }
    
    // OK
    var node = get_select_directory_node();
    var dir = node.path;
    var new_path = (dir ? dir + '/' : '') + new_name;
    
    FileActionService.call(api, [new_path], function(err, info){
      
      if(err){
        return Dialog.error(err.message, add.bind(null, self, new_name, title, api, cb));
      }
      
      var new_node = node.root.NewNode();
      new_node.text = new_name;
      new_node.leaf = true;
      new_node.info = info;
      
      var children = node.children();
      for(var i = 0; i < children.length; i++){
        var item = children[i];
        if(item.icon != 'dir'){
          item.before(new_node);
          break;
        }
      }
      if(i == children.length){
        node.append(new_node);
      }
      
      if(node !== node.root){
        node.expand();
      }
      
      node.root.setSelectedNode(new_node); // 选择节点
      
      cb(null, { node: new_node, path: new_path }); // 成功创建
    });
  });
}

/**
 * 添加map
 * @private
 */
function add_map(self){
  
  if(isBusy()){
    return Dialog.error('无法添加,当前有任务没有完成!');
  }
  var node = get_select_directory_node();
  
  FileActionService.call('createMap', [node.path], function(err, info){
    if(err){
      return Dialog.error(err.message);
    }

    //node.reload();
    var map = node.root.NewNode();
    map.text = '.map';
    map.icon = 'dir';
    var conf = node.root.NewNode();
    conf.text = 'conf.keys';
    conf.icon = 'keys';
    conf.leaf = true;
    node.prepend(map);
    map.append(conf);
    map.expand();
    node.root.setSelectedNode(conf);
    
    if(node !== node.root){
      node.info = info;
      node.expand(); //展开
    }
    
    //***
    var conf_path = (node.path ? node.path + '/' : '') + '.map/conf.keys';
    var east_content = teide.touch.MainViewport.share().east_content;
    east_content.open(conf_path);
    
    node.root.onstartbusy.on(function(evt){ // 开始占线
      if (evt.data === node) { // 
        east_content.onreleaseview.off('add_map_config'); // 取消侦听
        node.root.onstartbusy.off('add_map_config');
      }
    }, 'add_map_config');
    
    east_content.onreleaseview.once(function(evt) {
      
      node.root.onstartbusy.off('add_map_config'); // 取消侦听
      
      var name = evt.data.getFilename();
      
      if(/\.map\/conf\.keys$/.test(name)) {
        // 测试连接
        var dir = name.replace(/\/?\.map\/conf\.keys$/, '');
        var dir_node = teide.touch.MainViewport.share().res.find(dir);
        if(!dir_node || node !== dir_node){
          return;
        }
        
        FileActionService.call('test_mapping', [dir], function(err, is){
          if(err || !is){
            return;
          }
          // 连接正常
          // TODO 提示用户是否要更新目录
          Dialog.confirm('检测到您刚刚添加了映射配置,是否立即从服务器更新目录', function(is){
            if (is) {
              teide.touch.FileInfoMenu.updateMappingNode(node);
            }
          });
        });
      }
    }, 'add_map_config');
    
  });
}

function get_download_name(url, parent_node){
  url = ts.url.cleanurl(url);
  var dir = ts.url.dir(url);
  var name = url.replace(dir, '') || ts.sysid() + '';
  return name;
}

function solve_download_name(url, name, parent_node){
  
  // 是否为github下载  
  var mat = /^https:\/\/codeload\.github\.com\/([a-z0-9_\-\$]+)\/([a-z0-9_\-\$]+)\/([a-z0-9_\-\$]+)\/([a-z0-9_\-\$]+)$/i.exec(url);
  if(mat){
    var proj = mat[2];
    var type = mat[3];
    var tag = mat[4];
    name = proj + '-' + tag + '.' + type;
  }
  
  var dir_path = parent_node.path;
  if(parent_node.root.find(dir_path ? dir_path + '/' + name : name)){ // 名称重复
    name = name.replace(/(_\d+)?(\.[^\.\/]+$|$)/, '_' + tesla.sysid() + '$2');
  }
  return name;
}

function download(url, cb, name){
  
  var node = get_select_directory_node();
  if(node.root !== node && !node.isLoadData){ // 还没加载数据
    
    // 展开载入数据,并且监听一次加载完成事件
    node.root.onloaddata.once(function(evt){
      evt.data.node.root.setSelectedNode(evt.data.node);
      download(url, cb, name); // 继续下载
    });
    node.expand(); // 展开会自动载入数据
    return;
  }
  
  if(!name){
    name = get_download_name(url, node);
  }
  name = solve_download_name(url, name, node);
  var save = node.path ? node.path + '/' + name : name;

  if(isBusy()){
    return cb($t('无法下载,当前有任务没有完成!'));
  }
  
  // TODO ?
  var new_node = node.root.NewNode();
  new_node.text = name;
  new_node.leaf = true;
  new_node.icon = teide.touch.ResourcesPanel.get_icon(name);
  node.append(new_node);
  
  if(node !== node.root){
    node.expand(); // 展开
  }
  
  new_node.root.setSelectedNode(new_node); // 选择节点
  new_node.startBusy();
  new_node.root.onclickbusy.on(function(){
    tesla.gui.Control.New('teide.touch.StopAction')
      .setValue('停止下载')
      .setClickHandle(function(){
        //  发送stop下载信号
        FileActionService.call('stopDownload', [new_node.path]);
      }).activateByElement(new_node.busy_btn);
  }, 'stopDownload');
  
  FileActionService.call('download', [url, save], function(err, data){

    new_node.root.onclickbusy.off('stopDownload');
    new_node.stopBusy();
    if(err){
      new_node.remove();
      return cb($t('下载失败,请检查网络环境或下载地址是否有效'));
    }
    
    if(data.rename && data.rename != name){ // 需要改名
      new_node.text = data.rename;
    }
    new_node.info = data.info;

    if (data.cancel) {
      cb();
    }
    else {
      cb(null, new_node);
    }
  });
}

function nativeRequestDownload_confirm(url){

  // 下载到 downloads 目录,如果没有这个目录创建一个
  var root = teide.touch.MainViewport.share().res;
  var node = root.find('downloads');
  
  if(node){ // 有这个目录
    // 选中这个目录,因为download函数会把文件下载到当前选中的目录
    root.setSelectedNode(node);
    download(url, function(err){ // 下载
      if(err){
        Dialog.error(err);
      }
    });
    return;
  }
  
  // 如果没有这个目录创建一个
  new_downloads(function(err){
    
    if(err){
      return Dialog.error(err.message);
    }
    // 开始下载
    download(url, function(err){
      if(err){
        Dialog.error(err);
      }
      // 成功下载到文件 
    });
  });
}

/**
 * native请求下载文件
 * @private
 */
function nativeRequestDownload(url){

  if(isBusy()){
    return Dialog.error('无法下载,当前有任务没有完成!');
  }

  Dialog.confirm($t('确定要下载\n{0}').format(url), function(is){
    if(is){
      nativeRequestDownload_confirm(url);
    }
  });
}

// 建议解压zip
function downloadProposeUnzip(self, url, name){
  
  download(url, function(err, node){
    if(err){
      return Dialog.error(err);
    }
    if(!node){ // 取消
      return;
    }
    // 下载完成
    if(/\.zip$/i.test(node.text)){
      // 下载的是一个压缩包,提示用户是否要解压
      Dialog.confirm('下载的文件似乎是个压缩包,是否尝试解压?', function(is){
        if(is){
          teide.touch.MoreMenu.decompress(node); // 解压
        }
      });
    }
  }, name);
}

function download_web(self, url){

  if(isBusy()){
    return Dialog.error('无法下载,当前有任务没有完成!');
  }

  Dialog.prompt('输入要下载的文件URL', url || 'http://', function(url){

    if(url === null){
      return;
    }

    var mat = /^(https?:\/\/)?[a-z0-9_\-\$]+\.[a-z0-9_\-\$]+/i.exec(url);
    if(mat){
      if(!mat[1]){
        url = 'http://' + url;
      }
      downloadProposeUnzip(self, url);
    }
    else{
      Dialog.alert('请输入正确的URL', function(){
        download_web(self, url);
      });
    }
  });
}

function download_github(self, name){

  if(isBusy()){
    return Dialog.error('无法下载,当前有任务没有完成!');
  }
  var node = get_select_directory_node();

  Dialog.prompt('输入GitHub项目路径', name || '(user)/(proj)/zip/master', function(url){

    if(url === null){
      return;
    }
    var mat = /^(https:\/\/codeload\.github\.com\/)?([a-z0-9_\-\$]+)\/([a-z0-9_\-\$]+)\/([a-z0-9_\-\$]+)\/([a-z0-9_\-\$]+)$/i.exec(url);
    if(mat){
      url = 'https://codeload.github.com/';
      var user = mat[2];
      var proj = mat[3];
      var type = mat[4];
      var tag = mat[5];

      url += user + '/' + proj + '/' + type + '/' + tag;
      downloadProposeUnzip(self, url, proj + '-' + tag + '.' + type);
    }
    else{
      Dialog.alert('请输入正确的GitHub项目路径', function(){
        download_github(self, url);
      });
    }
  });
}

$class('teide.touch.AddedMenu', teide.touch.OverlayPanel, {

	/**
	 * @constructor
	 */
	AddedMenu: function(tag){
		this.OverlayPanel(tag);
	},

  m_add_file_click_handle: function(){
  	add(this, 'NewFile.js', '输入新的文件名称', 'create', function(err, data){
      if(!ts.env.iphone && !ts.env.ipod){ // 
        teide.touch.MainViewport.share().east_content.open(data.path);
      }
  	  data.node.icon = teide.touch.ResourcesPanel.get_icon(data.node.text);
  	});
  },

  m_add_dir_click_handle: function(){
  	add(this, 'NewDirectory', '输入新的目录名称', 'mkdir', function(err, data){
  	  data.node.icon = 'dir';
  	});
  },
  
  m_add_compress_click_handle: function(){
		var node = teide.touch.MainViewport.share().res.selectedNode();
		if(!node){
			return Dialog.alert('请选择要压缩的文件或目录');
		}
		teide.touch.MoreMenu.compress(node);
  },

  // 添加映射,先创建一个本地目录
  m_add_ftp_sftp_click_handle: function(){
    var self = this;
  	add(self, 'NewMappingDirectory', 
  	'请先创建一个本地目录', 'mkdir', function(err, data){
  	  data.node.icon = 'dir';
  	  add_map(self);
  	});
  },
  
  m_add_ssh_remote_script_handle: function(){
    add(this, 'NewRemots.script', '输入新的文件名称', 'createScript', function(err, data){
      teide.touch.MainViewport.share().east_content.open(data.path);
      data.node.icon = teide.touch.ResourcesPanel.get_icon(data.node.text);
    });
  },
	
  m_download_web_click_handle: function(){
    download_web(this);
  },
  
  m_download_GitHub_handle: function(){
    download_github(this);
  }

}, {

  /**
   * native请求下载文件
   */
  nativeRequestDownload: nativeRequestDownload

});
