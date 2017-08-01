var page = require('webpage').create();

page.settings.userAgent = 'Chrome/37.0.2062.120';

var system = require('system');

var url = system.args[1];

page.open(url, function(status) {
  console.log(status + ' on connect to generate meme');
  if(status === 'success') {
    var t = setTimeout(function() {
      console.log("quitting phantom");
      phantom.exit();
    }, 1000);
  }
});
