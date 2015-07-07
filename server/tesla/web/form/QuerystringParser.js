/**
 * @class tesla.web.form.QuerystringParser
 * @extends Object
 * @createTime 2012-01-12
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/node.js');

// This is a buffering parser, not quite as nice as the multipart one.
// If I find time I'll rewrite this to be fully streaming as well
var querystring = tesla.node.querystring;

Class('tesla.web.form.QuerystringParser', {

	/**
	 * constructor function
	 * @constructor
	 */
	QuerystringParser: function() {
		this.buffer = '';
	},

	write: function(buffer) {
		this.buffer += buffer.toString('ascii');
		return buffer.length;
	},

	end: function() {
		var fields = querystring.parse(this.buffer);

		for (var field in fields) {
			this.onField(field, fields[field]);
		}
		this.buffer = '';

		this.onEnd();
	}

});

