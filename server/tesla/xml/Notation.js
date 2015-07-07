/**
 * @class tesla.xml.Notation
 * @extends tesla.xml.Node
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/xml/Node.js');

var Node = tesla.xml.Node;

Class('tesla.xml.Notation', Node, {
	nodeType: Node.NOTATION_NODE
});
