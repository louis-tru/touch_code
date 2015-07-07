/**
 * @createTime 2014-12-15
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/event_delegate.js');
include('tesla/gui/resources.js');
include('tesla/gui/scroll_view.js');
include('teide/touch/tree_panel.vx');

/**
 * 更新节点层级
 * @private
 */
function updateLeval(self){
  
  var level = self.m_parent.level + 1;
  
  if(level != self.m_level){
    self.m_level = level;
    self.inner.css('padding-left', (level - 1) * 15 + 'px');

    var children = self.children();
    
    // 设置子节点的层级
    for(var i = 0; i < children.length; i++){
      updateLeval(children[i]);
    }
  }
}

/**
 * 通过以当前节点的偏移值查询节点
 * 返回偏移移值上面相近的节点
 * @private
 */
function queryNodeByOffset(self, y){
  
  var root = self.m_root;
  y += root.m_dart_basic_offset_y + root.m_dart_basic_scroll_top;
  var count = Math.round(y / 32);
  
  if(count < 1){
    return null;
  }
  return queryNode(self, root, { count: count /*找目标节点的上一个*/ });
}

/**
 * 查找节点
 */
function queryNode(self, node, data){
  
  var children = node.children();
  
  for(var i = 0; i < children.length; i++){

    if(data.count === 0){
      if(node === self){ 
        // 如果找到自己的位置,在向下查找一个位置
        data.count++;
      }
      else{
        return node;
      }
    }

    node = children[i];
    data.count--;

    if(node.isExpand()){     // 如果已展开
      node = queryNode(self, node, data);
    }
  }
  
  return node;
}

/**
 * 选中节点
 * @private
 */
function selected_node(self){
  self.addClass('select');
}

/**
 * 反选中节点
 * @private
 */
function not_selected_node(self){
  self.removeClass('select');
}

function drag_start(self, x, y){
  self.m_root.m_dart_basic_offset_y = self.offset.top - self.m_root.offset.top; //45; // 设置基础偏移
  self.m_root.m_dart_basic_scroll_top = self.m_root.dom.scrollTop;
  self.m_root.m_drag_start_x = x;
  self.m_root.m_drag_start_y = y;
  // 开始拖拽
  // 设置样式为拖拽状态
  self.addClass('drag');
}

// 拖拽移动
function drag_move(self, x, y){
  
  var root =  self.m_root;
  var start_x = root.m_drag_start_x;
  var start_y = root.m_drag_start_y;
  var distance_x = x - start_x;
  var distance_y = y - start_y;
  
  if(!root.m_drag_node){
    // 移动超过5像素开始拖拽
    if(Math.abs(distance_x) > 5 || Math.abs(distance_y) > 5){
      root.m_drag_node = self;
      self.collapse();  // 收拢节点
    }
  }
  
  if(root.m_drag_node){
    
    var first = root.children()[0];
    
    if(root.m_drag_adjoin){
      root.m_drag_adjoin.css0ms('margin-bottom', 0);
      root.m_drag_adjoin = null;
    } else {
      first.css0ms('margin-top', 0);
    }
    
    distance_y += (root.dom.scrollTop - root.m_dart_basic_scroll_top);
    
    if(distance_y >= 16) { // 修正偏差
      distance_y += 32;
    }

    self.css0ms('top', distance_y + 'px');

    // 查询最相近的节点,返回的这个节点始终都靠近偏移值上面
    var node = queryNodeByOffset(self, distance_y);
    if(node){
      root.m_drag_adjoin = node;
      root.m_drag_adjoin.css0ms('margin-bottom', '32px');
      self.css0ms('margin-top', '-32px');
    }
    else{
      // 如果没有返回表示已经达到最上面
      if(first !== self){
        first.css0ms('margin-top', '32px');
        self.css0ms('margin-top', '-32px');
      }
      else{
        self.css0ms('margin-top', 0);
      }
    }
  }
}

