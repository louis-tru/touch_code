/**
 * @class tesla.uglify.Uglify
 * @createTime 2013-05-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */


include('tesla/uglify/Parser.js');
include('tesla/uglify/Process.js');
include('tesla/uglify/Consolidator.js');

/*
上面的代码会立刻进行代码的全面压缩，正如你所看到的，这里经历了一系列的步骤，你可有省略某些步骤以满足自己的需求。

这里的函数有一些参数，我们做些介绍：

jsp.parse(code, strict_semicolons) - 解析JS代码并返回AST。strict_semicolons是可选的，默认为false，当传入true，解析器会在预期为分号而实际没找到的情况下抛出错误。对于大多数JS代码我们不需要那么做，但严格约束代码很有益处。
pro.ast_mangle(ast, options) - 返回经过变量和函数名称混淆的AST，它支持以下选项：
    toplevel - 混淆顶级作用域的变量和函数名称（默认不开启）。
    except - 指定不被压缩的名称的数组
pro.ast_squeeze(ast, options) - 开启深度优化以降低代码尺寸，返回新的AST，选项可以是一个hash，支持的参数有：
    make_seqs （默认true） 将多个语句块合并为一个。
    dead_code （默认true） 将删除不被使用的代码。
pro.gen_code(ast, options) - 通过AST生成JS代码。默认输出压缩代码，但可以通过调整选项参数获得格式化的输出。选项是可选的，如果传入必须为对象，支持以下选项：
    beautify: false - 如果希望得到格式化的输出，传入true
    indent_start: 0 （仅当beautify为true时有效） - 初始缩进空格
    indent_level: 4 （仅当beautify为true时有效） - 缩进级别，空格数量
    quote_keys: false - 传入true将会用引号引起所有文本对象的key
    space_colon: false （仅当beautify为true时有效） - 是否在冒号前保留空格
    ascii_only: false - 传入true则将编码非ASCII字符到\uXXXX
*/

Class('tesla.uglify.Uglify', null, {

  parse: function (orig_code, options) {
    options || (options = {});

    var jsp = tesla.uglify.Parser;
    var pro = tesla.uglify.Process;
    var ast = jsp.parse(orig_code, options.strict_semicolons); // parse code and get the initial AST
        ast = pro.ast_mangle(ast, options.mangle_options); // get a new AST  with mangled names
        ast = pro.ast_squeeze(ast, options.squeeze_options); // get an AST with compression optimizations
    var final_code = pro.gen_code(ast, options.gen_options); // compressed code here
    return final_code;
  },

	//
	parse2: function(orig_code, options){
		options || (options = {});

    var jsp = tesla.uglify.Parser;
    var pro = tesla.uglify.Process;
    var ast = jsp.parse(orig_code, options.strict_semicolons); // parse code and get the initial AST
        //ast = pro.ast_mangle(ast, options.mangle_options); // get a new AST  with mangled names
        ast = pro.ast_squeeze(ast, options.squeeze_options); // get an AST with compression optimizations
    var final_code = pro.gen_code(ast, options.gen_options); // compressed code here
    return final_code;
	}

});

