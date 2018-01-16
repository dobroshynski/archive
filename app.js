const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const newSchedule = require('./routes/new');
const scheduled = require('./routes/scheduled');
const updates = require('./routes/updates');

const session = require('express-session');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// passport setup
const passport = require('passport');
const LocalStrategy = require('passport-localapikey').Strategy;

// mongoose setup
const mongoose = require('mongoose');
const APIKey = mongoose.model('APIKey');

// session setup
app.use(session({ secret: 'anything' }));
app.use(passport.initialize());
app.use(passport.session());

// additional route handlers
app.use('/', newSchedule);
app.use('/', scheduled);
app.use('/', updates);

/*
  AUTHENTICATION
*/

/*
  passport serialization
*/
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

/*
  strategy
*/
passport.use(new LocalStrategy(
  function(apikey, done) {
    console.log("given key: " + apikey);
    APIKey.findOne({ key: apikey }, function(err, apiKeyObj) {
        if (err) {
          console.log(err);
          return done(err);
        } else if(!apiKeyObj) {
          console.log("didn't find a matching api key from database");
          return done(null, false, { message: 'Unknown apikey : ' + apikey });
        } else {
          return done(null, apiKeyObj);
        }
    });
  }
));

/*
  autheticate with an API key and create a session
*/
app.post('/authenticate',
  passport.authenticate('localapikey', { failureRedirect: '/', failureFlash: false }),
  function(req, res) {
     console.log(req.user);
     res.redirect('/new');
});

/*
  main page showing all scheduled repo closings
  needs authetication to view
*/
app.get('/new', authenticated, function(req, res) {
  res.render('index');
});

/*
  remove current autheticated API key session and log out
*/
app.get('/logout', authenticated, function(req, res){
  req.logout();
  res.redirect('/');
});

/*
  middle ware to ensure user is autheticated for any chosen particular route
*/
function authenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.locals.message = "error";
  res.redirect('/');
}

/*
  root page, autheticate here
*/
app.get('/', function(req, res, next) {
  var obj = {'shouldDisplayError': false}
  res.render('authenticate', obj);
});

/*
  ERROR HANDLING
*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Page Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
