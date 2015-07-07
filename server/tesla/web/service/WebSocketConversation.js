/**
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/web/service/Early.js');
include('tesla/web/service/Hybi_07_12.js');
include('tesla/web/service/Hybi_16.js');
include('tesla/web/service/Hybi_17.js');
include('tesla/node.js');

var querystring = tesla.node.querystring;
var service = tesla.web.service;

var protocol_versions = {
	'7': tesla.web.service.Hybi_07_12,
	'8': tesla.web.service.Hybi_07_12,
	'9': tesla.web.service.Hybi_07_12,
	'10': tesla.web.service.Hybi_07_12,
	'11': tesla.web.service.Hybi_07_12,
	'12': tesla.web.service.Hybi_07_12,
	'13': tesla.web.service.Hybi_16,
	'14': tesla.web.service.Hybi_16,
	'15': tesla.web.service.Hybi_16,
	'16': tesla.web.service.Hybi_16,
	'17': tesla.web.service.Hybi_17
};

/**
 * @class tesla.web.service.WebSocketConversation
 * @static
 */
Class('tesla.web.service.WebSocketConversation', null, {

	/**
	 * create websocket
	 * @param  {http.ServerRequest} req
	 * @param  {Buffer}             upgradeHead
	 * @return {tesla.web.service.Conversation}
	 * @static
	 */
	New: function(req, upgradeHead) {
	  
	  var mat = decodeURI(req.url).match(/\?(.+)/);
	  var params = querystring.parse(mat ? mat[1] : '');
	  var bind_services_name = params.bind_services || '';
		var version = req.headers['sec-websocket-version'];
		
		if(version){
		  var protocol = protocol_versions[version];
		  if(protocol){
		    return new protocol(req, upgradeHead, bind_services_name);
		  }
		}
		return new tesla.web.service.Early(req, upgradeHead, bind_services_name);
	}

});
