/**
 * @class tesla.web.Session server session
 * @createTime 2012-01-20
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/web/Cookie.js');

var Cookie = tesla.web.Cookie;
var SESSIONS = {};
var SESSION_TOKEN_NAME = '__SESSION_TOKEN';

function deleteSession(token) {
	var data = SESSIONS[token];

	if (data.ws)
		return data.timeout = deleteSession.delay(data.expired, token);
	delete SESSIONS[token];
}

function getData(_this) {
	var token = _this.token;

	if (!token) {
		_this.token = token = tesla.guid();
		var service = _this._service;

		if (service instanceof tesla.web.service.HttpService)  // http service
			service.cookie.set(SESSION_TOKEN_NAME, token);
		else  //ws service
			throw new Error('Can not set the session, session must first \
be activated in HttpService');
	}

	var expired = _this._service.server.session * 6e4;

	var se = SESSIONS[token] || (SESSIONS[token] = {
		timeout: deleteSession.delay(expired, token),
		expired: expired,
		data: {},
		ws: 0
	});
	return se;
}

Class('tesla.web.Session', {

	//private:
	_service: null,

	/**
	 * Conversation token
	 * @type {Number}
	 */
	token: 0,

	/**
	 * constructor
	 * @param {tesla.service.Service} service tesla.service.HttpService or tesla.service.WSService
	 * @constructor
	 */
	Session: function(service) {
		this._service = service;

		var is = service instanceof tesla.web.service.HttpService;
		var cookie = is ? service.cookie : new Cookie(service.request);
		var token = cookie.get(SESSION_TOKEN_NAME);

		if (!token)
			return;

		this.token = token;
		var data = SESSIONS[token];
		if (data) {

      Function.undelay(data.timeout);
			data.timeout = deleteSession.delay(service.server.session * 6e4, token);
		}

		if (is)  // ws service
			return;

		var _this = this;
		var conv = service.conversation;

		conv.onopen.on(function() {
			var data = getData(_this);

			data.ws++;
			conv.onclose.on(function() { data.ws--; });
		});
	},

	/**
	 * get session value by name
	 * @param  {String} name session name
	 * @return {String}
	 */
	get: function(name) {
		var se = SESSIONS[this.token];
		return se ? se.data[name] ? se.data[name] : null : null;
	},

	/**
	 * set session value
	 * @param {String} name
	 * @param {String} value
	 */
	set: function(name, value) {
		getData(this).data[name] = value;
	},

	/**
	 * delete session
	 * @param {String} name
	 */
	remove: function(name) {
		var token = this.token;
		if (!token)
			return;
		var se = SESSIONS[token];
		if (se)
			delete se.data[name];
	},

	/**
	 * get all session
	 * @return {Object}
	 */
	getAll: function() {
		return getData(this).data;
	},

	/**
	 * delete all session
	 */
	removeAll: function() {
		var token = this.token;
		if (!token)
			return;
		var se = SESSIONS[token];
		if (se)
			se.data = {};
	}

});
