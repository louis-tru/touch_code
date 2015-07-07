/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var INCLUDES = {};
var ANALYSIS_HEADR_CACHE = [];
var INCLUDE_REGEXP = /\{([^!=\|\}]+)(?:(=|!)([^\|\}]+))?(?:\|([^\}]+))?\}/g;

//获取配置
function getConf(conf, name){

  var names = name.split('.');
  var rest = conf;

  while ((name = names.shift()) && (rest = rest[name])){ }
  return rest;
}

function analysisIncludeStr(conf, name){

  var is = true;

  name = name.replace(/\s+/g, '').replace(INCLUDE_REGEXP, 
	function(all, name, sign, value, or){
    var conf_val = getConf(conf, name);
    if(sign == '=' ? conf_val == value:
       sign == '!' ? conf_val != value:conf_val){
      return conf_val;
    }
  	else if(or){
  		return or;
  	}
    else {
        is = false;
    }
  });

  if(is){
	  return name;
  }
}

/**
 * 进一步分析压缩后的代码头
 * 会替换代码头中的配置符号
 * @status
 */
function analysisHeaderByCode(conf, code, name){

	var cache = ANALYSIS_HEADR_CACHE[name];
	if(cache){
		return cache;
	}

	var includes = [];
	var mat = code.match(/^#([^\n]+)\n/);

	if(mat){

		var ls = mat[1].split(';');

		for(var i = 0; i < ls.length; i++){
			var item = analysisIncludeStr(conf, ls[i]);
			if(item){
				includes.push(item);
			}
		}
		code = code.substr(mat[0].length);
	}

	ANALYSIS_HEADR_CACHE[name] = cache = { includes: includes, code: code };
	return cache;
}

/**
 * 获得简单的头列表
 * @private
 */
function getSimpleIncludes(self, name, parent){
  
	var cache = ANALYSIS_HEADR_CACHE[name];
	if(cache){
		return cache.includes;
	}
  
	var code;
	try{
		code = self.parser.action.getSourceCode(name);
	}
	catch(err){
		var msg = (parent || 'app.module') + ' >> ' + name + '\n' + err.message;
 		throw new Error(msg);
	}
	return analysisHeaderByCode(self.parser.action.conf, code, name).includes;
}

function get_include2(self, name, relys, out, parent){

	var sources_filename = getSimpleIncludes(self, name, parent);
	var out_values = out.values;
	var out_keys = out.keys;

	for(var i = 0; i < sources_filename.length; i++){

		var item = sources_filename[i];

		if(!out_keys[item]){
			out_keys[item] = true;
			get_include2(self, item, [], out, name);
			out_values.push(item);
		}
	}
}

function get_include(self, name, parent){

	var include = INCLUDES[name];
	
	if(!include){
  	
  	include = { values: [], keys: {} };
  	
  	INCLUDES[name] = include;
  
  	if(!/\.vx$/i.test(name)){ // vx文件不需分析
  		get_include2(self, name, [], include, parent || 'app.module');
  	}
	}

	return include;
}

/**
 * 同获取多个源代码文件中所有依赖的文件列表
 * @private
 */
function getMultipleInclude(self, names, parent){

	var out_values = [];
	var out_keys = {};

	for(var i = 0; i < names.length; i++){

		var name = names[i];
		var values = get_include(self, name, parent).values;

		values.push(name);

		for(var j = 0; j < values.length; j++){

			var value = values[j];

			if(!out_keys[value]){
				out_values.push(value);
				out_keys[value] = true;
			}
 		}
	}

	return { values: out_values, keys: out_keys };
}

// 比较两个目标文件
// 如果b比a大返回true
// 即a依赖b
function compare(self, file_a, file_b){

	var files_b = file_b.source_filenames;
	var len = files_b.length;
	var keys = getMultipleInclude(self, file_a.source_filenames).keys;

	for(var i = 0; i < len; i++){
		var b_key = files_b[i];

		if(keys[b_key]){ //
			return true;
		}
	}
	return false;
}

/**
 * 排序目标文件,使得需要被依赖的文件放到前面
 * @private
 */
function SortTargetFile(self) {
  
	return self.target_files.sort(function(a, b){
	  return compare(self, a, b);
	});
}

/**
 * 文件名称是被否包含
 * @private
 */
function exists(self, name){
	
	if(name in self.m_source_filenames.keys){
	  return true;
	}
	else{
	  var parent = self.parent;
	  if(parent){
	    return exists(parent, name);
	  }
	}
	return false;
}

/**
 * @class tesla.publish.module.Module
 */
Class('tesla.publish.module.Module', {

	parser: null,
	parent: null,
	members: null,
  // 
	m_source_filenames: null,
	target_files: null,
	m_is_sort: false,
	
  /**
   * @constructor
   */
	Module: function(parser, members, parent){
	  this.parser       = parser;
		this.members      = members;
		this.parent       = parent;
		this.target_files = [];
	},

  /**
   * 获取模块包含的所有源文件名称
   */
	getAllSourceFileNames: function(){

		if(this.m_source_filenames){
			return this.m_source_filenames;
		}

		var out_values = getMultipleInclude(this, this.members).values;
		
		var values = [/*once*/];
		var keys = {};
		this.m_source_filenames = { values: values, keys: keys };

		//keys[once] = true;

		for(var i = 0; i < out_values.length; i++){

			var item = out_values[i];
			
			// 文件可能在父模块中已以包含
			if(!exists(this, item)){ 
				values.push(item);
				keys[item] = true;
			}
		}
    
		return this.m_source_filenames;
	},
  
  /**
   * 获取模块表达式
   */
	getExp: function(){
	  
	  // 先排序哪个文件应该放到前面
	  if(!this.m_is_sort){
	    this.m_is_sort = true;
	    SortTargetFile(this); 
	  }

		var rest = [];
		var target_files = this.target_files;

		for(var i = 0; i < target_files.length; i++){
			var file = target_files[i];
			rest.push(file.filename);
		}

		return this.members.join(' ') + ':' + rest.join(' ');
	},
  
  /**
   * 添加目标文件对像
   * @param {File} file
   */
	addTargetFile: function(file){
		if(this.target_files.indexOf(file) === -1){
			this.target_files.push(file);
		}
	}

}, {
  
	/**
	 * 进一步分析压缩后的代码头
	 * 会替换代码头中的配置符号
	 * @status
	 */
	analysisHeaderByCode: analysisHeaderByCode
});


