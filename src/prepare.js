/**
 * Prepares a response body
 *
 * @method prepare
 * @param  {Mixed}  arg    [Optional] Response body "data"
 * @param  {Object} error  [Optional] Error instance
 * @param  {Number} status HTTP status code
 * @return {Object}        Standardized response body
 */
function prepare (arg, error, status) {
	let data = clone(arg);

	if (arg !== null) {
		error = null;
	}

	return {
		data: data || null,
		error: error ? ( error.message || error ) : null,
		links: [],
		status: status || 200
	};
}
