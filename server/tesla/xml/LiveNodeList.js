/**
 * @class tesla.xml.LiveNodeList
 * @extends tesla.xml.NodeList
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/xml/NodeList.js');

function update(_this) {
	var inc = _this._node.ownerDocument._inc;
	if (_this._inc != inc) {
		var ls = _this._refresh(_this._node);
		var l = ls.length;

		_this._length = l;
		for(var i = 0; i < l; i++)
			_this[i] = ls[i];

		_this._inc = inc;
	}
}


Class('tesla.xml.LiveNodeList', tesla.xml.NodeList, {

	_length: 0,

	get length() {
		update(this);
		return this._length;
	},

	LiveNodeList: function(node, refresh) {
		this._node = node;
		this._refresh = refresh
	},

	item: function(index) {
		update(this);
		return this[index] || null;
	}
});
