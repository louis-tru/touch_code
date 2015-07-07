/**
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities
 *
 * @class tesla.xml.NamedNodeMap
 * @extends tesla.xml.NodeList
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/xml/DOMException.js');

var DOMException = tesla.xml.DOMException;
var NodeList = tesla.xml.NodeList;

function findNodeIndex(_this, node) {
	var i = _this.length;
	while (i--) {
		if (_this[i] == node) { return i }
	}
}

function add(_this, node, old) {
	if (old) {
		_this[findNodeIndex(_this, old)] = node;
	} else {
		_this[_this.length++] = node;
	}
	var el = _this._ownerElement;
	var doc = el && el.ownerDocument;
	if (doc)
		node.ownerElement = el;

	return old || null;
}


Class('tesla.xml.NamedNodeMap', NodeList, {

	getNamedItem: function(key) {

		var i = this.length;
		while (i--) {
			var node = this[i];
			if (node.nodeName == key)
				return node;
		}
	},

	setNamedItem: function(node) {
		var old = this.getNamedItem(node.nodeName);
		return add(this, node, old);
	},

	/* returns Node */
	setNamedItemNS: function(node) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var old = this.getNamedItemNS(node.namespaceURI, node.localName);
		return add(_this, node, old);
	},

	_removeItem: function(node) {
		var i = this.length;
		var lastIndex = i - 1;
		while (i--) {
			var c = this[i];
			if (node === c) {
				var old = c;
				while (i < lastIndex) {
					this[i] = this[++i]
				}
				this.length = lastIndex;
				node.ownerElement = null;
				var el = this._ownerElement;
				var doc = el && el.ownerDocument;
				return old;
			}
		}
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var node = this.getNamedItem(key);
		if (node) {
			this._removeItem(node);
		} else {
			throw DOMException(DOMException.NOT_FOUND_ERR, new Error())
		}

	}, // raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR

	//for level2
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while (i--) {
			var node = this[i];
			if (node.localName == localName && node.namespaceURI == namespaceURI) {
				return node;
			}
		}
		return null;
	},

	removeNamedItemNS: function(namespaceURI, localName) {
		var node = this.getNamedItemNS(namespaceURI, localName);
		if (node) {
			this._removeItem(node);
		} else {
			throw DOMException(DOMException.NOT_FOUND_ERR, new Error())
		}
	}
});
