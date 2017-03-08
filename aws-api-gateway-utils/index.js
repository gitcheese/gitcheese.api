 class Callbacks {
   constructor(awsCallback) {
     this.awsCallback = awsCallback;
   }
   ok(body) {
     return this._executeCallback(200, body);
   }
   badRequest(body) {
     return this._executeCallback(400, body);
   }
   found(location) {
     return this._executeCallback(302, null, { location: location });
   }
   internalServerError() {
     return this.awsCallback('something went wrong :(');
   }
   _executeCallback(code, body, additionalHeaders) {
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
     return this.awsCallback(null, response);
   }
 }
 exports.utils = {
   Callbacks: Callbacks
 };
