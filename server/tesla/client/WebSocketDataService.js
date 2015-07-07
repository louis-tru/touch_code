/**
 * @class tesla.client.WebSocketDataService
 * @extends tesla.Event
 * @createTime 2012-03-08
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/client/Conversation.js');
include('tesla/client/DataService.js');

var CALLBACKS = {};
var CLIENTS = {};
var PATH =
	tesla.defaults(tesla.APP_CONF.webService, 'ws://localhost/')
	.replace(/^https?:\/\//i, 'ws://');

var WebSocketDataService =

Class('tesla.client.WebSocketDataService', tesla.client.DataService, {

	//public:
	/**
	 * conversation
	 * @type {tesla.client.Conversation}
	 */
	conversation: null,

	/**
	 * service path config
	 * @type {String}
	 * @static
	 */
	path: PATH,

	/**
	 * service name
	 * @type {String}
	 */
	name: '',

	/**
	 * constructor function
	 * @param {String} name              service name
	 * @param {String} path   (Optional) service path config, default as location
	 * @constructor
	 */
	WebSocketDataService: function(name, path) {
		this.name = name;
		if (path)
			this.path = path;
		var _this = this;

		var url = this.path.replace('(\\?|&)({0}=[^&]*)(&|$)'.format(name), '');
		url += (url.match(/\?/) ? url.match(/(&|\?)$/) ? '' : '&' : '?') + 'service=' + name;
		var conv =
		this.conversation = new tesla.web.client.Conversation(url);

		conv.onmessage.on(function(e) {

			var data = JSON.parse(e.data);
			var type = data.type;

			switch (type) {
				case 'event':
					_this.emit(data.event, data.data);
					break;
				case 'callback':
					var err = data.error;
					var id = data.callback;
					var cb = CALLBACKS[id];
					delete CALLBACKS[id];

					if (err)
						throwError(err, cb);
					else
						cb(err, data.data);
					break;
				default: break;
			}

		});
	},

	/**
	 * call service api
	 * @param {String}    name
	 * @param {Object[]}  args  (Optional)
	 * @param {Function}  cb    (Optional)  callback
	 */
	call: function(name, args, cb) {

		if (typeof args == 'function') {
			cb = args;
			args = [];
		}

		var msg = { type: 'call', name: name, args: args || [] };

		if (cb) {
			var id = tesla.guid();
			msg.callback = id;
			CALLBACKS[id] = cb;
		}
		this.conversation.send(JSON.stringify(msg));
	}

}, {

	/**
	 * get service by name
	 * @param  {String} name
	 * @return {tesla.client.WebSocketDataService}
	 * @static
	 */
	get: function(name) {
		var client = CLIENTS[name];

		if (!client)
			SERVICES[name] = client = new WebSocketDataService(name);
		return client;
	}

});

