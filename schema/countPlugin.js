module.exports = exports = function countPlugin (schema) {
	schema.statics.count = function(content) {
	    var ccc = require('cccount');

	    return ccc.wcharCount(content);
	};
}