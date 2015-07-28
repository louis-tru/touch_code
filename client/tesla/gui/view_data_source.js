/**
 * 视图数据源
 * @class tesla.gui.ViewDataSource
 * @extends tesla.data.ServiceDataSource
 * @createTime 2013-04-10
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * @version 1.0
 */

'use strict';

include('tesla/gui/control.js');
include('tesla/data/service_data_source.js');

var Control_view = tesla.gui.Control.view;

$class('tesla.gui.ViewDataSource', tesla.data.ServiceDataSource, {

	autoLoad: true,

  ViewDataSource: function() {
    this.ServiceDataSource();
  },

  loadView: function(view) {
    view = Control_view(view);
    tesla.extend(this, view);
    var param = view.param;
    if (param)
      this.param = EVAL('(' + param + ')');
  },

  /**
   * @param {tesla.gui.Node}
   */
  appendTo: function(parent, id){
    
    if(id){
      var top = (parent.te == 1 ? parent : parent.top);
      if (top) {
        var ds = top[id];
        if (ds) {
          // TODO ? 
          // throw new Error('不能使用id:"' + id + '",已存在同名属性');
        }
        top[id] = this;
      }
    }
  }
});

