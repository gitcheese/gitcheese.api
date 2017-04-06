'use strict';
const aws = require('aws-sdk');
const gcSES = require('gc-ses');

exports.handler = (event, context, callback) => {
  let bucket = event.Records[0].s3.bucket.name;
  let profileKey = event.Records[0].s3.object.key;

  getProfile(bucket, profileKey)
    .then((profile) => {
      return gcSES.sendEmail('welcome.hbs', profile.email);
    })
    .catch((err) => {
      throw new Error(err);
    });
};
let getProfile = (bucket, key) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.getObject({
      Bucket: bucket,
      Key: key
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data.Body.toString()));
      }
    });
  });
};
