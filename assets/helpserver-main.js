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
        if( !searchEle ) {
            this.searchTerm = null;
        } else {
            var searchInput = searchEle.contentDocument.getElementById('input');
            if( !searchInput || searchInput.value != this.searchTerm ) {
              this.searchTerm = null;
            } 
        }
        if( this.originalHelpPath != path ) {
          this.originalHelpPath = path;
          this.originalHelpPage = null;
        }
        if (!this.originalHelpPage) {
          this.originalHelpPage = helpEle.contentDocument.body.innerHTML;
        }
        replaceWithSearchTerm = replaceWithSearchTerm.toLowerCase();
        var newPage = this.originalHelpPage;
        var matchList = [];
        var matchIndex = 0;
        while( true ) {
            var posOfExample = newPage.search(new RegExp(replaceWithSearchTerm, "i"));
            if( posOfExample < 1 )
                break;
            var thisResult = newPage.substr(posOfExample,replaceWithSearchTerm.length);
            debugger;    
            matchList.push(thisResult);            
            var placeHolder = "____HELPSYSTEMREPLACEMENT"+matchIndex+"___";        
            while (newPage.indexOf(thisResult) >= 0)
              newPage = newPage.replace(thisResult, placeHolder );
           ++matchIndex;   
        } 
        var index = 0;
        var i;
        for( i = 0 ; i < matchList.length ; ++i ) {
            var placeHolder = "____HELPSYSTEMREPLACEMENT"+i+"___";
            while (newPage.indexOf(placeHolder) >= 0) {
              newPage = newPage.replace(placeHolder, "<span id=\"searchterm_"+index+"\" style=\"background:yellow;\" >" + matchList[i] + "</span>");
              ++index;
            }
        }
        this.searchTermCount = index;
        if (newPage != this.originalHelpPage) {
          helpEle.contentDocument.body.innerHTML = newPage;
        }
      }
    }
  },
  ItemToggle: function (id) {
    if (this.onItemToggle) {
      this.onItemToggle(id);
    }
  }
};

