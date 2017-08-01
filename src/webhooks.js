var express = require('express');
var router = express.Router();
var path = require('path');

var AWS = require('aws-sdk');
const fs = require('fs');

const request = require('request');

// global variables to track some basic state for testing
var inProgressOfGenerating = false;
var blurbsReceived = 0;
var blurbsToGoInMeme = [];
var idUser;

router.get('/', function(req, res, next) {
  res.sendStatus(200);
});

router.post('/handle/image/data', function(req, res) {
  console.log("got buffered data on server side");

  var body = req.body;
  var base64Data = req.body.data.replace(/^data:image\/png;base64,/, "");

  var fileName = "/app/web/generated/messenger-memegenerator-" + Date.now() + ".png";
  var AWSfileName = fileName.substring(19);
  console.log("AWS file name: " + AWSfileName);

  fs.writeFile(fileName, base64Data, 'base64', function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("wrote file to disk successfully!");

      AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY });

      fs.readFile(fileName, function (err, data) {
        if (err) { throw err; }

        var s3 = new AWS.S3();
        s3.putObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: AWSfileName,
          ContentType: 'image/jpeg',
          Body: data
        }, function(err, response) {
          if(err) {
            throw err;
          } else {
            console.log('Successfully uploaded file to AWS.');
            var fileURLonAWS = 'https://s3.amazonaws.com/' + process.env.AWS_BUCKET_NAME + '/' + AWSfileName;
            console.log("stored on AWS at: " + fileURLonAWS);

            // delete the file from local folder
            fs.unlink(fileName, (err) => {
              if (err) throw err;
              console.log('successfully deleted ' + fileName + ' from local storage');

              // respond back with data
              sendMemeBackToUserAndReset(fileURLonAWS, idUser);
            });
          }
        });
      });
    }
  });
});

router.get('/get/data', function(req,res) {
  var obj = {list: blurbsToGoInMeme};
  var JSONobj = JSON.stringify(obj);
  res.send(JSONobj);
});

// this endpoint gets called by the phantomjs page.open;
router.get('/generate/meme', function(req, res) {
  console.log("redirected from phantomjs...");
  res.sendFile(path.join(__dirname, '../web', 'meme-generate.html'));
});

// authenticate FB messenger webooks
router.get('/messenger-webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.FB_VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

// listen for messages
router.post('/messenger-webhook', function(req, res) {
  console.log("webhook POST hit");
  console.log(req.payload)
  var data = req.body;

  if(data.object === 'page') {
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      entry.messaging.forEach(function(event) {
        if(event.message) {
          if(event.message.quick_reply) {
            receivedQuickReplyMessage(event);
          } else {
            receivedMessage(event);
          }
        } else if(event.postback) {
          console.log("received postback");
          console.log("payload:");
          var payload = event.postback.payload;
          console.log(payload);

          if(payload === "GET_MEME_GENERATION_STARTED_PAYLOAD") {
            // send a welcome message
            sendWelcomeMessage(event.sender.id);
          } else if(payload === "EXPANDING_BRAIN_MEME_PAYLOAD") {
            // set the meme chosen to be Expanding Brain Meme
            console.log("user picked to generate an expanding brain meme");
            sendMemeConfirmMessage(event.sender.id, "EXPANDING_BRAIN_MEME");
          }
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });
    res.sendStatus(200);
  }
});

// send the generated meme to the user and reset the state
function sendMemeBackToUserAndReset(fileURL, senderID) {
  // reset state
  inProgressOfGenerating = false;
  blurbsReceived = 0;
  blurbsToGoInMeme = [];

  sendMeme(fileURL, senderID);
}

function sendMeme(fileURL, recipientId) {
  console.log("sending meme back...");
  var messageText = "Here is your meme!";
  var textData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment:{
        type:"image",
        payload:{
          url:fileURL
        }
      }
    }
  };
  sendAPICall(textData, messageData); // sending message first and attachment after
}

