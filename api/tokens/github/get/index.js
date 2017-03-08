'use strict';
const http = require('api-utils').http;
exports.get = (event, context, callback) => {
  let url = 'https://github.com/login/oauth/authorize?';
  url += `client_id=${event.stageVariables.GithubClientId}`;
  url += '&scope=user:email';
  return http.response.found(callback, url);
};
