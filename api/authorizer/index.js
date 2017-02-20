var jwt = require('jsonwebtoken');
var aws = require('aws-sdk');
exports.handler = function(event, context, callback) {
    console.log('Client token: ' + event.authorizationToken);
    try {
        jwt.verify(event.authorizationToken, process.env.JWT_SECRET, (err, data) => {
            if (err) context.fail("Unauthorized");
            else {
                console.log(data);
                var userId = data.userId;
                var arn = event.methodArn.split(':');
                apiArn = arn[5].split('/');
                var response = {
                    principalId: userId,
                    policyDocument: {
                        "Version": "2012-10-17",
                        "Statement": [{
                            "Action": "execute-api:Invoke",
                            "Effect": "Allow",
                            "Resource": [
                                `arn:aws:execute-api:${arn[3]}:${arn[4]}:${apiArn[0]}/${apiArn[1]}/*/*`
                            ]
                        }]
                    }
                };
                response.context = {
                    userId: userId
                };
                callback(null, response);
            }
        });
    } catch (exception) {
        context.fail("Unauthorized");
    }
};
