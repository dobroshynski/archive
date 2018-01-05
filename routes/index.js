var express = require('express');
var router = express.Router();
var schedule = require('node-schedule');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

// authentication with passport
var passport = require('passport-localapikey');


var config = JSON.parse(fs.readFileSync(path.join(__dirname, '/../config.json')));

require('../db');

// mongoose setup
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const ScheduledRepoClosing = mongoose.model('ScheduledRepoClosing');

const debug = true;

function closeRepositories(action, orgName, repoName, apiToken) {
  var args = [action, orgName, repoName, apiToken];
  childProcess.fork(__dirname + '/../modify-repositories-script.js', args);
}

router.get('/', function(req, res, next) {
  var obj = {'shouldDisplayError': false}
  res.render('index', obj);
});

router.post('/confirm', function(req,res) {
  // schedule a repo closing here
  var organizationName = req.body.organizationName;
  var homeworkName = req.body.homeworkName;
  var closingDate = req.body.closingDate;
  var closingTime = req.body.closingTime;

  var apiKey = req.body.password;
  var storedToken = config.token;

  if(storedToken === apiKey) {
      var date = new Date(closingDate + " " + closingTime);
      var localeDateString = date.toLocaleString();
      var dateTokenized = localeDateString.split(',');

      const scheduledRepoClosing = new ScheduledRepoClosing({
        organization: organizationName,
        homeworkPrefix: homeworkName,
        closeAt: date
      });

      scheduledRepoClosing.save(function(err,object,count){
        if(err){
          res.send(err);
        } else {
          if(debug) {
            console.log("successfully added a scheduled repo closing object to database with id " + object._id);
          }
          var string = "job-id:" + object._id;
          // schedule to execute some code to close the repo
          var job = schedule.scheduleJob(string, date, function(objectID, action, orgName, repoName, apiKey){
            console.log("running repo closing script...");

            closeRepositories(action, orgName, repoName, apiKey);
            ScheduledRepoClosing.find({_id: objectID}).remove().exec();
          }.bind(null, object._id, 'close', organizationName, homeworkName, apiKey));

          if(debug) {
            console.log('repos closing scheduled with unique job name ' + string);
          }
          var obj = {'homeworkName': homeworkName, 'closingDate': dateTokenized[0], 'closingTime': dateTokenized[1]};
          res.render('confirm',obj);
        }
      });
  } else {
    // re-render with an error display
    var obj = {'shouldDisplayError': true}
    res.render('index', obj);
  }
});

router.post('/confirm-update', function(req,res) {
  // update the scheduled repo closing here
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

router.get('/scheduled/view', function(req,res) {
  var obj = {};
  var listOfSchedules = [];
  ScheduledRepoClosing.find(function(err, schedules, count) {
    schedules.forEach(function(ele) {
      var singleObj = {'organizationName': ele.organization, 'homeworkName': ele.homeworkPrefix};
      var closingDate = ele.closeAt;
      var localeDateString = closingDate.toLocaleString();
      singleObj['closingDateTime'] = localeDateString;

      listOfSchedules.push(singleObj);
    });
    obj['schedules'] = listOfSchedules;
    listOfSchedules.length == 0 ? obj['isNotEmpty'] = false : obj['isNotEmpty'] = true;
    res.render('view-scheduled', obj);
  });
});

router.get('/scheduled/edit/:id', function(req,res) {
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

router.post('/confirm-delete', function(req,res) {
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

router.get('/scheduled/delete', function(req,res) {
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

router.get('/scheduled/edit', function(req,res) {
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

module.exports = router;
