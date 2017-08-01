var page = require('webpage').create();

page.settings.userAgent = 'Chrome/37.0.2062.120';

var system = require('system');

page.viewportSize = {
  width: 1024,
  height: 900
};

var url = system.args[1];

page.open(url, function(status) {
  console.log(status + ' on connect to generate meme');
  page.render('MEME_PAGE.png');
  if(status === 'success') {
    var t = setTimeout(function() {
      console.log("quitting phantom");
      phantom.exit();
    }, 1000);
  }
});
