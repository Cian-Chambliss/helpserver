var tableOfContents = {
	anchorPrefix: "",
	searchMode: false,
	searchCount: 0,
	searchIndex: 0,
	searchText: null,
	tocEle: null,
	lastSelection: null,
	allowCheck: false,
	checkedItems: [],
	tocData: null,
	onCheckChanged: null,
	disableScrollTo: null,
	useLocalToc: null ,
	localTocData : null ,
	localFolderLevel: null ,
	altTocs: {} ,
	setSelectedPage: function (navToId) {
		var navTo = document.getElementById(navToId);
		if (!navTo) {
			navToId = decodeURI(navToId);
			navTo = document.getElementById(navToId);
		}
		if (navTo && this.lastSelection != navTo) {
			if (this.lastSelection != null) {
				if (this.lastSelection.className == "checkedselected") {
					this.lastSelection.className = "checked";
				} else {
					this.lastSelection.className = "";
				}
			}
			if (navTo.className == "checked")
				navTo.className = "checkedselected";
			else
				navTo.className = "selected";
			if (tableOfContents.disableScrollTo == navTo) {
				tableOfContents.disableScrollTo = null;
				tableOfContents.lastSelection = navTo;
			} else {
				var dad = navTo.parentNode;
				while (dad) {
					if (dad.style && dad.style.display == "none") {
						dad.style.display = "";
						dad = dad.parentNode;
						dad.className = "opened";
					}
					dad = dad.parentNode;
				}
				this.lastSelection = navTo;
				if (navTo.scrollIntoViewIfNeeded)
					navTo.scrollIntoViewIfNeeded();
				else
					navTo.scrollIntoView();
			}
			tableOfContents.populateBreadcrumbs();
		} else if( !navTo ) {
			var i;
			var deepestAltToc = null;
			if( helpServer.config.altTocs && helpServer.config.altTocs.length > 0 ) {
				for( i = 0 ; i < helpServer.config.altTocs.length ; ++i ) {
					 var prefix = helpServer.config.altTocs[i];
					 if( navToId.substring(0,prefix.length).toLowerCase() == prefix.toLowerCase() ) {
						 if( !deepestAltToc )
						 	deepestAltToc = prefix;
						 else if( deepestAltToc.length < prefix.length )
						 	deepestAltToc = prefix;	 
					 }
				}
			}	
			// Lets check for change of TOC...
			if( deepestAltToc && tableOfContents.useLocalToc != deepestAltToc ) {
				var priorHelpServerToc = tableOfContents.useLocalToc;
				tableOfContents.useLocalToc = deepestAltToc;					
				tableOfContents.localFolderLevel = deepestAltToc;				
				tableOfContents.localTocData = tableOfContents.altTocs[deepestAltToc];
				if( !tableOfContents.localTocData ) {				
					tableOfContents.altTocs[deepestAltToc] = { children: [] };
					var xmlhttp = new XMLHttpRequest();
					xmlhttp.onload = function () {
						if (this.status == 200) {
							var jsonText = xmlhttp.responseText;
							tableOfContents.localTocData = JSON.parse(jsonText);
							tableOfContents.altTocs[deepestAltToc] = tableOfContents.localTocData;
							tableOfContents.repopulateFromData(tableOfContents.localTocData);
						} else {
							helpServer.pageHasLocalTOC = false;
							tableOfContents.useLocalToc = null;
							tableOfContents.localFolderLevel = null;
							if( priorHelpServerToc && tableOfContents.tocData ) {
								tableOfContents.repopulateFromData(tableOfContents.tocData);
							}
						}
					};
					xmlhttp.open("GET", "/altToc" + deepestAltToc, true);
					xmlhttp.send('');
				}	
			} else if( helpServer.pageHasLocalTOC ) {								
				if( tableOfContents.useLocalToc != navToId ) {
					var priorHelpServerToc = tableOfContents.useLocalToc;
					tableOfContents.useLocalToc = navToId;
					tableOfContents.localFolderLevel = null;					
					var xmlhttp = new XMLHttpRequest();
					xmlhttp.onload = function () {
						if (this.status == 200) {
							var jsonText = xmlhttp.responseText;
							tableOfContents.localTocData = {children:JSON.parse(jsonText)};
							tableOfContents.completeLocalToc(tableOfContents.localTocData,navToId);
							tableOfContents.repopulateFromData(tableOfContents.localTocData);
						} else {
							helpServer.pageHasLocalTOC = false;
							tableOfContents.useLocalToc = null;
							if( priorHelpServerToc && tableOfContents.tocData ) {
								tableOfContents.repopulateFromData(tableOfContents.tocData);
							}
						}
					};
					xmlhttp.open("GET", "/structure" + navToId, true);
					xmlhttp.send('');
				}
			} else {
				if( tableOfContents.useLocalToc && tableOfContents.tocData ) {
					tableOfContents.useLocalToc = null;
					tableOfContents.repopulateFromData(tableOfContents.tocData);
				}
			}
		}
	},
	tocClickHandler: function (e) {
			if (e.target) {
				if (e.target.id == "TOC") {
					return false;
				} else if (e.target.nodeName == "DIV") {
					if (e.ctrlKey && tableOfContents.allowCheck) {
						// toggle selections...
						var addCheck = false;
						if (e.target.className == "selected") {
							e.target.className = "checkedselected";
							addCheck = true;
						} else if (e.target.className == "checkedselected") {
							e.target.className = "selected";
						} else if (e.target.className == "checked") {
							e.target.className = "";
						} else {
							e.target.className = "checked";
							addCheck = true;
						}
						if (addCheck) {
							// Add an item...
							if( e.target.id && e.target.id != '' ) {
								tableOfContents.checkedItems.push(e.target.id);
							}
						} else {
							// Remove an item...
							var i;
							for (i = 0; i < tableOfContents.checkedItems.length; ++i) {
								if (tableOfContents.checkedItems[i] == e.target.id) {
									tableOfContents.checkedItems.splice(i, 1);
									break;
								}
							}
						}
						if( e.shiftKey ) {
							if( e.target.nextElementSibling ) {
								if( e.target.nextElementSibling.tagName == 'UL' ) {
									var divs = e.target.nextElementSibling.getElementsByTagName('div');
									for (var i = 0; i < divs.length; i++) { 
									    if( divs[i].id && divs[i].id != '' ) { 
											if( divs[i].className == "" ) {
												divs[i].className = "checked";
												tableOfContents.checkedItems.push(divs[i].id);												
											}
									    }
									}									
								} 
							}							
						}
						if (tableOfContents.onCheckChanged) {
							tableOfContents.onCheckChanged(tableOfContents.checkedItems);
						}
					} else if (this.lastSelection == e.target) {
						window.parent.helpServer.ItemToggle(e.target.id);
					} else {
						if (e.target.id) {
							var navToId = e.target.id;
							tableOfContents.disableScrollTo = e.target;
							if (helpServer && helpServer.checkNavigation)
								helpServer.checkNavigation(navToId, 'toc');
							else
								window.parent.helpServer.checkNavigation(navToId, 'toc');
						} else {
							if (tableOfContents.lastSelection != null) {
								if (tableOfContents.lastSelection.className == "checkedselected") {
									tableOfContents.lastSelection.className = "checked";
								} else {
									tableOfContents.lastSelection.className = "";
								}
							}
							tableOfContents.lastSelection = e.target;
							if (e.target.className == "checked") {
								e.target.className = "checkedselected";
							} else {
								e.target.className = "selected";
							}
						}
					}
				} else if (e.target.nodeName == "LI" && e.target.getAttribute("branch") == "true") {
					var eleB = e.target.lastElementChild;
					if (eleB.style.display == "none") {
						eleB.style.display = "";
						e.target.className = "opened";
					} else {
						eleB.style.display = "none";
						e.target.className = "closed";
					}
				}
			}
		},
	tocLoaded: function () {
		tableOfContents.tocEle = document.getElementById("TOC");
		tableOfContents.tocEle.addEventListener("click", tableOfContents.tocClickHandler );
		var eleHeader = document.getElementById('header');
		if (eleHeader) {
			eleHeader.innerHTML = [
				"<div id=\"search\">",
				"	<div id=\"searchNav\">",
				"		<button id=\"searchNavFirst\" disabled=\"disabled\"  onclick=\"tableOfContents.searchFirst()\" ></button>",
				"		<button id=\"searchNavPrev\" disabled=\"disabled\" onclick=\"tableOfContents.searchPrev()\" ></button>",
				"		<button id=\"searchNavNext\" onclick=\"tableOfContents.searchNext()\" ></button>",
				"		<button id=\"searchNavLast\" onclick=\"tableOfContents.searchLast()\" ></button>",
				"		<div id=\"searchNavCount\">Select a page...</div>",
				"	</div>",
				"   <div id=\"searchBox\">",
				"       <button id=\"searchClearButton\" onclick=\"tableOfContents.searchClear();\"></button>",
				"	    <button id=\"searchButton\" onclick=\"tableOfContents.search();\"></button>",
				"	    <div id=\"searchInput\"><input placeholder=\"Search...\" id=\"searchInputText\" onkeyup=\"var keyCode = event.charCode || event.keyCode; if(keyCode == 13){ tableOfContents.search();} else if(keyCode == 27){ tableOfContents.searchClear();}\" /></div>",
				"   </div>",
				"</div>",
				"<div id=\"pageTitle\" ></div>",
				"<div id=\"breadcrumbs\" ></div>"
			].join('\n');
		}
		if (window.location.hash) {
			this.setSelectedPage(window.location.hash.substr(1));
		}
	},
	search: function () {
		var ele = document.getElementById("searchInputText");
		if (window.parent.helpServer)
			window.parent.helpServer.searchTerm = ele.value;
		this.searchText = ele.value;
		if (ele.value != '') {
			var command = "/search?limit=50&pattern=" + ele.value;
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onreadystatechange = function () {
				if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
					var resultList = JSON.parse(xmlhttp.responseText);
					var html = '';
					var i;
					var prefix = tableOfContents.anchorPrefix;
					if( !prefix ) {
						prefix = "/main#";
						var parts = window.location.pathname.split('/');
						// Remember the path
						if (parts.length > 2) {
							if (parts[1] != 'toc') {
								prefix = "/" + parts[1] + "/main#";
							}
						}
					}
					if( resultList.length > 0 ) {
						var j;
						var checkRepeats = true;
						while( checkRepeats ) {
							checkRepeats = false;
							for (i = 0; i < resultList.length; ++i) {
								var levelSep = resultList[i].title.indexOf(" / ");
								if( levelSep > 0 ) {
									var compareBranch = resultList[i].title.substring(0,levelSep+3);
									var repeatSection = false;
									var indentLevel = 1;
									if( resultList[i].indent ) {
										indentLevel += resultList[i].indent;
									} else {
										if( resultList[i].path.indexOf("#") > 0 )
										    repeatSection = true;
									}									
									for (j = i+1; j < resultList.length; ++j) {
										if( resultList[j].title.substring(0,levelSep+3) == compareBranch ) {
											resultList[j].title = resultList[j].title.substring(levelSep+3);
											resultList[j].indent = indentLevel;
											repeatSection = true;
										} else {
											break;
										}
									}
									if( repeatSection ) {
										var parentTitleHtml = "<div class=\"searchParentDiv\"";
										if( resultList[i].indent ) {
										    parentTitleHtml += " style=\"padding-left:"+(resultList[i].indent*4)+"pt;\" ";	
										}
										parentTitleHtml += " >"+ resultList[i].title.substring(0,levelSep)+"</div>";
										
										if( resultList[i].parentTitle ) {
											resultList[i].parentTitle += parentTitleHtml;
										} else {
											resultList[i].parentTitle = parentTitleHtml;
										} 
										resultList[i].title = resultList[i].title.substring(levelSep+3);
										resultList[i].indent = indentLevel;
										checkRepeats = true;
										break;
									}
								}
							}	
						}
					}
					for (i = 0; i < resultList.length; ++i) {	
						if( resultList[i].parentTitle )
						   html += resultList[i].parentTitle;						   
						html += "<a href=\"" + prefix + resultList[i].path + "\" target=\"_top\" id=\"search_"+resultList[i].path+"\" class=\"searchUnselected\" "
						if( resultList[i].indent )
						    html += " style=\"padding-left:"+(resultList[i].indent*4)+"pt;\" ";
						html += ">" + resultList[i].title + "</a>";
					}
					tableOfContents.searchMode = true;
					var headerEle = document.getElementById('header');
					document.getElementById("searchResults").innerHTML = html;
					if (headerEle)
						headerEle.className = 'searchActive';
					document.body.className = 'searchActive';
				}
			};
			xmlhttp.open("GET", command, true);
			xmlhttp.send();
		}
	},
	searchClear: function () {
		var headerEle = document.getElementById('header');
		if (headerEle)
			headerEle.className = '';
		document.body.className = '';
		this.searchMode = false;
	},
	setSearchBounds: function () {
		var leading = this.searchIndex < 1;
		var trailing = (this.searchIndex + 1) >= this.searchCount;
		var navFirst = document.getElementById('searchNavFirst');
		var navPrev = document.getElementById('searchNavPrev');
		var navNext = document.getElementById('searchNavNext');
		var navEnd = document.getElementById('searchNavLast');
		navFirst.disabled = leading;
		navPrev.disabled = leading;
		navNext.disabled = trailing;
		navEnd.disabled = trailing;
		document.getElementById("searchNavCount").innerHTML = (this.searchIndex + 1) + " of " + this.searchCount + " on page";
	},
	setSearchCount: function (count) {
		this.searchCount = count;
		if (count > 0) {
			this.searchIndex = 0;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		} else {
			document.getElementById("searchNavCount").innerHTML = "Select a page...";
			this.searchIndex = -1;
		}
	},
	trimExtraHash : function() {	
		if( document.location.hash.lastIndexOf("#") > 1 ) {
		     var hashes = document.location.hash.split("#");
			 document.location.hash = "#"+hashes[1];
		}
	},
	searchFirst: function () {
		tableOfContents.trimExtraHash();
		if (this.searchIndex > 0) {
			this.searchIndex = 0;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	searchPrev: function () {
		tableOfContents.trimExtraHash();
		if (this.searchIndex > 0) {
			--this.searchIndex;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	searchNext: function () {
		tableOfContents.trimExtraHash();
		if ((this.searchIndex + 1) < this.searchCount) {
			++this.searchIndex;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	searchLast: function () {
		tableOfContents.trimExtraHash();
		if ((this.searchIndex + 1) < this.searchCount) {
			this.searchIndex = this.searchCount - 1;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	selectTreeElement: function (path) {
		if (!this.searchMode) {
			this.setSelectedPage(path);
		}
	},
	DeselectChecked: function () {
		if (this.checkedItems.length) {
			// First uncheck the items	
			var i;
			for (i = 0; i < this.checkedItems.length; ++i) {
				var ele = document.getElementById(this.checkedItems[i]);
				if (ele) {
					if (ele.className == "checkedselected")
						ele.className = "selected";
					else
						ele.className = "";
				}
			}
			this.checkedItems = [];
			if (tableOfContents.onCheckChanged) {
				tableOfContents.onCheckChanged(tableOfContents.checkedItems);
			}
		}
	},
	repopulateFromData: function (_tocData) {
		if( tableOfContents.tocEle) {		
			var buildTree = function (res, isOpen) {
				if( res && res.length ) {
					var ulList = isOpen ? "<ul>\n" : "<ul style=\"display:none\">\n";
					var i;
					for (i = 0; i < res.length; ++i) {
						if (res[i].children) {
							ulList += "<li branch=\"true\" class=\"closed\" >";
						} else {
							ulList += "<li class=\"leaf\" >";
						}
						if (res[i].path) {
							if(	res[i].ignoreBreadcrumbs ) {
								if (res[i].hash)
									ulList += "<div id=\"" + res[i].path + "#" + res[i].hash + "\" ignoreBreadcumbs=\"true\" >" + res[i].title + "</div>";
								else
									ulList += "<div id=\"" + res[i].path + "\" ignoreBreadcumbs=\"true\" >" + res[i].title + "</div>";
							} else if (res[i].hash)
								ulList += "<div id=\"" + res[i].path + "#" + res[i].hash + "\">" + res[i].title + "</div>";
							else
								ulList += "<div id=\"" + res[i].path + "\">" + res[i].title + "</div>";
						} else
							ulList += "<div>" + res[i].title + "</div>";
						if (res[i].children)
							ulList += buildTree(res[i].children, false);
						ulList += "</li>\n"
					}
					ulList += "</ul>\n";
					return ulList;
				}
				return "";
			};
			tableOfContents.tocEle.innerHTML = buildTree(_tocData.children, true);
			if (window.location.hash != '') {
				var path = window.location.hash.substring(1);
				tableOfContents.setSelectedPage(path);
			}
		}
	},
	tocPopulate: function () {
		this.tocLoaded();	
		var parts = window.location.pathname.split('/');
		var command = "/toc.json";
		// Remember the path
		if (parts.length > 2) {
			if (parts[1] != 'main') {
				command = "/" + parts[1] + "/toc.json";
			}
		}
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onload = function () {
			if (this.status == 200) {
				tableOfContents.tocData = JSON.parse(xmlhttp.responseText);
				if( tableOfContents.localTocData ) {
				    tableOfContents.repopulateFromData(tableOfContents.localTocData );	
				} else {
					tableOfContents.repopulateFromData(tableOfContents.tocData);
				    if( tableOfContents.tocData.path ) {
						  helpServer.setDefaultPage( tableOfContents.tocData.path );					
					}
				}				
			}
		};
		xmlhttp.open("GET", command, true);
		xmlhttp.send('');
	},
	completeLocalToc: function(_tocData,navToId) {
		var processTree = function (res) {
			if( res && res.length ) {
				var i;
				for (i = 0; i < res.length; ++i) {
					if( !res[i].path )
						res[i].path = navToId;
					if( res[i].children)
						processTree(res[i].children);
				}
			}
		};
		if( !_tocData.path )
			_tocData.path = navToId;
		processTree(_tocData.children);
	},
	selectCurrentTOC: function () {
		if (tableOfContents.lastSelection) {
			if (this.lastSelection.className = "selected") {
				this.lastSelection.className = "checkedselected";
				tableOfContents.checkedItems.push(tableOfContents.lastSelection.id);
				if (tableOfContents.onCheckChanged) {
					tableOfContents.onCheckChanged(tableOfContents.checkedItems);
				}
			}
		}
	},
	advanceNextTOC: function () {
		if (tableOfContents.lastSelection) {
			var pNode = tableOfContents.lastSelection.parentNode.nextSibling;
			while (pNode) {
				if (pNode) {
					if (pNode.nextSibling && pNode.nextSibling.firstChild && pNode.nextSibling.firstChild.tagName == 'DIV' && pNode.nextSibling.firstChild.id) {
						var navToId = pNode.nextSibling.firstChild.id;
						if (helpServer && helpServer.checkNavigation)
							helpServer.checkNavigation(navToId, 'toc');
						else
							window.parent.helpServer.checkNavigation(navToId, 'toc');
					} else if (pNode.firstChild && pNode.firstChild.tagName == 'DIV') {
						var navToId = pNode.firstChild.id;
						if( navToId ) {
							if (helpServer && helpServer.checkNavigation)
								helpServer.checkNavigation(navToId, 'toc');
							else
								window.parent.helpServer.checkNavigation(navToId, 'toc');
						}
					} else if (pNode.parentNode && pNode.parentNode != pNode) {
						pNode = pNode.parentNode;
						continue;
					}
				}
				break;
			}
		}
	},
	getBreadcrumbsLow : function(elem){
		var fullPath = '';
		if( elem ) {
			var filename = elem.id;
			var namePos = filename.lastIndexOf('/');
			if( namePos > 0 ) {
				filename = filename.substr(namePos+1);
				if( filename.lastIndexOf('.') > 0 ) {
					fullPath = filename;
				} 
			}		
			if( fullPath == '' )	 						
			    fullPath = elem.innerText.trim();
			if( elem.parentElement 
			 && elem.parentElement.parentElement 
			 && elem.parentElement.parentElement.previousElementSibling
			 && elem.parentElement.parentElement.previousElementSibling.id
			 && elem.parentElement.parentElement.previousElementSibling.getAttribute("ignoreBreadcumbs") !== "true" 
			  ) {
				 var prefix = elem.parentElement.parentElement.previousElementSibling.id;
				 var extnPos = prefix.lastIndexOf('.');
				 if( extnPos > 0 ) {
					 var extn = prefix.substr(extn).toLowerCase();
					 if( extn == ".html" || extn == ".md" || extn == ".xml" ) {
						 // we have an actual page - need to recurse	
						 prefix = tableOfContents.getBreadcrumbsLow(elem.parentElement.parentElement.previousElementSibling);
					 } 
				 } 
		     	fullPath = prefix + "/" + fullPath;
			}
		}
		return fullPath;
	},
	getBreadcrumbs : function() {
		var fullPath = '';
		if( tableOfContents.lastSelection ) {
			fullPath = tableOfContents.getBreadcrumbsLow( tableOfContents.lastSelection );
		} 
		return fullPath;
	},
	populateBreadcrumbs : function() {
		var breadCrumbs = document.getElementById("breadcrumbs");
		var titleElem = document.getElementById("pageTitle");
		var elementName = tableOfContents.getBreadcrumbs();
		if( elementName && elementName != '' ) {
			var breadCrumbMarkup = "";
			var cleanPageName = "";
			var levels = [];
			if( tableOfContents.useLocalToc && !tableOfContents.localFolderLevel ) {
			   breadCrumbMarkup += " / ";
			    var buildLocalBreadcrumb = function( topics ) {
					var i;
					for( i = 0 ; i < topics.length ; ++i ) {
						if( ("#"+topics[i].path + "#" + topics[i].hash) == document.location.hash ) {
							cleanPageName = topics[i].title;
							return topics[i].title;
						} else if( topics[i].children && topics[i].children.length > 0 ) {
							var branch = buildLocalBreadcrumb(topics[i].children);
							if( branch ) {
								return  "<a onclick=\"tableOfContents.clickBreadCrumbs('"+(topics[i].path + "#" + topics[i].hash)+"')\">"+ topics[i].title + "</a> / " + branch;
							}
						} 
					}
				   return null;
			    }
				var childPtr = buildLocalBreadcrumb( tableOfContents.localTocData.children );
				if( childPtr ) {
					breadCrumbMarkup += childPtr;
				}			
			} else {
				elementName = elementName.replace('#','/');
				elementName = elementName.replace('#','/');
				var i , j;
				var startAt = 1;
				levels = elementName.split('/');
				if( tableOfContents.useLocalToc && tableOfContents.localFolderLevel ) {
					var removeLevels = tableOfContents.localFolderLevel.toLowerCase().split("/");
					for( i = 1 ; i < (levels.length-1) && i < removeLevels.length ; ++i ) {
						if( levels[i].toLowerCase() != removeLevels[i] )
							break;
						startAt = i + 1;
					}
				}
				
				for( i = startAt ; i < (levels.length-1) ; ++i ) {
					if( i > startAt )
						breadCrumbMarkup += " / "; 				
					breadCrumbMarkup += "<a onclick=\"tableOfContents.clickBreadCrumbs('";
					for( j = startAt ; j <= i ; ++j ) {
						breadCrumbMarkup += "/" + levels[j];
					}
					var leveltext = levels[i];
					if( leveltext.length > 5 && leveltext.substring(leveltext.length-5).toLowerCase() == ".html") {
						leveltext = leveltext.substring(0,leveltext.length-5);					
					}
					breadCrumbMarkup += "')\">"+leveltext+"</a>";
				}
				cleanPageName = helpServer.cleanupHelpFilename( levels[levels.length-1] );
				if( levels.length > 1 ) {
					var lastLevel = levels[levels.length-2];
					if( lastLevel.toLowerCase() == cleanPageName.substr(0,lastLevel.length).toLowerCase() ) {
						var newName = cleanPageName.substr(lastLevel.length);
						if( newName.length > 1 ) {
							var sepChr = newName.substr(0,1);
							if( sepChr == '.' || sepChr == ' ' || sepChr == ':' ) {
								cleanPageName = newName.trim();
							}						
						}
					}
				}
			}			
			breadCrumbs.innerHTML = breadCrumbMarkup;
			titleElem.innerHTML = cleanPageName; 
		}		
	},
	clickBreadCrumbs: function(path) {
		if (helpServer && helpServer.checkNavigation)
			helpServer.checkNavigation(path, 'breadcrumbs');
		else
			window.parent.helpServer.checkNavigation(path, 'breadcrumbs');
	}
};