var tableOfContents = {
	searchMode: false,
	searchCount: 0,
	searchIndex: 0,
	searchText: null,
	tocEle: null,
	lastSelection: null,
	allowCheck: false,
	checkedItems: [],
	onCheckChanged : null ,
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
	},
	tocLoaded: function () {
		this.tocEle = document.getElementById("TOC");
		this.tocEle.addEventListener("click", function (e) {			
			if (e.target) {
				if (e.target.id == "TOC") {
					return false;
				} else if (e.target.nodeName == "DIV") {
					if ( e.ctrlKey && tableOfContents.allowCheck ) {
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
							tableOfContents.checkedItems.push(e.target.id);
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
						if( tableOfContents.onCheckChanged ) {
							tableOfContents.onCheckChanged(tableOfContents.checkedItems);
						}
					} else if (this.lastSelection == e.target) {
						window.parent.helpServer.ItemToggle(e.target.id);
					} else {
						if (e.target.id) {
							window.parent.helpServer.checkNavigation(e.target.id, 'toc');
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
		});
		var eleHeader = document.getElementById('header');
		if (eleHeader) {
			eleHeader.innerHTML = [
				"	<div id=\"searchNav\">",
				"		<button id=\"searchNavFirst\" disabled=\"disabled\"  onclick=\"tableOfContents.searchFirst()\" ></button>",
				"		<button id=\"searchNavPrev\" disabled=\"disabled\" onclick=\"tableOfContents.searchPrev()\" ></button>",
				"		<button id=\"searchNavNext\" onclick=\"tableOfContents.searchNext()\" ></button>",
				"		<button id=\"searchNavLast\" onclick=\"tableOfContents.searchLast()\" ></button>",
				"		<div id=\"searchNavCount\">Select a page...</div>",
				"	</div>",
				"	<button id=\"searchClearButton\" onclick=\"tableOfContents.searchClear();\"></button>",
				"	<button id=\"searchButton\" onclick=\"tableOfContents.search();\"></button>",
				"	<div id=\"searchInput\"><input placeholder=\"Search...\" id=\"searchInputText\" onkeyup=\"var keyCode = event.charCode || event.keyCode; if(keyCode == 13){ tableOfContents.search();} else if(keyCode == 27){ tableOfContents.searchClear();}\" /></div>"
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
					var prefix = "/main#";
					var parts = window.location.pathname.split('/');
					// Remember the path
					if (parts.length > 2) {
						if (parts[1] != 'toc') {
							prefix = "/" + parts[1] + "/main#";
						}
					}
					for (i = 0; i < resultList.length; ++i) {
						html += "<a href=\"" + prefix + resultList[i].path + "\" target=\"_top\">" + resultList[i].title + "</a><br>";
					}
					tableOfContents.searchMode = true;
					document.getElementById("searchResults").innerHTML = html;
					document.body.className = 'searchActive';
				}
			};
			xmlhttp.open("GET", command, true);
			xmlhttp.send();
		}
	},
	searchClear: function () {
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
	searchFirst: function () {
		if (this.searchIndex > 0) {
			this.searchIndex = 0;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	searchPrev: function () {
		if (this.searchIndex > 0) {
			--this.searchIndex;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	searchNext: function () {
		if ((this.searchIndex + 1) < this.searchCount) {
			++this.searchIndex;
			this.setSearchBounds();
			window.parent.helpServer.navigateHelpSearch(this.searchIndex);
		}
	},
	searchLast: function () {
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
	DeselectChecked: function() {
		if( this.checkedItems.length ) {
		    // First uncheck the items	
			var i;
			for( i = 0 ; i < this.checkedItems.length ; ++i ) {
				var ele = document.getElementById(this.checkedItems[i]);
				if( ele ) {
					if( ele.className == "checkedselected" )
						ele.className = "selected";
					else
						ele.className = "";
				}
			}
			this.checkedItems = [];
			if( tableOfContents.onCheckChanged ) {
				tableOfContents.onCheckChanged(tableOfContents.checkedItems);
			}
		}		
	}
};