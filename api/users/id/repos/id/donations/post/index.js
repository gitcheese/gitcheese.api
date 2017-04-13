'use strict';
const aws = require('aws-sdk');
const request = require('request-promise-native');
const http = require('api-utils').http;
const Validator = require('validatorjs');
const validationRules = {
  token: 'required',
  amount: 'required|numeric|min:200',
  email: 'required|email'
};
exports.post = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let stripeApiUrl = event.stageVariables.StripeApiUrl;
  let userId = event.pathParameters.userId;
  let repoId = event.pathParameters.repoId;
  let data = JSON.parse(event.body) || {};
  var validation = new Validator(data, validationRules);
  if (validation.fails()) {
    return http.response.badRequest(callback, validation.errors.all());
  }
  getManagedAccount(bucket, userId)
    .then((account) => {
      return createStripeCharge(bucket, userId, repoId,
        account.id, stripeApiUrl, account.keys.secret, data);
    })
    .then(() => {
      return http.response.ok(callback);
    })
    .catch((err) => {
      console.log(err);
      return http.response.error(callback);
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
let createStripeCharge = (bucket, userId, repoId, managedAccountId, stripeApiUrl, stripeSecretKey, data) => {
  return new Promise((resolve, reject) => {
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      form: {
        amount: data.amount,
        source: data.token,
        destination: managedAccountId,
        currency: 'usd'
      },
      json: true
    };
    request.post(`${stripeApiUrl}/charges`, options)
      .then((response) => {
        let s3 = new aws.S3();
        s3.putObject({
          Bucket: bucket,
          Key: `users/${userId}/repos/${repoId}/donations/${response.id}/data.donation.json`,
          Body: JSON.stringify(response)
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
