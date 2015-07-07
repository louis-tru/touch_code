/**
 * @class tesla.db.mssql.Mssql
 * @extends tesla.db.Database
 * @createTime 2012-01-30
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 */

include('tesla/db/Database.js');

//public:
Class('tesla.db.mssql.Mssql', tesla.db.Database, {

	/**
	 * constructor function
	 * @param {Object} opt (Optional)
	 * @constructor
	 */
	Mssql: function(opt) {
		this.Database();
		tesla.update(this, opt);
	},

	//overlay
	use: function(db, cb) {

	},

	//overlay
	statistics: function(cb) {

	},

	//overlay
	ping: function(cb) {

	},

	//overlay
	query: function(sql, cb) {

	},

	//overlay
	close: function() {

	}

});

