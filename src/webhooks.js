var express = require('express');
var router = express.Router();
var path = require('path');

var AWS = require('aws-sdk');
const fs = require('fs');
const Q = require('q');

const request = require('request');

var memes = {}; // dictionary/object of MemeGenerated objects; key = id, value = MemeGenerated

class MemeGenerated {
  constructor(userID, templateNumber) {
    this.userID = userID;
    this.blurbsToGoInMeme = [];
    this.blurbsReceived = 0;
    this.numberOfBlurbsToExpect = templateNumber;
    this.isDoneTakingInput = false;
  }
}

router.get('/', function(req, res, next) {
  res.sendStatus(200);
});

// id paramater: id for user that the image is being generated
router.post('/handle/image/data/:id', function(req, res) {
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
              var userID = req.params.id;

              // respond back with data
              setTypingOff(userID);
              sendMemeBackToUserAndReset(fileURLonAWS, userID);
              res.sendStatus(200);
            });
          }
        });
      });
    }
  });
});

// id paramater: id for user that the image is being generated
router.get('/get/data/:id', function(req,res) {
  var blurbsForMemeForCurrentUser = memes[req.params.id].blurbsToGoInMeme;
  var obj = {list: blurbsForMemeForCurrentUser, id: req.params.id};
  var JSONobj = JSON.stringify(obj);
  res.send(JSONobj);
});

// id paramater: id for user that the image is being generated
// this endpoint gets called by the phantomjs page.open;
router.get('/generate/meme/:templateNumber/:id', function(req, res) {
  console.log("redirected to template number " + req.params.templateNumber + " from phantomjs...");
  // pass in the id to the call
  var obj = {id: req.params.id, templateNumber: req.params.templateNumber};
  console.log(path.join(__dirname + '/../web' + ('/meme-generate-' + obj.templateNumber)));

  res.render(path.join(__dirname + '/../web' + ('/meme-generate-' + obj.templateNumber)), obj);
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
            sendFollowUpAskingForTemplate(event.sender.id, "EXPANDING_BRAIN_MEME");
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

  memes[senderID] = undefined; // reset the meme for this user ID so can create new one later

  var messageText = "Here is your meme!";

  sendTextMessage(senderID, messageText);
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
  sendAPICall(messageData); // sending message first and attachment after
}

function sendFollowUpAskingForTemplate(recipientId, memeType) {
  if(memeType === "EXPANDING_BRAIN_MEME") {
    var messageText = "Cool, you've picked the Expanding Brain Meme template! Please choose a numbered template from below for the number of sections in your meme";
    console.log('sending message prompting to choose a template');
    sendChooseTemplateMessage(recipientId, messageText);
  }
}

function sendMemeConfirmMessage(recipientId, memeType, templateNumber) {
  if(memeType === "EXPANDING_BRAIN_MEME") {
    var memeForThisUser = memes[recipientId]; // try to get the meme from the dictionary

    if(memeForThisUser) { // already have meme in progress

    } else { // start making a new one
      var meme = new MemeGenerated(recipientId, templateNumber);
      console.log(meme);
      console.log('starting new meme for user ' + recipientId + '... added to dictionary of memes');
      memes[recipientId] = meme;
    }

    var messageText = "Great! You've picked the " + templateNumber + "-part template!";
    var followUpMessage = "Please message the 1/" + templateNumber + " blurb of text for your meme";
    console.log("sending confirm message...");
    sendTextMessage(recipientId, messageText, followUpMessage);
  }
}

function sendWelcomeMessage(recipientId) {
  var messageText = "Welcome! Please choose a type of meme you would like to generate from the in-chat menu";
  console.log("sending welcome message...");
  sendWelcomeTextMessage(recipientId, messageText);
}

function sendChooseTemplateMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies:[
            {
              content_type:"text",
              title:"2",
              payload:"EXPANDING_BRAIN_MEME_PICK_TEMPLATE_NUMBER_PAYLOAD_2"
            },
            {
              content_type:"text",
              title:"3",
              payload:"EXPANDING_BRAIN_MEME_PICK_TEMPLATE_NUMBER_PAYLOAD_3"
            },
            {
              content_type:"text",
              title:"4",
              payload:"EXPANDING_BRAIN_MEME_PICK_TEMPLATE_NUMBER_PAYLOAD_4"
            }
          ]
    }
  };
  sendAPICall(messageData);
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

function setTypingOff(recipientId) {
  var setTypingOffData = {
    recipient:{
      id: recipientId
    },
    sender_action:"typing_off"
  };
  sendAPICall(setTypingOffData);
}

