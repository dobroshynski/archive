var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');

var webhooks = require('./src/webhooks');

var app = express();

var testing = false;
if(testing) {
  var ngrok = require('ngrok');

  ngrok.connect(3000, function (err, url) {
    console.log('connected on: ' + url);

    request(url + '/data', function (error, response, body) {
      console.log('status on data load from server:', response && response.statusCode); // Print the response status code if a response was received
      console.log(body);
    });
  });
} else {
  request(process.env.DEPLOYED_URL + '/data', function (error, response, body) {
    console.log('status on data load from server:', response && response.statusCode); // Print the response status code if a response was received
    console.log(body);
  });
}

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', webhooks);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // send the error status
  res.sendStatus(err.status || 500);
});

module.exports = app;
