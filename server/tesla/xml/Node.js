/**
 * @class tesla.xml.Node
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var HTML_TAG = /^(br|hr|input|frame|img|area|link|col|meta|area|base|basefont|param)$/i;
var HTML = /^html$/i;

function xmlEncoder(c) {
	return c == '<' && '&lt;' || c == '&' && '&amp;' || c == '"' && '&quot;' || '&#' + c.charCodeAt() + ';'
}

function findNSMap(_this) {
	var el = _this;

	while (el.nodeType !== Node.ELEMENT_NODE) {
		if (el.nodeType === Node.ATTRIBUTE_NODE) {
			el = el.ownerElement;
		} else {
			el = el.parentNode;
		}
	}
	return el._namespaceMap;
}

function serializeToString(node, buf) {
	switch (node.nodeType) {
		case Node.ELEMENT_NODE:
			var attrs = node.attributes;
			var len = attrs.length;
			var child = node.firstChild;
			var nodeName = node.tagName;
			buf.push('<', nodeName);
			for (var i = 0; i < len; i++) {
				serializeToString(attrs.item(i), buf);
			}
			if (child) {
				buf.push('>');
				while (child) {
					serializeToString(child, buf);
					child = child.nextSibling;
				}
				buf.push('</', nodeName, '>');
			} else {

				var doc = node.ownerDocument;
				var doctype = doc.doctype;
				if (doctype && HTML.test(doctype.name)) {

					if (HTML_TAG.test(nodeName))
						buf.push(' />');
					else
						buf.push('></', nodeName, '>');
				}
				else
					buf.push(' />');
			}
			return;
		case Node.DOCUMENT_NODE:
		case Node.DOCUMENT_FRAGMENT_NODE:
			var child = node.firstChild;
			while (child) {
				serializeToString(child, buf);
				child = child.nextSibling;
			}
			return;
		case Node.ATTRIBUTE_NODE:
			return buf.push(' ', node.name, '="', node.value.replace(/[<&"]/g, xmlEncoder), '"');
		case Node.TEXT_NODE:
			return buf.push(node.data.replace(/[<&]/g, xmlEncoder)); //(?!#?[\w\d]+;)
		case Node.CDATA_SECTION_NODE:
			return buf.push('<![CDATA[', node.data, ']]>');
		case Node.COMMENT_NODE:
			return buf.push("<!--", node.data, "-->");
		case Node.DOCUMENT_TYPE_NODE:

			var pubid = node.publicId;
			var sysid = node.systemId;

			buf.push('<!DOCTYPE ', node.name);
			if (pubid) {
				buf.push(' PUBLIC "', pubid);
				if (sysid && sysid != '.') {
					buf.push('" "', sysid);
				}
				buf.push('">');
			} else if (sysid && sysid != '.') {
				buf.push(' SYSTEM "', sysid, '">');
			} else {
				var sub = node.internalSubset;
				if (sub) {
					buf.push(" [", sub, "]");
				}
				buf.push(">");
			}
			return;
		case Node.PROCESSING_INSTRUCTION_NODE:
			return buf.push("<?", node.nodeName, " ", node.data, "?>");
		case Node.ENTITY_REFERENCE_NODE:
			return buf.push('&', node.nodeName, ';');
			//case ENTITY_NODE:
			//case NOTATION_NODE:
		default:
			buf.push('??', node.nodeName);
	}
}

/*
* attributes;
* children;
*
* writeable properties:
* nodeValue,Attr:value,CharacterData:data
* prefix
*/
function update(_this, el, attr) {

	var doc = _this.ownerDocument || _this;
	doc._inc++;
	if (attr) {
		if (attr.namespaceURI == 'http://www.w3.org/2000/xmlns/') {
			//update namespace
		}
	} else {//node
		//update childNodes
		var cs = el.childNodes;
		var child = el.firstChild;
		var i = 0;

		while (child) {
			cs[i++] = child;
			child = child.nextSibling;
		}
		cs.length = i;
	}
}

function cloneNode(doc, node, deep) {
	var node2 = new node.constructor();
	for (var n in node) {
		var v = node[n];
		if (typeof v != 'object') {
			if (v != node2[n]) {
				node2[n] = v;
			}
		}
	}
	if (node.childNodes) {
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
		case Node.ELEMENT_NODE:
			var attrs = node.attributes;
			var attrs2 = node2.attributes = new NamedNodeMap();
			var len = attrs.length
			attrs2._ownerElement = node2;
			for (var i = 0; i < len; i++) {
				attrs2.setNamedItem(cloneNode(doc, attrs.item(i), true));
			}
			break; ;
		case Node.ATTRIBUTE_NODE:
			deep = true;
	}
	if (deep) {
		var child = node.firstChild;
		while (child) {
			node2.appendChild(cloneNode(doc, child, deep));
			child = child.nextSibling;
		}
	}
	return node2;
}


