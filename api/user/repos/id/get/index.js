'use strict';
const aws = require('aws-sdk');
exports.get = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let id = event.pathParameters.id;
  s3.getObject({
    Bucket: bucket,
    Key: `users/${event.requestContext.authorizer.principalId}/repos/${id}/data.json`
  }, (err, data) => {
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