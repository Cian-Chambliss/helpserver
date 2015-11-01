var helpServer = {
	config: {},
  baseTagHost: "",
  mainWindow: null,
  onItemToggle: null,
  originalHelpPath: null,
  originalHelpPage: null,
  lastSearchedElement: -1,
  lastLoadedDiv : null ,
  pageMetaData: {},
  trackMetaData: null,
  allowCheck: false,
  currentPath: '',
  checkedItems: [],
  onCheckChanged: null,
  followNavigation: null,
  defaultPage : null ,
  lastSearchSelected: null,
  pageHasLocalTOC: false,
  findMetadata: function (el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var node = el.childNodes[i];
      if (node.nodeType === 8) {
        var md = node.data.indexOf('HELPMETADATA:');
        if (md >= 0) {
          helpServer.pageMetaData = node.data.substring(md + 13);
          while (helpServer.pageMetaData.substring(helpServer.pageMetaData.length - 1) == '-') {
            helpServer.pageMetaData = helpServer.pageMetaData.substring(0, helpServer.pageMetaData.length - 1);
          }
          if (helpServer.pageMetaData != '') {
            try {
              helpServer.pageMetaData = JSON.parse(helpServer.pageMetaData);
            } catch (err) {
              helpServer.pageMetaData = {}
            }
          }
        }
      } else {
        helpServer.findMetadata(node);
      }
    }
  },
  loadHelpDiv: function (path) {
    if( helpServer.lastLoadedDiv != path ) {
      var elemHelpPage = document.getElementById('help');
      var lastLoadedWas = helpServer.lastLoadedDiv || "";
      helpServer.lastLoadedDiv = path;
      var xmlhttp = new XMLHttpRequest();
      var subElemPos = path.lastIndexOf('#');
      var subElemId = null;
      var pageToGet =  path;
      
      if( subElemPos > 0 ) {
            // Only focus on
            pageToGet = pageToGet.substring(0,subElemPos);
            subElemId = path.substring(subElemPos+1);            
            var lastLoadedHash = lastLoadedWas.lastIndexOf('#');
            if( lastLoadedHash > 0 )
                lastLoadedWas = lastLoadedWas.substring(0,lastLoadedHash);
            if( lastLoadedWas ==  pageToGet ) {
                pageToGet = null;            
                if( subElemId ) {
                    var subEle = document.getElementsByName(subElemId);
                    if( subEle && subEle.length > 0 ) {
                        subEle[0].scrollIntoView();
                    } else {
                        setTimeout(function() {
                          // in case DOM was not ready...
                          var subEle = document.getElementsByName(subElemId);
                          if( subEle && subEle.length > 0 ) {
                              subEle[0].scrollIntoView();
                          }                         
                        },500);
                    }
                }
            }
      } else if( !pageToGet && helpServer.defaultPage )
          pageToGet = helpServer.defaultPage; 
      if( pageToGet ) {
        elemHelpPage.innerHTML = "Loading " + path + "...";
        helpServer.pageHasLocalTOC = false;
        xmlhttp.onload = function () {
          if (this.status == 200) {
            var htmlText = xmlhttp.responseText;
            var lowText = htmlText.toLowerCase();
            var bodyAt = lowText.indexOf('<body');
            if (bodyAt >= 0) {
              var endBodyAt = lowText.indexOf('</body');
              if (endBodyAt >= 0) {
                htmlText = "<div" + htmlText.substring(bodyAt + 5, endBodyAt) + "</div>";
              }
            }
            var baseTagElement = document.getElementById("baseTag");
            baseTagElement.href = helpServer.baseTagHost+"/help" + path;
            elemHelpPage.innerHTML = htmlText;
            var getLocalHelpToc = elemHelpPage.getElementsByClassName("helpserver_toc");
            if( getLocalHelpToc && getLocalHelpToc.length > 0 ) {
                helpServer.pageHasLocalTOC = true;
                tableOfContents.setSelectedPage(path);
            }
            helpServer.helpFrameLoad();
            if( subElemId ) {
                  var subEle = document.getElementsByName(subElemId);
                  if( subEle ) {
                      subEle[0].scrollIntoView();
                  }
             }             
          }
        };
        xmlhttp.open("GET", "/help" + pageToGet, true);
        xmlhttp.send('');
      }
    }
  },
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

    helpServer.currentPath = path;
    var elemTOC = document.getElementById('toc');
    var elemHelpPage = document.getElementById('help');

    if (path != "") {
      if (elemTOC) {
        if (elemTOC.tagName.toLowerCase() == "iframe") {
          if (elemTOC) {
            elemTOC.contentWindow.tableOfContents.selectTreeElement(path);
          }
        } else if (tableOfContents) {
          tableOfContents.selectTreeElement(path);
        }
      }
      if (elemHelpPage) {
        if (elemHelpPage.tagName.toLowerCase() == "iframe") {
          if (this.getSrcPath(elemHelpPage.src) !== ("/help" + path)) {
            elemHelpPage.src = "/help" + path;
          }
        } else {
          this.loadHelpDiv(path);
        }
      }
    }
    if (this.followNavigation) {
      this.followNavigation(path);
    }
  },
  checkNavigation: function (path, from) {
    var elemTOC = document.getElementById('toc');
    if (path && path != "" && ("#" + path) !== window.location.hash) {
      var newLocation = helpServer.mainWindow.location.pathname + "#" + path;
      var baseTagElement = document.getElementById("baseTag");
      var saveBaseTag = null;
      if( baseTagElement ) {
          saveBaseTag = baseTagElement.href;
          baseTagElement.href = "/";
      }
      if( elemTOC.tagName != 'iframe' ) {
          var currentItem = document.getElementById(path);
          if( currentItem ) {
               currentItem.id = '';
               helpServer.mainWindow.location.replace(newLocation);
               currentItem.id = path;
          } else {
               helpServer.mainWindow.location.replace(newLocation);  
          }
      } else {
          helpServer.mainWindow.location.replace(newLocation);
      }
      if( baseTagElement )
           baseTagElement.href = saveBaseTag;
    }
    var elemHelpPage = document.getElementById('help');
    helpServer.currentPath = path;
    if (from != 'toc' && elemTOC) {
      if (elemTOC.tagName.toLowerCase() == "iframe") {
        if (elemTOC.contentWindow.tableOfContents) {
          elemTOC.contentWindow.tableOfContents.setSelectedPage(path);
        }
      } else if (tableOfContents) {
        tableOfContents.setSelectedPage(path);
      }
    }
    if (from != 'help' && elemHelpPage) {
      if (elemHelpPage.tagName.toLowerCase() == "iframe") {
        if (this.getSrcPath(elemHelpPage.src) !== ("/help" + path)) {
          this.originalHelpPage = null;
          elemHelpPage.src = "/help" + path;
        }
      } else {
        this.loadHelpDiv(path);
      }
    }
  },
  onLoad: function () {
    this.mainWindow = window;
    if (window.top != window.self) {
      this.followNavigation = function (path) {
        window.top.postMessage({ path: path }, "*");
      };
      window.addEventListener('message', function (event) {
        if (event.data.path) {
  			     window.location.hash = "#" + event.data.path;
        }
      });
    }
    var helpEle = document.getElementById('help');
    if (helpEle.tagName.toLowerCase() !== 'iframe') {
      // Lets hook this div 
      helpEle.onclick = function (e) {
        var ele = e.target || e.srcElement;
        if (ele && ele.href) {
          var startPattern;
          if( helpServer.baseTagHost !== '' ) {
               startPattern = helpServer.baseTagHost;
          } else {
               startPattern = window.location.protocol + "//" + window.location.host;
          }
          if (ele.href.substring(0, startPattern.length) == startPattern) {
            e.stopPropagation();
            e.preventDefault();
            var navPath = ele.href.substring(startPattern.length);
            if (navPath.substring(0, 6).toLowerCase() == '/help/')
              navPath = navPath.substring(5);
            if (e.ctrlKey && helpServer.allowCheck) {
              if (ele.className.indexOf('checkedHREF') >= 0) {
                ele.className = ele.className.replace(' checkedHREF', '').replace('checkedHREF', '');
                var i;
                for (i = 0; i < helpServer.checkedItems.length; ++i) {
                  if (helpServer.checkedItems[i] == navPath) {
                    helpServer.checkedItems.splice(i, 1);
                    break;
                  }
                }
              } else if (ele.className && ele.className != '') {
                ele.className += ' checkedHREF';
                helpServer.checkedItems.push(navPath);
              } else {
                ele.className = 'checkedHREF';
                helpServer.checkedItems.push(navPath);
              }
              if (helpServer.onCheckChanged)
                helpServer.onCheckChanged(helpServer.checkedItems);
            } else {
              window.top.helpServer.checkNavigation(navPath, 'load');
            }
          }
        }
      }
    }
    this.navigateToFragment();
  },
  onHashChange: function () {
    this.navigateToFragment();
    if( window.location.hash.substr(0,1) == '#' ) {
       var searchId = "search_"+window.location.hash.substr(1);
       var searchSource = document.getElementById(searchId);
       if( searchSource ) {
           if( helpServer.lastSearchSelected && helpServer.lastSearchSelected != searchId ) {
             var lastSearchSource = document.getElementById(helpServer.lastSearchSelected);
             if( lastSearchSource )
                 lastSearchSource.className = "searchUnselected";
           }
           searchSource.className = "searchSelected";
           helpServer.lastSearchSelected = searchId;
       }
    }
  },
  helpFrameLoad: function () {
    var helpEle = document.getElementById('help');
    var helpTagType = helpEle.tagName.toLowerCase();
    var elemTOC = document.getElementById('toc');
    var path = this.currentPath;

    if (helpTagType == 'iframe') {
      path = helpEle.contentWindow.location.pathname;
      if (path.substring(0, 5) == '/help')
        path = path.substr(5);
      else
        return;

      this.checkNavigation(path, 'help');

      if (helpEle && helpEle.contentDocument && this.allowCheck) {
        if (helpTagType == 'iframe') {
          var style = document.createElement('style');
          style.type = 'text/css';
          style.innerHTML = '.checkedHREF { background: Orange; }';
          helpEle.contentDocument.getElementsByTagName('head')[0].appendChild(style);
        }
      }

      helpEle.contentDocument.body.onclick = function (e) {
        var ele = e.target || e.srcElement;
        if (ele && ele.href) {
          var startPattern = window.top.location.protocol + "//" + window.top.location.host;
          if (ele.href.substring(0, startPattern.length) == startPattern) {
            e.stopPropagation();
            e.preventDefault();
            var navPath = ele.href.substring(startPattern.length);
            if (navPath.substring(0, 6).toLowerCase() == '/help/')
              navPath = navPath.substring(5);
            if (e.ctrlKey && helpServer.allowCheck) {
              if (ele.className.indexOf('checkedHREF') >= 0) {
                ele.className = ele.className.replace(' checkedHREF', '').replace('checkedHREF', '');
                var i;
                for (i = 0; i < helpServer.checkedItems.length; ++i) {
                  if (helpServer.checkedItems[i] == navPath) {
                    helpServer.checkedItems.splice(i, 1);
                    break;
                  }
                }
              } else if (ele.className && ele.className != '') {
                ele.className += ' checkedHREF';
                helpServer.checkedItems.push(navPath);
              } else {
                ele.className = 'checkedHREF';
                helpServer.checkedItems.push(navPath);
              }
              debugger;
              if (helpServer.onCheckChanged)
                helpServer.onCheckChanged(helpServer.checkedItems);
            } else {
              window.top.helpServer.checkNavigation(navPath, 'load');
            }
          }
        }
      }
    }
    // Track metadata
    if (this.trackMetaData) {
      this.pageMetaData = {};
      if (helpTagType == 'iframe') {
        this.findMetadata(helpEle.contentDocument.body);
      } else {
        this.findMetadata(helpEle);
      }
      this.trackMetaData(this.pageMetaData);
    }

    var tocPtr = null;
    if (elemTOC) {
      if (elemTOC.tagName.toLowerCase() == "iframe") {
        if (elemTOC.contentWindow.tableOfContents) {
          tocPtr = elemTOC.contentWindow.tableOfContents;
        }
      } else if (tableOfContents) {
        tocPtr = tableOfContents;
      }
    }

    if (tocPtr
      && tocPtr.searchMode
      && tocPtr.searchText
      && tocPtr.searchText.length > 0
      ) {
      var replaceWithSearchTerm = tocPtr.searchText;
      if (this.originalHelpPath != path) {
        this.originalHelpPath = path;
        this.originalHelpPage = null;
      }
      if (!this.originalHelpPage) {
        if (helpTagType == 'iframe') {
          this.originalHelpPage = helpEle.contentDocument.body.innerHTML;
        } else {
          this.originalHelpPage = helpEle.innerHTML;
        }
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
        if (helpTagType == 'iframe') {
          helpEle.contentDocument.body.innerHTML = newPage;
        } else {
          helpEle.innerHTML = newPage;
        }
      }
      tocPtr.setSearchCount(index);
    }
  },
  ItemToggle: function (id) {
    if (this.onItemToggle) {
      this.onItemToggle(id);
    }
  },
  navigateHelpSearch: function (index) {
    var helpEle = document.getElementById('help');
    if (helpEle) {
      var docPtr = document;
      if( helpEle.tagName.toLowerCase() == "iframe" )
        docPtr = helpEle.contentDocument;
      var ele = docPtr.getElementById('searchterm_' + index);
      if (ele) {
        if (this.lastSearchedElement >= 0) {
          var oldEle = docPtr.getElementById('searchterm_' + this.lastSearchedElement);
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
  },
  removeNumericPrefix:  function (title) {
  		var length = 1;
  		while (length < title.length) {
  			var chr = title.substr(length, 1);
  			if ('0' <= chr && chr <= '9') {
  				++length;
  			} else if (chr == '_') {
  				++length;
  				var newtitle = title.substring(length);
  				if (newtitle && newtitle != '')
  					title = newtitle;
  				break;
  			} else {
  				break;
  			}
  		}
  		return title;
  	},
	cleanupHelpFilename : function (txt) {
    if( txt.substring(0,1) == '_' )
  	     txt = helpServer.removeNumericPrefix(txt);
		if( helpServer.config.escapes ) {
      var replaceAll = function (str, find, replace) {
        while (str.indexOf(find) >= 0)
          str = str.replace(find, replace);
        return str;
      };      
			var i;
			for( i = 0 ; i < helpServer.config.escapes.length ; ++i ) {
				var esc = helpServer.config.escapes[i];
				txt = replaceAll(txt,esc.from,esc.to);
			}
		}
		return txt;
	},  
  setDefaultPage: function(path) {
    if( helpServer.defaultPage != path ) {
      if( path === "" )
          path = null; 
      helpServer.defaultPage = path; 
      var path = "";
      if (window.location.hash)
        path = window.location.hash.substring(1);
      if( path === "" )  
          helpServer.loadHelpDiv(path);
    }
  }
};


//----- load helpserver config
var xmlhttp = new XMLHttpRequest();
xmlhttp.onload = function () {
	if (this.status == 200) {
		helpServer.config = JSON.parse(xmlhttp.responseText);
	}
};
xmlhttp.open("GET", "/config", true);
xmlhttp.send();
