/**
 * @class tesla.xml.Comment
 * @extends tesla.xml.CharacterData
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/xml/CharacterData.js');

Class('tesla.xml.Comment', tesla.xml.CharacterData, {

	nodeName: "#comment",
	nodeType: tesla.xml.Node.COMMENT_NODE

});