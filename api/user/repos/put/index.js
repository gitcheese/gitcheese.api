'use strict';
const aws = require('aws-sdk');
const request = require('request-promise-native');
const http = require('api-utils').http;
exports.put = (event, context, callback) => {
  let bucket = event.stageVariables.BucketName;
  let clientId = event.stageVariables.GithubClientId;
  let clientSecret = event.stageVariables.GithubClientSecret;
  let userId = event.requestContext.authorizer.principalId;
  let githubLogin = event.requestContext.authorizer.githubLogin;

  getOwnedRepositories(githubLogin, clientId, clientSecret)
    .then((ownedRepos) => {
      return createMissingRepos(bucket, userId, ownedRepos);
    })
    .then((newRepos) => {
      return http.response.ok(callback, newRepos || []);
    })
    .catch(err => {
      console.log(err);
      return http.response.error(callback);
    });
};
let getOwnedRepositories = (githubLogin, clientId, clientSecret) => {
  let githubRequest = {
    headers: {
      'User-Agent': 'Gitcheese'
    },
    json: true
  };
  return new Promise((resolve, reject) => {
    let personal;
    getAllPages(`https://api.github.com/users/${githubLogin}/repos`, clientId, clientSecret, githubRequest)
      .then(response => {
        personal = response.filter((repo) => !repo.fork);
        return request(`https://api.github.com/users/${githubLogin}/orgs`, githubRequest);
      })
      .then(organizations => {
        let orgRepos = organizations.map((org) => getAllPages(`https://api.github.com/orgs/${org.login}/repos`, clientId, clientSecret, githubRequest));
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
      Key: `users/${userId}/repos/${repo.id}/repo.json`,
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
let createMissingRepos = (bucket, userId, ownedRepos) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.listObjectsV2({
      Bucket: bucket,
      Prefix: `users/${userId}/repos`
    }, (err, data) => {
      if (err) {
        return reject(err);
      }
      let promises = ownedRepos
        .filter(r => !data.Contents.find(c => c.Key.indexOf(`users/${userId}/repos/${r.id}/`) > -1))
        .map(r => createRepository(bucket, userId, r));
      Promise.all(promises)
        .then((newRepos) => resolve(newRepos));
    });
  });
};

let getAllPages = (url, clientId, clientSecret, githubRequest) => {
  let clientQueryParams = `client_id=${clientId}&client_secret=${clientSecret}`;
  return new Promise((resolve, reject) => {
    let recursive = (page, result) => {
      return request(`${url}?page=${page}&per_page=100&${clientQueryParams}`, githubRequest)
        .then((response) => {
          if (response.length > 0) {
            return recursive(++page, [...result, ...response]);
          } else {
            resolve(result);
          }
        });
    };
    return recursive(1, []);
  });
};
