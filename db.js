var mongoose = require('mongoose');

const ScheduledRepoClosing = new mongoose.Schema({
  organization: String,
  homeworkPrefix: String,
  closeAt: Date
});

const APIKey = new mongoose.Schema({
  key: String
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