// 拖拽结束
function drag_end(self, x, y){
  
  self.removeClass('drag');
  self.css('top', 0);

  var root = self.m_root;

  if(!root.m_drag_node){
    return;
  }
  //
  root.m_drag_node = null;
  root.children()[0].css0ms('margin-top', 0);
  self.css0ms('margin-top', 0);
  
  var parent = self.m_parent;
  var drag_adjoin = root.m_drag_adjoin;
  var data = { oldParent: parent, node: self };
  
  root.m_drag_adjoin = null;
  
  if(drag_adjoin){
    drag_adjoin.css0ms('margin-bottom', 0);
    
    if(drag_adjoin === self){ // 如果是自己无效
      return;
    }
    
    // 拖拽到达drag_adjoin节点的下面
    // 如果相邻的节点已经加载过数据并且没有子节点与展开的情况下
    // 当前做为子节点加入到相邻节点否则插入该节点的后面
    if(drag_adjoin.isLoadData && drag_adjoin.isExpand()){
      drag_adjoin.prepend(self); // 前置节点
    }
    // 如果节点是一个叶子节点,并且是一个目录
    // 加入到节点内部,成为子节点
    else if(drag_adjoin.icon == 'dir' && drag_adjoin.leaf){
      drag_adjoin.prepend(self);  // 前置节点
      drag_adjoin.expand();       // 展开
    }
    else{ // 插入到后面
      drag_adjoin.after(self);
    }
    root.ondrag.notice(data);
  }
  else{
    // 没有相邻的节点表示达到最上面
    if(root.children()[0] !== self){
      root.children()[0].before(self);
      root.ondrag.notice(data);
    }
  }
}

// 绑定mobile事件
function bindMobileEvent(self){
  
  var is_start = false;
  var touch_point_id = 0; // 触点id
  
  self.drag_btn.on('touchstart', function(evt){
    
    evt.return_value = false;
    
    // 是否为编辑状态,是否已经开始,是否忙碌
    if(!self.root.edit || 
      is_start || 
      self.root.isBusy  // 只有节点正在占线,就不允许操作
      //self.isBusy(true)
      ){
      // 已经开始就不需要在来一次了 // 一个触点就够了
      return;
    }
    
    is_start = true;
    touch_point_id = evt.data.touches[0].identifier;
		var touche = evt.data.touches[0];
		drag_start(self, touche.pageX, touche.pageY);
		
  });
  
  function selectTouches(touches, fn){
    
    if(!is_start){
      return;
    }
    for(var i = 0; i < touches.length; i++){
      if(touches[i].identifier == touch_point_id){
        fn(self, touches[i].pageX, touches[i].pageY);
        return true;
      }
    }
  }
  
  self.drag_btn.on('touchmove', function(evt){
    evt.return_value = false;
    selectTouches(evt.data.changedTouches, drag_move);
  });
  
  self.drag_btn.on('touchend', function(evt){
    if(selectTouches(evt.data.changedTouches, drag_end)){
      is_start = false;
    }
  });
}

// 绑定pc事件
function bindPCEvent(self){
  self.drag_btn.on('mousedown', function(evt){
    // TODO 
  });
}

/**
 * @节点初始化
 * @private
 */
function init_TreeNode(self){

  self.on('click', function(){
    // 展开与收拢状态切换
    self.toggleNode();
    if(!self.m_root.edit){
      // 如果不为编辑状态,可选中当前节点
      self.root.setSelectedNode(self);
      self.root.onnodeclick.notice({ node: self });
    }
  });
  
  self.info_btn.on('click', function(evt){
    self.m_root.onclickinfo.notice({ node: self });
    evt.return_value = false;
  });

  self.busy_btn.on('click', function(evt){
    self.m_root.onclickbusy.notice({ node: self });
    evt.return_value = false;
  });
  
  if(ts.env.touch){
    bindMobileEvent(self);
  }
  else{
    bindPCEvent(self);
  }
}

