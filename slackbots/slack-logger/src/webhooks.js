const express = require('express');
const router = express.Router();
const request = require('request');
const fs = require('fs');

require('dotenv').config();

var users = [];
var channels = [];

const debug = false;

router.get('/', function(req,res) {
  res.sendStatus(200);
});

// retrieve and store some data for quick access without making additional API calls
router.get('/data', function(req,res) {
  const options = {
    method: 'POST',
    uri: 'https://slack.com/api/users.list',
    form: {
      token: process.env.AUTH_TOKEN,
    },
    json: true,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  };
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = body.members;
      if(debug) {
        console.log("users:");
      }
      users = [];
      data.forEach(function(user) {
        if(debug) {
          console.log(user.id);
        }
        users[user.id] = user.real_name;
      });
    } else {
      console.log("error sending POST request");
    }
  });

  const channelsOptions = {
    method: 'POST',
    uri: '  https://slack.com/api/channels.list',
    form: {
      token: process.env.AUTH_TOKEN,
    },
    json: true,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  };
  request(channelsOptions, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = body.channels;
      if(debug) {
        console.log("channels:");
      }
      channels = [];
      data.forEach(function(channel) {
        if(debug) {
          console.log("#" + channel.name);
        }
        channels[channel.id] = channel.name;
      });
      res.send("successfully updated data");
    } else {
      console.log("error sending POST request");
    }
  });
});

// webhook for Slack's Event Notifications
router.post('/event', function(req,res) {
  const payload = req.body;
  if (payload.type === 'url_verification') {
    res.send(payload.challenge);
  } else if (payload.type === 'event_callback' && payload.event.subtype !== "bot_message") {

    console.log("got message in channel: " + payload.event.channel);
    console.log(payload.event);

    var userName = users[payload.event.user];
    var text = payload.event.text;
    var utcSeconds = payload.event.ts;
    var date = new Date(0);
    date.setUTCSeconds(utcSeconds);

    var dateString = date.toString();
    dateString = date.toLocaleString('en-US', { hour: 'numeric',minute:'numeric',second:'numeric', hour12: true });

    if(debug) {
      console.log("\nusername: " + userName);
      console.log("text: " + text);
      console.log("date: " + dateString);
    }

    var logString = "[" + dateString + "] " + userName + ": `" + text + "`";
    var separator = "";
    for(let i = 0; i < logString.length; i++) {
      separator += "-";
    }
    logString += "\n" + separator + "\n";

    var tokens = date.toString().split(' ');
    var concatDate = tokens[0] + ' ' + tokens[1] + ' ' + tokens[2] + ' ' + tokens[3];

    var logFileTitle = "Log | " + concatDate + " | Channel: #" + channels[payload.event.channel] + "\n\n";
    var todaysLogFileName = "log-" + (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear() + "-#" + channels[payload.event.channel];
    var todayFolderGroup = "logs-" + (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear();

    if(debug) {
      console.log("todays log file name: " + todaysLogFileName);
    }

    if(!fs.existsSync('slack-logs/' + todayFolderGroup)) {
      fs.mkdirSync('slack-logs/' + todayFolderGroup);
      if(!fs.existsSync('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName)) {
        fs.appendFile('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName, logFileTitle, {'flags': 'a+'}, function (err) {
          if (err) throw err;
          console.log('Saved Initial File!');
          fs.appendFile('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName, logString, {'flags': 'a+'}, function (err) {
            if (err) throw err;
            console.log('Saved!');
          });
        });
      } else {
        fs.appendFile('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName, logString, {'flags': 'a+'}, function (err) {
          if (err) throw err;
          console.log('Saved!');
        });
      }
    } else {
      if(!fs.existsSync('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName)) {
        fs.appendFile('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName, logFileTitle, {'flags': 'a+'}, function (err) {
          if (err) throw err;
          console.log('Saved Initial File!');
          fs.appendFile('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName, logString, {'flags': 'a+'}, function (err) {
            if (err) throw err;
            console.log('Saved!');
          });
        });
      } else {
        fs.appendFile('slack-logs/' + todayFolderGroup + '/' + todaysLogFileName, logString, {'flags': 'a+'}, function (err) {
          if (err) throw err;
          console.log('Saved!');
        });
      }
    }

    res.sendStatus(200);
  }
});

module.exports = router;
