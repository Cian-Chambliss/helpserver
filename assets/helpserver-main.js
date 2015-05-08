var helpServer = {
  navigateToFragment: function () {
    var path = "";
    if (window.location.hash)
      path = window.location.hash.substring(1);
    var iframeToc = document.getElementById('toc');
    var iframeHelper = document.getElementById('help');
    if ( path != "" ) {
      if (iframeToc)
        iframeToc.src = "/toc#" + path;
      if (iframeHelper)
        iframeHelper.src = "/help" + path;
    }
  },
  checkNavigation: function (path, from) {
    if (path && path != "" && ("#" + path) !== window.location.hash) {
      var parentWindow = window.parent.window;
      var newLocation = parentWindow.location.pathname + "#" + path;
      parentWindow.location.replace(newLocation);
    }
    var iframeToc = document.getElementById('toc');
    var iframeHelper = document.getElementById('help');
    if (from != 'toc' && iframeToc) {
      if (iframeToc.contentWindow.tableOfContents) {
        iframeToc.contentWindow.tableOfContents.setSelectedPage(path);
      }
    }
    if (from != 'help' && iframeHelper) {
      iframeHelper.src = "/help" + path;
    }
  },
  onLoad: function () {
    this.navigateToFragment();
  },
  onHashChange: function () {
    this.navigateToFragment();
  },
  helpFrameLoad: function () {
    var path = document.getElementById('help').contentWindow.location.pathname;
    if( path.substring(0,5) == '/help' ) { 
        path = path.substr(5);        
        this.checkNavigation(path, 'help');
    }
  }
};

