/**
 * @class tesla.web.form.IncomingForm
 * @extends tesla.Event
 * @createTime 2012-01-12
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/web/form/File.js');
include('tesla/web/form/MultipartParser.js');
include('tesla/web/form/QuerystringParser.js');
include('tesla/Delegate.js');
include('tesla/node.js');

var fsx = tesla.node.fsx;
var path = tesla.node.path;
var StringDecoder = tesla.node.string_decoder.StringDecoder;

var MultipartParser = tesla.web.form.MultipartParser;
var QuerystringParser = tesla.web.form.QuerystringParser;
var File = tesla.web.form.File;
var Delegate = tesla.Delegate;

var _UPLOAD_DIR;
var dirs = [process.env.TMP, '/tmp', process.cwd()];

for (var i = 0; i < dirs.length; i++) {
	var dir = dirs[i];
	var isDirectory = false;

	try {
		isDirectory = fsx.statSync(dir).isDirectory();
	} catch (e) { }

	if (isDirectory) {
		_UPLOAD_DIR = dir;
		break;
	}
}

var private$part =

Class('private$part', {

	headers: null,
	name: '',
	filename: '',
	mime: '',
	headerField: '',
	headerValue: '',

	ondata: null,
	onend: null,

	private$part: function() {
		Delegate.def(this, 'data', 'end');
		this.headers = {};
	}
});

function canceled(_this){
	//
	for(var i in _this.files){
		var files = _this.files[i];
		for(var j = 0, len = files.length; i < len; i++){
			fsx.unlink(files[j].path);
		}
	}
}

var IncomingForm =

Class('tesla.web.form.IncomingForm', {

	_parser: null,
	_flushing: 0,
	_fieldsSize: 0,
	_service: null,

	error: null,
	ended: false,

	/**
	 * default size 2MB
	 * @type {Number}
	 */
	maxFieldsSize: 5 * 1024 * 1024,

	/**
	 * default size 5MB
	 * @type {Number}
	 */
	maxFilesSize: 5 * 1024 * 1024,

	/**
	 * verifyFileMime 'js|jpg|jpeg|png' default as '*' ...
	 * @type {String}
	 */
	verifyFileMime: '*',

	/**
	 * is use file upload, default not upload
	 * @type {Boolean}
	 */
	isUpload: false,

	fields: null,
	files: null,

	keepExtensions: false,
	uploadDir: _UPLOAD_DIR,
	encoding: 'utf-8',
	headers: null,
	type: null,

	bytesReceived: null,
	bytesExpected: null,

	onaborted: null,
	onprogress: null,
	onfield: null,
	onfileBegin: null,
	onfile: null,
	onerror: null,
	onend: null,

	/**
	 * constructor function
	 * @param {tesla.web.service.HttpService}
	 * @constructor
	 */
	IncomingForm: function IncomingForm(service) {
		Delegate.def(this,
		'aborted', 'progress', 'field', 'filebegin', 'file', 'error', 'end');

		this._service = service;
		this.fields = {};
		this.files = {};
		this.maxFieldsSize = this._service.server.maxFormDataSize;
		this.maxFilesSize = this._service.server.maxUploadFileSize;
	},

	/**
	 * parse
	 */
	parse: function() {

		var _this = this;
		var req = this._service.request;

		req.on('error', function(err) {
			_this._error(err);
		});
		req.on('aborted', function() {
			canceled(_this);
			_this.onaborted.emit();
		});
		req.on('data', function(buffer) {
			_this.write(buffer);
		});
		req.on('end', function() {
			if (_this.error) {
				return;
			}

			var err = _this._parser.end();
			if (err) {
				_this._error(err);
			}
		});

		this.headers = req.headers;
		this._parseContentLength();
		this._parseContentType();
	},

	write: function(buffer) {
		if (!this._parser) {
			this._error(new Error('unintialized parser'));
			return;
		}

		this.bytesReceived += buffer.length;
		this.onprogress.emit({ bytesReceived: this.bytesReceived, bytesExpected: this.bytesExpected });

		var bytesParsed = this._parser.write(buffer);
		if (bytesParsed !== buffer.length) {
			this._error(new Error('parser error, ' + bytesParsed + ' of ' + buffer.length + ' bytes parsed'));
		}

		return bytesParsed;
	},

	pause: function() {
		try {
			this._service.request.pause();
		} catch (err) {
			// the stream was destroyed
			if (!this.ended) {
				// before it was completed, crash & burn
				this._error(err);
			}
			return false;
		}
		return true;
	},

	resume: function() {
		try {
			this._service.request.resume();
		} catch (err) {
			// the stream was destroyed
			if (!this.ended) {
				// before it was completed, crash & burn
				this._error(err);
			}
			return false;
		}

		return true;
	},

	onPart: function(part) {
		// this method can be overwritten by the user
		this.handlePart(part);
	},

	handlePart: function(part) {
		var self = this;

		if (part.filename === undefined) {
			var value = '';
			var decoder = new StringDecoder(this.encoding);

			part.ondata.on(function(e) {
				var buffer = e.data;
				self._fieldsSize += buffer.length;
				if (self._fieldsSize > self.maxFieldsSize) {
					self._error(new Error('maxFieldsSize exceeded, received ' + self._fieldsSize + ' bytes of field data'));
					return;
				}
				value += decoder.write(buffer);
			});

			part.onend.on(function() {
				self._fieldsSize = 0;
				self.fields[part.name] = value;
				self.onfield.emit({ name: part.name, value: value });
			});
			return;
		}

		if(!this.isUpload){
			return this._error(new Error('Does not allow file uploads'));
		}

		this._flushing++;

		var file = new File({
			path: this._uploadPath(part.filename),
			name: part.filename,
			type: part.mime
		});

		if (this.verifyFileMime != '*' && !new RegExp('\.(' + this.verifyFileMime + ')$', 'i').test(part.filename)) {
			return this._error(new Error('File mime error'));
		}

		this.onfilebegin.emit({ name: part.name, file: file });

		part.ondata.on(function(e) {
			var buffer = e.data;
			self.pause();

			self._fieldsSize += buffer.length;
			if (self._fieldsSize > self.maxFilesSize) {

				file.end(function() {
					self._error(new Error('maxFilesSize exceeded, received ' + self._fieldsSize + ' bytes of field data'));
				});
				return;
			}

			file.write(buffer, function() {
				self.resume();
			});
		});

		part.onend.on(function() {
			self._fieldsSize = 0;
			file.end(function() {
				self._flushing--;

				var files = self.files[part.name];
				if (!files)
					self.files[part.name] = files = [];
				files.push(file);

				self.onfile.emit({ name: part.name, file: file });
				self._maybeEnd();
			});
		});
	},

	_parseContentType: function() {

		var type = this.headers['content-type'];

		if (type.match(/multipart/i)) {

			var m;
			if (m = this.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i)) {
				this._initMultipart(m[1] || m[2]);
			} else {
				this._error(new Error('bad content-type header, no multipart boundary'));
			}
		}
		else
			this._initUrlencoded();
	},

	_error: function(err) {
		if (this.error) {
			return;
		}

		canceled(this);

		this.error = err;
		this._service.request.socket.destroy(); //close socket connect
		this.onerror.emit(err);
	},

	_parseContentLength: function() {
		if (this.headers['content-length']) {
			this.bytesReceived = 0;
			this.bytesExpected = parseInt(this.headers['content-length'], 10);
		}
	},

	_newParser: function() {
		return new MultipartParser();
	},

	_initMultipart: function(boundary) {
		this.type = 'multipart';

		var parser = new MultipartParser();
		var self = this;
		var headerField = '';
		var headerValue = '';
		var part;

		parser.initWithBoundary(boundary);

		parser.onPartBegin = function() {
			part = new private$part();
		};

		parser.onHeaderField = function(b, start, end) {
			headerField += b.toString(self.encoding, start, end);
		};

		parser.onHeaderValue = function(b, start, end) {
			headerValue += b.toString(self.encoding, start, end);
		};

		parser.onHeaderEnd = function() {

			headerField = headerField.toLowerCase();
			part.headers[headerField] = headerValue;

			var m;
			if (headerField == 'content-disposition') {
				if (m = headerValue.match(/name="([^"]+)"/i)) {
					part.name = m[1];
				}

				part.filename = self._fileName(headerValue);
			} else if (headerField == 'content-type') {
				part.mime = headerValue;
			}

			headerField = '';
			headerValue = '';
		};

		parser.onHeadersEnd = function() {
			self.onPart(part);
		};

		parser.onPartData = function(b, start, end) {
			part.ondata.emit(b.slice(start, end));
		};

		parser.onPartEnd = function() {
			part.onend.emit();
		};

		parser.onEnd = function() {
			self.ended = true;
			self._maybeEnd();
		};

		this._parser = parser;
	},

	_fileName: function(headerValue) {
		var m = headerValue.match(/filename="(.*?)"($|; )/i)
		if (!m) return;

		var filename = m[1].substr(m[1].lastIndexOf('\\') + 1);
		filename = filename.replace(/%22/g, '"');
		filename = filename.replace(/&#([\d]{4});/g, function(m, code) {
			return String.fromCharCode(code);
		});
		return filename;
	},

	_initUrlencoded: function() {
		this.type = 'urlencoded';

		var parser = new QuerystringParser()
		var _this = this;

		parser.onField = function(name, value) {
			_this.fields[name] = value;
			_this.onfield.emit({ name: name, value: value });
		};

		parser.onEnd = function() {
			_this.ended = true;
			_this._maybeEnd();
		};

		this._parser = parser;
	},

	_uploadPath: function(filename) {
		var name = '';
		for (var i = 0; i < 32; i++) {
			name += Math.floor(Math.random() * 16).toString(16);
		}

		if (this.keepExtensions) {
			var ext = path.extname(filename);
			ext = ext.replace(/(\.[a-z0-9]+).*/, '$1')

			name += ext;
		}

		return path.join(this.uploadDir, 'temp_upload_' + name);
	},

	_maybeEnd: function() {
		if (!this.ended || this._flushing) {
			return;
		}
		this.onend.emit();
	}

}, {
	UPLOAD_DIR: _UPLOAD_DIR
});



