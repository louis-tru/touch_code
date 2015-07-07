/**
 * @createTime 2014-12-23
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('teide/touch/more_menu.vx');
include('teide/touch/dialog.js');

function isBusy(){
  return teide.touch.MainViewport.share().res.isBusy;
}

function solve_compress_name_repeat(path){
  if(teide.touch.MainViewport.share().res.find(path)){ // 名称重复
    path = path.replace(/(_\d+)?(\.[^\.\/]+$|$)/, '_' + tesla.sysid() + '$2');
  }
  return {
  	path: path,
  	name: path.match(/[^\/]+$/)[0]
  };
}

function decompress(node){
  
	if(isBusy()){
		return Dialog.alert('无法解压,当前有任务没有完成!');
	}
  
	if(!/\.zip/i.test(node.text)){
		return Dialog.alert('只有zip文件才能被解压缩');
	}
  
	var target = node.path;
	 
	function done(list){

    // debugger;
    
    var parent = node.getParentNode();
    var dirPath = parent.path ? parent.path + '/' : '';

    for(var i = 0; i < list.length; i++){

      // TODO ?
      var data = list[i];
      var oldNode = node.root.find(dirPath + data.text);
      if(oldNode){ // 文件节点存在, 删除
        oldNode.remove();
      }

      var new_node = node.root.NewNode();
      new_node.text = data.text;
      new_node.leaf = data.leaf;
      new_node.info = data.info;
      new_node.icon = data.icon;

      if(data.icon == 'dir'){

        var children = parent.children();

        for(var j = 0; j < children.length; j++){
          var item = children[j];
          if(item.icon != 'dir'){
            item.before(new_node);
            break;
          }
        }
        if(j == children.length){
          parent.append(new_node);
        }
      }
      else{
        parent.append(new_node);
      }
    }
	}

	node.startBusy();
  node.root.onclickbusy.on(function(){
    tesla.gui.Control.New('teide.touch.StopAction')
      .setValue('停止解压')
      .setClickHandle(function(){
        // stop 解压缩信号
        FileActionService.call('stopDecompress', [node.path]);
      }).activateByElement(node.busy_btn);
  }, 'stopDecompress');
  
	FileActionService.call('decompress', [target], function(err, list){
	  
    node.root.onclickbusy.off('stopDecompress');
    node.stopBusy();
    if(err){
  	  return Dialog.alert('解压缩文件失败');
    }
    done(list);
	});
}

function compress(node){
	if(isBusy()){
		return Dialog.alert('无法压缩,当前有任务没有完成!');
	}
  
	node.startBusy();
  node.root.onclickbusy.on(function(){
    tesla.gui.Control.New('teide.touch.StopAction')
      .setValue('停止压缩')
      .setClickHandle(function(){
        // stop 压缩信号
        FileActionService.call('stopCompress', [node.path]);
      }).activateByElement(node.busy_btn);
  }, 'stopCompress');
  
	var target = node.path;
	var save = solve_compress_name_repeat(target + '.zip');

	FileActionService.call('compress', [target, save.path], function(err, data){
    
    node.root.onclickbusy.off('stopCompress');
    node.stopBusy();
    if(err){
  	  return Dialog.alert('压缩文件失败');
    }
    
    if(data.cancel){ // 压缩被取消
      return;
    }
    
	  var new_node = node.root.NewNode();
    new_node.info = data.info;
	  new_node.text = save.name;
	  new_node.leaf = true;
	  new_node.icon = teide.touch.ResourcesPanel.get_icon(save.name);
	  node.getParentNode().append(new_node);
	  node.root.setSelectedNode(new_node); // 选择节点
	});
}

function init(self){
  if (teide.touch.MainViewport.share().application_info.is_lite) {
    if (ts.env.ios) {
      if (ts.env.ipad) {
        self.buy_pro_btn.show();
      } else {
        self.buy_ph_btn.show();
      }
    } 
  }
}

/**
 * @class teide.touch.MoreMenu
 * @extends teide.touch.OverlayPanel
 */
