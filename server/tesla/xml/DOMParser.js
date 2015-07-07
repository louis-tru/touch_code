include('tesla/Extend.js');
include('tesla/xml/Document.js');

/**
 * @class tesla.xml.DOMParser.private$attributes
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var Attributes =

Class('private$attributes', {
	length: 0,
	getLocalName: function(i) { return this[i].localName },
	getOffset: function(i) { return this[i].offset },
	getQName: function(i) { return this[i].qName },
	getURI: function(i) { return this[i].uri },
	getValue: function(i) { return this[i].value }
});


/**
 * @class tesla.xml.DOMParser.private$xmlreader
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */
var ENTITY_MAP = { 'lt': '<', 'gt': '>', 'amp': '&', 'quot': '"', 'apos': "'", 'nbsp': '\u00a0' };
function entityReplacer(_this, a) {
	var k = a.slice(1, -1);

	if (k.charAt(0) == '#')
		return String.fromCharCode(parseInt(k.substr(1).replace('x', '0x')))
	else if (k in ENTITY_MAP)
		return ENTITY_MAP[k];
	else {
		_this.errorHandler && _this.errorHandler.error('entity not found:' + a);
		return a;
	}
}
function parse(_this, source) {
	while (true) {
		var i = source.indexOf('<');
		var next = source.charAt(i + 1);
		if (i < 0) {
			appendText(_this, source, source.length);
			return;
		}
		if (i > 0) {
			appendText(_this, source, i);
			source = source.substring(i);
		}

		switch (next) {
			case '/':
				var end = source.indexOf('>', 3);
				var qName = source.substring(2, end);
				var config = _this._stack.pop();
				source = source.substring(end + 1);
				_this.contentHandler.endElement(config.uri, config.localName, qName);
				for (qName in config.nsMap) {
					_this.contentHandler.endPrefixMapping(qName); //reuse qName as prefix
				}
				// end elment
				break;
			case '?': // <?...?>
				source = parseInstruction(_this, source);
				break;
			case '!': // <!doctype,<![CDATA,<!--
				source = parseDCC(_this, source);
				break;
			default:
				source = parseElementStart(_this, source);
				break;
		}
	}
}
function parseElementStart(_this, source) {
	var tokens = split(source);
	var qName = tokens[0][0];
	var localName = qName.substr(qName.indexOf(':') + 1);
	var end = tokens.pop();
	var nsMap;
	var uri = null;
	var attrs = new Attributes();
	var unsetURIs = [];
	var len = tokens.length;
	var i = 1;

	function replace(all) {
		return entityReplacer(_this, all);
	}

	while (i < len) {
		var m = tokens[i++];
		var key = m[0]; //remove = on next expression
		var value = key.charAt(key.length - 1) == '=' ? key.slice(0, -1) : key;
		var nsp = value.indexOf(':');
		var prefix = nsp > 0 ? key.substr(0, nsp) : null;
		var attr = attrs[attrs.length++] = { prefix: prefix, qName: value, localName: nsp > 0 ? value.substr(nsp + 1) : value }

		if (value == key) {//default value
			//TODO:check
		} else {
			//add key value
			m = tokens[i++];
			key = value;
			value = m[0];
			nsp = value.charAt(0);
			if ((nsp == '"' || nsp == "'") && nsp == value.charAt(value.length - 1)) {
				value = value.slice(1, -1);
			}

			value = value.replace(/&#?\w+;/g, replace);
			//TODO:encode value
		}
		if (prefix == 'xmlns' || key == 'xmlns') {
			attr.uri = 'http://www.w3.org/2000/xmlns/';
			(nsMap || (nsMap = {}))[prefix == 'xmlns' ? attr.localName : ''] = value;
		}
		else if (prefix) {
			if (prefix == 'xml')
				attr.uri = 'http://www.w3.org/XML/1998/namespace';
			else
				unsetURIs.push(attr);
		}

		attr.value = value;
		attr.offset = m.index;
	}

	var stack = _this._stack;
	var top = stack[stack.length - 1];
	var config = { qName: qName };
	var nsStack = top.nsStack;

	//print(stack+'#'+nsStack)
	nsStack = config.nsStack = (nsMap ? tesla.extend(tesla.extend({}, nsStack), nsMap) : nsStack);
	config.uri = nsStack[qName.slice(0, -localName.length)];

	while (attr = unsetURIs.pop())
		attr.uri = nsStack[attr.prefix];

	if (nsMap) {
		for (prefix in nsMap)
			_this.contentHandler.startPrefixMapping(prefix, nsMap[prefix])
	}

	_this.contentHandler.startElement(uri, localName, qName, attrs);
	if (end[0].charAt() == '/') {
		_this.contentHandler.endElement(uri, localName, qName);
		if (nsMap) {
			for (prefix in nsMap)
				_this.contentHandler.endPrefixMapping(prefix)
		}
	}
	else
		stack.push(config);

	return source.substr(end.index + end[0].length);
}
function split(source) {
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+(?:\s*=\s*)?|(\/?\s*>|<)/g;
	reg.lastIndex = 0;
	reg.exec(source); //skip <
	while (match = reg.exec(source)) {
		buf.push(match);
		if (match[1]) return buf;
	}
}
function appendText(_this, source, len) {
	source = source.substr(0, len);

	var contentHandler = _this.contentHandler;
	var reg = /&(#?)(\w+);/g;
	var prevIndex = 0;
	var mat;

	while (mat = reg.exec(source)) {
		var index = mat.index;
		var text = mat[0];

		if (prevIndex != index)
			contentHandler.characters(source, prevIndex, index - prevIndex);
		if (mat[1]) {
			var value = entityReplacer(_this, text);
			contentHandler.characters(value, 0, value.length);
		}
		else
			contentHandler.startEntityReference(mat[2]);
		prevIndex = index + text.length;
	}
	if (prevIndex != len)
		contentHandler.characters(source, prevIndex, len - prevIndex);
}
function parseInstruction(_this, source) {
	var match = source.match(/^<\?(\S*)\s*(.*)\?>/);
	if (match) {
		var len = match[0].length;
		_this.contentHandler.processingInstruction(match[1], match[2]);
	}
	else //error
		appendText(_this, source, len = 2);
	return source.substring(len);
}
function parseDCC(_this, source) {//sure start with '<!'
	var next = source.charAt(2)
	if (next == '-') {
		if (source.charAt(3) == '-') {
			var end = source.indexOf('-->');
			//append comment source.substring(4,end)//<!--
			var lex = _this.lexicalHandler
			lex && lex.comment(source, 4, end - 4);
			return source.substring(end + 3)
		} else {
			//error
			appendText(_this, source, 3)
			return source.substr(3);
		}
	} else {
		if (/^<!\[CDATA\[/.test(source)) {
			var end = source.indexOf(']]>');
			var lex = _this.lexicalHandler;
			lex && lex.startCDATA();
			appendText(_this, source.substring(9, end), 0, end - 9);
			lex && lex.endCDATA()
			return source.substring(end + 3);
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId)
		var matchs = split(source);
		var len = matchs.length;
		if (len > 1 && /!doctype/i.test(matchs[0][0])) {

			var name = matchs[1][0];
			var pubid = len > 3 && /^public$/i.test(matchs[2][0]) && matchs[3][0]
			var sysid = len > 4 && matchs[4][0];
			var lex = _this.lexicalHandler;
			var reg = /^"?([^"]*)"?$/;

			lex && lex.startDTD(name, pubid && pubid.match(reg)[1], sysid && sysid.match(reg)[1]);
			lex && lex.endDTD();
			matchs = matchs[len - 1]
			return source.substr(matchs.index + matchs[0].length);
		} else {
			appendText(_this, source, 2)
			return source.substr(2);
		}
	}
}
var XMLReader =
Class('private$xmlreader', {
	//private:
	_stack: null,
	//public:
	/**
	* constructor function
	* @constructor
	*/
	private$xmlreader: function() {
		this._stack = [{ nsMap: {}, nsStack: {}}];
	},
	parse: function(source) {
		this.contentHandler.startDocument();
		parse(this, source);
		this.contentHandler.endDocument();
	},
	fragment: function(source) {
		parse(this, source);
	}
});


/**
 * @class tesla.xml.DOMParser.private$domhandler
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */
function toString(chars, start, length) {
	return typeof chars == 'string' ?
		chars.substr(start, length) :
		Array.toArray(chars).slice(start, start + length).join('');
}
function noop() {
	return null;
}
/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement(_this, node) {
	if (!_this.currentElement)
		_this.document.appendChild(node);
	else
		_this.currentElement.appendChild(node);
}

var DOMHandler =
Class('private$domhandler', {

	/**
		* constructor function
		* @param {tesla.xml.Document} doc (Optional)
		* @param {tesla.xml.Element} el   (Optional)
		* @constructor
		*/
	private$domhandler: function(doc, el) {
		this.saxExceptions = [];
		this.cdata = false;
		this.document = doc;
		this.currentElement = el;
	},
	startDocument: function() {
		this.document = new tesla.xml.Document();
		if (this.locator)
			this.document.documentURI = this.locator.getSystemId();
	},
	startElement: function(namespaceURI, localName, qName, attrs) {
		var doc = this.document;
		var el = doc.createElementNS(namespaceURI, qName || localName);
		var len = attrs.length;
		appendElement(this, el);
		this.currentElement = el;
		for (var i = 0; i < len; i++) {
			var namespaceURI = attrs.getURI(i);
			var value = attrs.getValue(i);
			var qName = attrs.getQName(i);
			this.currentElement.setAttributeNS(namespaceURI, qName, value);
		}
	},
	endElement: function(namespaceURI, localName, qName) {
		var parent = this.currentElement.parentNode;
		//if(parent.tagName != qName){
		//    var err = 'Xml format error "</' + qName + '>" no start tag';
		//    throw err;
		//}
		this.currentElement = parent;
	},

	startPrefixMapping: function(prefix, uri) { },
	endPrefixMapping: function(prefix) { },
	processingInstruction: function(target, data) {
		var ins = this.document.createProcessingInstruction(target, data);
		appendElement(this, ins);
	},

	ignorableWhitespace: function(ch, start, length) { },
	characters: function(chars, start, length) {
		chars = toString.apply(this, arguments);
		if (this.currentElement && chars) {
			if (this.cdata) {
				var cdataNode = this.document.createCDATASection(chars);
				this.currentElement.appendChild(cdataNode);
			} else {
				var textNode = this.document.createTextNode(chars);
				this.currentElement.appendChild(textNode);
			}
		}
	},
	skippedEntity: function(name) { },
	endDocument: function() {
		this.document.normalize();
	},
	setDocumentLocator: function(locator) {
		this.locator = locator;
	},
	//LexicalHandler
	comment: function(chars, start, length) {
		chars = toString.apply(this, arguments)
		var comment = this.document.createComment(chars);
		appendElement(this, comment);
	},
	startCDATA: function() {
		//used in characters() methods
		this.cdata = true;
	},
	endCDATA: function() {
		this.cdata = false;
	},
	startDTD: function(name, publicId, systemId) {
		var doc = this.document;
		var doctype = new tesla.xml.DocumentType(name, publicId, systemId);
		doc.doctype = doctype;
		doc.appendChild(doctype);
	},
	startEntityReference: function(name) {
		var doc = this.document;
		var el = this.currentElement;
		var node = doc.createEntityReference(name);
		node.text = node.nodeValue = ENTITY_MAP[name]
		el.appendChild(node);
	},
	warning: function(error) {
		this.saxExceptions.push(error);
	},
	error: function(error) {
		this.saxExceptions.push(error);
	},
	fatalError: function(error) {
		console.error(error);
		throw error;
	},
	endEntityReference: noop,
	endDTD: noop,
	startEntity: noop,
	endEntity: noop,
	attributeDecl: noop,
	elementDecl: noop,
	externalEntityDecl: noop,
	internalEntityDecl: noop,
	resolveEntity: noop,
	getExternalSubset: noop,
	notationDecl: noop,
	unparsedEntityDecl: noop
});


/**
 * @class tesla.xml.DOMParser
 * @extends Object
 * @createTime 2012-01-18
 * @updateTime 2013-01-18
 * @author www.mooogame.com, Simplicity is our pursuit
 * @copyright (C) Copyright mooogame Corporation 2011-2100 All Rights Reserved.
 * @version 1.0
 */
Class('tesla.xml.DOMParser', {

	/**
		* constructor function
		* @param  {String}          source
		* @return {tesla.xml.Document}
		* @constructor
		*/
	parser: function(source) {
		var sax = new XMLReader();
		var handler = new DOMHandler();

		sax.contentHandler = handler;
		sax.lexicalHandler = handler;
		sax.errorHandler = handler;
		sax.parse(source);

		return handler.document;
	},

	/**
		* constructor function
		* @param  {tesla.xml.Document} doc
		* @param  {tesla.xml.Element}  el
		* @param  {String}          source
		* @return {tesla.xml.Document}
		* @constructor
		*/
	fragment: function(doc, el, source) {
		var sax = new XMLReader();
		var handler = new DOMHandler(doc, el);

		sax.contentHandler = handler;
		sax.lexicalHandler = handler;
		sax.errorHandler = handler;
		sax.fragment(source);

		return handler.document;
	}

});

