var express = require('express');
var router = express.Router();

const request = require('request');

router.get('/', function(req, res, next) {
  res.sendStatus(200);
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

function sendMemeConfirmMessage(recipientId, memeType) {
  if(memeType === "EXPANDING_BRAIN_MEME") {
    var messageText = "Cool, you've picked the Expanding Brain Meme template";
    var followUpMessage = "Please message the 1st blurb of text for your meme";
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
    sendTextMessage(senderID, messageText);
  } else if(messageAttachments) {
    console.log("received message with attachments");
  }
}

module.exports = router;