/**
 * 节点卸载事件
 */
function unload_TreeNode(self){
  var root = self.m_root;
  if(root.selectedNode() === self){
    root.setSelectedNode(null);
  }
  if(root.m_drag_node === self){
    root.m_drag_node = null;
  }
}

/**
 * 设置节点的数据
 * @private
 */
function setData(self, data){
  // TODO
  self.m_data = ts.extend({}, data);
  delete self.m_data.children;
  
  if(data.text){
    self.text = data.text;
  }
  if(data.icon){
    self.icon = data.icon;
  }
  
  if(data.info){
    self.info = data.info;
  }
  
  if(data.leaf){ // 叶子节点
    //self.loadData(null);
    self.leaf = true;
  }
  else if('children' in data){
    self.loadData(data.children);
  }

  self.m_root.onrendernode.notice({ node: self });
}

/**
 * 展开节点
 */
function expand(self){
  self.m_children_container.show();
}

// 初始子节点
function init_children(self, el){
  var ns = el.childNodes;
  var ls = [];
  for (var i = 0; i < ns.length; i += 2) {
    ls.push($(ns[i]));
  }
  self.m_children = ls;
  return ls;
}

// 
function get_last(self, el){
  var n = el.lastChild;
  if(n){
    return $(n.previousSibling);
  }
  return null;
}

function find(self, names){
  
  var name = names.shift();
  var ns = self.children();
  
  for(var i = 0; i < ns.length; i++){
    var node = ns[i];
    if(node.m_text == name){
      return names.length ? find(node, names): node;
    }
  }
  return null;
}

/**
 * 通过路径查询现有节点
 * @private
 */
function findByPath(self, path){
  path = path.replace(/\/$/, '');
  if(path){
    return find(self, path.split('/'));
  }
  return self;
}

/**
 * @class private$TreeNode
 * @extends tesla.gui.Control
 */
