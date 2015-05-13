var helpServer = {
  onItemToggle: null,
  originalHelpPath: null,
  originalHelpPage: null,
  searchTerm: null,
  searchTermCount: 0,
  navigateToFragment: function () {
    var path = "";
    if (window.location.hash)
      path = window.location.hash.substring(1);
    var iframeToc = document.getElementById('toc');
    var iframeHelper = document.getElementById('help');
    if (path != "") {
      if (iframeToc)
        iframeToc.src = "/toc#" + path;
      if (iframeHelper) {
        iframeHelper.src = "/help" + path;
      }
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
      this.originalHelpPage = null;
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
    var helpEle = document.getElementById('help');
    var path = helpEle.contentWindow.location.pathname;
    if (path.substring(0, 5) == '/help') {
      path = path.substr(5);
      this.checkNavigation(path, 'help');
      if (this.searchTerm != null) {
        var replaceWithSearchTerm = this.searchTerm;
        var searchEle = document.getElementById('search');
        if (!searchEle) {
          this.searchTerm = null;
        } else {
          var searchInput = searchEle.contentDocument.getElementById('input');
          if (!searchInput || searchInput.value != this.searchTerm) {
            this.searchTerm = null;
          }
        }
        if (this.originalHelpPath != path) {
          this.originalHelpPath = path;
          this.originalHelpPage = null;
        }
        if (!this.originalHelpPage) {
          this.originalHelpPage = helpEle.contentDocument.body.innerHTML;
        }
        var rep = '<span style="color:red;background:yellow;" id="spansearch__sequential" >$1</span>';
        var re = new RegExp('(' + replaceWithSearchTerm + '+(?![^<>]*>))', 'ig');
        var newPage = this.originalHelpPage.replace(re, rep);
        var index = 0;
        if (newPage != this.originalHelpPage) {
          while (newPage.indexOf("spansearch__sequential") >= 0) {
            newPage = newPage.replace("spansearch__sequential", "spansearch_" + index);            
            ++index;
          }
          helpEle.contentDocument.body.innerHTML = newPage;
        }
        this.searchTermCount = index;
      }
    }
  },
  ItemToggle: function (id) {
    if (this.onItemToggle) {
      this.onItemToggle(id);
    }
  }
};

