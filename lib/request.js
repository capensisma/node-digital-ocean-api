var request = require('request');

module.exports = function(query, callback) {
  request({
    uri: query.uri,
    method: query.method,
    headers: query.headers,
    body: JSON.stringify(query.body),
  }, function(err, res) {
    if (err)
      return callback(err);
    try {
      res.body = JSON.parse(res.body);
    } catch(err) {
      res.body = {};
    }

    var obj = {
      headers: res.headers,
      body: res.body,
      status: res.statusCode,
    };
    callback(null, obj);
  });

};
