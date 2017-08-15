const express = require('express');
const router = express.Router();
const request = require('request');

var webhookUri = process.env.WEBHOOK_URI;

const debug = false;

router.get('/', function(req,res) {
  res.sendStatus(200);
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
