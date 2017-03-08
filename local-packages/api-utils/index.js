 class Response {
   ok(callback, body) {
     return this._executeCallback(callback, 200, body);
   }
   badRequest(callback, body) {
     return this._executeCallback(callback, 400, body);
   }
   found(callback, location) {
     return this._executeCallback(callback, 302, null, { location: location });
   }
   error(callback) {
     return callback('something went wrong :(');
   }
   _executeCallback(callback, code, body, additionalHeaders) {
     let response = {
       statusCode: code,
       headers: {
         'Access-Control-Allow-Origin': '*'
       }
     };
     if (body) {
       response.body = JSON.stringify(body);
     }
     if (additionalHeaders) {
       Object.assign(response.headers, additionalHeaders);
     }
     return callback(null, response);
   };
 }
 exports.http = { response: new Response() };
