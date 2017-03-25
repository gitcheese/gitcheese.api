'use strict';
const aws = require('aws-sdk');
exports.handler = (event, context, callback) => {
  let bucket = event.Records[0].s3.bucket.name;
  let repoKey = event.Records[0].s3.object.key
    .split('/')
    .slice(0, -3)
    .join('/');
  getAllDonations(bucket, `${repoKey}/donations`)
    .then((donations) => {
      return Promise.all([
        updateRepoData(bucket, repoKey, donations),
        updateDonationsList(bucket, `${repoKey}/donations`, donations)
      ]);
    })
    .catch((err) => {
      throw Error(err);
    });
};
let updateRepoData = (bucket, prefix, donations) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.getObject({
      Bucket: bucket,
      Key: `${prefix}/repo.json`
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        let repoData = JSON.parse(data.Body.toString());
        repoData.donatedAmount = donations.reduce((sum, donation) => {
          return sum + donation.amount;
        }, 0);
        s3.putObject({
          Bucket: bucket,
          Key: `${prefix}/repo.json`,
          Body: JSON.stringify(repoData)
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
};
let updateDonationsList = (bucket, prefix, donations) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.putObject({
      Bucket: bucket,
      Key: `${prefix}/list.json`,
      Body: JSON.stringify(donations)
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
let getAllDonations = (bucket, prefix) => {
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
          .filter(c => c.Key.endsWith('donation.json'))
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
          .then(donations => {
            resolve(donations);
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  });
};
