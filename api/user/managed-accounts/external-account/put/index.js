'use strict';
const aws = require('aws-sdk');
const http = require('api-utils').http;
const request = require('request-promise-native');
const Validator = require('validatorjs');
const validationRules = {
  externalAccountToken: 'required'
};
exports.put = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let stripeSecretKey = event.stageVariables.StripeSecretKey;
  let stripeApiUrl = event.stageVariables.StripeApiUrl;
  let data = JSON.parse(event.body) || {};
  var validation = new Validator(data, validationRules);
  if (validation.fails()) {
    return http.response.ok(callback, validation.errors.all());
  }
  let managedAccount;
  getManagedAccount(bucket, userId)
    .then((account) => {
      managedAccount = account;
      return updateExternalAccountInfo(stripeApiUrl, stripeSecretKey, managedAccount.id, data);
    })
    .then(() => {
      return updateVerificationStatus(bucket, userId, stripeApiUrl, stripeSecretKey, managedAccount);
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
let updateExternalAccountInfo = (stripeApiUrl, stripeSecretKey, managedAccountId, data) => {
  return new Promise((resolve, reject) => {
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      form: {
        'external_account': data.externalAccountToken
      },
      json: true
    };
    request.post(`${stripeApiUrl}/accounts/${managedAccountId}/external_accounts`, options)
      .then((response) => {
        return resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
let updateVerificationStatus = (bucket, userId, stripeApiUrl, stripeSecretKey, managedAccount) => {
  return new Promise((resolve, reject) => {
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      json: true
    };
    request.get(`${stripeApiUrl}/accounts/${managedAccount.id}`, options)
      .then((response) => {
        let s3 = new aws.S3();
        managedAccount.verification = response.verification;
        s3.putObject({
          Bucket: bucket,
          Key: `users/${userId}/managed-account/data.json`,
          Body: JSON.stringify(managedAccount)
        }, (err, data) => {
          if (err) {
            return reject(err);
          } else {
            return resolve();
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
};
