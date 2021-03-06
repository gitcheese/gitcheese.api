'use strict';
const aws = require('aws-sdk');
const http = require('api-utils').http;
exports.get = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  getManagedAccount(bucket, userId)
    .then((account) => {
      return http.response.ok(callback, account);
    })
    .catch(() => {
      return http.response.ok(callback);
    });
};
let getManagedAccount = (bucket, userId) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.getObject({
      Bucket: bucket,
      Key: `users/${userId}/managed-account/data.json`
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(JSON.parse(data.Body.toString()));
    });
  });
};
