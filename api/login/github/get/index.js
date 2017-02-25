'use strict';
exports.get = (event, context, callback) => {
  let url = 'https://github.com/login/oauth/authorize?';
  url += `client_id=${event.stageVariables.GithubClientId}`;
  url += '&scope=user:email';
  callback(null, {
    statusCode: 302,
    headers: { 'location': url }
  });
};
