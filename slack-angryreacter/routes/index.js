const express = require('express');
const router = express.Router();
const request = require('request');

var webhookUri = process.env.WEBHOOK_URI;

const debug = false;

router.get('/', function(req,res) {
  res.sendStatus(200);
});

// retrieve user list
router.get('/user-list', function(req,res) {
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
    if (!error && response.statusCode == 200) {
      console.log(body);
      res.send(body.members);
    } else {
      console.log("error sending POST request");
    }
  });
});

// route handler for Slack's Event Notifications sent as POST requests
router.post('/events', function(req,res) {
  if(debug) {
    console.log("ENDPOINT HIT");
  }
  const payload = req.body;

  if (payload.type === 'url_verification') {
    res.send(payload.challenge);
  } else if (payload.type === 'event_callback' && payload.event.subtype !== "bot_message" && payload.event.user === process.env.ANGRY_REACTER_USER_ID) {

    const options = {
      method: 'POST',
      uri: 'https://slack.com/api/reactions.add',
      form: {
        token: process.env.BOT_AUTH_TOKEN,
        name: process.env.REACTION_EMOJI_NAME !== undefined ? process.env.REACTION_EMOJI_NAME : "rage", // "fb_angry" or default
        channel: payload.event.channel,
        timestamp: payload.event.ts,
        as_user: true
      },
      json: true,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    };

    request(options);

    if(debug) {
      console.log("responded to message posted in channel by some user");
      console.log(req.body.event);
    }
    res.end();
  }
});

// sends a test message to a particular hook
router.get('/slack-test', function(req, res, next) {
  var headers = {
    'Content-type': 'application/json'
  };
  var dataString = '{"text":"Test"}';
  var options = {
    url: webhookUri,
    method: 'POST',
    headers: headers,
    body: dataString
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
      res.sendStatus(200);
    } else {
      console.log("error sending POST request");
    }
  });
});

module.exports = router;
