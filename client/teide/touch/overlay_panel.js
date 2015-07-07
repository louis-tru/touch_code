/**
 * @createTime 2014-12-15
 * @author louis.tru <louistru@live.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

include('tesla/gui/control.js');
include('tesla/gui/root.js');
include('teide/touch/overlay_panel.vx');
include('tesla/gui/scroll_view.js');

var arrowSize = { width: 30, height: 13 };

function init(self){
  
  if (ts.env.ios && ts.env.ios_version >= 8.2 && ts.env.ios_version < 10) {
    self.inl.addClass('fine');
  }
  
  tesla.gui.screen.onchange.on(self.remove, self);
  
  if(tesla.env.mobile){
    self.bg.on('touchend', self.remove, self);
  }
  else{
    self.bg.on('mouseup', self.remove, self);
  }
  self.on('click', function(){
    if(self.frail){
      self.remove();
    }
  });
}

function release(self){
  tesla.gui.screen.onchange.off(self.remove, self);
}

/**
 * 获取left
 * @private
 */
function getLeft(self, x, offset_x){
  
  x -= 10; // 留出10像素边距
  var screen_width = tesla.gui.screen.size.width - 20;
  var width = self.dom.clientWidth;
  
  if(screen_width < width){
    return (screen_width - width) / 2 + 10;
  }
  else{
    var left = x + offset_x / 2 - width / 2;
    if(left < 0){
      left = 0;
    }
    else if(left + width > screen_width){
      left = screen_width - width;
    }
    return left + 10;
  }
}

/**
 * 获取top
 * @private
 */
function getTop(self, y, offset_y){

  y -= 10; // 留出10像素边距
  var screen_height = tesla.gui.screen.size.height - 20;
  var height = self.dom.clientHeight;
  
  if(screen_height < height){
    return (screen_height - height) / 2 + 10;
  }
  else{
    var top = y + offset_y / 2 - height / 2;
    if(top < 0){
      top = 0;
    }
    else if(top + height > screen_height){
      top = screen_height - height;
    }
    return top + 10;
  }
}

/**
 * 获取arrowtop
 * @private
 */
function getArrowTop(self, top, y, offset_y){
  var height = self.dom.clientHeight;
  y += offset_y / 2;
  var min = 8 + arrowSize.width / 2;
  var max = height - 8 - arrowSize.width / 2;
  if(min > max){
    return height / 2;
  }
  return Math.min(Math.max(min, y - top), max);
}

/**
 * 获取arrowleft
 * @private
 */
function getArrowLeft(self, left, x, offset_x){
  var width = self.dom.clientWidth;
  x += offset_x / 2;
  var min = 8 + arrowSize.width / 2;
  var max = width - 8 - arrowSize.width / 2;
  if(min > max){
    return width / 2;
  }
  return Math.min(Math.max(min, x - left), max);
}

/**
 * 尝试在目标的top显示
 * @private
 */
function attempt_top(self, x, y, offset_x, offset_y, force){

  var height = self.dom.clientHeight;
  var top = y - height - arrowSize.height;
  
  if (top - 10 > 0 || force){
    var left = getLeft(self, x, offset_x);
    var arrow_left = getArrowLeft(self, left, x, offset_x) - arrowSize.width / 2;
    self.inl.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: 'auto', 
      bottom: '-{0}px'.format(arrowSize.height - 0.5), 
      right: 'auto', 
      left: arrow_left + 'px',
      transform: 'rotateZ(180deg)'
    };
    return true;
  }
  return false;
}

/**
 * 尝试在目标的right显示
 * @private
 */
function attempt_right(self, x, y, offset_x, offset_y, force){
  
  var size = tesla.gui.screen.size;
  var width = self.dom.clientWidth;
  
  var left = x + offset_x + arrowSize.height;
  
  if (left + width + 10 <= size.width || force){
    var top = getTop(self, y, offset_y);
    var arrow_top = getArrowTop(self, top, y, offset_y) - arrowSize.height / 2;
    self.inl.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: arrow_top + 'px', 
      bottom: 'auto', 
      right: 'auto',
      left: '-{0}px'.format(arrowSize.width / 2 + arrowSize.height / 2),
      transform: 'rotateZ(-90deg)'
    };
    return true;
  }
  return false;
}

/**
 * 尝试在目标的bottom显示
 * @private
 */
