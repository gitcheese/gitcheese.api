const aws = require('aws-sdk');

let getJSONObject = function(options) {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.getObject(options, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data.Body.toString()));
      }
    });
  });
};

let getJSONObjects = function(options) {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    s3.listObjectsV2({
      Bucket: options.Bucket,
      Prefix: options.Prefix
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        let promises = data.Contents
          .filter(c => c.Key.endsWith(options.Postfix))
          .map(c => getJSONObject({Bucket: options.Bucket, Key: c.Key}));

        Promise.all(promises)
          .then(allObjects => resolve(allObjects))
          .catch((err) => reject(err));
      }
    });
  });
};

let putJSONObject = (object, options) => {
  return new Promise((resolve, reject) => {
    let s3 = new aws.S3();
    options.Body = JSON.stringify(object);
    s3.putObject(options, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

exports = {
  getJSONObject: getJSONObject,
  getJSONObjects: getJSONObjects,
  putJSONObject: putJSONObject
};
