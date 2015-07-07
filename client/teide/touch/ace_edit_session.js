/**
 * @class teide.touch.AceEditSession
 * @extends ace.EditSession
 * @createTime 2012-01-29
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var EditSession = require('ace/edit_session').EditSession;
var Range = require('ace/range').Range;

var default_mode = 'ace/mode/text';

// 支持的所有后缀
var support_text_suffix = 
'abap|asciidoc|c9search_results|search|Cakefile|coffee|cf|cfm|cs|css|dart|diff|patch|dot|\
glsl|frag|vert|vp|fp|go|groovy|hx|haml|htm|html|xhtml|c|cc|cpp|cxx|h|hh|hpp|clj|jade|java|\
jsp|js|json|conf|jsx|te|teh|latex|tex|ltx|bib|less|lisp|scm|rkt|liquid|lua|lp|lucene|\
GNUmakefile|makefile|Makefile|OCamlMakefile|make|mk|keys|script|log|module|map|\
md|markdown|m|mm|ml|mli|pl|pm|pgsql|php|phtml|ps1|py|gyp|gypi|r|Rd|Rhtml|ru|gemspec|rake|rb|\
scad|scala|scss|sass|sh|bash|bat|sql|styl|stylus|svg|tcl|tex|txt|textile|typescript|ts|str|\
xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl|vx|xq|yaml|license|text'.toLowerCase().split('|');

/**
 * 是否可以搜索的文件
 */
function is_text(path){
  var suffix = path.match(/[^\.\/]+$/)[0].toLowerCase();
  return support_text_suffix.indexOf(suffix) != -1;
}

// vx conf
var MODES_BY_NAME = {
    abap:       ["ABAP"         , "abap"],
    asciidoc:   ["AsciiDoc"     , "asciidoc"],
    c9search:   ["C9Search"     , "c9search_results|search"],
    coffee:     ["CoffeeScript" , "Cakefile|coffee|cf"],
    coldfusion: ["ColdFusion"   , "cfm"],
    csharp:     ["C#"           , "cs"],
    css:        ["CSS"          , "css"],
    dart:       ["Dart"         , "dart"],
    diff:       ["Diff"         , "diff|patch"],
    dot:        ["Dot"          , "dot"],
    glsl:       ["Glsl"         , "glsl|frag|vert|vp|fp"],
    golang:     ["Go"           , "go"],
    groovy:     ["Groovy"       , "groovy"],
    haxe:       ["haXe"         , "hx"],
    haml:       ["HAML"         , "haml"],
    html:       ["HTML"         , "htm|html|xhtml"],
    c_cpp:      ["C/C++"        , "c|cc|cpp|cxx|h|hh|hpp"],
    clojure:    ["Clojure"      , "clj"],
    jade:       ["Jade"         , "jade"],
    java:       ["Java"         , "java"],
    jsp:        ["JSP"          , "jsp"],
    javascript: ["JavaScript"   , "js"],
    json:       ["JSON"         , "json|conf"],
    jsx:        ["JSX"          , "jsx|te|teh"],
    latex:      ["LaTeX"        , "latex|tex|ltx|bib"],
    less:       ["LESS"         , "less"],
    lisp:       ["Lisp"         , "lisp|scm|rkt"],
    liquid:     ["Liquid"       , "liquid"],
    lua:        ["Lua"          , "lua"],
    luapage:    ["LuaPage"      , "lp"], // http://keplerproject.github.com/cgilua/manual.html#templates
    lucene:     ["Lucene"       , "lucene"],
    makefile:   ["Makefile"     , "GNUmakefile|makefile|Makefile|OCamlMakefile|make|mk|keys|script|module"],
    markdown:   ["Markdown"     , "md|markdown"],
    objectivec: ["Objective-C"  , "m|mm"],
    ocaml:      ["OCaml"        , "ml|mli"],
    perl:       ["Perl"         , "pl|pm"],
    pgsql:      ["pgSQL"        , "pgsql"],
    php:        ["PHP"          , "php|phtml"],
    powershell: ["Powershell"   , "ps1"],
    python:     ["Python"       , "py|gyp|gypi"],
    r:          ["R"            , "r"],
    rdoc:       ["RDoc"         , "Rd"],
    rhtml:      ["RHTML"        , "Rhtml"],
    ruby:       ["Ruby"         , "ru|gemspec|rake|rb"],
    scad:       ["OpenSCAD"     , "scad"],
    scala:      ["Scala"        , "scala"],
    scss:       ["SCSS"         , "scss|sass"],
    sh:         ["SH"           , "sh|bash|bat"],
    sql:        ["SQL"          , "sql"],
    stylus:     ["Stylus"       , "styl|stylus"],
    svg:        ["SVG"          , "svg"],
    tcl:        ["Tcl"          , "tcl"],
    tex:        ["Tex"          , "tex"],
    text:       ["Text"         , "txt|log|map"],
    textile:    ["Textile"      , "textile"],
    typescript: ["Typescript"   , "typescript|ts|str"],
    xml:        ["XML"          , "xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl|vx"],
    xquery:     ["XQuery"       , "xq"],
    yaml:       ["YAML"         , "yaml"]
};