$class('teide.touch.MoreMenu', teide.touch.OverlayPanel, {

  // 不脆弱,不会一点击就消失
  // frail: false,
  // 主视图
  mMain_view_port: null,

	/**
	 * @constructor
	 */
	MoreMenu: function(tag){
		this.OverlayPanel(tag);
		this.mMain_view_port = teide.touch.MainViewport.share();
    this.onloadview.$on(init);
	},
	
	m_preferences_click_handle: function(){
	  teide.touch.MainViewport.share().east_content.open('[preferences.settings]');
	},
	
  m_connect_device_click_handle: function(){
    
    NativeService.call('get_network_host', function(err, host){
      
      if (host) {
        NativeService.call('sleep_disabled', [true]); // 禁用睡眠
        Dialog.alert_html($t('Touch Code 保持唤醒状态用浏览器打开') + '<br/>\
<a href="javascript:teide.touch.MainViewport.share().open_web_browser\
(\'http://{0}/documents/\')">http://{0}/documents/</a>'.format(host), function(){
          NativeService.call('sleep_disabled', [false]); // 启用睡眠
        });
      }
      else {
        if (ts.env.ios || ts.env.android || ts.env.windows_phone) {
          Dialog.error('检测到设备没有连接到网络,请先将设备连接到wifi网络');
        }
        else {
          Dialog.error('检测到设备没有连接到网络,请先将设备连接到网络');
        }
      }
    });
  },
	
	/**
	 * 压缩文件
	 */
  m_compress_click_handle: function(){
		var node = this.mMain_view_port.res.selectedNode();
		if(!node){
			return Dialog.alert('请选择要压缩的文件或目录');
		}
		compress(node);
  },

  /**
   * 解压文件
   */
  m_decompress_click_handle: function(){
		var node = this.mMain_view_port.res.selectedNode();
		if(!node){
			return Dialog.alert('请选择要解压的文件');
		}
		decompress(node);
  },
  
  m_refresh_root_click_handle: function(){
    if(isBusy()){
		  return Dialog.error('无法刷新目录,当前有任务没有完成!');
  	}
    teide.touch.MainViewport.share().res.reload();
  },

	m_about_click_handle: function(){
	  var dia = tesla.gui.Control.New('AboutDialog');
	  var app = this.mMain_view_port.application_info;
	  dia.ver.text = app.version;
	  dia.show();
	},

  // 建议与bug
  m_suggest_click_handle: function() { 
    NativeService.call('send_email_to_author');
  },

  m_reviews_click_handle: function() {
    NativeService.call('open_app_store_reviews');
  },

  m_buy_pro_click_handle: function(){
    NativeService.call('open_app_store_buy_pro');
  },

  m_buy_ph_click_handle: function(){
    NativeService.call('open_app_store_buy_ph');
  },

}, {

	/**
	 * 解压节点
	 */
	decompress: decompress,
	
	/**
	 * 压缩节点
	 */
	compress: compress

});

/**
 * sopt action ui control
 * @class teide.touch.StopAction
 * @extends teide.touch.OverlayPanel
 */
$class('teide.touch.StopAction', teide.touch.OverlayPanel, {

  m_click_handle: null,
  
  priority: 'left',

  /**
   * @constructor
   */
  StopAction: function(tag){
    this.OverlayPanel(tag);
  },
  
  setPriority: function(value){
    this.priority = value;
    return this;
  },

  setValue:function(value){
    this.m_display_text.text = $t(value);
    return this;
  },
  
  m_stop_action_click_handle: function(){
    if(this.m_click_handle){
      this.m_click_handle();
    }
  },
  
  /**
   * 设置处理handle
   */
  setClickHandle: function(handle){
    this.m_click_handle = handle;
    return this;
  }
  
});

$class('teide.touch.AboutDialog', Dialog, {

  AboutDialog: function(tag){
    Dialog.call(this, tag);
  },

  m_contact_author_click_handle: function() {
    NativeService.call('send_email_to_author');
  },

});

