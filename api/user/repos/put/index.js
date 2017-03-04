'use strict';
const request = require('request-promise-native');
const aws = require('aws-sdk');
let getOwnedRepositories = (githubLogin) => {
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
        orgRepos.forEach((org) => personal.push(...org));
        resolve(personal);
      })
      .catch(err => {
        reject(err);
      });
  });
};
let createRepository = (bucket, userId, githubRepo) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    let repo = {
      id: githubRepo.id,
      name: githubRepo.name,
      fullname: githubRepo.full_name,
      url: githubRepo.url
    };
    s3.putObject({
      Bucket: bucket,
      Key: `users/${userId}/repos/${repo.id}/data.json`,
      Body: JSON.stringify(repo)
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(repo);
      }
    });
  });
};
exports.put = (event, context, callback) => {
  let s3 = new aws.S3();
  let bucket = event.stageVariables.BucketName;
  let userId = event.requestContext.authorizer.principalId;
  let githubLogin = event.requestContext.authorizer.githubLogin;
  getOwnedRepositories(githubLogin)
    .then(repos => {
      s3.listObjectsV2({
        Bucket: bucket,
        Prefix: `users/${userId}/repos`
      }, (err, data) => {
        if (err) {
          console.log(err);
          return callback('There was an erro.');
        }
        let reposToAdd = repos.filter(r => {
          return !data.Contents
            .find(c => c.Key.indexOf(`users/${userId}/repos/${r.id}/`) > -1);
        });
        return Promise.all(reposToAdd.map(r => createRepository(bucket, userId, r)));
      });
    })
    .then(() => {
      return callback(null, { statusCode: 200 });
    })
    .catch(err => {
      console.log(err);
      return callback('There was an erro.');
    });
};
