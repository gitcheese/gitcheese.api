const aws = require('aws-sdk');
const fs = require('fs');
const handlebars = require('handlebars');

exports.Email = class Email {
  constructor(templateName) {
    this.templateName = templateName;
  }
  compile(data) {
    let source = fs.readFileSync(this.templateName + '.hbs', 'utf8');
    let template = handlebars.compile(source);
    this.body = template(data);
  }
  send(to, subject) {
    return new Promise((resolve, reject) => {
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
              Data: this.body
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
  }
};
