/** @flow */
/* global gapi */

var API = require('./API');
var Dispatcher = require('./Dispatcher');

function list() {
  return API.wrap(() =>
    API.execute(gapi.client.gmail.users.labels.list({userId: 'me'}))
      .then(response => response.labels)
  );
}

module.exports = {
  list,
};
