'use strict';
const request = require('request-promise-native');
const aws = require('aws-sdk');
const uuid = require('uuid/v4');
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
        let userId;
        request('https://api.github.com/user', githubOptions)
            .then((response) => {
                userId = response.id;
                return request('https://api.github.com/user/emails', githubOptions);
            })
            .then((response) => {
                let userEmail;
                if (response.length > 0)
                    userEmail = response.find((e) => e.primary).email;
                resolve({ id: userId, email: userEmail });
            });
    });
};
let userExists = (bucket, githubData) => {
    return new Promise((resolve, reject) => {
        let s3 = new aws.S3();
        s3.listObjectsV2({
            Bucket: bucket,
            Prefix: `github/users/${githubData.id}.json`
        }, (err, data) => {
            if (err)
                reject(err);
            else
                resolve({
                    exists: data.Contents.length > 0,
                    githubData: githubData
                });
        });
    });
};
let createUser = (bucket, githubData) => {
    return new Promise((resolve, reject) => {
        let s3 = new aws.S3();
        let newId = uuid();
        s3.putObject({
            Bucket: bucket,
            Key: `github/users/${githubData.id}.json`,
            Body: JSON.stringify({ id: newId })
        }, function(err, data) {
            if (err)
                reject(err);
            else {
                s3.putObject({
                    Bucket: bucket,
                    Key: `users/${newId}/profile.json`,
                    Body: JSON.stringify({ email: githubData.email })
                }, function(err, data) {
                    if (err)
                        reject(err);
                    else
                        resolve(newId);
                });
            }
        });
    });
};
let getExistingUserId = (bucket, githubId) => {
    return new Promise((resolve, reject) => {
        let s3 = new aws.S3();
        s3.getObject({
            Bucket: bucket,
            Key: `github/users/${githubId}.json`
        }, function(err, data) {
            if (err)
                reject(err);
            else {
                resolve(JSON.parse(data.Body.toString()).id);
            }
        });
    });
};
exports.get = (event, context, callback) => {
    let bucket = event.stageVariables.BucketName;
    request('https://github.com/login/oauth/access_token', {
            json: {
                client_id: event.stageVariables.GithubClientId,
                client_secret: event.stageVariables.GithubClientSecret,
                code: event.queryStringParameters.code
            }
        })
        .then((response) => {
            return getGithubData(response.access_token);
        })
        .then((githubData) => {
            return userExists(bucket, githubData);
        })
        .then((response) => {
            if (response.exists)
                return getExistingUserId(bucket, response.githubData.id);
            else
                return createUser(bucket, response.githubData);
        })
        .then((userId) => {
            let token = jwt.sign({ userId: userId }, event.stageVariables.JWTSecret);
            let url = `${event.stageVariables.RedirectUrl}?token=${token}`;
            callback(null, {
                "statusCode": 302,
                "headers": { "location": url }
            });
        })
        .catch(() => {
            callback('something went wrong :(');
        });
};
