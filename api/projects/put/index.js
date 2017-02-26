'use strict';
const request = require('request-promise-native');
const aws = require('aws-sdk');
const uuid = require('uuid/v4');
let getOwnedRepositories = githubLogin => {
  let githubRequest = {
    headers: {
      'User-Agent': 'Gitcheese'
    },
    json: true
  };
  return new Promise((resolve, reject) => {
    let personal;
    request(`https://api.github.com/users/${githubLogin}/repos`, githubRequest)
      .then(response => {
        personal = response.filter((repo) => !repo.fork);
        return request(`https://api.github.com/users/${githubLogin}/orgs`, githubRequest);
      })
      .then(organizations => {
        let orgRepos = organizations.map((org) => request(`https://api.github.com/orgs/${org.login}/repos`, githubRequest));
        return Promise.all(orgRepos);
      })
      .then(orgRepos => {
        let allOrgRepos = ...orgRepos;
        resolve(personal.push(...allOrgRepos));
      })
      .catch(err => {
        reject(err);
      });
  });
};
let createRepository = (bucket, userId, githubUserId, repo) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    let newId = uuid();
    s3.putObject({
      Bucket: bucket,
      Key: `github/users/${githubUserId}/repos/${repo.id}/map.json`,
      Body: JSON.stringify({ id: newId })
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        let project = {
          id: newId,
          githubId: repo.id,
          name: repo.name,
          fullname: repo.full_name,
          url: repo.url
        };
        s3.putObject({
          Bucket: bucket,
          Key: `users/${userId}/repos/${newId}/data.json`,
          Body: JSON.stringify(project)
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(project);
          }
        });
      }
    });
  });
};
exports.put = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let githubLogin = event.requestContext.authorizer.githubLogin;
  let githubId = event.requestContext.authorizer.githubId;
  getOwnedRepositories(githubLogin)
    .then(repos => {
      s3.listObjectsV2({
        Bucket: bucket,
        Prefix: `github/users/${githubId}/repos`
      }, (err, data) => {
        if (err) {
          console.log(err);
          callback('There was an erro.');
          return;
        }
        let reposToAdd = repos.filter(r => {
          return !data.Contents
            .find(c => c.Key.indexOf(`github/users/${githubId}/repos/${r.id}/`) > -1);
        });
        return Promise.all(reposToAdd.map(r => createRepository(bucket, userId, githubId, r)));
      });
    })
    .then(() => {
      callback(null, {
        statusCode: 200
      });
    })
    .catch(err => {
      console.log(err);
      callback('There was an erro.');
    });
};
