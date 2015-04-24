var seetru = require('./../lib/index')({
  app: 'Users',
  service: 1
});

var express = require('express');
var superagent = require('superagent');

var app = express();

var getNamespace = require('continuation-local-storage').getNamespace;

app.get('/', function (req, res) {

  superagent
    .get('http://localhost:1481')
    .end(function(err, response) {

      seetru.report({
        status: 'aaaaaaaaaaaaaaaaaaaa',
        data: 'eee'
      });

      superagent
        .get('http://risingstack.com')
        .end(function(err, response) {
          seetru.report({
            status: 'bbbbbbbbbbbbbbb',
            data: 'eee'
          });
          res.json({});
        });

    });

});


app.get('/alma', function (req, res) {
  var latency = Math.floor(Math.random() * 80) + 20;

  setTimeout(function () {
    res.json({status: ok});
  }, latency);
});

var server = app.listen(3000, function (err) {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Express app listening at http://%s:%s', host, port)
});
