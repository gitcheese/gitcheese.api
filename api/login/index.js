'use strict';
console.log('Loading function');
exports.get = (event, context, callback) => {
    callback(null, {
        "statusCode": 200,
        "body": JSON.stringify(event)
    });
};
