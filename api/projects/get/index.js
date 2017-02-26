'use strict';
const aws = require('aws-sdk');
exports.get = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalI;
  s3.listObjectsV2({
    Bucket: bucket,
    Prefix: `users/${userId}/repos`
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback('something went wrong :(');
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
              resolve(data.Body.toString());
            }
          });
        });
      });
      Promise.all(projectPromises)
        .then(projects => {
          callback(null, {
            statusCode: 200,
            body: projects
          });
        });
    }
  });
};