var private$TreeNode = 
$class('private$TreeNode', tesla.gui.Control, {
  
  // private:
  m_text: '',     // 节点文本
  m_icon: '',     // 图标类型
  m_info: 'I',    // info 标记
  m_leaf: false,  // 是否为叶子节点
  m_level: -1,    // 节点层级
  m_children: null,
  m_children_container: null, // 子节点容器
  // 根节点 teide.touch.ResourcesPanel
  m_root: null,                 
  // 父节点,这个父节点不是普通的父节点,它只能为private$TreeNode
  m_parent: null,
  // 节点是否展开
  m_is_expand: false,
  // 节点数据,只是单个节点数据,并没有子节点数据,子节点数据应该在子节点上找到
  // 这个数据通常是在父节点调用loadData后被设置的
  m_data: null,
  // 是否加载了数据
  m_is_load_data: false,
  // 是否占线
  m_is_busy: false,

	/**
	 * @constructor
	 */
  private$TreeNode: function(root){
    this.Control();
    this.m_root = root;
    this.attr('class', 'node');
    this.m_children_container = $('div');
    this.m_children_container.attr('class', 'children');
    this.m_children = [];
    // 载入视图
    this.loadView('teide.touch.TreeNode');
    init_TreeNode(this);
    this.$on('unload', unload_TreeNode);
  },
  
  /**
   * 返回是否已载入过子节点
   */
  get isLoadData(){
    return this.m_is_load_data;
  },

  /**
   * 节点文本
   * @get
   */  
  get text(){ 
    return this.m_text; 
  },
  
  /**
   * 节点文本
   * @set
   */
  set text(value){
    this.m_text = value;
    this.n_text.html = value;
  },
  
  /**
   * 节点类型
   * @get
   */  
  get icon(){ 
    return this.m_icon;
  },
  
  /**
   * 节点类型
   * @set
   */
  set icon(value){
    this.icon_panel.attr('class', 'n_icon ' + value);
    this.m_icon = value;
  },

  /**
   * @是否忙碌状态
   * @param {boolean} depth 深度查询,查询子节点
   * @return {boolean} 
   */
  isBusy: function(depth){

    if(this.m_is_busy){
      return true;
    }

    if(depth && this.root.isBusy){

      var node = this.root.m_busy_node;

      while(node){
        if(node === this){
          return true;
        }
        else{
          node = node.getParentNode();
        }
      }
    }

    return false;
  },
  
  /**
   * 开始忙碌,如果成功返回true
   */
  startBusy: function(){
    if(this.m_is_busy || this.m_root.m_busy_node){
      return false; // 当前还有没有完成的任务
    }
    this.busy_progress_text.text = '';
    this.m_is_busy = true;
    this.m_root.m_busy_node = this;
    this.collapse();// 收起节点
    this.addClass('busy');
    this.root.onstartbusy.notice(this);
    return true;
  },

  /**
   * 设置忙线进度
   */
  setBusyProgress: function(progress){
    this.busy_progress_text.text = Math.round(progress * 100) + '%';
  },
  
  /**
   * 停止忙碌状态,如果成功返回true
   */
  stopBusy: function(){
    if(!this.m_is_busy){
      return false;
    }
    this.busy_progress_text.text = '';
    this.m_is_busy = false;
    this.m_root.m_busy_node = null;
    this.removeClass('busy');
    this.root.onstopbuys.notice(this);
    return true;
  },
  
  /**
   * 是否为叶子节点
   */
  get leaf(){ 
    return this.m_leaf; 
  },
  
  /**
   * 设置是否叶子节点
   */
  set leaf(value){
    if(value != this.m_leaf){
      this.m_leaf = value;
      if(value){
        this.loadData(null);
      }
      else{
        // 设置叶子节点后无法在设置回去
        // 只能通过loadData 加载数据更改或添加子节点
      }
    }
  },
  
  /**
   * 获取节点info标记
   */
  get info(){
    return this.m_info;
  },
  
  /**
   * 获取节点info标记
   */
  set info(value){
    this.m_info = value;
    return this.info_btn.text = value.mark;
  },

  /**
   * 根节点
   */
  get root(){
    return this.m_root;
  },
  
  /**
   * 获取子节点列表,此子节点非彼子节点
   */
  children: function(){
    if(this.m_children){
      return this.m_children;
    }
    else{
      return init_children(this, this.m_children_container.dom);
    }
  },
  
  /**
   * 删除所有的子节点
   */
  empty: function(){
    this.m_children = [];
    // 清空容器中的内容
    this.m_children_container.empty();
  },
  
  /**
   * 子节点是否已经展开
   */
  isExpand: function(){
    return this.m_is_expand;
  },
  
  /**
   * 展开子节点
   */
  expand: function(){
    
    if(this.m_is_busy){
      return; // 忙碌时无法展开
    }
    
    if(this.m_leaf){// 叶子节点不能展开
      return;
    }
    
    if(this.m_is_expand){ // 节点已经展开
      return;
    }
    this.m_is_expand = true; // 设置成展开状态
    this.addClass('expand');
    
    if(this.m_is_load_data){
      expand(this);
    }
    else {
      // 还未初始化, 请求数据
      this.m_root.onrequest.notice({ node: this });
    }
    this.m_root.onexpand.notice({ node: this });
  },
  
  /**
   * 收拢子节点
   */
  collapse: function(){
    if(this.m_is_expand){
      this.m_is_expand = false; // 设置收拢成状态
      this.removeClass('expand');
      this.m_children_container.hide();
      this.root.oncollapse.notice({ node: this });
    }
  },
  
  /**
   * 展开与收拢子节点
   */
  toggleNode: function(){
    if(this.m_is_expand){
      this.collapse();
    }
    else{
      this.expand();
    }
  },
  
  /**
   * 获取节点层级
   */
  get level(){
    return this.m_level;
  },
  
  /**
  * 前置节点,只能添加private$ResourcesPanelNode
  */
  prepend: function(node) {
    if(node instanceof private$TreeNode){
      this.m_children_container.prepend(node); // 添加节点
      ts.gui.Node.members.after.call(node, node.m_children_container);
      node.setParentNode(this); // 设置父节点
      // if(this.m_leaf){ // 去掉叶子节点属性
      //   this.m_leaf = false;
      //   this.removeClass('leaf');
      // }
    }
    else{
      throw new Error('只能添加 teide.touch.TerrPanel 创建的节点');
    }
  },

  /**
   * 添加子节点,只能添加private$ResourcesPanelNode
   */
  append: function(node){
    // TODO
    if(node instanceof private$TreeNode){
      this.m_children_container.append(node); // 添加节点
      this.m_children_container.append(node.m_children_container); // 添加节点的容器
      node.setParentNode(this); // 设置父节点
      // if(this.m_leaf){ // 去掉叶子节点属性
      //   this.m_leaf = false;
      //   this.removeClass('leaf');
      // }
    }
    else{
      throw new Error('只能添加 teide.touch.TerrPanel 创建的节点');
    }
  },
  
  /**
   * 插入前,只能添加private$TreeNode
   */
  before: function(node) {
    if(node instanceof private$TreeNode){
      ts.gui.Node.members.before.call(this, node); // 添加节点
      ts.gui.Node.members.after.call(node, node.m_children_container);
      node.setParentNode(this.m_parent); // 设置父节点
    }
    else{
      throw new Error('只能添加 teide.touch.TerrPanel 创建的节点');
    }
  },

  /**
   * 插入后,只能添加private$TreeNode
   */
  after: function(node) {
    if(node instanceof private$TreeNode){
      this.m_children_container.after(node); // 添加节点
      ts.gui.Node.members.after.call(node, node.m_children_container);
      node.setParentNode(this.m_parent); // 设置父节点
    }
    else{
      throw new Error('只能添加 teide.touch.TerrPanel 创建的节点');
    }
  },
  
  /**
   * 设置父节点
   */
  setParentNode: function(node){
    
    if(this.m_parent === node){
      if(node){
        this.m_parent.m_children = null; // 重置子节点列表
      }
      // 相同不需要设置
      return;
    }
    if(this.m_parent){
      this.m_parent.m_children = null; // 重置子节点列表
    }
    if(node){
      if(node instanceof private$TreeNode){
        node.m_is_load_data = true;
        if(node.m_leaf){ // 去掉叶子节点属性
          node.m_leaf = false;
          node.removeClass('leaf');
        }
      }
      this.m_parent = node;
      this.m_parent.m_children = null; // 重置子节点列表
      updateLeval(this);
    }
  },
  
  /**
   * 设置样式
   */
  css200ms: function(name, value){
    this.css('transition-duration', '200ms');
    this.css(name, value);
  },
  
  /**
   * 设置样式
   */
  css0ms: function(name, value){
    this.css('transition-duration', 0);
    this.css(name, value);
  },
  
  /**
   * 获取父节点
   */
  getParentNode: function(){
    return this.m_parent;
  },
  
  /**
   * 上一个兄弟节点
   */
  get prev(){
    var n = this.dom.previousSibling;
    if(n){
      return $(n.previousSibling);
    }
    return null;
  },
  
  /**
   * 下一个兄弟节点
   */
  get next(){
    return this.m_children_container.next;
  },
  
  /**
   * 第一个子节点
   */
  get first() {
    return this.m_children_container.first; 
  },
  
  /**
   * 最后一个子节点
   */
  get last() {
    return get_last(this);
  },
  
  /**
   * 删除节点
   */
  remove: function(){
    if(this.m_parent){
      this.m_parent.m_children = null;  // 重置子节点列表
    }
    ts.gui.Node.members.remove.call(this); // 调用基础方法
    this.m_children_container.remove();
  },
  
  /**
   * 节点上的数据
   */
  get data(){
    return m_data;
  },
  
  /**
   * 重新载入子节点
   */
  reload: function(cb){
    if (cb) {
      var self = this;
      self.root.onloaddata.once(function(evt){
        if(evt.data.node === self){
          cb();
        }
      });
    }
    this.m_root.onrequest.notice({ node: this });
  },
  
  /**
   * 获取节点的路径
   */
  get path(){
    if(this.m_parent !== this.m_root){
      return this.m_parent.path + '/' + this.m_text;
    }
    else{
      return this.m_text;
    }
  },
  
  /**
   * 通过路径查询现有节点
   */
  find: function(path){
    return findByPath(this, path);
  },
  
  /**
   * 加载数据
   */ 
  loadData: function(data){
    
    this.empty(); // 清空
    
    this.m_is_load_data = true; // 设置已加载过数据
    
    if(this instanceof private$TreeNode){

      if(data === null || !data.length){ // 为叶子节点
        this.m_leaf = true;
        this.addClass('leaf');
        this.collapse();
        return;
      }
      else{
        this.m_leaf = false;
        this.removeClass('leaf');
      }
    
      if(this.m_is_expand){
        expand(this);
      }
    }
    else if(data === null){
      return;
    }
    
    for(var i = 0; i < data.length; i++){
      var item = data[i];
      var node = this.m_root.NewNode();
      this.append(node);
      setData(node, item);
    }

    this.m_root.onloaddata.notice({ node: this, data: data });
  }
  
});


