'use strict';
const aws = require('aws-sdk');
const http = require('api-utils').http;
const request = require('request-promise-native');
exports.put = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let sourceIp = event.requestContext.identity.sourceIp;
  let stripeSecretKey = event.stageVariables.StripeSecretKey;
  let stripeApiUrl = event.stageVariables.StripeApiUrl;
  let managedAccount;
  getManagedAccount(bucket, userId)
    .then((account) => {
      managedAccount = account;
      return updateTosInfo(stripeApiUrl, stripeSecretKey, managedAccount.id, sourceIp);
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
let updateTosInfo = (stripeApiUrl, stripeSecretKey, managedAccountId, sourceIp) => {
  return new Promise((resolve, reject) => {
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      form: {
        'tos_acceptance[ip]': sourceIp,
        'tos_acceptance[date': Math.floor(new Date().getTime() / 1000)
      },
      json: true
    };
    request.post(`${stripeApiUrl}/accounts/${managedAccountId}`, options)
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
            resolve();
          }
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
};
