var helpServer = {
  onItemToggle: null,
  originalHelpPath: null,
  originalHelpPage: null,
  lastSearchedElement: -1,
  getSrcPath: function (src) {
    var oldPath = src;
    var oldPathIndex = oldPath.indexOf('/help');
    if (oldPathIndex > 0) {
      oldPath = oldPath.substring(oldPathIndex);
    }
    return oldPath;
  },
  navigateToFragment: function () {
    var path = "";
    if (window.location.hash)
      path = window.location.hash.substring(1);
    var iframeToc = document.getElementById('toc');
    var iframeHelper = document.getElementById('help');
    if (path != "") {
      if (iframeToc) {
        iframeToc.contentWindow.tableOfContents.selectTreeElement(path);
      }
      if (iframeHelper) {
        if (this.getSrcPath(iframeHelper.src) !== ("/help" + path)) {
          iframeHelper.src = "/help" + path;
        }
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
      if (this.getSrcPath(iframeHelper.src) !== ("/help" + path)) {
        this.originalHelpPage = null;
        iframeHelper.src = "/help" + path;
      }
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
      var tocEle = document.getElementById('toc');
      helpEle.contentDocument.body.onclick = function (e) {
        var ele = e.target || e.srcElement;
        if (ele && ele.href ) {
          var startPattern = window.top.location.protocol + "//" + window.top.location.host;
          if (ele.href.substring(0, startPattern.length) == startPattern) {
            e.stopPropagation();
            e.preventDefault();
            var navPath = ele.href.substring(startPattern.length);
            if( navPath.substring(0,6).toLowerCase() == '/help/' )
               navPath = navPath.substring(5);
            window.top.helpServer.checkNavigation(navPath, 'load');
          }
        }
      }
      if (tocEle
        && tocEle.contentWindow.tableOfContents
        && tocEle.contentWindow.tableOfContents.searchMode
        && tocEle.contentWindow.tableOfContents.searchText
        && tocEle.contentWindow.tableOfContents.searchText.length > 0
        ) {
        var replaceWithSearchTerm = tocEle.contentWindow.tableOfContents.searchText;
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
            newPage = newPage.replace("spansearch__sequential", "searchterm_" + index);
            ++index;
          }
          helpEle.contentDocument.body.innerHTML = newPage;
        }
        tocEle.contentWindow.tableOfContents.setSearchCount(index);
      }
    }
  },
  ItemToggle: function (id) {
    if (this.onItemToggle) {
      this.onItemToggle(id);
    }
  },
  navigateHelpSearch: function (index) {
    var iframeHelper = document.getElementById('help');
    if (iframeHelper) {
      var ele = iframeHelper.contentDocument.getElementById('searchterm_' + index);
      if (ele) {
        if (this.lastSearchedElement >= 0) {
          var oldEle = iframeHelper.contentDocument.getElementById('searchterm_' + this.lastSearchedElement);
          if (oldEle) {
            oldEle.style.color = "red";
            oldEle.style.background = "yellow";
          }
        }
        this.lastSearchedElement = index;
        if (ele.scrollIntoViewIfNeeded && index == 0)
          ele.scrollIntoViewIfNeeded();
        else
          ele.scrollIntoView();
        ele.style.color = "yellow";
        ele.style.background = "red";
      }
    }
  }
};

