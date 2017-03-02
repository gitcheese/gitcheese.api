'use strict';
const aws = require('aws-sdk');
const Validator = require('validatorjs');
exports.put = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let rules = {
    email: 'required|email',
    country: 'required|in:US,AT,AU,BE,CA,CH,DE,DK,ES,FI,FR,GB,HK,IE,IT,JP,LU,NL,NO,NZ,PT,SE,SG'
  };
  let data = JSON.parse(event.body);
  var validation = new Validator(data, rules);
  if (validation.fails()) {
    callback(null, { statusCode: 400, body: JSON.stringify({ errors: validation.errors.all() }) });
    return;
  }
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
