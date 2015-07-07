/**
 * @class tesla.xml.DOMException
 * @extends Object
 * @createTime 2012-01-18
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

var ExceptionMessage = [];

Class('tesla.xml.DOMException', {

	DOMException: function(code, message) {
		if (message instanceof Error) {
			var error = message;
		} else {
			error = this;
			Error.call(this, ExceptionMessage[code]);
			this.message = ExceptionMessage[code];
			if (Error.captureStackTrace)
				Error.captureStackTrace(this, DOMException);
		}
		error.code = code;
		if (message)
			this.message = this.message + ": " + message;
		return error;
	}

}, {
	INDEX_SIZE_ERR: (ExceptionMessage[1] = 'Index size error', 1),
	DOMSTRING_SIZE_ERR: (ExceptionMessage[2] = 'DOMString size error', 2),
	HIERARCHY_REQUEST_ERR: (ExceptionMessage[3] = 'Hierarchy request error', 3),
	WRONG_DOCUMENT_ERR: (ExceptionMessage[4] = 'Wrong document', 4),
	INVALID_CHARACTER_ERR: (ExceptionMessage[5] = 'Invalid character', 5),
	NO_DATA_ALLOWED_ERR: (ExceptionMessage[6] = 'No data allowed', 6),
	NO_MODIFICATION_ALLOWED_ERR: (ExceptionMessage[7] = 'No modification allowed', 7),
	NOT_FOUND_ERR: (ExceptionMessage[8] = 'Not found', 8),
	NOT_SUPPORTED_ERR: (ExceptionMessage[9] = 'Not supported', 9),
	INUSE_ATTRIBUTE_ERR: (ExceptionMessage[10] = 'Attribute in use', 10),
	//level2
	INVALID_STATE_ERR: (ExceptionMessage[11] = 'Invalid state', 11),
	SYNTAX_ERR: (ExceptionMessage[12] = 'Syntax error', 12),
	INVALID_MODIFICATION_ERR: (ExceptionMessage[13] = 'Invalid modification', 13),
	NAMESPACE_ERR: (ExceptionMessage[14] = 'Invalid namespace', 14),
	INVALID_ACCESS_ERR: (ExceptionMessage[15] = 'Invalid access', 15)

});