/**
 * @class tesla.db.mysql.OutgoingPacket
 * @extends Object
 * @createTime 2012-01-12
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/node.js');

var Buffer = tesla.node.buffer.Buffer;

Class('tesla.db.mysql.OutgoingPacket', {

	/**
	 * index
	 * @type {Number}
	 */
	index: 0,

	/**
	 * constructor function
	 * @param {Number} size
	 * @param {Number} num
	 * @constructor
	 */
	OutgoingPacket: function(size, num) {
		this.buffer = new Buffer(size + 3 + 1);
		this.writeNumber(3, size);
		this.writeNumber(1, num || 0);
	},

	writeNumber: function(bytes, number) {
		for (var i = 0; i < bytes; i++) {
			this.buffer[this.index++] = (number >> (i * 8)) & 0xff;
		}
	},

	writeFiller: function(bytes) {
		for (var i = 0; i < bytes; i++) {
			this.buffer[this.index++] = 0;
		}
	},

	write: function(bufferOrString, encoding) {
		if (typeof bufferOrString == 'string') {
			this.index += this.buffer.write(bufferOrString, this.index, encoding);
			return;
		}

		bufferOrString.copy(this.buffer, this.index, 0);
		this.index += bufferOrString.length;
	},

	writeNullTerminated: function(bufferOrString, encoding) {
		this.write(bufferOrString, encoding);
		this.buffer[this.index++] = 0;
	},

	writeLengthCoded: function(bufferOrStringOrNumber, encoding) {
		if (bufferOrStringOrNumber === null) {
			this.buffer[this.index++] = 251;
			return;
		}

		if (typeof bufferOrStringOrNumber == 'number') {
			if (bufferOrStringOrNumber <= 250) {
				this.buffer[this.index++] = bufferOrStringOrNumber;
				return;
			}

			// @todo support 8-byte numbers and simplify this
			if (bufferOrStringOrNumber < 0xffff) {
				this.buffer[this.index++] = 252;
				this.buffer[this.index++] = (bufferOrStringOrNumber >> 0) & 0xff;
				this.buffer[this.index++] = (bufferOrStringOrNumber >> 8) & 0xff;
			} else if (bufferOrStringOrNumber < 0xffffff) {
				this.buffer[this.index++] = 253;
				this.buffer[this.index++] = (bufferOrStringOrNumber >> 0) & 0xff;
				this.buffer[this.index++] = (bufferOrStringOrNumber >> 8) & 0xff;
				this.buffer[this.index++] = (bufferOrStringOrNumber >> 16) & 0xff;
			} else {
				throw new Error('8 byte length coded numbers not supported yet');
			}
			return;
		}

		if (bufferOrStringOrNumber instanceof Buffer) {
			this.writeLengthCoded(bufferOrStringOrNumber.length);
			this.write(bufferOrStringOrNumber);
			return;
		}

		if (typeof bufferOrStringOrNumber == 'string') {
			this.writeLengthCoded(Buffer.byteLength(bufferOrStringOrNumber, encoding));
			this.write(bufferOrStringOrNumber, encoding);
			return;
		}

		throw new Error('passed argument not a buffer, string or number: ' + bufferOrStringOrNumber);
	}

});

