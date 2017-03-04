const jwt = require('jsonwebtoken');
exports.handler = (event, context, callback) => {
  console.log('Client token: ' + event.authorizationToken);
  try {
    jwt.verify(event.authorizationToken, process.env.JWT_SECRET, (err, data) => {
      if (err) context.fail('Unauthorized');
      else {
        let arn = event.methodArn.split(':');
        let apiArn = arn[5].split('/');
        let response = {
          principalId: data.id,
          policyDocument: {
            Version: '2012-10-17',
            Statement: [{
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: [
                `arn:aws:execute-api:${arn[3]}:${arn[4]}:${apiArn[0]}/${apiArn[1]}/*/*`
              ]
            }]
          }
        };
        response.context = {
          githubLogin: data.githubLogin
        };
        return callback(null, response);
      }
    });
  } catch (exception) {
    context.fail('Unauthorized');
  }
};
