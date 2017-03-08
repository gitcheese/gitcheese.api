'use strict';
const aws = require('aws-sdk');
const http = require('api-utils').http;
exports.get = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  s3.getObject({
    Bucket: bucket,
    Key: `users/${event.requestContext.authorizer.principalId}/profile.json`
  }, (err, data) => {
    if (err) {
      console.log(err);
      return http.response.error(callback);
    } else {
      return http.response.ok(callback, JSON.parse(data.Body.toString()));
    }
  });
};
