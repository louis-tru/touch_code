
include('tesla/node.js');
include('tesla/Delegate.js');
include('tesla/Extend.js');

var fsx = tesla.node.fsx;
var SETTINGS = { };
var DESTROY_TIME = 5e5;
var SAVED_TIME = 6e4;
var SETTINGS_FILE_NAME = 'app_setting.conf';

/**
* @class teide.Settings.private$settings
* @extends Object
* @createTime 2012-03-03
* @updateTime 2012-03-03
* @author www.mooogame.com, simplicity is our pursuit
* @copyright (C) Copyright mooogame Corporation 2011-2100 All Rights Reserved.
* @version 1.0
*/

function saved(self, cb){
  if (self.m_path in SETTINGS){
		fsx.writeFile(self.m_path + SETTINGS_FILE_NAME, JSON.stringify(self._values), cb);
	}
	else{
	  cb && cb();
	}
}

function save(self) {
	Function.undelay(self.m_saved_timeoutid);
	self.m_saved_timeoutid = saved.delay(SAVED_TIME, self);
}

function destroy(path) {
  var o = SETTINGS[path];
  if(o){
  	var self = o.value;
  	saved(self, function(){
  		delete SETTINGS[path];
  		self.ondestroy.emit();
  		self.ondestroy.unon();
  		self.onchangebreakpoints.unon();  	  
  	});
  }
}

function encodeName(filename) {
	return filename.replace(/\./g, '&lg');
}

function decodeName(filename) {
	return filename.replace(/&lg/g, '.');
}

