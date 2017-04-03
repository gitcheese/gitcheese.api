'use strict';
const aws = require('aws-sdk');
const jwt = require('jsonwebtoken');
const http = require('api-utils').http;
const request = require('request-promise-native');
exports.get = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let tokenRequest = {
    json: {
      client_id: event.stageVariables.GithubClientId,
      client_secret: event.stageVariables.GithubClientSecret,
      code: event.queryStringParameters.code
    }
  };
  request('https://github.com/login/oauth/access_token', tokenRequest)
    .then((response) => {
      return getGithubData(response.access_token);
    })
    .then((githubData) => {
      return userExists(bucket, githubData);
    })
    .then((response) => {
      if (response.exists) {
        return getExistingUser(bucket, response.githubData.id);
      } else {
        return createUser(bucket, response.githubData);
      }
    })
    .then((userProfile) => {
      let token = jwt.sign(userProfile, event.stageVariables.JWTSecret);
      let url = `${event.stageVariables.TokenCallbackUrl}?token=${token}`;
      return http.response.found(callback, url);
    })
    .catch((err) => {
      console.log(err);
      http.response.error(callback);
    });
};
let getGithubData = (token) => {
  return new Promise((resolve, reject) => {
    let githubOptions = {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'Gitcheese'
      },
      json: true
    };
    let githubUser;
    request('https://api.github.com/user', githubOptions)
      .then((resp) => {
        githubUser = resp;
        return request('https://api.github.com/user/emails', githubOptions);
      })
      .then((resp) => {
        let userEmail;
        if (resp.length > 0) {
          userEmail = resp.find((e) => e.primary).email;
        }
        resolve({ id: githubUser.id, login: githubUser.login, email: userEmail });
      });
  });
};
let userExists = (bucket, githubData) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.listObjectsV2({
      Bucket: bucket,
      Prefix: `users/${githubData.id}/profile.json`
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          exists: data.Contents.length > 0,
          githubData: githubData
        });
      }
    });
  });
};
let createUser = (bucket, githubData) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    let profile = {
      id: githubData.id,
      email: githubData.email,
      githubLogin: githubData.login
    };
    s3.putObject({
      Bucket: bucket,
      Key: `users/${githubData.id}/profile.json`,
      Body: JSON.stringify(profile)
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        sendWelcomeEmail(githubData.email);
        resolve(profile);
      }
    });
  });
};
let getExistingUser = (bucket, githubId) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.getObject({
      Bucket: bucket,
      Key: `users/${githubId}/profile.json`
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data.Body.toString()));
      }
    });
  });
};
let sendWelcomeEmail = (email) => {
  let ses = new aws.SES();
  let params = {
    Source: 'cat@gitcheese.com',
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: 'Welcome In Gitcheese!',
      Body: {
        Text: {
          Data: 'Welcome in gitcheese'
        }
      }
    }
  };
  ses.sendEmail(params, (err, data) => {
    if (err) {
      console.log('Error sending email');
      console.log(err);
    }
  });
};
