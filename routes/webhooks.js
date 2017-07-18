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

function cleanupEvents(events) {
  var didSeeUpdateEvent = false;
  var didSeeCreateEvent = false;
  var didSeeDeleteEvent = false;
  var filtered = [];
  events.forEach(function(evnt) {
    var type = evnt.action;
    if(type === 'changed' && !didSeeUpdateEvent) {
      didSeeUpdateEvent = true;
      filtered.push(evnt);
    } else if(type === 'added' && !didSeeCreateEvent) {
      didSeeCreateEvent = true;
      filtered.push(evnt);
    } else if(type === 'deleted' && !didSeeDeleteEvent) {
      didSeeDeleteEvent = true;
      filtered.push(evnt);
    }
  });

  events.forEach(function(evnt) {
    if(evnt.action === 'deleted') {
      var ret = [];
      ret.push(evnt);
      filtered = ret;
    }
  });
  return filtered;
}

router.post('/interactive-messages-endpoint', function(req,res) {
  console.log("Slack Interactive Messages endpoint hit");
  console.log(req.body);
});

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

    // first fetch a list of users
    const options = {
      method: 'POST',
      uri: 'https://slack.com/api/users.list',
      form: {
        token: process.env.USER_LIST_TOKEN,
      },
      json: true,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    };
    request(options, function (error, response, body) {
      // console.log(body.members);
      console.log(typeof body.members);
      var users = body.members;
      var currentUser = {};
      var currentUserID = process.env.CURRENT_USER_ID;
      users.forEach(function(user){
        if(user.id === currentUserID) {
          currentUser = user;
          console.log("current user is: " + user.profile.first_name + " " + user.profile.last_name);
        }
      });

      var events = cleanupEvents(req.body.events);

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
          request(options, function(error, response, body) {
            var dataObj = JSON.parse(body);
            var headerText = "Asana:";
            if(event.action === 'changed') {
              console.log("An Asana task assigned to " + dataObj.data.name + " has been changed.");

              var link = "https://app.asana.com/0/" + myTasksID + "/" + event.resource;
              var jsonMessage = [{
                "text": "A task assigned to you has been changed. <" + link + "|View Task>",
                "fallback": "Asana Bot cannot be loaded",
                "color": "#10579d",
                "attachment_type": "default"
              }];

              const options = {
                method: 'POST',
                uri: 'https://slack.com/api/chat.postMessage',
                form: {
                  token: process.env.BOT_AUTH_TOKEN,
                  text: headerText,
                  attachments: JSON.stringify(jsonMessage),
                  channel: currentUser.id, // set this to ID of person receiving the message
                  as_user: true
                },
                headers: {
                  'content-type': 'application/x-www-form-urlencoded'
                }
              };

              request(options);
            } else if(event.action === 'added') {
                console.log("A new Asana task has been added and assigned to " + dataObj.data.name + ".");

                var link = "https://app.asana.com/0/" + myTasksID + "/" + event.resource;
                var jsonMessage = [{
                  "text": "A new task has been added and assigned to you. <" + link + "|View Task>",
                  "fallback": "Asana Bot cannot be loaded",
                  "color": "#10579d",
                  "attachment_type": "default"
                }];

                const options = {
                  method: 'POST',
                  uri: 'https://slack.com/api/chat.postMessage',
                  form: {
                    token: process.env.BOT_AUTH_TOKEN,
                    text: headerText,
                    attachments: JSON.stringify(jsonMessage),
                    channel: currentUser.id, // set this to ID of person receiving the message
                    as_user: true
                  },
                  json: true,
                  headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                  }
                };

                request(options);
            } else if(event.action === 'deleted') {
                console.log("An Asana task assigned to " + dataObj.data.name + " has been deleted.");

                var link = "https://app.asana.com/0/" + myTasksID + "/" + event.resource;
                var jsonMessage = [{
                  "text": "A task assigned to you has been deleted. <" + link + "|View Task>",
                  "fallback": "Asana Bot cannot be loaded",
                  "color": "#10579d",
                  "attachment_type": "default"
                }];

                const options = {
                  method: 'POST',
                  uri: 'https://slack.com/api/chat.postMessage',
                  form: {
                    token: process.env.BOT_AUTH_TOKEN,
                    text: headerText,
                    attachments: JSON.stringify(jsonMessage),
                    channel: currentUser.id, // set this to ID of person receiving the message
                    as_user: true
                  },
                  json: true,
                  headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                  }
                };

                request(options);
            }
          });
        }
      });
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
