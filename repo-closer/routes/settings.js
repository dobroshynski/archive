const express = require('express');
const router = express.Router();
const schedule = require('node-schedule');
const childProcess = require('child_process');

require('../db');

// mongoose setup
const mongoose = require('mongoose');
const ScheduledRepoClosing = mongoose.model('ScheduledRepoClosing');

//mdebug flag
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