var Node =

Class('tesla.xml.Node', {

	firstChild: null,
	lastChild: null,
	previousSibling: null,
	nextSibling: null,
	attributes: null,
	parentNode: null,
	childNodes: null,
	ownerDocument: null,
	nodeValue: null,
	namespaceURI: null,
	prefix: null,
	localName: null,

	// Modified in DOM Level 2:
	insertBefore: function(newChild, refChild) {//raises
		var parentNode = this;

		var cp = newChild.parentNode;
		if (cp) {
			cp.removeChild(newChild); //remove and update
		}
		if (newChild.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
			var newFirst = newChild.firstChild;
			var newLast = newChild.lastChild;
		}
		else
			newFirst = newLast = newChild;

		if (refChild == null) {
			var pre = parentNode.lastChild;
			parentNode.lastChild = newLast;
		} else {
			var pre = refChild.previousSibling;
			newLast.nextSibling = refChild;;
			refChild.previousSibling = newLast;
		}
		if (pre)
			pre.nextSibling = newFirst;
		else
			parentNode.firstChild = newFirst;

		newFirst.previousSibling = pre;
		do
			newFirst.parentNode = parentNode;
		while (newFirst !== newLast && (newFirst = newFirst.nextSibling))

		update(this, parentNode);
	},

	replaceChild: function(newChild, oldChild) {//raises
		this.insertBefore(newChild, oldChild);
		if (oldChild) {
			this.removeChild(oldChild);
		}
	},

	removeAllChild: function() {
		var ns = this.childNodes;
		for (var i = 0, l = ns.length; i < l; i++) {
			ns[i].parentNode = null;
			delete ns[i];
		}
		this.firstChild = null;
		this.lastChild = null;

		update(this, this);
	},

	removeChild: function(oldChild) {
		var parentNode = this;
		var previous = null;
		var child = this.firstChild;

		while (child) {
			var next = child.nextSibling;
			if (child === oldChild) {
				oldChild.parentNode = null; //remove it as a flag of not in document
				if (previous)
					previous.nextSibling = next;
				else
					parentNode.firstChild = next;

				if (next)
					next.previousSibling = previous;
				else
					parentNode.lastChild = previous;
				update(this, parentNode);
				return child;
			}
			previous = child;
			child = next;
		}
	},

	appendChild: function(newChild) {
		return this.insertBefore(newChild, null);
	},
	hasChildNodes: function() {
		return this.firstChild != null;
	},
	cloneNode: function(deep) {
		return cloneNode(this.ownerDocument || this, this, deep);
	},
	// Modified in DOM Level 2:
	normalize: function() {
		var child = this.firstChild;
		while (child) {
			var next = child.nextSibling;
			if (next && next.nodeType == Node.TEXT_NODE && child.nodeType == Node.TEXT_NODE) {
				this.removeChild(next);
				child.appendData(next.data);
			} else {
				child.normalize();
				child = next;
			}
		}
	},
	// Introduced in DOM Level 2:
	isSupported: function(feature, version) {
		return this.ownerDocument.implementation.hasFeature(feature, version);
	},
	// Introduced in DOM Level 2:
	hasAttributes: function() {
		return this.attributes.length > 0;
	},
	lookupPrefix: function(namespaceURI) {
		var map = findNSMap(this)
		if (namespaceURI in map) {
			return map[namespaceURI]
		}
		return null;
	},
	// Introduced in DOM Level 3:
	isDefaultNamespace: function(namespaceURI) {
		var prefix = this.lookupPrefix(namespaceURI);
		return prefix == null;
	},
	// Introduced in DOM Level 3:
	lookupNamespaceURI: function(prefix) {
		var map = findNSMap(this)
		for (var n in map) {
			if (map[n] == prefix) {
				return n;
			}
		}
		return null;
	},

	toString: function() {
		var buf = [];
		serializeToString(this, buf);
		return buf.join('');
	}

}, {

	ELEMENT_NODE: 1,
	ATTRIBUTE_NODE: 2,
	TEXT_NODE: 3,
	CDATA_SECTION_NODE: 4,
	ENTITY_REFERENCE_NODE: 5,
	ENTITY_NODE: 6,
	PROCESSING_INSTRUCTION_NODE: 7,
	COMMENT_NODE: 8,
	DOCUMENT_NODE: 9,
	DOCUMENT_TYPE_NODE: 10,
	DOCUMENT_FRAGMENT_NODE: 11,
	NOTATION_NODE: 12

});

