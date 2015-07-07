/**
 * @createTime 2012-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/node.js');
include('tesla/publish/module/Module.js');
include('tesla/publish/module/TargetFile.js');

var fsx       = tesla.node.fsx;
var Module    = tesla.publish.module.Module;
var TargetFile = tesla.publish.module.TargetFile;

/**
 * 保存目标文件
 * @private
 */
function saveTargetFile(self){
  
	var action = self.action;
	var targetMap = action.targetMap;
	var target_files = self.target_files;
  
	for(var i in target_files){
    
		var file = target_files[i];
		//
		var source_filenames = file.source_filenames;
		var len = source_filenames.length;
		var codes = [];
    
		for(var j = 0; j < len; j++){
			var name = source_filenames[j];
			var code = self.action.getSourceCode(name);
      
			if(/\.vx$/i.test(name)){
				code = '__def.vx("' + name + '",' + code + ');';
			}
			else{
        
				var info = Module.analysisHeaderByCode(action.conf, code, name);
        
				code =
					'__def.js("' + name + '",[' +
					info.includes.map(function(item){
						return '"' + item + '"';
					}).join(',') +
					'],function(){' + info.code + '});';
			}
			codes.push(code);
		}

		var allCode = codes.join('\n');
		var md5 = tesla.hash(allCode);

		var filename = file.filename;
		var info = targetMap.info(filename);
    var update = info.md5 != md5;

    targetMap.set(filename, md5);
    action.writeFile(filename, allCode, info.ver, update);
	}
}

// auto 优化结果
function majorization(self){
	//TODO ?
}

/**
 * 解析模块配置值
 */
function parserModuleConfigValue(self){
  
  var modules     = self.modules;
  var len         = modules.length;
  var values      = [];
	var warningLogs = [];

	for(var i = 0; i < len; i++){
		var module = modules[i];
		
		var l = module.target_files.length;
		if(l > 5){
		  // 如果这个模块依赖超过5个目标文件发出一个警告
			warningLogs.push('>> ' + module.members.join('\n   ') + ' >> count:' + l);
		}
		values.push(module.getExp());
	}

	if(warningLogs.length){
		console.log('\nWarning: module file more than 5\n\
       in the the down when http1.1 to program performance degradation\n\
       consider the optimizer\n');
		console.log(warningLogs.join('\n'), '\n');
	}
	return values.join('\n');
}

/**
 * 分析单个源文件
 * 通过源文件与模块之间的关系获得目标文件,并且将目标与模块相关联
 * @param {String} source_filename 未知的目标文件中所包含的源文件的名称
 * @private
 */
function analysisSourceFile(self, source_filename){
  
  var target_files = self.target_files;
  var related_modules = [];  // 与源文件include_a相关的模块
  var target_files_key = ''; // 目标文件的key
  
  for(var i = 0; i < self.modules.length; i++){
    var module = self.modules[i];
    // 模块中是否的该源文件
    if(source_filename in module.getAllSourceFileNames().keys){ 
      related_modules.push(module);
      target_files_key += i.toString();
    }
  }
  
  var target_file = target_files[target_files_key];
  if(!target_file){ // 没有这个key对应的文件
    target_file = new TargetFile(target_files_key);
    target_files[target_files_key] = target_file;
  }
  
  target_file.addSourceFileName(source_filename);
  
	for(var l = 0; l < related_modules.length; l++){
		related_modules[l].addTargetFile(target_file);
	}
}

/**
 * 分析所有模块并保存分析的目标文件
 * @private
 */
function analysis(self){
	
	var keys = { };
	
	// 分析所有模块中的所有源文件
	// 最终获得一些要输出的目标文件
	// 并且将这些目标文件与模块相关联
	
	for(var i = 0; i < self.modules.length; i++){
		var names = self.modules[i].getAllSourceFileNames().values;
		
		for(var j = 0; j < names.length; j++){
		  var filename = names[j];
		  if(!(filename in keys)){
		    keys[filename] = true;
		    analysisSourceFile(self, filename);
		  }
		}
	}

	// TODO 优化结果 
	majorization(self);
	saveTargetFile(self);
	
	return parserModuleConfigValue(self);
}

/**
 * 分析所有模块并保存分析的目标文件
 * @private
 */
// function _analysis(self){
  
// 	// TODO 
// 	var target_files   = self.target_files;
// 	var modules = self.modules;
// 	var len     = modules.length;

// 	// 比较这些模块中的文件,找出最终的目标文件
// 	// 并且目标文件被哪些模块依赖
	
// 	for(var i = 0; i < len; i++){

