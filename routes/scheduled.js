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
  view page listing all the scheduled closings of repositories
*/
router.get('/scheduled/view', authenticated, function(req,res) {
  console.log(req.user);
  console.log(req.session.message);
  var obj = {};
  var listOfSchedules = [];
  ScheduledRepoClosing.find({ "createdBy": req.user._id }, function(err, schedules, count) {
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

    res.render('edit-scheduled-single', obj);
  });
});

/*
  view a picker to select one repo closing schedule to delete
*/
router.get('/scheduled/delete', authenticated, function(req,res) {
  var obj = {};
  var listOfSchedules = [];
  ScheduledRepoClosing.find(function(err, schedules, count) {
    schedules.forEach(function(ele) {
      var summaryString = "[" + ele.organization + "] " + ele.homeworkPrefix;
      var singleObj = {'scheduleName': summaryString, 'scheduleID': ele._id};

      listOfSchedules.push(singleObj);
    });
    obj['schedules'] = listOfSchedules;
    res.render('delete-scheduled', obj);
  });
});

/*
  view a picker to select one repo closing schedule to edit
*/
router.get('/scheduled/edit', authenticated, function(req,res) {
  var obj = {};
  var listOfSchedules = [];
  ScheduledRepoClosing.find(function(err, schedules, count) {
    schedules.forEach(function(ele) {
      var summaryString = "[" + ele.organization + "] " + ele.homeworkPrefix;
      var singleObj = {'scheduleName': summaryString, 'scheduleID': ele._id};

      listOfSchedules.push(singleObj);
    });
    obj['schedules'] = listOfSchedules;
    res.render('edit-scheduled', obj);
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
