/**
 * @class tesla.xml.CharacterData
 * @extends tesla.xml.Node
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/xml/Node.js');

Class('tesla.xml.CharacterData', tesla.xml.Node, {

	data: '',

	substringData: function(offset, count) {
		return this.data.substring(offset, offset + count);
	},

	appendData: function(text) {
		text = this.data + text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},

	insertData: function(offset, text) {
		this.replaceData(offset, 0, text);
	},

	deleteData: function(offset, count) {
		this.replaceData(offset, count, "");
	},

	replaceData: function(offset, count, text) {
		var start = this.data.substring(0, offset);
		var end = this.data.substring(offset + count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}

});