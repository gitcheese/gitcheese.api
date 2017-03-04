'use strict';
const aws = require('aws-sdk');
const request = require('request-promise-native');
const Validator = require('validatorjs');
const validationRules = {
  externalAccountToken: 'required',
  legalEntityType: 'required',
  legalEntityFirstName: 'required',
  legalEntityLastName: 'required',
  legalEntityDobDay: 'required',
  legalEntityDobMonth: 'required',
  legalEntityDobYear: 'required',
  tosAcceptanceIp: 'required',
  tosAcceptanceDate: 'required'
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
  let managedAccount;
  getManagedAccount(bucket, userId)
    .then((account) => {
      managedAccount = account;
      return updateLegalEntityInfo(stripeApiUrl, stripeSecretKey, managedAccount.id, data);
    })
    .then(() => {
      return updateExternalAccountInfo(stripeApiUrl, stripeSecretKey, managedAccount.id, data);
    })
    .then(() => {
      return markVerificationAsCompleted(bucket, userId, managedAccount);
    })
    .catch((err) => {
      console.log(err);
      return callback('There was an error.');
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
let updateLegalEntityInfo = (stripeApiUrl, stripeSecretKey, managedAccountId, data) => {
  return new Promise((resolve, reject) => {
    let options = {
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      },
      form: {
        'legal_entity[type]': data.legalEntityType,
        'legal_entity[first_name]': data.legalEntityFirstName,
        'legal_entity[last_name]': data.legalEntityLastName,
        'legal_entity[dob][day]': data.legalEntityDobDay,
        'legal_entity[dob][month]': data.legalEntityDobMonth,
        'legal_entity[dob][year]': data.legalEntityDobYear,
        'tos_acceptance[ip]': data.tosAcceptanceIp,
        'tos_acceptance[date': data.tosAcceptanceDate
      }
    };
    request.post(`${stripeApiUrl}/accounts/${managedAccountId}`, options)
      .then((response) => {
        if (response.status === 'succeeded') {
          return resolve(response);
        }
        return reject(response);
      })
      .catch((err) => {
        reject(err);
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
      }
    };
    request.post(`${stripeApiUrl}/accounts/${managedAccountId}/external_accounts`, options)
      .then((response) => {
        if (response.status === 'succeeded') {
          return resolve(response);
        }
        return reject(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
let markVerificationAsCompleted = (bucket, userId, managedAccount) => {
  return new Promise((resolve, reject) => {
    managedAccount.stage1VerificationCompleted = true;
    let s3 = new aws.S3();
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
  });
};
