'use strict';
const aws = require('aws-sdk');
const gcSES = require('gc-ses');
const gcS3 = require('gc-s3');

exports.handler = (event, context, callback) => {
  let bucket = event.Records[0].s3.bucket.name;
  let donationKey = event.Records[0].s3.object.key;
  let profileKey = donationKey.split('/')
    .slice(0, -5)
    .join('/')
    .concat('/profile.json');

  getDonations(bucket, donationKey)
    .then((donations) => Promise.all([
      updateRepoData(bucket, donationKey, donations),
      updateDonationsList(bucket, donationKey, donations)
    ]))
    .then(() => Promise.all([
      gcS3.getJSONObject({Bucket: bucket, Key: donationKey}),
      gcS3.getJSONObject({Bucket: bucket, Key: profileKey})
    ]))
    .then((donationAndProfile) => Promise.all([
      sendNewDonationEmail(donationAndProfile[0], donationAndProfile[1]),
      sendThanksForDonationEmail(donationAndProfile[0])
    ]))
    .catch((err) => {
      throw new Error(err);
    });
};

let updateRepoData = (bucket, donationKey, donations) => {
  let key = donationKey.split('/')
    .slice(0, -3)
    .join('/')
    .concat('/repo.json');

  return gcS3.getJSONObject({Bucket: bucket, Key: key})
    .then((repo) => {
      repo.donatedAmount = donations.reduce((sum, donation) => {
        return sum + donation.amount;
      }, 0);
      return gcS3.putJSONObject(repo, {
        Bucket: bucket,
        Key: key
      });
    });
};

let updateDonationsList = (bucket, donationKey, donations) => {
  let key = donationKey.split('/')
    .slice(0, -2)
    .join('/')
    .concat('/list.json');
  return gcS3.putJSONObject(donations, {Bucket: bucket, Key: key});
};

let getDonations = (bucket, donationKey) => {
  let prefix = donationKey.split('/')
    .slice(0, -2)
    .join('/');
  return gcS3.getJSONObjects({
    Bucket: bucket,
    Prefix: prefix,
    Postfix: 'donation.json'});
};

let sendNewDonationEmail = (donation, profile) => {
  console.log(donation);
  console.log(profile);
  return new Promise((resolve) => resolve());
};

let sendThanksForDonationEmail = (donation) => {
  console.log(donation);
  return new Promise((resolve) => resolve());
};
