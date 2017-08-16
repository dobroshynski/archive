const express = require('express');
const router = express.Router();
const request = require('request');
const lineReader = require('line-reader');
const Promise = require('bluebird');

var webhookUri = process.env.WEBHOOK_URI;
var responsesFileName = 'responses.txt';

const debug = false;

router.get('/', function(req,res) {
  res.sendStatus(200);
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

router.get('/random-response', function(req,res) {
  var responses = [];
  var eachLine = Promise.promisify(lineReader.eachLine);

  eachLine(responsesFileName, function(line) {
    responses.push(line);
  }).then(function() {
    console.log('done.');
    console.log('responses:');
    console.log(responses);

    var randomIndex = getRandomInt(0, responses.length);
    var randomResponse = responses[randomIndex];

    console.log('random index: ' + randomIndex);
    console.log('random response: ' + randomResponse);

    res.sendStatus(200);
  }).catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
});

// sends a test message to hook specified by WEBHOOK_URI
router.get('/test-webhook', function(req, res) {
  var headers = {
    'Content-type': 'application/json'
  };
  var dataString = '{"text":"Slack webhook test"}';
  var options = {
    url: webhookUri,
    method: 'POST',
    headers: headers,
    body: dataString
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.sendStatus(200);
    } else {
      console.log("error sending POST request to Slack API");
      res.sendStatus(500);
    }
  });
});

module.exports = router;
