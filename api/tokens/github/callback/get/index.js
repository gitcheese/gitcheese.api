'use strict';
const request = require('request-promise-native');
const aws = require('aws-sdk');
const jwt = require('jsonwebtoken');
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
      .then((response) => {
        githubUser = response;
        return request('https://api.github.com/user/emails', githubOptions);
      })
      .then((response) => {
        let userEmail;
        if (response.length > 0) {
          userEmail = response.find((e) => e.primary).email;
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
      let url = `${event.stageVariables.RedirectUrl}?token=${token}`;
      return callback(null, {
        statusCode: 302,
        headers: { location: url }
      });
    })
    .catch((err) => {
      console.log(err);
      callback('something went wrong :(');
    });
};
