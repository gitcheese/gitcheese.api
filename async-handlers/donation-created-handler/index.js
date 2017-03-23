'use strict';
// const aws = require('aws-sdk');
exports.handler = (event, context, callback) => {
  console.log(event.Records[0].s3);
  let bucket = event.Records[0].s3.bucket.name;
  let repoKey = event.Records[0].s3.object.key
    .split('/')
    .slice(0, -2)
    .join('/');
  console.log(bucket);
  console.log(repoKey);
};
