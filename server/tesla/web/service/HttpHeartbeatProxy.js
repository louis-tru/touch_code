/**
 * @class tesla.web.service.HttpHeartbeatProxy conversation proxy
 * @extends tesla.web.service.HttpService
 * @createTime 2012-01-01
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/web/service/HttpHeartbeatConversation.js');
include('tesla/web/service/HttpService.js');
include('tesla/web/service/WebSocketService.js');

var Conversation = tesla.web.service.Conversation;
var HttpHeartbeatConversation = tesla.web.service.HttpHeartbeatConversation;
var HttpService = tesla.web.service.HttpService;

Class('tesla.web.service.HttpHeartbeatProxy', HttpService, {

	/**
	 * complete handshakes, return client
	 * @param {Number} token             conversation token
	 * @param {Object} password          verify the password
	 */
	handshakesComplete: function(token, password) {
		this.result({ type: 'handshakes_complete', token: token, password: password });
	},

	/**
	 * send message to client
	 * @param {String[]} msg
	 */
	send: function(msg) {
		this.result({ type: 'message', data: msg });
	},

	/**
	 * complete receive client data, return client
	 */
	receiveComplete: function() {
		this.result({ type: 'receive_complete' });
	},

	/**
	 * close the connection
	 */
	close: function() {
		this.result({ type: 'close' });
	},

	/**
	 * http heartbeat proxy handshakes
	 * @type {String} bind_services_name  bind services name
	 */
	handshakes: function(bind_services_name) {
		// 创建连接
		new HttpHeartbeatConversation(this, bind_services_name);
	},

	/**
	 * listen conversation change
	 * @param {Number} token        conversation token
	 * @param {String} password     verify the password
	 */
	listen: function(token, password) {

		/*
		Note:
		The network fault tolerance,
		the browser will cause strange the second request,
		this error only occurs on the server restart,
		the BUG caused by the request can not respond to
		*/
		var conversation = Conversation.get(token);
		if (conversation)
			conversation.listen(this, password);
		else
			this.close();
	},

	/**
	 * receive client data
	 * @param {Number} token        conversation token
	 * @param {String} password     verify the password
	 * @param {String} data         get data
	 */
	receive: function(token, password, data) {
		var conversation = Conversation.get(token);
		if (conversation)
			conversation.receive(this, password, data);
		else
			this.close();
	}

});
