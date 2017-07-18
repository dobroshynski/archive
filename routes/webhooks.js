var express = require('express');
var router = express.Router();

// load and read the config file
const fs = require('fs');
const path = require('path');
const configFn = path.join(__dirname, '../config.json');
const data = fs.readFileSync(configFn);
const configurations = JSON.parse(data);

const request = require('request');
const asanaAccessToken = configurations.asanaAccessToken;
const asanaBotID = configurations.asanaBotID;
const newBotID = configurations.newBotID;
const projectID = configurations.projectID;
const myTasksID = configurations.myTasksID;

const webhookUri = process.env.WEBHOOK_URI;


var tunnelUrl = '';

var testing = true;
if(testing) {
  var ngrok = require('ngrok');

  ngrok.connect(3000, function (err, url) {
    console.log('connected on: ' + url);
    tunnelUrl = url;
  });
}

// route handler for Slack's Event Notifications sent as POST requests to verify endpoint
router.post('/events-auth', function(req,res) {
  if(debug) {
    console.log("ENDPOINT HIT");
  }
  const payload = req.body;

  if (payload.type === 'url_verification') {
    res.send(payload.challenge);
  }
});

router.get('/', function(req,res) {
  res.sendStatus(200);
});

function createResponse(authHeader) {
  return `HTTP/1.1 200 OK
  Content-Type: application/json
  X-Hook-Secret: ${authHeader}
  `;
}

router.post('/asana-webhook', function(req,res) {
  console.log("ASANA AUTH WEBHOOK HIT");
  var hookAuthHeader = req.get("X-Hook-Secret");
  console.log(hookAuthHeader);
  if(hookAuthHeader) {
    console.log("writing header");
    var response = createResponse(hookAuthHeader);
    console.log(response);
    res.setHeader('Content-Type', 'text');
    res.setHeader('X-Hook-Secret', hookAuthHeader);
    res.sendStatus(200);
    res.end();
  } else {
    var signatureHeader = req.get("X-Hook-Signature");
    if(signatureHeader){
      console.log('got signature header');
      console.log(signatureHeader);
      console.log(req.body);
    }
    var events = req.body.events;

    events.forEach(function(event){
      if(event.type === 'task' && event.user) {
        var userID = event.user;
        var headers = {
          'Authorization': 'Bearer ' + asanaAccessToken,
          'content-type': 'application/x-www-form-urlencoded'
        };
        var options = {
          url: 'https://app.asana.com/api/1.0/users/' + userID,
          headers: headers
        };

        if(event.action === 'changed') {
          // a task assigned to the user has been changed
          request(options, function(error, response, body) {
            var dataObj = JSON.parse(body);
            console.log("A task assigned to " + dataObj.data.name + " has been changed.");
          });
        } else if(event.action === 'added') {
          // a task has been added and assigned to the user
          request(options, function(error, response, body) {
            var dataObj = JSON.parse(body);
            console.log("A new task has been added and assigned to " + dataObj.data.name + ".");
          });
        } else if(event.action === 'deleted') {
          // a task assined to the user has been deleted
          request(options, function(error, response, body) {
            var dataObj = JSON.parse(body);
            console.log("A task assigned to " + dataObj.data.name + " has been deleted.");
          });
        }
      }
    });
    res.end();
  }
});

function callback(error, response, body) {
  if (!error && response.statusCode == 201) {
    console.log("Successfully Authorized Asana Webhooks");
    console.log(body);
  } else {
    console.log('error');
    console.log(body);
  }
}

router.get('/test', function(req, res, next) {
  var headers = {
    'Authorization': 'Bearer ' + asanaAccessToken,
    'content-type': 'application/x-www-form-urlencoded'
  };
  var urlToTestHook = tunnelUrl + '/asana-webhook';
  var dataString = 'resource=' + myTasksID + '&target=' + urlToTestHook;
  console.log(urlToTestHook);

  var options = {
    url: 'https://app.asana.com/api/1.0/webhooks',
    method: 'POST',
    headers: headers,
    body: dataString
  };

  request(options, callback);
  res.send('Successfully authenticated with Asana API');
});

module.exports = router;
