const aws = require('aws-sdk');
const fs = require('fs');
const handlebars = require('handlebars');

exports.sendEmail = function(templateFilename, to, data) {
  return new Promise((resolve, reject) => {
    let source = fs.readFileSync(templateFilename, 'utf8');
    let template = handlebars.compile(source);
    let body = template(data);
    let subject = body.match('<title>(.*?)</title>')[1];
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
    ses.sendEmail(params, (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      resolve(data);
    });
  });
};
