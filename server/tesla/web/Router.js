/**
 * @class tesla.web.Router
 * @createTime 2011-12-14
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
*/

Class('tesla.web.Router', {

	/**
	 * 路由规则
	 * @type {Object[]}
	 */
	rules: null,
  
	/**
	 * Service to handle static files
	 * @type {String}
	 */
	static_service: 'tesla.web.service.StaticService',
  
	/**
	 * 构造函数
	 * @constructor
	 */
	Router: function() {
		this.rules = [];
	},
  
	/**
	 * 设置路由器
	 * @param {Object} rules   路由配置
	 */
	config: function(conf) {
    
		var virtual = conf.virtual || '';
		te.update(this, { static_service: conf.static_service });
    
		// 默认路由
		var defines = [
			{ match: '/?method={service}.{action}' }, // 默认api调用路由
			// { match: '/?service={service}&action={action}' },
			// { match: '/?service={service}', action: 'unknown' }
		].concat(Array.isArray(conf.router) ? conf.router : []);
    
		this.rules = [];
    
		for (var i = 0; i < defines.length; i++) {
      
      var item = defines[i];
			var rule = { 
			  match: null, // 用来匹配请求的url,如果成功匹配,把请求发送到目标服务处理
			  keys: [],    // 关键字信息,用来给目标服务提供参数
			  default_value: { } // 如果匹配成功后,做为目标服务的默认参数
			};
			
			// 创建表达式字符串
			// 替换{name}关键字表达式并且转义表达式中的特殊字符
			var match = (virtual + item.match)
				.replace(/\{([^\}]+)\}|[\|\[\]\(\)\{\}\?\.\+\*\!\^\$\:\<\>\=]/g,
				function(all, key) {
          
					if (key) {
						rule.keys.push(key); // 添加一个关键字
						switch (key) {
							case 'service': return '([\\w\\$\\./]+)'; // 使用贪婪匹配,匹配到最后一个.字符
							case 'action': return '([\\w\\$]+)';      // 不贪婪
						}
						//return '([^&\?]+)'; // 至少匹配到一个字符
						return '([^&\?]*)';   // 匹配0到多个
					}
					else {
						return '\\' + all;  // 转义
					}
				});
      
      // 额外的url参数不需要在匹配范围,所以不必需从头匹配到尾
      rule.match = new RegExp('^' + match + (match.match(/\?/) ? '' : '(?:\\?|$)'));
      
			for (var j in item) {
				if (j != 'match') {
					rule.default_value[j] = item[j]; // 路由默认属性
				}
			}
      
      // 必需要有service、action 关键字,否则丢弃掉
			if ((rule.keys.indexOf('service') !== -1 || rule.default_value.service) &&
				  (rule.keys.indexOf('action') !== -1 || rule.default_value.action)) {
			  this.rules.push(rule);
			}
		}
	},


	/**
	 * find router info by url
	 * @param  {String} url
	 * @return {Object}
	 */
	find: function(url) {
    
		for (var i = 0; i < this.rules.length; i++) {
		  
			var item = this.rules[i];
			var mat = url.match(item.match);
			
			if (mat) {
      
				var info = te.extend({}, item.default_value);
        
				for (var j = 1; j < mat.length; j++){
					info[item.keys[j - 1]] = mat[j];
				}
        
				info.service = info.service.replace(/\//g, '.');
				return info;
			}
      
		}
    
    // 找不到任何匹配的服务,只能使用使用静态文件服务
		return {
			service: this.static_service,
			action: 'unknown'
		};
	}

});


