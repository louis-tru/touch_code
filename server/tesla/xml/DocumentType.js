/**
 * @class tesla.xml.DocumentType
 * @extends tesla.xml.Node
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/xml/Node.js');

var Node = tesla.xml.Node;

Class('tesla.xml.DocumentType', Node, {

	// Introduced in DOM Level 2:
	/**
		* constructor function
		* @constructor
		* @param {String}              qualifiedName
		* @param {String}              publicId
		* @param {String}              systemId
		*/
	DocumentType: function(qualifiedName, publicId, systemId) {// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR

		this.name = qualifiedName;
		this.nodeName = qualifiedName;
		this.publicId = publicId;
		this.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;

		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
	},

	nodeType: Node.DOCUMENT_TYPE_NODE

});