function sendMemeConfirmMessage(recipientId, memeType) {
  if(memeType === "EXPANDING_BRAIN_MEME" && !inProgressOfGenerating) {
    inProgressOfGenerating = true;
    var messageText = "Cool, you've picked the Expanding Brain Meme template";
    var followUpMessage = "Please message the 1/4 blurb of text for your meme";
    console.log("sending confirm message...");
    sendTextMessage(recipientId, messageText, followUpMessage);
  }
}

function sendWelcomeMessage(recipientId) {
  var messageText = "Welcome! Please choose a type of meme you would like to generate from the in-chat menu";
  console.log("sending welcome message...");
  sendWelcomeTextMessage(recipientId, messageText);
}

function sendWelcomeTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies:[
            {
              content_type:"text",
              title:"Expanding Brain Meme",
              payload:"EXPANDING_BRAIN_MEME_QUICK_REPLY_PAYLOAD"
            }
          ]
    }
  };
  sendAPICall(messageData);
}

function sendTextMessage(recipientId, messageText, followUpMessage) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };
  if(followUpMessage) {
    var followUpMessageData = {
      recipient: {
        id: recipientId
      },
      message: {
        text: followUpMessage
      }
    };
    sendAPICall(messageData, followUpMessageData);
  } else {
    sendAPICall(messageData);
  }
}

function sendAPICall(messageData, followUpMessageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function(error, response, body) {
    if(!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);

      if(followUpMessageData) {
        sendAPICall(followUpMessageData);
      }
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

function receivedQuickReplyMessage(evnt) {
  var quickReply = evnt.message.quick_reply;
  console.log("received message from quick reply");
  if(quickReply.payload === "EXPANDING_BRAIN_MEME_QUICK_REPLY_PAYLOAD") {
    console.log("user chose expanding brain meme template from quick reply...");
    sendMemeConfirmMessage(evnt.sender.id, "EXPANDING_BRAIN_MEME");
  }
}

function receivedMessage(evnt) {
  var senderID = evnt.sender.id;
  var recipientID = evnt.recipient.id;
  var timeOfMessage = evnt.timestamp;
  var message = evnt.message;

  console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if(messageText) {
    if(!inProgressOfGenerating) {
      // echo back the text for now
      sendTextMessage(senderID, messageText);
    } else {
      // currently in progress of generating a meme and received some text
      if(blurbsReceived === 0) {
        blurbsReceived++;
        blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + blurbsReceived);

        var messageText = "Please message the 2/4 blurb of text for your meme";
        console.log("sending message asking for next blurb...");
        sendTextMessage(senderID, messageText);
      } else if(blurbsReceived === 1) {
        blurbsReceived++;
        blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + blurbsReceived);

        var messageText = "Please message the 3/4 blurb of text for your meme";
        console.log("sending message asking for next blurb...");
        sendTextMessage(senderID, messageText);
      } else if(blurbsReceived === 2) {
        blurbsReceived++;
        blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + blurbsReceived);

        var messageText = "Please message the 4/4 blurb of text for your meme";
        console.log("sending message asking for next blurb...");
        sendTextMessage(senderID, messageText);
      } else if(blurbsReceived === 3) {
        // got the 4th blurb
        blurbsReceived++;
        blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + blurbsReceived);
        console.log("array currently:");
        console.log(blurbsToGoInMeme);

        idUser = senderID;

        // open a headless browser window here and generate the meme

        var phantomURL = process.env.PHANTOM_URL;

        var phantomjs = require('phantomjs-prebuilt');
        var program = phantomjs.exec('phantom-script.js', phantomURL);

        program.stdout.pipe(process.stdout);
        program.stderr.pipe(process.stderr);
        program.on('exit', code => {
          console.log("node: phantom script exited..." + code);
        });
      }
    }
  } else if(messageAttachments) {
    console.log("received message with attachments");
  }
}

module.exports = router;
