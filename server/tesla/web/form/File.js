/**
 * @class tesla.web.form.File
 * @extends tesla.Event
 * @createTime 2012-01-12
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/Delegate.js');
include('tesla/node.js');

var WriteStream = tesla.node.fsx.WriteStream;

Class('tesla.web.form.File', tesla.Event, {

	_writeStream: null,

	path: '',
	name: '',
	type: null,
	size: 0,
	lastModifiedDate: null,

	// @todo Next release: Show error messages when accessing these
	get length() {
		return this.size;
	},

	get filename() {
		return this.name;
	},

	get mime() {
		return this.type;
	},

	/**
	 * @event onprogress
	 */
	onprogress: null,

	/**
	 * @event onend
	 */
	onend: null,

	/**
	 * constructor function
	 * @param {Object} properties
	 * @constructor
	 */
	File: function(properties) {
		tesla.Delegate.def(this, 'progress', 'end');
		tesla.extend(this, properties);
	},

	open: function() {
		this._writeStream = new WriteStream(this.path);
	},

	write: function(buffer, cb) {
		var _this = this;

		if (!_this._writeStream)
			_this.open();

		_this._writeStream.write(buffer, function() {
			_this.lastModifiedDate = new Date();
			_this.size += buffer.length;
			_this.onprogress.emit(_this.size);
			cb();
		});
	},

	end: function(cb) {
		var _this = this;

		if (_this._writeStream) {
			_this._writeStream.end(function() {
				_this.onend.emit();
				cb();
			});
		}
		else {
			_this.path = '';
			_this.onend.emit();
			cb();
		}
	}
});

