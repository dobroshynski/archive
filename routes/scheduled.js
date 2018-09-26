const express = require('express');
const router = express.Router();
const schedule = require('node-schedule');
const childProcess = require('child_process');

require('../db');

// mongoose setup
const mongoose = require('mongoose');
const ScheduledRepoClosing = mongoose.model('ScheduledRepoClosing');

// debug flag
const debug = true;

/*
  view page listing all the scheduled closings of repositories
*/
router.get('/scheduled/view', authenticated, function(req,res) {
  var obj = {};
  var listOfSchedules = [];

  ScheduledRepoClosing.find({ "ownerId": req.user._id }, function(err, schedules, count) {
    schedules.forEach(function(ele) {
      var singleObj = {'id': ele._id, 'organizationName': ele.organization, 'homeworkName': ele.homeworkPrefix};
      var closingDate = ele.closeAt;
      var localeDateString = closingDate.toLocaleString();
      singleObj['closingDateTime'] = localeDateString;

      listOfSchedules.push(singleObj);
    });

    obj['schedules'] = listOfSchedules;
    listOfSchedules.length == 0 ? obj['isNotEmpty'] = false : obj['isNotEmpty'] = true;

    // message if updated anything
    if(req.session.message) {
      var message = req.session.message;
      req.session.message = undefined;
      obj['shouldDisplayMessage'] = true;
      obj['message'] = message;
    }
    res.render('view-scheduled', obj);
  });
});

/*
  view page for edititng one particular scheduled closings of repository
  repo determined by the 'id'
*/
router.get('/scheduled/edit/:id', authenticated, function(req,res) {
  var scheduledClosingID = req.params.id;
  var obj = {'shouldDisplayError': false};
  var listOfSchedules = [];

  ScheduledRepoClosing.findOne({_id: scheduledClosingID}, function(err, scheduled, count) {
    if (debug) {
      console.log("found one scheduled object");
      console.log(scheduled);
    }
    obj['organizationName'] = scheduled.organization;
    obj['homeworkName'] = scheduled.homeworkPrefix;

    var date = scheduled.closeAt;
    var month = date.getMonth() + 1;
    var monthString = "";

    if(month <= 9) {
      monthString = "0" + month;
    } else {
      monthString = "" + month;
    }

    var dateString = date.getFullYear() + "-" + monthString + "-" + date.getDate(); // YYYY-MM-DD
    var hoursString = date.getHours() <= 9 ? "0" + date.getHours() : date.getHours();
    var minutesString = date.getMinutes() <= 9 ? "0" + date.getMinutes() : date.getMinutes();

    var timeString = hoursString + ":" + minutesString;

    obj['dateToClose'] = dateString;
    obj['timeToClose'] = timeString;

    res.render('edit', obj);
  });
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
