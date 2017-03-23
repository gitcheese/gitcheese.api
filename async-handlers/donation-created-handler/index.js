'use strict';
// const aws = require('aws-sdk');
exports.handler = (event, context, callback) => {
  console.log(event.Records[0].s3);
};
