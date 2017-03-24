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
      console.log(donations);
    })
    .catch((err) => {
      console.log(err);
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
        throw err;
      } else {
        let promises = data.Contents.map(c => {
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
