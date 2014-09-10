var express = require('express');
var jt = require('./jasontree-middleware.js');
var bodyParser = require('body-parser');

var app = express();

var sampleData = {
  users: {
    bobby: {
      firstName: 'Bob',
      lastName: 'Smith',
      friends: ['Alice', 'John']
    }
  }
};

app.use(bodyParser.json());
app.use('/jasontree', jt(sampleData));

var server = app.listen(3003, function() {
  console.log('Simple JasonTree HTTP server at http://localhost:' + server.address().port + '/tree/');
});

