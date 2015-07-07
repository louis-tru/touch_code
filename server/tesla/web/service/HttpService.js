/**
 * @class tesla.web.service.HttpService http service
 * @extends tesla.web.service.StaticService
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/web/Cookie.js');
include('tesla/web/service/StaticService.js');
include('tesla/web/form/IncomingForm.js');
include('tesla/web/Session.js');
include('tesla/node.js');

var zlib = tesla.node.zlib;
var Buffer = tesla.node.buffer.Buffer;
var IncomingForm = tesla.web.form.IncomingForm;
var REGEXP = /^_/;

var StaticService_init = tesla.web.service.StaticService.members.init;
var StaticService_action = tesla.web.service.StaticService.members.action;

Class('tesla.web.service.HttpService', tesla.web.service.StaticService, {

	//public:
	
	/**
	 * site cookie
	 * @type {tesla.web.Cookie}
	 */
	cookie: null,
	
	/**
	 * site session
	 * @type {tesla.web.Session}
	 */
	session: null,

	/**
	 * ajax jsonp callback name
	 * @tpye {String}
	 */
	jsonp: '',

	/**
	 * post form
	 * @type {tesla.web.form.IncomingForm}
	 */
	form: null,

	/**
	 * post form data
	 * @param {Object}
	 */
	data: null,

	//overlay
	init: function(req, res) {
		StaticService_init.call(this, req, res);

		this.cookie = new tesla.web.Cookie(req, res);
		this.session = new tesla.web.Session(this);
		this.jsonp = this.params.jsonp || '';
		this.data = {};

		var self = this;
		if (req.method == 'POST') {
			var form = this.form = new IncomingForm(this);
			form.uploadDir = this.server.temp;

			form.onend.on(function() {
				self.data = {};
				tesla.extend(self.data, form.fields);
				tesla.extend(self.data, form.files);
			});
			form.parse();
		}
	},

	action: function(info) {

		/*
		 * Note:
		 * The network fault tolerance,
		 * the browser will cause strange the second request,
		 * this error only occurs on the server restart,
		 * the BUG caused by the request can not respond to
		 */

		var self = this;
		var req = this.request;
		var action = info.action;
		var fn;

		//Filter private function
		if (REGEXP.test(action) || !(fn = this[action]) || typeof fn != 'function')
			return StaticService_action.call(this);
		
		delete info.service;
		delete info.action;
    
		function end() {
      
			var args = self.data.args || self.params.args;
			var ok = false;
      
			if (args) {
				try {
					args = JSON.parse(args);
				} catch (e) { }
			}
      
			args = tesla.values(info).concat(Array.isArray(args) ? args : []);
			args.push(function(err, data) {
				if (ok)
					throw new Error('callback has been completed');
				ok = true;
        
				if(err){
				  self.returnError(err);
				}
				else{
				  self.result(data === undefined ? null : data);
				}
			});
      
			fn.apply(self, args);
		}
    
		var form = this.form;
		form ? form.onend.on(end) : req.on('end', end);
	},
  
	/**
	 * return data to browser
	 * @param {String} type    MIME type
	 * @param {String} data    data
	 */
	returnData: function(type, data) {
    
		var req = this.request;
		var res = this.response;
		var ae = req.headers['accept-encoding'];
    
		res.setHeader('Server', 'MoooGame tesla');
		res.setHeader('Date', new Date().toUTCString());
		res.setHeader('Content-Type', type);
    
		if (this.server.agzip && ae && ae.match(/gzip/i)) {
    
			zlib.gzip(data, function(err, data) {
				res.setHeader('Content-Encoding', 'gzip');
				res.writeHead(200);
				res.end(data);
			});
		}
		else {
			res.writeHead(200);
			res.end(data);
		}
	},
	
	/**
	 * return string to browser
	 * @param {String} type    MIME type
	 * @param {String} data    data
	 */
	returnString: function(type, str){
	  this.returnData(type + ';charset=utf-8', str);
	},

	/**
	 * return error to browser
	 * @param {Object} err
	 */
	returnError: function(err) {

		if (typeof err == 'string')
			err = new Error(err);

		error = (err instanceof Error ? tesla.extend({
			name: err.name,
			description: err.description,
			message: err.message
		}, err) : err);

		error.err = '\u0000\ufffd';
		this.result(error);
	},

	/**
	 * return data to browser
	 * @param {Object}  data
	 */
	result: function(data) {

		var type = this.server.getMIME(this.jsonp ? 'js' : 'json');
		var result = JSON.stringify(data);

		if (this.jsonp)
			result = this.jsonp + '(' + result + ')';
		this.returnString(type , result);
	},

	/**
	 * return html to browser
	 * @param {String}  html
	 */
	returnHtml: function(html){
		var type = this.server.getMIME('html');
		this.returnString(type, html);
	}
});


