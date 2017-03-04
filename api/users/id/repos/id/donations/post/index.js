'use strict';
const aws = require('aws-sdk');
const request = require('request-promise-native');
const Validator = require('validatorjs');
const validationRules = {
  country: 'required|in:US,AT,AU,BE,CA,CH,DE,DK,ES,FI,FR,GB,HK,IE,IT,JP,LU,NL,NO,NZ,PT,SE,SG'
};
exports.post = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let stripeSecretKey = event.stageVariables.StripeSecretKey;
  let stripeApiUrl = event.stageVariables.StripeApiUrl;
  let userId = event.pathParameters.userId;
  let repoId = event.pathParameters.repoId;
  let data = JSON.parse(event.body) || {};
  var validation = new Validator(data, validationRules);
  if (validation.fails()) {
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({ errors: validation.errors.all() })
    });
  }
};
