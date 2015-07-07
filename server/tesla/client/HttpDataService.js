/**
 * @class tesla.client.HttpService http service
 * @extends Object
 * @createTime 2012-03-08
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var SERVICES = {};
var HttpService =

Class('tesla.client.HttpService', {

	//public:
	/**
	 * constructor function
	 * @param {String} name (Optional) service name
	 * @param {String} path (Optional) service path config
	 * @constructor
	 */
	HttpService: function(name, path) {

	},

	call: function() {

	},
	
	callSync: function(){
	  
	}
	
}, {

	/**
	* get service by name
	* @param  {String} name
	* @return {tesla.client.HttpService}
	*/
	get: function(name) {
		if (!name)
			throw 'service name can not be empty';
		var service = SERVICES[name];

		if (!service)
			SERVICES[name] = service = new HttpService(name);
		return service;
	}
});