function getFileKey(filename) {
	return 'files.' + encodeName(filename).replace(/\//g, '.');
}

function forEach(values, name, cb) {
	if (Array.isArray(values.breakpoints || values.folds)){
		return cb(name, values);
	}
	for (var i in values){
		forEach(values[i], name + '/' + decodeName(i), cb);
	}
}

var private$settings =

Class('private$settings', {

	//private:
	m_path: '',
	_values: null,
	m_saved_timeoutid: 0,

	//public:
	/**
	* @event onchangebreakpoints
	*/
	onchangebreakpoints: null,

	/**
	* @event ondestroy
	*/
	ondestroy: null,

	/**
	* constructor
	* @param {String}  path
	* @constructor
	*/
	private$settings: function(path) {
		this.m_path = path;
		this._values = { };
		tesla.Delegate.def(this, 'changebreakpoints', 'destroy');
		try {
			var data = fsx.readFileSync(path + SETTINGS_FILE_NAME).toString('utf8');
			this._values = JSON.parse(data);
		}
		catch (err) {
			//console.error('Settings:' + err.message);
		}
	},

	/**
	* Get setting by name
	* @param  {String}   name
	* @return {Object}
	*/
	get: function(name) {
		return tesla.get(name, this._values);
	},

	/**
	* Get all setting by name
	* @return {Object}
	*/
	getAll: function() {
		return this._values;
	},

	/**
	* Set setting by name
	* @param {String}   name
	* @param {Object}   value
	* @return {Object}
	*/
	set: function(name, value) {
		tesla.set(name, value, this._values);
		save(this);
	},

	/**
	* @param {String}
	*/
	remove: function(name) {
		tesla.remove(name, this._values);
		save(this);
	},

	/**
	* Set all setting by name
	* @param {Object}   values
	* @return {Object}
	*/
	setAll: function(values) {
		this._values = values;
		save(this);
	},
	
	// 获取偏好设置
	get_preferences: function(){
	  return this.get('preferences') || { };
	},
	
	set_preferences: function(preferences){
	  this.set('preferences', preferences || { });
	},
	
	set_preferences_item: function(name, value){
	  this.set('preferences.' + name, value);
	},
  
  delete_preferences_item: function(name){
    this.remove('preferences.' + name);
  },
  
	/*
	* @param {Object}   filename
	* @return {Object}
	*/
	getFileProperty: function(filename) {

		var values = this.get(getFileKey(filename)) || {};
		values.breakpoints = values.breakpoints || [];
		values.folds = values.folds || [];
		return values;
	},

	/*
	* @param {Object}   filename
	* @param {Object}   value
	*/
	setFileProperty: function(filename, value) {

		var key = getFileKey(filename);

		if(
			(!value.breakpoints || !value.breakpoints.length) &&
			(!value.folds || !value.folds.length)
		) {
			this.remove(key);
		}
		else{
			this.set(key, value);
		}
		this.setBreakpoints(filename, value.breakpoints);
	},

	/*
	* @param {Object}   filename
	*/
	removeFileProperty: function(filename) {
		this.remove(getFileKey(filename));
		this.setBreakpoints(filename);
	},

	/*
	* @param {Object}   oldFilename
	* @param {Object}   newFilename
	*/
	renameFileProperty: function(oldFilename, newFilename) {
		var value = this.get(getFileKey(oldFilename));
		if (value) {
			this.removeFileProperty(oldFilename);
			this.setFileProperty(newFilename, value);
		}
	},

	/**
	* @param {String}   filename
	* @param {Number[]}   folds
	*/
	setFolds: function(filename, folds){
		var key = getFileKey(filename) + '.folds';

		if(folds.length){
			this.set(key, folds);
		}
		else{
			this.remove(key);
		}
	},

	/**
	* @param {String}   filename
	* @param {Number[]}   rows
	*/
	setBreakpoints: function(filename, rows) {
		rows = rows || [];

		var mat = filename.match(/^(server|client)/);
		var type = mat ? mat[1]: 'other';
		var key = getFileKey(filename) + '.breakpoints';

		if(rows.length){
			this.set(key, rows);
		}
		else{
			this.remove(key);
		}

		this.onchangebreakpoints.emit(
			{ name: filename, rows: rows, action: 'set', type: type});
	},

	/**
	* clear all breakpoint
	*/
	clearAllBreakpoints: function() {
		forEach(this.get('files'), '', function(name, value) {
			delete value.breakpoints;
		});

		save(this);
		this.onchangebreakpoints.emit({ action: 'clearAll' });
	},

	/**
	* @param  {String}   filename
	* @return {Object}
	*/
	getBreakpoints: function(filename) {
		var key = getFileKey(filename) + '.breakpoints';
		return this.get(key) || [];
	},

	/**
	* @return {Object}
	*/
	getAllBreakpoints: function() {

		var client = [];
		var server = [];
		var reg = /^\/(((client)|(server)).+)/i;

		forEach(this.get('files') || {}, '', function(name, value) {
			var mat = name.match(reg);
			if (mat){
				var breakpoints = value.breakpoints;

				(mat[3] ? client : server).push(
					{
						name: mat[1],
						breakpoints: breakpoints ? breakpoints.concat(): []
					}
				);
			}
		});

		var result = { client: client, server: server };
		return result;
	}
});


/**
* @class teide.Settings
* @extends Object
* @createTime 2012-03-03
* @updateTime 2012-03-03
* @author www.mooogame.com, simplicity is our pursuit
* @copyright (C) Copyright mooogame Corporation 2011-2100 All Rights Reserved.
* @version 1.0
* @singleton
*/
Class('teide.Settings', null, {

	SETTINGS_FILE_NAME: SETTINGS_FILE_NAME,
  
	/**
	* Get settings by path
	* @param  {String} path
	* @return {teide.Settings.private$settings}
	*/
	get: function(path) {

		var INSTANCE = SETTINGS[path];
		if (!INSTANCE) {
			SETTINGS[path] = INSTANCE = { value: new private$settings(path), timeout: 0 };
		}
		else{
		  tesla.clearDelay(INSTANCE.timeout);
		}
		INSTANCE.timeout = destroy.delay(DESTROY_TIME, path);
		return INSTANCE.value;
	}
});