function attempt_bottom(self, x, y, offset_x, offset_y, force){
  
  var size = tesla.gui.screen.size;
  var height = self.dom.clientHeight;
  
  var top = y + offset_y + arrowSize.height;
  
  if (top + height + 10 <= size.height || force){
    var left = getLeft(self, x, offset_x);
    var arrow_left = getArrowLeft(self, left, x, offset_x) - arrowSize.width / 2;
    self.inl.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: '-{0}px'.format(arrowSize.height),
      bottom: 'auto', 
      right: 'auto',
      left: arrow_left + 'px',
      transform: 'rotateZ(0deg)'
    };
    return true;
  }
  return false;
}

/**
 * 尝试在目标的left显示
 * @private
 */
function attempt_left(self, x, y, offset_x, offset_y, force){
  
  var width = self.dom.clientWidth;
  var left = x - width - arrowSize.height;
  
  if (left - 10 > 0 || force){
    
    var top = getTop(self, y, offset_y);
    var arrow_top = getArrowTop(self, top, y, offset_y) - arrowSize.height / 2;
    self.inl.style = { top: top + 'px', left: left + 'px' };
    self.arrow.style = { 
      top: arrow_top + 'px',
      bottom: 'auto', 
      right: '-{0}px'.format(arrowSize.width / 2 + arrowSize.height / 2),
      left: 'auto',
      transform: 'rotateZ(90deg)'
    };
    return true;
  }
  return false;
}


/**
 * @class teide.touch.OverlayPanel
 * @extends tesla.gui.Control
 */
$class('teide.touch.OverlayPanel', tesla.gui.Control, {
  
  /**
   * 很脆弱
   * 默认为点击就会消失掉
   */
  frail: true,
  
  x: 0, 
  y: 0, 
  offset_x: 0, 
  offset_y: 0,
  activate: false,
  opacity: 1,

  /**
   * 优先显示的位置
   */
  priority: 'bottom', // top | right | bottom | left
  
  /**
	 * @constructor
	 */
  OverlayPanel: function(tag){
    this.Control(tag);
    tesla.gui.Node.members.hide.call(this);
    tesla.gui.root.share().append(this);
    this.$on('loadview', init);
    this.$on('unload', release);
  },
  
  /**
   * 通过ts.gui.Node 激活 OverlayPanel
   * @param {ts.gui.Node} target 参数可提供要显示的位置信息
   * @param {Object} offset 显示目标位置的偏移
   */
  activateByElement: function(target){
    var offset = target.offset;
    this.activateByPosition(offset.left, offset.top, offset.width, offset.height);
  },
  
  /**
   * 通过位置激活
   */
  activateByPosition: function(x, y, offset_x, offset_y){

    var self = this;
    var size = tesla.gui.screen.size;
    
    self.bg.style = { width: size.width + 'px', height: size.height + 'px' };

    x = Math.max(0, Math.min(size.width, x));
    y = Math.max(0, Math.min(size.height, y));

    offset_x = offset_x || 0;
    offset_y = offset_y || 0;
    
    self.show();
    
    this.x = x;
    this.y = y;
    this.offset_x = offset_x;
    this.offset_y = offset_y;
    
    switch (self.priority) {
      case 'top':
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y, true);
        break;
      case 'right':
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y, true);
        break;
      case 'bottom':
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y, true);
        break;
      default:
        attempt_left(self, x, y, offset_x, offset_y) ||
        attempt_right(self, x, y, offset_x, offset_y) ||
        attempt_bottom(self, x, y, offset_x, offset_y) ||
        attempt_top(self, x, y, offset_x, offset_y) ||
        attempt_left(self, x, y, offset_x, offset_y, true);
        break;
    }

    if(!self.activate){
      self.animate({ opacity: self.opacity }, 200);
    }

    this.activate = true;
  },

  /**
   * 重新激活
   */
  reset: function(){
    if(this.activate){
      this.activateByPosition(this.x, this.y, this.offset_x, this.offset_y);
    }
  },
  
  /**
   * @overwrite
   */
  appendTo: function(parent, id){
    if(ts.gui.root.is_root(parent)) {
      tesla.gui.Control.members.appendTo(parent, id);
    } else {
      throw new Error('只能加入Root节点');
    }
  },

  hide: function(){
    var self = this;
    this.animate({ opacity: 0.01 }, 200, function(){
      ts.gui.Node.members.hide.call(self);
    });
  },
  
  remove: function (){
    var self = this;
    this.animate({ opacity: 0.01 }, 200, function(){
      ts.gui.Node.members.remove.call(self);
    });
  }
  
});