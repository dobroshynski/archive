const express = require('express');
const router = express.Router();
const request = require('request');
const lineReader = require('line-reader');
const Promise = require('bluebird');

require('dotenv').config();

const webhookUri = process.env.WEBHOOK_URI;
const responsesFileName = 'responses.txt';

const debug = true;

router.get('/', function(req,res) {
  res.sendStatus(200);
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function respondWithTextMessage(randomResponse, payload) {
  var headers = {
    'Content-type': 'application/json'
  };
  var dataString = '{"text":"' + randomResponse + '"}';
  var options = {
    url: webhookUri,
    method: 'POST',
    headers: headers,
    body: dataString
  };
  request(options);
}

function respondWithDislike(randomResponse, payload) {
  const options = {
    method: 'POST',
    uri: 'https://slack.com/api/reactions.add',
    form: {
      token: process.env.BOT_AUTH_TOKEN,
      name: "thumbsdown",
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
}

function respondWithAngryEmojiReact(randomResponse, payload) {
  const options = {
    method: 'POST',
    uri: 'https://slack.com/api/reactions.add',
    form: {
      token: process.env.BOT_AUTH_TOKEN,
      name: "angry",
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
}

function respondWithAngryReact(randomResponse, payload) {
  const options = {
    method: 'POST',
    uri: 'https://slack.com/api/reactions.add',
    form: {
      token: process.env.BOT_AUTH_TOKEN,
      name: process.env.EMOJI !== undefined ? process.env.EMOJI : "rage",
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
}

// webhook for Slack's Event Notifications
router.post('/events', function(req,res) {
  const payload = req.body;
  if (payload.type === 'url_verification') {
    res.send(payload.challenge);
  } else if (payload.type === 'event_callback' && payload.event.subtype !== "bot_message" && payload.event.user === process.env.MEANBOT_USER_ID) {

    var responses = [];
    var eachLine = Promise.promisify(lineReader.eachLine);

    eachLine(responsesFileName, function(line) {
      responses.push(line);
    }).then(function() {

      var randomIndex = getRandomInt(0, responses.length);
      var randomResponse = responses[randomIndex];

      if(randomResponse === "DISLIKE_KEY") {
        respondWithDislike(randomResponse, payload);
      } else if(randomResponse === "ANGRY_REACT_KEY") {
        respondWithAngryReact(randomResponse, payload);
      } else if(randomResponse === "ANGRY_EMOJI_REACT_KEY") {
        respondWithAngryEmojiReact(randomResponse, payload);
      } else {
        respondWithTextMessage(randomResponse.toLowerCase(), payload);
      }
      res.end();
    }).catch(function(err) {
      console.error(err);
      res.sendStatus(500);
    });
  }
});

module.exports = router;
