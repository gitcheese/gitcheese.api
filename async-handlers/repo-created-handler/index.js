'use strict';
const aws = require('aws-sdk');
exports.handler = (event, context, callback) => {
  let bucket = event.Records[0].s3.bucket.name;
  let reposKey = event.Records[0].s3.object.key
    .split('/')
    .slice(0, -2)
    .join('/');
  getAllRepos(bucket, reposKey)
    .then((repos) => {
      return updateReposList(bucket, reposKey, repos);
    })
    .catch((err) => {
      throw Error(err);
    });
};
let updateReposList = (bucket, prefix, repos) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.putObject({
      Bucket: bucket,
      Key: `${prefix}/list.json`,
      Body: JSON.stringify(repos)
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
let getAllRepos = (bucket, prefix) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        let promises = data.Contents
          .filter(c => c.Key.endsWith('repo.json'))
          .map(c => {
            return new Promise((resolve, reject) => {
              s3.getObject({
                Bucket: bucket,
                Key: c.Key
              }, (err, data) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(JSON.parse(data.Body.toString()));
                }
              });
            });
          });
        Promise.all(promises)
          .then(repos => {
            resolve(repos);
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  });
};