//通过文件获取模块名称
function getModeName(filename){

	var mat = filename.match(/([^\/\.]+)[^\/]*?(\.([^\.]+))?$/);
	if(mat){
    var suffix = mat[3];
    var basename = mat[1];
    var ls = [suffix, basename];

    for(var i = 0; i < 2; i++){

      var item = ls[i];
      if(item){
    		for(var name in MODES_BY_NAME){
    			var mode = MODES_BY_NAME[name];
          var reg = new RegExp('^(' + mode[1] + ')$', 'i');
                
    			if(reg.test(item)){
    				return 'ace/mode/' + name;
    			}
    		}
      }
    }
	}
	return default_mode;
}

$class('teide.touch.AceEditSession', EditSession, {

	/**
	* constructor function
	* @param {Object}   text
	* @param {String}   filename   (Optional)
	* @constructor
	*/
	AceEditSession: function(text, filename) {
	  
		EditSession.call(this, text || '', getModeName(filename || ''));
		
		this.$break = {
			row: -1,
			startColumn: -1,
			endColumn: -1
		};
		this.setTabSize(2); 				// 行缩进默认为2
		this.setUseSoftTabs(true);  // 使用软tab
	},

	//重写
	onChange: function(e){

		var delta = e.data;
		var breakpoints = this.$breakpoints;
		var len = breakpoints.length;
		var action = delta.action;
		var range = delta.range;
		var start = range.start.row;
		var end = range.end.row;
		switch (action) {
			case 'removeText':
			case 'removeLines':
				breakpoints.splice(start + 1, end - start);
				break;
			case 'insertText':
			case 'insertLines':
				if(start + 1 < len){
					if(action == 'insertLines' || end - start > 0){
						breakpoints.splice
				.apply(breakpoints, [start + 1, 0].concat(new Array(end - start)));
					}
				}
				break;
		}

		EditSession.prototype.onChange.call(this, e);
	},

	getTransformBreakpoints: function(){
		var breakpoints = this.getBreakpoints();
		var rest = [];

		breakpoints.forEach(function(item, i){
			if(item){
				rest.push(i);
			}
		});
		return rest;
	},

	getTransformFolds: function(){
		var folds = this.getAllFolds();
		var rest = [];

		return folds.map(function(item){
			var start = item.range.start;
			var end = item.range.end;
			return [start.row, start.column, end.row, end.column];
			//{ start: item.range.start, end: item.range.end };
		});
	},

	addFoldsByRange: function(ranges){
		//Range

		var self = this;

		ranges.forEach(function(item){

			//var start = item.start;
			//var end = item.end;

			//item

			//var range = new Range(start.row, start.column, end.row, end.column);
			var range = new Range(item[0], item[1], item[2], item[3]);

			self.addFold('...', range);
		});
	},

	setDebugBreak: function(row, startColumn, endColumn) {

		this.clearDebugBreak();

		this.$break = {
			row: row,
			startColumn: startColumn,
			endColumn: endColumn
		};
		var range = new Range(row, startColumn, row, endColumn);

		this.addGutterDecoration(row, 'ace_debug_break');
		this.$breakMarkerId =
			this.addMarker(range, 'ace_selected_debug_break', 'text');

		this._emit("debugbreak", {
			action: 'set',
			row: row,
			startColumn: startColumn,
			endColumn: endColumn
		});
	},

	clearDebugBreak: function() {
		var breakMarkerId = this.$breakMarkerId;
		if (!breakMarkerId)
			return;

		this.removeMarker(breakMarkerId);
		this.removeGutterDecoration(this.$break.row, 'ace_debug_break');

		this.$break = { row: -1, startColumn: -1, endColumn: -1 };
		this.$breakMarkerId = 0;
		this._emit("debugbreak", { action: 'clear' });
	},

	getDebugBreak: function() {
		return this.$break;
	},

	destroy: function(){
		this.$stopWorker();
		//TODO ?
	}

}, {
  
  /**
   * 通过文件名称获取代码mode
   */
  getModeByFileName: function(name){
    return getModeName(name);
  },
  
  /**
   * 支持的文件后缀
   */
  support_text_suffix: support_text_suffix,
  
  /**
   * 是否为文本文件
   */
  is_text: is_text
  
});

