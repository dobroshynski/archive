/*
  Script to set up the Facebook page to use the messenger bot with. Sets up greeting text, adds a 'get started' button, sets up a persistent menu
*/

const request = require('request');
const FB_ACCESS_TOKEN = process.argv[2]; // FB page auth token as a command line argument for script

var headers = {
    'Content-Type': 'application/json'
};

var greetingTextRequestData = {
    url: 'https://graph.facebook.com/v2.6/me/thread_settings?access_token=' + FB_ACCESS_TOKEN,
    method: 'POST',
    headers: headers,
    body: `{
      "setting_type":"greeting",
      "greeting":{
        "text":"Easily generate memes right from Messenger."
      }
    }`
};

var getStartedButtonRequestData = {
    url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + FB_ACCESS_TOKEN,
    method: 'POST',
    headers: headers,
    body: `{
      "get_started":{
        "payload":"GET_MEME_GENERATION_STARTED_PAYLOAD"
      }
    }`
};

var persistentMenuRequestData = {
    url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + FB_ACCESS_TOKEN,
    method: 'POST',
    headers: headers,
    body: `{
      "persistent_menu":[
        {
          "locale":"default",
          "composer_input_disabled": false,
          "call_to_actions":[
            {
              "title":"Expanding Brain Meme",
              "type":"postback",
              "payload":"EXPANDING_BRAIN_MEME_PAYLOAD"
            }
          ]
        }
      ]
    }`
};

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body);
  } else {
    console.log("error");
    console.log(error);
  }
}

// send requests to Facebook Graph API
request(greetingTextRequestData, callback);
request(getStartedButtonRequestData, callback);
request(persistentMenuRequestData, callback);
