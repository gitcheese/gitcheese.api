'use strict';
const aws = require('aws-sdk');
const gcSES = require('gc-ses');

exports.handler = (event, context, callback) => {
  let bucket = event.Records[0].s3.bucket.name;
  let profileKey = event.Records[0].s3.object.key;

  getProfile(bucket, profileKey)
    .then((profile) => {
      return gcSES.sendEmail('welcome.hbs', profile.email, 'Welcome In Gitcheese!', {});
    })
    .then((result) => {
      console.log('email sent');
      console.log(result);
    })
    .catch((err) => {
      throw new Error(err);
    });
};
let getProfile = (bucket, key) => {
  console.log('getting profile');
  console.log(key);
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.getObject({
      Bucket: bucket,
      Prefix: key
    }, (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log(data);
        resolve(JSON.parse(data.Body.toString()));
      }
    });
  });
};