function sendTextMessageAndSetTypingOn(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };
  var setTypingOnData = {
    recipient:{
      id: recipientId
    },
    sender_action:"typing_on"
  };
  sendAPICall(messageData);
  sendAPICall(setTypingOnData);
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
    sendFollowUpAskingForTemplate(evnt.sender.id, "EXPANDING_BRAIN_MEME");
  } else if(quickReply.payload === "EXPANDING_BRAIN_MEME_PICK_TEMPLATE_NUMBER_PAYLOAD_2") {
    console.log("user chose a particular number template from quick reply");
    sendMemeConfirmMessage(evnt.sender.id, "EXPANDING_BRAIN_MEME", 2);
  } else if(quickReply.payload === "EXPANDING_BRAIN_MEME_PICK_TEMPLATE_NUMBER_PAYLOAD_3") {
    console.log("user chose a particular number template from quick reply");
    sendMemeConfirmMessage(evnt.sender.id, "EXPANDING_BRAIN_MEME", 3);
  } else if(quickReply.payload === "EXPANDING_BRAIN_MEME_PICK_TEMPLATE_NUMBER_PAYLOAD_4") {
    console.log("user chose a particular number template from quick reply");
    sendMemeConfirmMessage(evnt.sender.id, "EXPANDING_BRAIN_MEME", 4);
  }
}

// open a headless browser window here and generate the meme
function generateMemeWithTemplate(templateNumber, senderID) {
  var phantomURL = process.env.PHANTOM_URL;

  phantomURL = phantomURL + '/generate/meme/' + templateNumber + '/' + senderID;

  var phantomjs = require('phantomjs-prebuilt');
  var program = phantomjs.exec('/app/src/phantom-script.js', phantomURL);

  program.stdout.pipe(process.stdout);
  program.stderr.pipe(process.stderr);
  program.on('exit', code => {
    console.log("node: phantom script exited..." + code);
  });
}

function parseTextAndRespond(senderID, messageText) {
  if(messageText.toLowerCase() === "help" || messageText.split(' ').indexOf('help') !== -1) {
    var responseText = "Need help? No problem! Get started by choosing a meme type from the in-chat menu!";
    sendTextMessage(senderID, responseText);
  } else {
    // echo back the text
    sendTextMessage(senderID, messageText);
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
    if(!memes[senderID]) { // there is no currently generating meme for the current user
      // echo back the text for now
      parseTextAndRespond(senderID, messageText);
    } else {
      // currently in progress of generating a meme and received some text

      var memeForThisUser = memes[senderID]; // try to get the meme from the dictionary

      console.log("meme for this user:");
      console.log(memeForThisUser);

      if(memeForThisUser.blurbsReceived === 0) {

        memeForThisUser.blurbsReceived++;
        memeForThisUser.blurbsToGoInMeme.push(messageText);

        console.log("added text to array; blurbs recieved: " + memeForThisUser.blurbsReceived);

        var messageText = "Thanks! Please message the 2/" + memeForThisUser.numberOfBlurbsToExpect + " blurb of text for your meme";
        console.log("sending message asking for next blurb...");
        sendTextMessage(senderID, messageText);
      } else if(memeForThisUser.blurbsReceived === 1 && !memeForThisUser.isDoneTakingInput) {
        memeForThisUser.blurbsReceived++;
        memeForThisUser.blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + memeForThisUser.blurbsReceived);

        if(memeForThisUser.blurbsReceived === memeForThisUser.numberOfBlurbsToExpect) {
          memeForThisUser.isDoneTakingInput = true;
          // generate the meme now
          // send message informing the user the meme is being generated
          var messageText = "Thanks! Your meme is currently being generated";
          sendTextMessageAndSetTypingOn(senderID, messageText);

          // open a headless browser window here and generate the meme
          generateMemeWithTemplate(2, senderID);
        } else {
          var messageText = "Awesome. Please message the 3/" + memeForThisUser.numberOfBlurbsToExpect + " blurb of text for your meme";
          console.log("sending message asking for next blurb...");
          sendTextMessage(senderID, messageText);
        }
      } else if(memeForThisUser.blurbsReceived === 2 && !memeForThisUser.isDoneTakingInput) {
        memeForThisUser.blurbsReceived++;
        memeForThisUser.blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + memeForThisUser.blurbsReceived);

        if(memeForThisUser.blurbsReceived === memeForThisUser.numberOfBlurbsToExpect) {
          memeForThisUser.isDoneTakingInput = true;
          // generate the meme now
          // send message informing the user the meme is being generated
          var messageText = "Thanks! Your meme is currently being generated";
          sendTextMessageAndSetTypingOn(senderID, messageText);

          // open a headless browser window here and generate the meme
          generateMemeWithTemplate(3, senderID);
        } else {
          var messageText = "Got it. Now please message the 4/" + memeForThisUser.numberOfBlurbsToExpect + " blurb of text for your meme";
          console.log("sending message asking for next blurb...");
          sendTextMessage(senderID, messageText);
        }
      } else if(memeForThisUser.blurbsReceived === 3 && !memeForThisUser.isDoneTakingInput) {
        // got the 4th blurb
        memeForThisUser.blurbsReceived++;
        memeForThisUser.blurbsToGoInMeme.push(messageText);
        console.log("added text to array; blurbs recieved: " + memeForThisUser.blurbsReceived);
        console.log("array currently:");
        console.log(memeForThisUser.blurbsToGoInMeme);

        // send message informing the user the meme is being generated
        var messageText = "Thanks! Your meme is currently being generated";
        sendTextMessageAndSetTypingOn(senderID, messageText);

        // open a headless browser window here and generate the meme
        generateMemeWithTemplate(4, senderID);

        res.sendStatus(200);
      }
    }
  } else if(messageAttachments) {
    console.log("received message with attachments");
  }
}

module.exports = router;
