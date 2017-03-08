'use strict';
const aws = require('aws-sdk');
const http = require('api-utils').http;
const Validator = require('validatorjs');
exports.put = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let rules = { email: 'required|email' };
  let data = JSON.parse(event.body);
  var validation = new Validator(data, rules);
  if (validation.fails()) {
    return http.response.badRequest(callback, validation.errors.all());
  }
  s3.putObject({
    Bucket: bucket,
    Key: `users/${userId}/profile.json`,
    Body: JSON.stringify(JSON.parse(event.body))
  }, (err, data) => {
    if (err) {
      console.log(err);
      return http.response.error(callback);
    } else {
      return http.response.ok(callback);
    }
  });
};
