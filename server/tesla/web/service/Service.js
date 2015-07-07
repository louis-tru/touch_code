/**
 * @class tesla.web.service.Service base service abstract class
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/node.js');

var querystring = tesla.node.querystring;

Class('tesla.web.service.Service', {

	//private:
	m_cleanurl: null,
	m_dir: null,
	m_extname: null,
	m_params: null,

	/**
	 * server
	 * @type {tesla.web.Server}
	 */
	server: null,

	/**
	 * request of server
	 * @type {http.ServerRequest}
	 */
	request: null,

	/**
	 * request host
	 * @type {String}
	 */
	host: '',

	/**
	 * request path
	 * @type {String}
	 */
	url: '',

	/**
	 * no param url
	 * @type {String}
	 */
	get cleanurl() {

		if(!this.m_cleanurl){
			this.m_cleanurl = this.url.match(/[^\?\#]+/)[0];
		}
		return this.m_cleanurl;
	},

	/**
	 * request path directory
	 * @type {String}
	 */
	get dir() {
		if(!this.m_dir){
			this.m_dir = this.cleanurl.replace(/[^\/]*$/, '');
		}
		return this.m_dir;
	},

	/**
	 * request extended name
	 * @type {String}
	 */
	get extname() {

		if(this.m_extname === null) {
			var mat = this.cleanurl.match(/\.(.+)/);
			this.m_extname = mat ? mat[1] : '';
		}
		return this._extname;
	},

	/**
	 * url param list
	 * @type {Object}
	 */
	get params() {

		if(!this.m_params) {
			var mat = this.url.match(/\?(.+)/);
			this.m_params = querystring.parse(mat ? mat[1] : '');
		}
		return this.m_params;
	},

	/**
	 * set request timeout
	 * @param {Number} time
	 */
	setTimeout: function(time) {
		this.request.socket.setTimeout(time);
	},

	/**
	 * init base service
	 * @param {http.ServerRequest} req
	 * @constructor
	 */
	initBase: function(req) {
		this.server = req.socket.server;
		this.request = req;
		this.host = req.headers.host;
		this.url = decodeURI(req.url);
		this.setTimeout(this.server.timeout * 1e3);
	},
  
	/**
	 * authentication by default all, subclasses override
	 * @param {Function} cb
	 * @param {String}   action
	 */
	auth: function(cb, action) {
		cb(true);
	},
  
	/**
	 * call function virtual function
	 * @param {Object} info service info
	 */
	action: function (){ }

});


