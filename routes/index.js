var express = require('express');
var router = express.Router();
var schedule = require('node-schedule');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

/*
  root page, authenticate here
*/
router.get('/', function(req, res, next) {
  var obj = {'shouldDisplayError': false}
  res.render('index', obj);
});

module.exports = router;
