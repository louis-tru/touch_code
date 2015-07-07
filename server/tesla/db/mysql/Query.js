/**
 * @class tesla.db.mysql.Query
 * @extends Object
 * @createTime 2012-01-12
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */


include('tesla/db/mysql/Parser.js');
include('tesla/Delegate.js');

var Parser = tesla.db.mysql.Parser;
var Query =

Class('tesla.db.mysql.Query', {

	/**
	 * query sql
	 * @type {String}
	 */
	sql: '',

	/**
	 * @event onerror
	 */
	onerror: null,

	/**
	 * @event onrow
	 */
	onrow: null,

	/**
	 * @event onfield
	 */
	onfield: null,

	/**
	 * @event onend
	 */
	onend: null,

	/**
	 * constructor function
	 * @param {String} sql
	 * @constructor
	 */
	Query: function(sql) {
		tesla.Delegate.def(this, 'row', 'field', 'end', 'error');
		this.sql = sql;
	},

	handlePacket: function(packet) {

		// We can't do this require() on top of the file.
		// That's because there is circular dependency and we're overwriting
		// module.exports
		var _this = this;

		switch (packet.type) {
			case Parser.OK_PACKET:
				_this.onend.emit(packet.toUserObject());
				break;
			case Parser.ERROR_PACKET:
				packet.sql = _this.sql;
				_this.onerror.emit(packet.toUserObject());
				break;
			case Parser.FIELD_PACKET:
				if (!_this._fields)
					_this._fields = [];

				this._fields.push(packet);
				_this.onfield.emit(packet);
				break;
			case Parser.EOF_PACKET:
				if (!_this._eofs)
					_this._eofs = 1;
				else
					_this._eofs++;

				if (_this._eofs == 2)
					_this.onend.emit();
				break;
			case Parser.ROW_DATA_PACKET:
				var row = {};
				var field;
				_this._rowIndex = 0;
				_this._row = row;

				packet.ondata.on(function(e) {

					var data = e.data;
					var buffer = data.buffer;
					var remaining = data.remaining;

					if (!field) {
						field = _this._fields[_this._rowIndex];
						row[field.name] = '';
					}

					if (buffer)
						row[field.name] += buffer.toString('utf-8');
					else
						row[field.name] = null;

					if (remaining !== 0)
						return;

					_this._rowIndex++;
					//TODO
					// NOTE: need to handle more data types, such as binary data
					if (buffer !== null) {
						switch (field.fieldType) {
							case Query.FIELD_TYPE_TIMESTAMP:
							case Query.FIELD_TYPE_DATE:
							case Query.FIELD_TYPE_DATETIME:
							case Query.FIELD_TYPE_NEWDATE:
								row[field.name] = new Date(row[field.name]);
								break;
							case Query.FIELD_TYPE_TINY:
							case Query.FIELD_TYPE_SHORT:
							case Query.FIELD_TYPE_LONG:
							case Query.FIELD_TYPE_LONGLONG:
							case Query.FIELD_TYPE_INT24:
							case Query.FIELD_TYPE_YEAR:
								row[field.name] = parseInt(row[field.name], 10);
								break;
							case Query.FIELD_TYPE_FLOAT:
							case Query.FIELD_TYPE_DOUBLE:
								// decimal types cannot be parsed as floats because
								// V8 Numbers have less precision than some MySQL Decimals
								row[field.name] = parseFloat(row[field.name]);
								break;
							case Query.FIELD_TYPE_BIT:
								row[field.name] = row[field.name] == '\u0000' ? 0 : 1;
								break;
						}
					}

					if (_this._rowIndex == _this._fields.length) {
						delete _this._row;
						delete _this._rowIndex;
						_this.onrow.emit(row);
						return;
					}

					field = null;
				});
				break;
		}
	}

}, {

	FIELD_TYPE_DECIMAL: 0x00,
	FIELD_TYPE_TINY: 0x01,
	FIELD_TYPE_SHORT: 0x02,
	FIELD_TYPE_LONG: 0x03,
	FIELD_TYPE_FLOAT: 0x04,
	FIELD_TYPE_DOUBLE: 0x05,
	FIELD_TYPE_NULL: 0x06,
	FIELD_TYPE_TIMESTAMP: 0x07,
	FIELD_TYPE_LONGLONG: 0x08,
	FIELD_TYPE_INT24: 0x09,
	FIELD_TYPE_DATE: 0x0a,
	FIELD_TYPE_TIME: 0x0b,
	FIELD_TYPE_DATETIME: 0x0c,
	FIELD_TYPE_YEAR: 0x0d,
	FIELD_TYPE_NEWDATE: 0x0e,
	FIELD_TYPE_VARCHAR: 0x0f,
	FIELD_TYPE_BIT: 0x10,
	FIELD_TYPE_NEWDECIMAL: 0xf6,
	FIELD_TYPE_ENUM: 0xf7,
	FIELD_TYPE_SET: 0xf8,
	FIELD_TYPE_TINY_BLOB: 0xf9,
	FIELD_TYPE_MEDIUM_BLOB: 0xfa,
	FIELD_TYPE_LONG_BLOB: 0xfb,
	FIELD_TYPE_BLOB: 0xfc,
	FIELD_TYPE_VAR_STRING: 0xfd,
	FIELD_TYPE_STRING: 0xfe,
	FIELD_TYPE_GEOMETRY: 0xff

});

