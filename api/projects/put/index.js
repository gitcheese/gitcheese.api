'use strict';
const request = require('request-promise-native');
const aws = require('aws-sdk');
const uuid = require('uuid/v4');
let getOwnedRepositories = githubLogin => {
    return new Promise((resolve, reject) => {
        let personal;
        let organizational;
        request(`https://api.github.com/users/${githubLogin}/repos`, {
                headers: {
                    'User-Agent': 'Gitcheese'
                },
                json: true
            })
            .then(response => {
                personal = response.filter((repo) => !repo.fork);
                return request(`https://api.github.com/users/${githubLogin}/orgs`, {
                    headers: {
                        'User-Agent': 'Gitcheese'
                    },
                    json: true
                });
            })
            .then(organizations => {
                let orgRepos = organizations.map((org) => request(`https://api.github.com/orgs/${org.login}/repos`, {
                    headers: {
                        'User-Agent': 'Gitcheese'
                    },
                    json: true
                }));
                return Promise.all(orgRepos);
            })
            .then(orgRepos => {
                orgRepos = orgRepos.reduce((a, b) => {
                    Array.prototype.push.apply(b, a);
                });
                console.log(orgRepos)
                Array.prototype.push.apply(personal, orgRepos);
                resolve(personal);
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
        }, function(err, data) {
            if (err)
                reject(err);
            else {
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
                }, function(err, data) {
                    if (err)
                        reject(err);
                    else
                        resolve(project);
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
                    callback(err);
                    return;
                }
                console.log(data)
                let reposToAdd = repos.filter(r => {
                    console.log(`github/users/${githubId}/repos/${r.id}`)
                    return !data.Contents
                        .find(c => c.Key.indexOf(`github/users/${githubId}/repos/${r.id}/`) > -1);
                });
                console.log(reposToAdd);
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
