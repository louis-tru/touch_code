/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/publish/Action.js');

var 
action = new tesla.publish.Action();
// action.excludes = [
//     //'test', 
//     'thk/res_r', 
//     //'thk/res_r_hd_50M', 
//     'thk/res_r_hd'
// ];
// action.statics = [
//     'thk/res_static', 
//     'thk/game.htm', 
//     'thk/top_app.htm', 
//     'thk/top_debug.htm',
//     'thk/top_qq.htm',
//     'thk/top_tx.htm',
//     'thk/top_xl.htm',
//     'thk/user.htm',
//     'thk/war.htm'
// ];

//action.isNativeShell = true;
action.isFullname = true;
action.map = true;
action.client($f('../browser'), $f('../pub_browser'));
//action.server($f('../server'), $f('../pub_server'));

console.log('发布完成,重启服务!');