/************************************************/

function test(self){
  // test data
  var data = [
    { text: 'test.cpp', icon: 'cpp', leaf: true, expanded: true, draggable: false, info: 'A' },
    { text: 'test.c', icon: 'c', leaf: true, info: '?' },
    { text: 'test.h', icon: 'h', leaf: true, info: '!' },
    { text: 'test.cc', icon: 'cpp', leaf: true, info: 'M' },
    { text: 'TeIDE' }
  ];
  self.loadData(data);
  self.onrequest.on(function(evt){
    evt.data.node.loadData(data);
  });
}

function cache_res (){
  ts.gui.resources.load([
    "teide/touch/res/icon/drag_mark.png",
    "teide/touch/res/icon/circle.png",
    "teide/touch/res/suffix/htm.png",
    "teide/touch/res/suffix/cpp.png",
    "teide/touch/res/suffix/c.png",
    "teide/touch/res/suffix/cfm.png",
    "teide/touch/res/suffix/cjl.png",
    "teide/touch/res/suffix/h.png",
    "teide/touch/res/suffix/cs.png",
    "teide/touch/res/suffix/js.png",
    "teide/touch/res/suffix/dart.png",
    "teide/touch/res/suffix/dot.png",
    "teide/touch/res/suffix/css.png",
    "teide/touch/res/suffix/go.png",
    "teide/touch/res/suffix/ab.png",
    "teide/touch/res/suffix/ham.png",
    "teide/touch/res/suffix/m.png",
    "teide/touch/res/suffix/hx.png",
    "teide/touch/res/suffix/java.png",
    "teide/touch/res/suffix/mm.png",
    "teide/touch/res/suffix/py.png",
    "teide/touch/res/suffix/te.png",
    "teide/touch/res/suffix/gl.png",
    "teide/touch/res/suffix/php.png",
    "teide/touch/res/suffix/jsp.png",
    "teide/touch/res/suffix/json.png",
    "teide/touch/res/suffix/conf.png",
    "teide/touch/res/suffix/lua.png",
    "teide/touch/res/suffix/lp.png",
    "teide/touch/res/suffix/ml.png",
    "teide/touch/res/suffix/pl.png",
    "teide/touch/res/suffix/sql.png",
    "teide/touch/res/suffix/bat.png",
    "teide/touch/res/suffix/r.png",
    "teide/touch/res/suffix/sh.png",
    "teide/touch/res/suffix/cf.png",
    "teide/touch/res/suffix/svg.png",
    "teide/touch/res/suffix/xml.png",
    "teide/touch/res/suffix/vx.png",
  ]);
}

