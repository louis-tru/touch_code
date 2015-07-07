/**
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Extend.js');
include('tesla/web/service/Conversation.js');
include('tesla/Delegate.js');

var TIMEOUT = 2E4;     //wait listen timeout default as 20s
var NOTIMEOUT = 5E4;

/**
 * @class Parser
 * @private
 */
var Parser = Class('Parser', {

	buffer: '',
	
	i: 0,

  /**
   * @constructor
   */
	Parser: function() {
		tesla.Delegate.def(this, 'close', 'data', 'error');
	},

	add: function(data) {
		this.buffer += data;
		this.parse();
	},

	parse: function() {
	  
	  var len = this.buffer.length;
	  
		for (var i = this.i, chr; i < len; i++) {
		  
			chr = this.buffer[i];

			if (this.buffer.length == 2 && this.buffer[1] == '\u0000') {
				this.onclose.emit();
				this.buffer = '';
				this.i = 0;
				return;
			}

			if (i === 0) {
				if (chr != '\u0000')
					this.error('Bad framing. Expected null byte as first frame');
				else
					continue;
			}

			if (chr == '\ufffd') {
				this.ondata.emit(this.buffer.substr(1, i - 1));
				this.buffer = this.buffer.substr(i + 1);
				this.i = 0;
				return this.parse();
			}
		}
	},

	error: function(reason) {
		this.buffer = '';
		this.i = 0;
		this.onerror.emit(reason);
		return this;
	}
});


function reset(self) {
	self.m_proxy = null;
	self.m_timeout = function() {
		//console.log('http heartbeat timeout close');
		self.close();
	} .delay2(TIMEOUT);
}

function handshakesComplete(self) {
	self.m_proxy.handshakesComplete(self.token, self.m_password);
	reset(self);
}

function send(self) {
	Function.undelay(self.m_no_timeout);
	self.m_proxy.send(self.m_message);
	self.m_message = [];
	reset(self);
}

/**
 * Send a test signal
 */
function sendTest(self) {
	self.send('\ufffb\ubfff');
}

/**
 * @class tesla.web.service.HttpHeartbeatConversation
 * @extends tesla.web.service.Conversation
 */
Class('tesla.web.service.HttpHeartbeatConversation', tesla.web.service.Conversation, {

	//private:
	m_proxy: null,
	m_parser: null,
	m_password: null,
	m_timeout: 0,
	m_no_timeout: 0,
	m_message: null,

	/**
	 * @param {tesla.web.service.HttpHeartbeatProxy} proxy
	 * @param {String}   bind_services_name
	 * @constructor
	 */
	HttpHeartbeatConversation: function(proxy, bind_services_name) {
		this.Conversation(proxy.request, bind_services_name);
		this.m_proxy = proxy;
		this.m_password = { main: tesla.random(), aid: tesla.random() };
		this.m_message = [];
	},

	/**
	 * listen conversation change
	 * @param {tesla.web.service.HttpHeartbeatProxy} proxy
	 * @param {String} password     verify the password
	 */
	listen: function(proxy, password) {
	  
		var self = this;
		
		if (this.isOpen && !this.m_proxy && this.m_password.main == password) {
      
			Function.undelay(this.m_timeout);
			this.m_proxy = proxy;
			this.m_no_timeout = sendTest.delay2(NOTIMEOUT, self);

			var req = proxy.request;

			req.on('close', function() {
				//console.log('http heartbeat close');
				self.close();
			});

			req.on('error', function(err){
				console.log('http heartbeat error close');
				self.close();
			});

			req.on('aborted', function(){
				//console.log('http heartbeat aborted close');
				self.close();
			});

			if(this.m_message.length){
			  send(this);
			}
		}
		else{
			proxy.close();
		}
	},

	/**
	 * receive client data
	 * @param {tesla.web.service.HttpHeartbeatProxy} proxy
	 * @param {String} password     verify the password
	 * @param {String} data         get data
	 */
	receive: function(proxy, password, data) {
		if(this.isOpen && this.m_password.aid == password) {
			this.m_parser.add(data);
			proxy.receiveComplete();
		}
		else{
			proxy.close();
		}
	},

	init: function() {
	  
		var self = this;
		this.m_parser = new Parser();
    
		handshakesComplete(this);
    
		this.m_parser.ondata.on(function(evt) {
			self.parse(evt.data);
		});
    
		this.m_parser.onclose.on(function() {
			//console.log('http heartbeat parser close');
			self.close();
		});
    
		this.m_parser.onerror.on(function(e) {
			console.error(e.data + '\nhttp heartbeat parser error close');
			self.onerror.emit(e.data);
			self.close();
		});
	},

	send: function(msg) {
		if (this.isOpen) {
		  
		  msg = JSON.stringify(msg);
		  
			this.m_message.push(msg);
			if(this.m_proxy){
			  send(this);
			}
		}
		else{
			throw new Error('error connection close status');
		}
	},

	close: function() {
		if (this.isOpen) {
			Function.undelay(this.m_timeout);
			if(this.m_proxy){
			  this.m_proxy.close();
			}
			this.onclose.emit();
		}
	}

});

