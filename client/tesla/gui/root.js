/**
 * 节点根
 * @class tesla.gui.Root
 * @extends tesla.gui.Control
 * @createTime 2012-06-01
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/gui/control.js');
include('tesla/gui/screen.js');
// include('tesla/gui/Scroll');

var screen = tesla.gui.screen;
var root = null;

if (tesla.env.touch) {
  
  // $(document.documentElement).on('touchstart', function(evt){
  //   var tagName = evt.data.target.tagName.toUpperCase();
  //   if(tagName != 'INPUT' && tagName != 'TEXTAREA' && root){
  //     //document.body.scrollTop = 1;
  //   }
  // });
  
  $(document.documentElement).on('touchmove', function(evt){
    if (root) {
      // evt.return_value = false;
    }
  });
}

screen.onchange.on(function(){
  var size = screen.size;
  if(root){
    root.style = { width: size.width + 'px', height: size.height + 'px' };
    // document.body.scrollTop = 1;
  }
});

var Root = 
$class('Root', tesla.gui.Control, {

  Root: function(){
    this.Control('div');
    var size = screen.size;
    this.style = { 
      width: size.width + 'px',
      height: size.height + 'px',
      position: 'absolute',
      top: 0,
      left: 0,
      'z-index': 10,
      overflow: 'hidden'
    };
    $(document.body).prepend(this);
  }
});

ts.gui.root = {
  
  is_root: function(node){
    return node !== null && node === root;
  },

  /**
   * 获取Root
   * @return {tesla.gui.Root}
   * @static
   */
  share: function(){
    if(root)
      return root;
    root = new Root();
    root.on('unload', function(){
      root = null;
    });
    return root;
  }
};



