
(function(){

//-----

function noop(){ 
    // empty function    
}

// 扩展objct对像
function extend(obj, obj2){
    for(var i in obj2){
        obj[i] = obj2[i];
    }
    return obj;
}

// 通过标签名称创建html元素
function newElement(tag, attrs){
    
    var el = new Element(document.createElement(tag));
    for(var i in attrs){
        var value = attrs[i];
        switch(i){
            case 'class':
                el.cls(value);
                break;
            case 'html':
                el.html(value);
                break;
            default:
                el.attr(i, value);
                break;
        }
    }
    return el;
}

/**
 * html 元素
 * @class Element 
 */
function Element(dom){
    this.dom = dom;
}

// 设置节点样式
Element.prototype.style = function(style){
    for (var i in style){
        this.css(i, style[i]);
    }
};

// 设置单个 css样式 
Element.prototype.css = function(name, value){
    this.dom.style[name] = value;
};

// Element.prototype.children = function(){
//     return [];
// };

// 添加节点至结尾
Element.prototype.append = function(el){
    this.dom.appendChild(el.dom);
};

// 插入后
Element.prototype.after = function(el){
    var dom = this.dom;
    var parent = dom.parentNode;
    dom.nextSibling ? 
                parent.insertBefore(el.dom, dom.nextSibling) : 
                parent.appendChild(el.dom);
};

// 设置 class 样式表
Element.prototype.cls = function(value){
    this.dom.className = value;
};

// 设置节点属性
Element.prototype.attr = function(name, value){
    if(arguments.length == 2){
        this.dom.setAttribute(name, value);
    }
    else{
        return this.dom.getAttribute(name);
    }
};

// 删除
Element.prototype.remove = function(){
    this.dom.parentNode.removeChild(this.dom);
};

// 设置获取html
Element.prototype.html = function(html){
    if(arguments.length == 1){
        this.dom.innerHTML = html;
    }
    else{
        return this.dom.innerHTML;
    }
};

/**
 * @class Node
 */
function Node(root, container){
    this._cells = null;
    this._cellCount = 0;
    this._root = root; 
    this._parentNode = null; 
    this._container = container || newElement('tr');
    this._data = null;
}

/**
 * 获取节点列
 * @return {Object}
 */
Node.prototype.cells = function(){
    return this._cells;
};

/**
 * 设置节点列
 * @param cells {Object}
 */
Node.prototype.setCells = function(cells){
    this._cells = cells;
};

/**
 * 获取列数量
 * @return {Number}
 */
Node.prototype.cellCount = function(){
    return this._cellCount;
};

/**
 * 设置列数量
 * @param num {Number}
 */
Node.prototype.setCellCount = function(num){
    this._cellCount = num;
};

/**
 * 获取根grid
 * @return {Node}
 */
Node.prototype.root = function(){
    return this._root;
};

/**
 * 获取父节点
 * @return {Node}
 */
Node.prototype.parentNode = function(){
    return this._parentNode;
};

/**
 * 设置父节点
 * @param node {Node}
 */
Node.prototype.setParentNode = function(node){
    this._parentNode = node;
};

/**
 * 获取节点容器
 * @return {Element}
 */
Node.prototype.container = function(){
    return this._container;
};

/**
 * 获取节点数据
 * @return {Object}
 */
Node.prototype.data = function(){
    return this._data;
};

/**
 * 获取节点数据
 * @param data {Object}
 */
Node.prototype.setData = function(data){
    this._data = data;
};

// 判断节点类型,子类型重写
Node.prototype.isTreeHeadNode = function(){
    return false;
};

// 判断节点类型,子类型重写
Node.prototype.isTreeNode = function(){
    return false;
};

// 渲染节点到页面
Node.prototype.render = function(data){
    // 子类型实现
    throw new Error('子类型需重写该方法');
};

/**
 * @class TreeHeadNode
 * @extends Node
 */
function TreeHeadNode(root){
    Node.call(this, root);
    var td = newElement('td', {'class': 'first'});
    this.container().cls('head');
    this.container().append(td);
}

extend(TreeHeadNode.prototype, Node.prototype);

TreeHeadNode.prototype.isTreeHeadNode = function(){
    return true;
};

// 渲染节点到页面
TreeHeadNode.prototype.render = function(data){

    // <tr class="head">
    //     <td class="first"></td>
    //     <td colspan="2">工艺名称</td>
    //     <td>工艺方案</td>
    //     <td>工艺版次</td>
    //     <td>是否有效</td>
    //     <td>主制车间</td>
    //     <td>最大批量</td>
    //     <td>最小批量</td>
    //     <td>经济批量</td>
    //     <td>输入人员</td>
    // </tr>

    var cells = {};
    var cellCount = 0;
    var _this = this;
    var root = this.root();
    
    for(var i in data){
        var td = newElement('td', { html: data[i], colspan: cellCount === 0 ? 2 : 1 });
        td.dom.onclick = function(evt){
            root.onclick({ sender: _this, cell: td, originEvent: evt || global.event });
        };
        this.container().append(td);
        cellCount++;
        cells[i] = td;
    }
    this.setData(data);
    this.setCellCount(cellCount);
    this.setCells(cells);
    // 发射事件
    root.onrendernode({ sender: this, data: data, cells: cells, cellCount: cellCount }); //
};

// 删除
TreeHeadNode.prototype.remove = function(){
    this.container().remove();
};

/**
 * @class TreeNode
 * @extends Node
 */
function TreeNode(root, container){
    Node.call(this, root, container);
    this._leaf = false;
    this._children = [];
    this._isexpand = false;
    this.children_container_tr = null;
    this.children_container_tr_td = null;
    this.children_container_tr_td2 = null;
    this.children_container = null;
    
    var first = newElement('td', {'class': 'first'});
    var button = newElement('div', {'class': 'plus'}); // 展开收拢按钮
    var row_start = newElement('td', {'class': 'row_start'});

    first.append(button);
    this._container.append(first);
    this._container.append(row_start);
    this._button = button;
    var _this = this;
    button.dom.onclick = function(){ // 点击事件
        _this.toggle();
    };
}

// 继承Node
extend(TreeNode.prototype, Node.prototype);

// 重写
TreeNode.prototype.isTreeNode = function(){
    return true;
};

/**
 * 是否为一个叶子节点
 * @return {Boolean}
 */
TreeNode.prototype.leaf = function(){
    return this._leaf;
};

/**
 * 获取子节点列表
 * @return {Array}
 */
TreeNode.prototype.children = function(){
    return this._children;
};

// 展开与收拢
TreeNode.prototype.toggle = function(){
    if(this._isexpand){
        this.collapse();
    }
    else{
        this.expand();
    }
};

TreeNode.prototype._expand = function(){
    this.children_container_tr.css('display', '');
    // 是否为最后一个子节点
    // 最后一个子节点要做特殊处理
    // 添加样式 last_child_panel 、last_child_panel_first
    
    var ns = this.parentNode().children();
    if(ns[ns.length -1] === this){ // 为最后的节点
        this.children_container_tr_td.cls('first child_panel_first last_child_panel_first');
        this.children_container_tr_td2.cls('child_panel last_child_panel');
    }
    else{
        this.children_container_tr_td.cls('first child_panel_first');
        this.children_container_tr_td2.cls('child_panel');
    }
};

TreeNode.prototype._collapse = function(){
    this.children_container_tr.css('display', 'none');
};

// 展开子节点
TreeNode.prototype.expand = function(){

    if(this._leaf){
        this.collapse();
        return;
    }
    
    this._isexpand = true;
    this._button.cls('minus');

    if(this.children_container_tr){ // 还未初始化, 请求数据
        this._expand();
    }
    else{
        this.root().onrequest({ sender: this });
    }
    this.root().onexpand({ sender: this });
};

// 收拢子节点
TreeNode.prototype.collapse = function(){
    this._isexpand = false;
    this._button.cls('plus');
    if(this.children_container_tr){
        this._collapse();
    }
    this.root().oncollapse({ sender: this });
};

// 通过数据载入子节点
TreeNode.prototype.loadData = function(data){
    
    this.empty(); // 清空
    
    if(this instanceof TreeNode){

        if(data === null){ // 为叶子节点
            this._leaf = true;
            this._button.css('display', 'none');
            this.collapse();
            return;
        }
        
        this._leaf = false;
        this._button.css('display', '');
    }

    var root = this.root();
    var head = root.createHead();
    
    root.onloaddata(data);
    
    this.append(head);
    head.render(data.head);
    
    var list_data = data.data;
    for(var i = 0; i < list_data.length; i++){
        var item = list_data[i];
        var node = root.createNode();
        this.append(node);
        node.render(item);
    }
};

// 添加子节点
TreeNode.prototype.append = function(node){

    var children_container = this.children_container;
    if(!children_container){
        
        // <tr>
        //     <td class="first child_panel_first"></td>
        //     <td colspan="10" class="child_panel">
        //         <table class="table" border="0" cellPadding="0" cellSpacing="0">

        var cellCount = this.cellCount();
        if(cellCount === 0){
            throw new Error('节点还未初始化, 请先初始节点, render(data);');
        }

        var tr = new newElement('tr');
        var first_td = new newElement('td', { 'class': 'first child_panel_first' });
        var child_panel_td = new newElement('td', { 'class': 'child_panel', colspan: cellCount + 1 });
        var table = new newElement('table', { 
            'class': this.root().cls, border: 0, cellPadding: 0, cellSpacing: 0 });
        var tbody = new newElement('tbody');


            
        tr.append(first_td);
        tr.append(child_panel_td);
        child_panel_td.append(table);
        table.append(tbody);

        this.container().after(tr);
        this.children_container_tr = tr;
        this.children_container_tr_td = first_td;
        this.children_container_tr_td2 = child_panel_td;
        this.children_container = tbody;
        
        if(this._isexpand){
            this._expand();
        }
        else{
            this._collapse();
        }
    }

    node.setParentNode(this);
    this._children.push(node);
    this.children_container.append(node.container());
};

TreeNode.prototype.render = function(data){
    
    // <tr class="select">
    //     <td class="first"><div class="minus"></div></td>
    //     <td class="row_start"></td>
    //     <td>st20a.1.1.1.1.1 2-2</td>
    //     <td>机械加工</td>
    //     <td>1</td>
    //     <td>是</td>
    //     <td></td>
    //     <td>1.0</td>
    //     <td>1.0</td>
    //     <td>1.0</td>
    //     <td>工艺工艺， 森</td>
    // </tr>

    var parent = this.parentNode();
    if(!parent){
        throw new Error('Error');
    }
    var treeHeadNode = parent.children()[0]; // 第一个为头节点
    if(!treeHeadNode){
        throw new Error('Error');
    }

    var headCells = treeHeadNode.cells();
    var cells = {};
    var _this = this;
    var root = this.root();

    for(var i in headCells){ // 依赖于头节点的字段定义
        var td = newElement('td', { html: data[i] });
        td.dom.onclick = function(evt){
            root.setSelected(_this);
            root.onclick({ sender: _this, cell: td, originEvent: evt || global.event });
        };
        this.container().append(td);
        cells[i] = td;
    }
    this.setData(data);
    this.setCellCount(treeHeadNode.cellCount());
    this.setCells(cells);

    if('children' in data){
        this.loadData(data.children);
    }

    // 发射事件
    root.onrendernode({ 
        sender: this, 
        data: data, 
        cells: cells, 
        cellCount: treeHeadNode.cellCount() }); //
};

// 通过数据载入子节点
TreeNode.prototype.empty = function(){
    var children = this.children();
    for(var i = 0; i < children.length; i++){
        children[i].remove();
    }
};

// 删除节点
TreeNode.prototype.remove = function(){
    var root = this.root();
    var selected = root.selected();
    if(selected === this){
        root.setSelected(null);
    }
    
    this.empty();
    this.container().remove();
    if(this.children_container_tr)
        this.children_container_tr.remove();
};

/**
 * @class TreeGrid
 * @extends Node
 */
function TreeGrid(container, cls){
    
    Node.call(this, this, new Element(container));
    
    /**
     * 控件使用的样式表
     * @type {String}
     */
    this.cls = cls || 'table';
    var table = newElement('table', { 
        'class': this.cls, border: 0, cellPadding: 0, cellSpacing: 0 });
    var tbody = newElement('tbody');

    table.append(tbody);
    this._children = [];
    this._selected = null;
    this.children_container = tbody;
    this.container().append(table);
}

// 继承 Node
extend(TreeGrid.prototype, Node.prototype);
TreeGrid.prototype.onclick = noop;            // 节点点击后触发
TreeGrid.prototype.onrequest = noop;          // 在请求子节点数据时触发
TreeGrid.prototype.onexpand = noop;           // 节点每次展开都会触发
TreeGrid.prototype.oncollapse = noop;         // 节点每次收拢都会触发
TreeGrid.prototype.onloaddata = noop;         // 子节点在载入数据后触发
TreeGrid.prototype.onrendernode = noop;       // 节点渲染后触发

/**
 * 获取子节点列表
 * @return {Array}
 */
TreeGrid.prototype.children = function(){
    return this._children;
};

// 通过数据载入子节点
TreeGrid.prototype.loadData = function(data){
    TreeNode.prototype.loadData.call(this, data);
};

// 通过数据载入子节点
TreeGrid.prototype.empty = function(){
    TreeNode.prototype.empty.call(this);
};

// 添加子节点
TreeGrid.prototype.append = function(node){
    node.setParentNode(this);
    this._children.push(node);
    this.children_container.append(node.container());
};

// 获取当前选中的节点
TreeGrid.prototype.selected = function(){
    return this._selected;
};

TreeGrid.prototype.setSelected = function(node){
    var selected = this.selected();
    if(selected){
        selected.container().cls('');
    }
    if(node)
        node.container().cls('select');
    this._selected = node;
};

TreeGrid.prototype.createHead = function(){
    return new TreeHeadNode(this);
};

// 创建节点
TreeGrid.prototype.createNode = function(){
    return new TreeNode(this);
};

window.TreeGrid = TreeGrid;

})();



