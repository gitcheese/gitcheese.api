'use strict';
const aws = require('aws-sdk');
exports.put = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  s3.putObject({
    Bucket: bucket,
    Key: `users/${userId}/profile.json`,
    Body: JSON.stringify(JSON.parse(event.body))
  }, (err, data) => {
    if (err) {
      console.log(err);
      callback('There was an error.');
    } else {
      callback(null, {
        statusCode: 200
      });
    }
  });
};
