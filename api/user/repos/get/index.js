'use strict';
const aws = require('aws-sdk');
const apiUtils = require('aws-api-gateway-utils');
exports.get = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let callbacks = new apiUtils.Callbacks(callback);
  s3.listObjectsV2({
    Bucket: bucket,
    Prefix: `users/${userId}/repos`
  }, (err, data) => {
    if (err) {
      console.log(err);
      return callbacks.internalServerError();
    } else {
      let projectPromises = data.Contents.map(c => {
        return new Promise((resolve, reject) => {
          s3.getObject({
            Bucket: bucket,
            Key: c.Key
          }, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(JSON.parse(data.Body.toString()));
            }
          });
        });
      });
      Promise.all(projectPromises)
        .then(projects => {
          return callbacks.ok(projects);
        });
    }
  });
};
