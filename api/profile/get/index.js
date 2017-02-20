'use strict';
const aws = require('aws-sdk');
exports.get = (event, context, callback) => {
    let s3 = new aws.S3();
    let bucket = event.stageVariables.BucketName;
    s3.getObject({
        Bucket: bucket,
        Key: `users/${event.requestContext.authorizer.principalId}/profile.json`
    }, function(err, data) {
        if (err) {
            console.log(err);
            callback('There was an error.');
        } else {
            callback(null, {
                statusCode: 200,
                body: data.Body.toString()
            });
        }
    });
};
