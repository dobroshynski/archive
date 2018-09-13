var mongoose = require('mongoose');

const ScheduledRepoClosing = new mongoose.Schema({
  createdBy: String, // id of autheticated user (by API key) that added this scheduled repo closing
  organization: String,
  homeworkPrefix: String,
  closeAt: Date
});

const APIKey = new mongoose.Schema({
  key: String,
  displayName: String
});

var fs = require('fs');
var path = require('path');
var fn = path.join(__dirname, 'config.json');
var data = fs.readFileSync(fn);

var conf = JSON.parse(data);
var dbconf = conf.dbconf;

mongoose.model('ScheduledRepoClosing', ScheduledRepoClosing);
mongoose.model('APIKey', APIKey);
mongoose.connect(dbconf);
