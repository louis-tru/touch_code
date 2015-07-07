/**
 * @createTime 2015-01-05
 * @author louis.tru <louistru@live.com>
 * @copyright © 2011 louis.tru, http://mooogame.com
 * @version 1.0
 */

'use strict';

include('tesla/node.js');

var fs = tesla.node.fsx;

/**
 * 解析行缩进
 */
function parse_indent(self, code){

	var indent = 0;
	var space = 0;

	for(var i = 0; i < code.length; i++){
		var char = code[i];

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
	if(space % 2 !== 0){
		throw error(self, 'Keys data indent error');
	}
	
	return { indent: indent + space / 2, content: code.substr(i) };
}

// 读取一行代码
function read_line_code(self){
  if(self.input.length > self.index){
    var code = self.input[self.index];
    self.index++;
    return code;
  }
  return null;
}

// 解析接续多行值
function parse_continuous(self, str){ // str,
  if(str[str.length - 1] == '\\'){ // 连续的
		
    var ls = [str.substr(0, str.length - 1)];
    
    while(true){
			str = read_line_code(self);
			if(str){
				if(str[str.length - 1] == '\\'){
					ls.push(str.substr(0, str.length - 1));
				}
				else{
					ls.push(str);
					break;
				}
			}
			else{
				break;
			}
		}
		return ls.join('');
  }
  return str;
}

// 分割普通值
function parse_and_split_value(self, value){
	
	var ls = []; // 结果
	var prev_end = 0;
	var index = 0;
	var c;
	
	// 处理字符串引号
	while(true){
		var i;
		if((i = value.indexOf("'", index)) != -1){ // ' 查找字符串引号开始
			c = "'";
		}
		else if((i = value.indexOf('"', index)) != -1){ // " 开始
			c = '"';
		}
		else{ // 没找着字符串引号的开始
			break;
		}
		index = i;
		
		if (index === 0 || 
				value[index - 1] == ' ' || 
				value[index - 1] == '\t'){ // 是否真的开始了
				
			if(prev_end != index){
				var s = value.substring(prev_end, index).trim();
				if(s){
					ls = ls.concat(s.split(/[\s\t]+/));
				}
			}
			
			index++;
			
			var end = index;
			
			// 查找结束
			while((end = value.indexOf(c, end)) != -1){
				if(value[end + 1] == c){ // 字符转义,两个相同的引号在一起为转义符,不是结束.
					end += 2; // 继续找
				}
				else{ // 不是转义,字符串引号结束
					ls.push(value.substring(index, end));
					index = prev_end = end + 1; // 设置上一个结束的位置
					break;
				}
			}
			
			if(end == -1){ // 没找着'|",结束
				ls.push(value.substr(index));
				prev_end = value.length;
				break;
			}
		}
		else{
			index++; // 在下一个位置继续查找
		}
	}
	
	if(prev_end === 0){
		ls = value.split(/[\s\t]+/);
	}
	else if(prev_end != value.length){
		var s = value.substr(prev_end).trim();
		if(s){
			ls = ls.concat(s.split(/[\s\t]+/));
		}
	}
	
	return ls.length > 1 ? ls : ls[0];
}

// 解析多行数组
function parse_multi_row_array(self, indent){
	
  var ls = [];
  var code = read_line_code(self);
  while(code !== null){
		if(/^[\s\t]*@end[\s\t]*$/.test(code)){ // 查询结束关键字
			// 开始缩进与结束缩进必需相同,否则异常
			if(parse_indent(self, code).indent == indent){ 
			  return ls;
			}
			else{
				throw error(self, '@end desc data indent error');
			}
		}
		ls.push(parse_continuous(self, code)); 
    code = read_line_code(self); // 继续查询end
  }
  return ls;
}

// 读取一对普通 key/value
function read_key_value_item(self){
  
  var code;
  
  while(true){
    code = read_line_code(self);
    if(code === null){
      return null;
    }
    else if(code){
      if(code.trim() !== ''){
        break;
      }
    }
  }
	
  var item = parse_indent(self, code);
  var content = item.content;
  var mat = content.match(/([\w\$\_\-\.]+)|,/); // 查询key
  
  if(!mat){
    throw error(self, 'Key Illegal characters');
  }
  
  var key = mat[0];
  var value = '';
  
  if(key.length < content.length){
    var char = content[key.length]; //content.substr(key.length, 1);
    
    switch(char){
      case ':':
        // 多行描叙数组,所以这一行后面不能在出现非空格的字符
        // TODO : 后面可以随意写无需遵循缩进格式,直到文档结束或遇到@end
        if(/[^\s\t]/.test(content.substr(key.length + 1))){ // 查询非空格字符
          throw error(self, 'Parse multi row array Illegal characters');
        }
        value = parse_multi_row_array(self, item.indent); // 解析多行数组
        break;
      case ' ':
      case '\t':
        
        value = content.substr(key.length + 1).trim();
        if(value){
          value = parse_and_split_value(self, 
          															parse_continuous(self, value) // 解析连续的字符
          															); // 解析分割普通值
        }
        break;
      default: 
        throw error(self, 'Key Illegal characters');
    }
  }
	
  item.key = key;
  item.value = value;
  return item;
}

function error(self, message){
  var 
  err = new Error(message);
  err.row = self.index - 1;
  return err;
}

/**
 * push data 
 */
function push_data(self, data, key, value){
	if(data instanceof Array){
		data.push(value);
	}
	else{
    if(key in data && typeof data[key] != 'funciton'){ // key 重复
      throw error(self, 'Key repeated');
    }
    data[key] = value;
	}
}

/**
 * keys 解析器
 * @class Parser
 */
function Parser(str){
	this.index = 0;
	this.input = 	str.replace(/\#.*$/mg, '') 		// 删除注释
								.split(/\r?\n/);					// 
}

/**
 * parse
 */
Parser.prototype.parse = function(){

	var item = read_key_value_item(this);
	
	if(!item){
		return { };
	}
	
	var output = item.key == ',' ? [ ] : { }; // 数组或key/value
	
	var stack = [output];
	
	while(true){
		
		var indent = item.indent;
		var key = item.key;
		var value = item.value;
		
		var data = stack[indent];
		if(!data){
			throw error(this, 'Keys data indent error'); // 缩进只能为两个空格或tab
		}
		stack.splice(indent + 1); // 出栈
		
		var next = read_key_value_item(this);
		if(next){
			
			if(next.indent == stack.length){ // 子对像
				
				if(value === ''){ // 如果有子对像,这个值必需为 ''
					value = next.key == ',' ? [ ] : { };
					stack.push(value); // 压栈
				}
				else{
					throw error(this, 'Keys data indent error');
				}
			}
			push_data(this, data, key, value);
			item = next;
		}
		else{
			push_data(this, data, key, value);
			break; // 已经没有更多key/value,结束
		}
	}
	return output;
};

/**
 * @class teide.touch.KeysDataParser
 */
Class('teide.touch.KeysDataParser', null, {
  
  /**
   * 解析文件
   * @return {Object}
   */
  parseFile: function(path){
    var str = fs.readFileSync(path).toString('utf-8');
    return new Parser(str).parse();
  },
  
  /**
   * 解析keys字符串
   * @return {Object}
   */
  parse: function(str){
    return new Parser(str).parse();
  },
  
  /**
   * 转换为keys字符串
   */
  stringify: function(obj){
    // TODO 
  }
  
});