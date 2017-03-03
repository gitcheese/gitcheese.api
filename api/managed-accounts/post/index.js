'use strict';
const aws = require('aws-sdk');
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
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({ errors: validation.errors.all() })
    });
  }
  console.log('checking managed account');
  managedAccountAlreadyExists(bucket, userId)
    .then((exists) => {
      console.log('managed account exists:' + exists);
      if (exists) {
        return callback(null, {
          statusCode: 400,
          body: JSON.stringify({ errors: 'Managed account allready exists.' })
        });
      }
      return createManagedAccount(stripeApiUrl, stripeSecretKey, bucket, userId, data.country);
    })
    .then(() => {
      return callback(null, { statusCode: 200 });
    })
    .catch((err) => {
      console.log(err);
      return callback('There was an error.');
    });
};
let createManagedAccount = (stripeApiUrl, stripeSecretKey, bucket, userId, country) => {
  return new Promise((resolve, reject) => {
    console.log('creating managed account');
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      json: {
        managed: true,
        country: country,
        transfer_schedule: {
          delay_days: 30,
          interval: 'daily'
        }
      }
    };
    request(`${stripeApiUrl}/accounts`, options)
      .then((response) => {
        console.log('stripe response:');
        console.log(response);
        let s3 = new aws.S3();
        s3.putObject({
          Bucket: bucket,
          Key: `users/${userId}/managed-account/data.json`,
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
        console.log(err);
        reject('There was an error.');
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
      return resolve(data.Contents > 0);
    });
  });
};
