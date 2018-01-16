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
  call a script to close the repositories
*/
function closeRepositories(action, orgName, repoName, apiToken) {
  var args = [action, orgName, repoName, apiToken];
  childProcess.fork(__dirname + '/../modify-repositories-script.js', args);
}

/*
  update a scheduled repo closing entry
*/
router.post('/confirm-update', authenticated, function(req,res) {
  var organizationName = req.body.organizationNameEdited;
  var homeworkName = req.body.homeworkNameEdited;
  var closingDate = req.body.submissionDateEdited;
  var closingTime = req.body.submissionTimeEdited;

  var apiKey = req.body.password;

  var date = new Date(closingDate + " " + closingTime);
  var localeDateString = date.toLocaleString();
  var dateTokenized = localeDateString.split(',');

  var newData = {
    organization: organizationName,
    homeworkPrefix: homeworkName,
    closeAt: date
  };

  ScheduledRepoClosing.findOneAndUpdate({'organization':organizationName, 'homeworkPrefix': homeworkName}, newData, function(err, doc){
    if (err) return res.sendStatus(err);
    if (debug) {
      console.log('successfully saved');
      console.log(doc);
    }
    var string = "job-id:" + doc._id;
    var job = schedule.scheduledJobs[string];
    if(job) {
      // cancel current job, re-schedule with new date
      job.cancel();
      var newJob = schedule.scheduleJob(string, date, function(objectID, action, orgName, repoName, apiKey){
        console.log("running repo closing script...");

        closeRepositories(action, orgName, repoName, apiKey);
        ScheduledRepoClosing.find({_id: objectID}).remove().exec();
      }.bind(null, doc._id, 'close', organizationName, homeworkName, apiKey));

      console.log('node-schedule job successfully rescheduled');
    } else {
      console.log("couldn't reschedule job; job is " + job);
    }

    var obj = {'homeworkName': homeworkName, 'closingDate': dateTokenized[0], 'closingTime': dateTokenized[1]};
    res.render('confirm-update',obj);
  });
});

/*
  delete a specific scheduled repo closing and update
*/
router.post('/confirm-delete', authenticated, function(req,res) {
  var scheduledRepoClosingID = req.body.repoClosingScheduleIdentifier;
  if(scheduledRepoClosingID) {
    ScheduledRepoClosing.find({_id: scheduledRepoClosingID }).remove().exec();
    console.log('deleted scheduled repo closing from database');

    var jobNameString = "job-id:" + scheduledRepoClosingID;
    var job = schedule.scheduledJobs[jobNameString];
    if(job) {
      job.cancel();
      console.log('node-schedule job successfully cancelled');
    } else {
      console.log("couldn't cancel scheduled job; job is " + job);
    }
    res.render('confirm-delete');
  } else {
    res.redirect('/scheduled/delete');
  }
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
