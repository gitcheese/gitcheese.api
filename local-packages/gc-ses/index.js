const aws = require('aws-sdk');
const fs = require('fs');
const handlebars = require('handlebars');

exports.sendEmail = function(templateFilename, to, subject, data) {
  return new Promise((resolve, reject) => {
    console.log('starting sendEmail');
    let source = fs.readFileSync(templateFilename, 'utf8');
    let template = handlebars.compile(source);
    let body = template(data);
    let ses = new aws.SES();
    let params = {
      Source: 'cat@gitcheese.com',
      Destination: {
        ToAddresses: [to]
      },
      Message: {
        Subject: {
          Data: subject
        },
        Body: {
          Html: {
            Data: body
          }
        }
      }
    };
    console.log('sending email with params');
    console.log(params);
    ses.sendEmail(params, (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(data);
    });
  });
};
