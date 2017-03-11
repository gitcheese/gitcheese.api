'use strict';
const aws = require('aws-sdk');
const http = require('api-utils').http;
const request = require('request-promise-native');
const Validator = require('validatorjs');
const validationRules = {
  country: 'required|in:US,AT,AU,BE,CA,CH,DE,DK,ES,FI,FR,GB,HK,IE,IT,JP,LU,NL,NO,NZ,PT,SE,SG'
};
exports.post = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let stripeSecretKey = event.stageVariables.StripeSecretKey;
  let stripeApiUrl = event.stageVariables.StripeApiUrl;
  let data = JSON.parse(event.body) || {};
  var validation = new Validator(data, validationRules);
  if (validation.fails()) {
    return http.response.badRequest(callback, validation.errors.all());
  }
  managedAccountAlreadyExists(bucket, userId)
    .then((exists) => {
      if (exists) {
        return http.response.badRequest(callback, { errors: 'Managed account allready exists.' });
      }
      return createManagedAccount(stripeApiUrl, stripeSecretKey, bucket, userId, data.country);
    })
    .then(() => {
      return http.response.ok(callback);
    })
    .catch((err) => {
      console.log(err);
      return http.response.error(callback);
    });
};
let createManagedAccount = (stripeApiUrl, stripeSecretKey, bucket, userId, country) => {
  return new Promise((resolve, reject) => {
    console.log('creating managed account');
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      form: {
        'managed': true,
        'country': country,
        'transfer_schedule[delay_days]': 30,
        'transfer_schedule[interval]': 'daily'
      },
      json: true
    };
    request.post(`${stripeApiUrl}/accounts`, options)
      .then((response) => {
        let s3 = new aws.S3();
        s3.putObject({
          Bucket: bucket,
          Key: `users/${userId}/managed-account/data.json`,
          Body: JSON.stringify({ id: response.id, verification: response.verification, country: response.country })
        }, (err, data) => {
          if (err) {
            return reject('There was an error.');
          } else {
            resolve();
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
};
let managedAccountAlreadyExists = (bucket, userId) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.listObjectsV2({
      Bucket: bucket,
      Prefix: `users/${userId}/managed-account/data.json`
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data.Contents.length > 0);
    });
  });
};
