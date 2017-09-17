# slack-logger
Log conversations from all Slack channels as a Slack App integration

  - deploy the application/server, add a new Slack App integration, set-up required permissions and configure the Slack Event Notifications webhook to point to '<deployed_webapp_url>/event', make a GET request to '<deployed_webapp_url>/data' to load up some Slack team data
  - set the AUTH_TOKEN env variable to Slack OAuth Access Token
  - the bot will systematically log messages and senders, creating and organizing logs by date and channel!
