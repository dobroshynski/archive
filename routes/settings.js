var express = require('express');
var router = express.Router();
var schedule = require('node-schedule');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var config = JSON.parse(fs.readFileSync(path.join(__dirname, '/../config.json')));

require('../db');

// mongoose setup
const mongoose = require('mongoose');
const ScheduledRepoClosing = mongoose.model('ScheduledRepoClosing');

const debug = true;

/*
  create a new scheduled repo closing entry
*/
router.get('/settings', authenticated, function(req,res) {
  res.render('settings');
});

/*
  middleware helper function to ensure user is autheticated for any chosen particular route
*/
function authenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.locals.message = "error";
  res.redirect('/');
}

module.exports = router;
