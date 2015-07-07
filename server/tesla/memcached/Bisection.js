/**
 * @class tesla.memcached.Bisection
 * @extends Object
 * @createTime 2012-01-16
 * @author louis.tru <louis.tru@gmail.com>
 * @copyright (C) 2011 louis.tru, http://mooogame.com
 * Released under MIT license, http://license.mooogame.com
 * @version 1.0
 * @singleton
 */


Class('tesla.memcached.Bisection', null, {

	/**
	 * Calculates the index of the Array where item X should be placed, assuming the Array is sorted.
	 *
	 * @param  {Array}  array The array containing the items.
	 * @param  {Number} x     The item that needs to be added to the array.
	 * @param  {Number} low   Inital Index that is used to start searching, optional.
	 * @param  {Number} high  The maximum Index that is used to stop searching, optional.
	 * @return {Number} the   index where item X should be placed
	 * @static
	 */
	right: function(array, x, low, high) {
		// The low and high bounds the inital slice of the array that needs to be searched
		// this is optional
		low || (low = 0);
		high || (high = array.length);

		var mid;

		while (low < high) {
			mid = (low + high) >> 1;

			if (x < array[mid]) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}

		return low;
	},

	/**
	* Calculates the index of the Array where item X should be placed, assuming the Array is sorted.
	* @param  {Array}  array The array containing the items.
	* @param  {number} x     The item that needs to be added to the array.
	* @param  {number} low   Inital Index that is used to start searching, optional.
	* @param  {number} high  The maximum Index that is used to stop searching, optional.
	* @return {number} the   index where item X should be placed
	*/
	left: function(array, x, low, high) {
		// The low and high bounds the inital slice of the array that needs to be searched
		// this is optional
		low || (low = 0);
		high || (high = array.length);

		var mid;

		while (low < high) {
			mid = (low + high) >> 1;

			if (x < array[mid]) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		return low;
	}

});


