const express = require('express');
const router = express.Router();
const request = require('request');

var webhookUri = process.env.WEBHOOK_URI;

const debug = false;

router.get('/', function(req,res) {
  res.sendStatus(200);
});

module.exports = router;
