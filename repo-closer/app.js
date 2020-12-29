const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const request = require('request');

const newSchedule = require('./routes/new');
const scheduled = require('./routes/scheduled');
const updates = require('./routes/updates');
const settings = require('./routes/settings');

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
app.use('/', settings);

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

app.get('/unautheticated', function(req, res) {
  req.session.unautheticated = true;
  res.redirect('/authenticate');
});

/*
  autheticate with an API key and create a session
*/
app.post('/authenticate',
  passport.authenticate('localapikey', { failureRedirect: '/unautheticated', failureFlash: false }),
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
  root page
*/
app.get('/', function(req, res, next) {
  res.render('main');
});

/*
   autheticate here
*/
app.get('/authenticate', function(req, res, next) {
  var obj = {'shouldDisplayError': false}
  if(req.session.unautheticated) {
    obj['shouldDisplayError'] = true;
    req.session.unautheticated = false;
  }
  res.render('authenticate', obj);
});

/*
  create a new account by supplying organization name and api key
*/
app.get('/create-account', function(req, res, next) {
  res.render('create-account');
});

app.post('/create-account', function(req, res, next) {
  const apikey = req.body.apikey;
  const displayName = req.body.displayName;
  const account = new APIKey({
    key: apikey,
    displayName: displayName
  });
  // try to find an APIKey and prevent a duplicate, otherwise crate a new
  APIKey.find({ key: apikey }, function(err, keys, count) {
    const keysFound = keys.length;
    if(keysFound != 0) {
      console.log("!= 0");
      console.log(keysFound);
      res.redirect('/create-account');
    } else {
      // create new account
      account.save(function(err,object,count){
        if(err) {
          console.log(err);
          res.redirect('/create-account');
        } else {
          res.redirect(307, '/authenticate');
        }
      });
    }
  });
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