/**
 * @private
 */
function init_TreePanel(self){
  
  // load icon
  nextTick(cache_res);

  self.on('click', function(evt){
    if(tesla.env.mobile){
      if(evt.data.srcElement === evt.data.currentTarget){
        self.setSelectedNode(null); // 取消选择
      }
    }
    else{
      if(evt.data.srcElement.parentNode === evt.data.currentTarget){
        self.setSelectedNode(null); // 取消选择
      }      
    }
  });
}

// 
function expand_all(self, node, names, cb){
  
  node = node.find(names.shift());
  
  if(!node){
    return cb('Error not node');
  }
  
  if(!names.length){
    return cb(null, node);
  }
  
  if(node.isExpand()){
    expand_all(self, node, names, cb);
  } else if(node.isLoadData) {
    node.expand(); // 展开
    expand_all(self, node, names, cb);
  } else {
    self.onloaddata.once(function(evt){
      if(evt.data.node === node){
        expand_all(self, node, names, cb); // 继续查找
      }
    });
    node.expand(); // 展开
  }
}

/**
 * 树根节点
 * @class teide.touch.TreePanel
 * @extends tesla.gui.ScrollView
 */
$class('teide.touch.TreePanel', ts.gui.Control, /*tesla.gui.ScrollView,*/ {
  
  // 选择的节点
  m_selected_node: null,      //
  m_children: null,           // 子节点
  m_edit: false, // 编辑状态
  // 编辑拖拽的开始x位置
  m_drag_start_x: 0,
  // 编辑拖拽的开始y位置
  m_drag_start_y: 0,
  // 当前拖拽的节点
  m_drag_node: null,
  // 拖拽相邻的节点
  m_drag_adjoin: null,
  // 拖拽节点的基础偏移
  m_dart_basic_offset_y: 0,
  // 是否有忙线的节点
  m_busy_node: null,
  
  /**
   * 节点点击事件
   * @event onnodeclick
   */
  onnodeclick: null,
  
  /**
   * 请求子节点时触发
   * @event onrequest
   */
  onrequest: null,
  
  /**
   * 节点每次展开都会触发
   */
  onexpand: null,
  
  /**
   * 节点每次收拢都会触发
   */
  oncollapse: null,
  
  /**
   * 子节点在载入数据后触发
   */
  onloaddata: null,
  
  /**
   * 节点渲染后触发
   */
  onrendernode: null,
  
  /**
   * 拖拽事件,这个事件只有打开编辑状态后才可能触发
   */
  ondrag: null,
  
  /**
   * 节点的info按钮点击事件
   */
  onclickinfo: null,

  /**
   * 忙线点击
   */
  onclickbusy: null,
  
  // 
  onstartbusy: null, // 开始占线
  
  onstopbuys: null,  // 结束占线

  /**
	 * @constructor
	 */
  TreePanel: function(){
    this.Control();
    this.m_children = [];
    ts.EventDelegate.init_events(this, 
      'nodeclick',
      'request', 
      'expand', 
      'collapse', 
      'loaddata', 
      'rendernode', 
      'drag', 
      'clickinfo',
      'clickbusy',
      'startbusy',
      'stopbuys'
    );
    this.addClass('respanel');
    
    this.style = {
      'width': '100%',
      'height': '100%',
      'overflow-scrolling': 'touch',
      'overflow' : 'auto',
    };
    
    this.m_scroller = $('div');
    this.m_scroller.style = {
      'min-width': '100%',
      'min-height': '100%',
      'display': 'inline-block',
      'position': 'relative',
    };
    this.m_scroller.appendTo(this);
    this.idom = this.m_scroller.dom;
    this.onloadview.$on(init_TreePanel);
  },
  
  get isBusy(){
    return this.m_busy_node;
  },

  /**
   * 获取选择的节点
   */  
  selectedNode: function(){
    return this.m_selected_node;
  },
  
  /**
   * 设置选择的节点
   */
  setSelectedNode: function(node){

    if(this.m_selected_node){
      not_selected_node(this.m_selected_node);
    }
    
    this.m_selected_node = node;
    if(node){
      selected_node(node);
    }
    
    // TODO 选中的节点如果没有在可视范围,调整到可视范围
  },
  
  /**
   * 加载数据
   */
  loadData: function(data){

    this.empty(); // 清空
    
    if(data === null){
      return;
    }
    
    for(var i = 0; i < data.length; i++){
      var item = data[i];
      var node = this.NewNode();
      this.append(node);
      setData(node, item);
    }

    this.onloaddata.notice({ node: this, data: data });
  },
  
  /**
   * 获取子节点列表
   */
  children: function(){
    if(this.m_children){
      return this.m_children;
    }
    else{
      return init_children(this, this.idom);
    }
  },

  /**
   * 获取父节点
   */
  getParentNode: function(){
    return null;
  },
  
  /**
   * 最后一个子节点
   */
  get last() {
    return get_last();
  },
  
  /**
   * 删除所有的子节点
   */
  empty: function(){
    this.m_children = [];
    ts.gui.Node.members.empty.call(this);
  },
  
  /**
  * 前置节点,只能添加private$ResourcesPanelNode
  */
  prepend: function(node) {
    if(node instanceof private$TreeNode){
      ts.gui.Node.members.prepend.call(this, node); // 添加节点
      ts.gui.Node.members.after.call(node, node.m_children_container);
      node.setParentNode(this); // 设置父节点
    }
    else{
      throw new Error('只能添加 teide.touch.TerrPanel 创建的节点');
    }
  },
  
  /**
   * 添加子节点
   */
  append: function(node){
    // TODO
    if(node instanceof private$TreeNode){
      ts.gui.Node.members.append.call(this, node); // 添加节点
      ts.gui.Node.members.append.call(this, node.m_children_container); // 添加节点的容器
      node.setParentNode(this); // 设置父节点
    }
    else{
      throw new Error('只能添加 teide.touch.ResourcesPanel 创建的节点');
    }
  },
  
  /**
   * 删除这个控件
   */
  remove: function(){
    ts.gui.Node.members.remove.call(this); // 调用基础方法
  },

  get root(){
    return this;
  },
  
  /**
   * 获取节点层级
   */
  get level(){
    return 0;
  },
  
  /**
   * 获取节点的路径
   */
  get path(){
    return '';
  },
  
  /**
   * 通过展开所有目标节点
   */
  expand_all: function(path, cb){
    if(!path){
      return cb('path error');
    }
    expand_all(this, this, path.split('/'), cb || function(){ });
  },
  
  /**
   * 通过路径查询现有节点
   */
  find: function(path){
    return findByPath(this, path);
  },
  
  /**
   * 开启编辑状态
   */
  enableEdit: function(){
    // 有忙线的节点时候不能进入编辑状态
    // if(this.isBusy){ 
    //   return false;
    // }
    this.m_edit = true;
    this.addClass('edit');
    // 如果当前有选择的节点取消节点的选择
    if(this.m_selected_node){
      not_selected_node(this.m_selected_node);
    }
    return true;
  },
  
  /**
   * 关闭编辑状态
   */
  disableEdit: function(){
    // 有忙线的节点时候不能关闭编辑状态
    // if(this.isBusy){
    //  return false;
    // }
    this.m_edit = false;
    this.removeClass('edit');
    return true;
  },
  
  /**
   * 返回是否为编辑状态
   */
  get edit(){
    return this.m_edit;
  },
  
  /**
   * 创建新的子节点
   * @
   */
  NewNode: function(){
    return new private$TreeNode(this);
  },
  
  /**
   * 重新载入子节点
   */
  reload: function(){
    // this.empty(); // 清空
    this.onrequest.notice({ node: this });
  }
  
});