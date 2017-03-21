'use strict';
const aws = require('aws-sdk');
const request = require('request-promise-native');
const Validator = require('validatorjs');
const validationRules = {
  token: 'required',
  amount: 'required|numeric|min:200',
  email: 'required|email'
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
  getManagedAccount(bucket, userId)
    .then((account) => {
      return createStripeCharge(bucket, userId, repoId, account.id, stripeApiUrl, stripeSecretKey, data);
    })
    .then(() => {
      return callback(null, { statusCode: 200 });
    })
    .catch((err) => {
      console.log(err);
      callback('There was an error');
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
      }
    };
    request.post(`${stripeApiUrl}/charges`, options)
      .then((response) => {
        let s3 = new aws.S3();
        s3.putObject({
          Bucket: bucket,
          Key: `users/${userId}/repos/${repoId}/donations/${response.id}/data.json`,
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