// 		var module_a = modules[i];
// 		var includes_a = module_a.getInclude().values;

// 		for(var j = 0; j < includes_a.length; j++){
		  
// 			var include_a = includes_a[j];

// 			if(module_a.isExcludeSourceFile(include_a)){
// 			  // 已排除
// 			  continue;
// 			}
		 
// 			var file_key = '';
// 			var related_modules = []; // 与源文件include_a相关的模块

// 			for(var u = 0; u < len; u++){

// 				if(u == i){
// 					file_key += (u * u + '**');
// 					module_a.excludeSourceFile(include_a);
// 					related_modules.push(module_a);
// 				}
// 				else{

// 					var module_b = modules[u];
// 					var includes_b = module_b.getInclude().values;

// 					for(var k = 0; k < includes_b.length; k++){
// 						var include_b = includes_b[k];

// 						if(include_a == include_b){
// 							file_key += (u * u + '**');
// 							module_b.excludeSourceFile(include_b);
// 							related_modules.push(module_b);
// 						}
// 					}
// 				}
// 			}

// 			var key = tesla.hash(file_key);

// 			var target_file = target_files[key];
//       if(!target_file){ // 没有这个key对应的文件
//         target_file = new TargetFile(key);
//         target_files[key] = target_file;
//       }

// 			target_file.addSourceFileName(include_a); // 把源文件加入到目标文件

// 			for(var l = 0; l < related_modules.length; l++){
// 				related_modules[l].addTargetFile(target_file);
// 			}
// 			//
// 		}
// 	}

// 	// TODO 优化结果 
// 	majorization(self);
// 	saveTargetFile(self);
	
// 	return parserModuleConfigValue(self);
// }

/**
 * 查询模块配置中的项
 * 返回项的缩进与模块名称
 * 使用2空格缩进
 * @private
 */
function getModuleItemIndentAndName(str){

	var len = str.length;
	var indent = 0;
	var space = 0;

	for(var i = 0; i < len; i++){
		var char = str[i];

		if(char == ' '){
			space++;
		}
		else if(char == '\t'){
			indent++;
		}
		else{
			break;
		}
	}

  // 使用2空格缩进
	if(space % 2 != 0){
		throw new Error('Format error app.module >>' + str);
	}

	return { indent: indent + space / 2, content: str.substr(i) };
}

/**
 * 通过模块配置初步分析模块
 * @private
 */
function PreliminaryAnalysisModule(self, str){

	var rest = [];
	var items = str.replace(/\\\s*\r?\n/g, ' ').split('\n');
	var len = items.length;

	var modules = self.modules;

	var mark = {};
	var cur_indent = 0;
	var prev_mod = null;

	for (var i = 0; i < len; i++) {

		var item = items[i].replace(/\s+$/g, '');
		if(!/^\s*(#|$)/.test(item)){

			var split = getModuleItemIndentAndName(item);
			var indent = split.indent;

			var members = split.content.split(/\s+/);
			//var mod_param = { members: members };
			var mod;

			for(var j = 0; j < members.length; j++){
				var name = members[j];
				if(mark[name]){
					throw new Error(name + ' duplicate definition');
				}
				mark[name] = true;
			}

			if(prev_mod){
				switch(indent - cur_indent){
					case 0:
						mod = new Module(self, members, prev_mod.parent);
						break;
					case 1:
						mod = new Module(self, members, prev_mod);
						break;
					case -1:
						mod = new Module(self, members, prev_mod.parent.parent);
						break;
					default:
						throw new Error('Format error app.module >>' + item);
						break;
				}
			}
			else if(indent == 0){
			  // 第一个模块
				mod = new Module(self, members, null);
			}
			else{
				throw new Error('Format error app.module ' + item);
			}

			modules.push(mod);
			prev_mod = mod;
			cur_indent = indent;
		}
	}
}


/**
 * @class tesla.publish.module.ModuleParser
 */
Class('tesla.publish.module.ModuleParser', {
  
	action: null,
	parse_rest: null,
	modules: null,
	target_files: null,
  
  /**
   * @constructor
   */
	ModuleParser: function(action){
		this.action = action;
		this.modules = [];
		this.target_files = { };
	},

  /**
   * 解析模块
   */
	parse: function(cb){

		if(!this.parse_rest){
		  //读取模块定义文件
  		var data = 
  		  fsx.readFileSync(this.action.source + 'app.module') + '';
  		PreliminaryAnalysisModule(this, data);
  		this.parse_rest = analysis(this);
		}
		return this.parse_rest;
	}
});

