/**
 * @class tesla.web.Controller
 * @extends tesla.web.service.HttpService
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/web/service/HttpService.js');
include('tesla/node.js');

var HttpService_init = tesla.web.service.HttpService.members.init;

Class('tesla.web.Controller', tesla.web.service.HttpService, {

	/**
	 * view data
	 * @type {Object}
	 */
	viewData: null,

	//overlay
	init: function(req, res) {
		HttpService_init.call(this, req, res);
		this.viewData = {};
	},

	/**
 	 * @param {Object} name svx view name
	 */
	view: function(name) {

		// TODO ?
		// parse *.svx file
		//
		// this.returnFile(tesla.format(name));

	}
});

