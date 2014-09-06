/**
 * Decorates the `rep` with hypermedia links
 *
 * Arrays of results are automatically paginated, Objects
 * will be parsed and have keys 'lifted' into the 'link'
 * Array if a pattern is matched, e.g. "user_(guid|uuid|id|uri|url)"
 * will map to "/users/$1"
 *
 * @method hypermedia
 * @param  {Object} server  TurtleIO instance
 * @param  {Object} req     Client request
 * @param  {Object} rep     Serialized representation
 * @param  {Object} headers HTTP response headers
 * @return {Undefined}      undefined
 */
function hypermedia ( server, req, rep, headers ) {
	var query, page, page_size, nth, root, remove, rewrite;

	// Parsing the object for hypermedia properties
	function parse ( obj, rel ) {
		rel = rel || "related";

		var keys = array.keys( obj );

		if ( keys.length === 0 ) {
			obj = null;
		}
		else {
			array.each( keys, function ( i ) {
				var collection, uri;

				// If ID like keys are found, and are not URIs, they are assumed to be root collections
				if ( REGEX_HYPERMEDIA.test( i ) ) {
					collection = i.replace( REGEX_TRAILING, "" ).replace( REGEX_TRAILING_S, "" ) + "s";
					uri = REGEX_SCHEME.test( obj[i] ) ? ( obj[i].indexOf( "//" ) > -1 ? obj[i] : req.parsed.protocol + "//" + req.parsed.host + obj[i] ) : ( req.parsed.protocol + "//" + req.parsed.host + "/" + collection + "/" + obj[i] );

					if ( uri !== root ) {
						rep.data.link.push( {uri: uri, rel: rel} );
						delete obj[i];
					}
				}
			} );

			if ( array.keys( obj ).length === 0 ) {
				obj = null;
			}
		}

		return obj;
	}

	if ( rep.status >= 200 && rep.status <= 206 ) {
		query     = req.parsed.query;
		page      = query.page      || 1;
		page_size = query.page_size || server.config.pageSize || 5;
		rep.data  = {link: [], result: rep.data};
		root      = req.parsed.protocol + "//" + req.parsed.host + req.parsed.pathname;

		if ( req.parsed.pathname !== "/" ) {
			rep.data.link.push( {uri: root.replace( REGEX_COLLECTION, "$1" ), rel: "collection"} );
		}

		if ( rep.data.result instanceof Array ) {
			if ( isNaN( page ) || page <= 0 ) {
				page = 1;
			}

			rewrite = false;
			remove  = [];
			nth     = Math.ceil( rep.data.result.length / page_size );

			if ( nth > 1 ) {
				rep.data.result = array.limit( rep.data.result, ( page - 1 ) * page_size, page_size );
				query.page = 0;
				query.page_size = page_size;

				root += "?" + array.keys( query ).map( function ( i ) {
					return i + "=" + encodeURIComponent( query[i] );
				} ).join( "&" );

				if ( page > 1 ) {
					rep.data.link.push( {uri: root.replace( "page=0", "page=1" ), rel: "first"} );
				}

				if ( page - 1 > 1 && page <= nth ) {
					rep.data.link.push( {uri: root.replace( "page=0", "page=" + ( page - 1 ) ), rel: "prev"} );
				}

				if ( page + 1 < nth ) {
					rep.data.link.push( {uri: root.replace( "page=0", "page=" + ( page + 1 ) ), rel: "next"} );
				}

				if ( nth > 0 && page !== nth ) {
					rep.data.link.push( {uri: root.replace( "page=0", "page=" + nth ), rel: "last"} );
				}
			}
			else {
				root += "?" + array.keys( query ).map( function ( i ) {
					return i + "=" + encodeURIComponent( query[i] );
				} ).join( "&" );
			}

			array.each( rep.data.result, function ( i, idx ) {
				var uri;

				if ( typeof i == "string" && REGEX_SCHEME.test( i ) ) {
					rewrite = true;
					uri     = i.indexOf( "//" ) > -1 ? i : req.parsed.protocol + "//" + req.parsed.host + i;

					if ( uri !== root ) {
						rep.data.link.push( {uri: uri, rel: "item"} );
						remove.push( idx );
					}
				}

				if ( i instanceof Object ) {
					parse( i, "item" );
				}
			} );

			// This is for collections of URIs
			if ( remove.length > 0 ) {
				array.each( remove.reverse(), function ( i ) {
					array.remove( rep.data.result, i );
				} );
			}

			if ( rewrite && rep.data.result.length === 0 ) {
				rep.data.result = null;
			}
		}
		else if ( rep.data.result instanceof Object ) {
			rep.data.result = parse( rep.data.result );
		}

		if ( rep.data.link !== undefined && rep.data.link.length > 0 ) {
			headers.link = rep.data.link.map( function ( i ) {
				return "<" + i.uri + ">; rel=\"" + i.rel + "\"";
			} ).join( ", " );
		}
	}

	return rep;
}
