var helpEditor = {
	checkedList: [],
	checkedList0: [],
	checkedList1: [],
	keywords: [],
	keywordsChecked : "" ,
	keywordDirty : false ,
	currentMedataData : null ,
	lastPageEdited : null,	
	suggestPathHandler : null ,
	suggestPath : "" ,
	trackCheckChangedMerge: function () {
		var checked = document.getElementById('checkedStatus');
		this.checkedList = this.checkedList0.concat(this.checkedList1);
		if (helpEditor.checkedList.length > 1)
			checked.innerHTML = helpEditor.checkedList.length + " Items Checked";
		else if (helpEditor.checkedList.length > 0)
			checked.innerHTML = "1 Item Checked";
		else
			checked.innerHTML = "No Items Checked";
	},
	trackCheckChanged: function (list) {
		helpEditor.checkedList0 = list;
		helpEditor.trackCheckChangedMerge();
				},
				trackHREFCheckChange: function (list) {
		helpEditor.checkedList1 = list;
		helpEditor.trackCheckChangedMerge();
				},
				tocLoaded: function () {
		var iframeToc = document.getElementById('toc');
		if (iframeToc) {
			iframeToc.contentWindow.tableOfContents.allowCheck = true;
			iframeToc.contentWindow.tableOfContents.onCheckChanged = this.trackCheckChanged;
		}
				},
				Deselect: function () {
		var iframeToc = document.getElementById('toc');
		if (iframeToc) {
			iframeToc.contentWindow.tableOfContents.DeselectChecked();
		}
	},
	RefreshServer: function (metadata) {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onload = function () {
			if (this.status == 200) {
				window.location.reload();
			}
		};
		xmlhttp.open("POST", "/admin/refresh", true);
		xmlhttp.send(JSON.stringify(metadata));
	},
	SetMetadata: function (metadata) {
		if (metadata.pages.length > 0) {
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onload = function () {
				if (this.status == 200) {
					if( !metadata.norefresh )
						helpEditor.RefreshServer();
				}
			};
			xmlhttp.open("POST", "/admin/metadata", true);
			xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			xmlhttp.send(JSON.stringify(metadata));
		} else {
			alert('no pages are checked.');
		}
	},
	ApplyTags: function () {
		var tagNames = document.getElementById('tagNames');
		if (tagNames.value && tagNames.value.length > 0) {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { tags: tagNames.value };
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
				tableOfContents.advanceNextTOC();
			}
			for (i = 0; i < this.checkedList.length; ++i) {
				tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty tag');
		}
	},
	ApplyGroup: function () {
		var groupName = document.getElementById('groupName');
		if (groupName.value && groupName.value.length > 0) {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { group: groupName.value };
			var matchPath = '';
			var pathLen = 0;
			var fullPath = groupName.value;
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
				tableOfContents.advanceNextTOC();
			}
			if (this.checkedList.length > 0) {
				matchPath = this.checkedList[0];
				pathLen = matchPath.lastIndexOf("/");
				matchPath = matchPath.substring(0, pathLen);
				fullPath = matchPath + '/';
				var gname = groupName.value;
				if (gname.substring(0, 1) == '/') {
					fullPath = gname;
				} else {
					if (gname.substring(0, 3) == '../') {
						while (gname.substring(0, 3) == '../') {
							gname = gname.substring(3);
							fullPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
							fullPath = fullPath.substring(0, fullPath.lastIndexOf('/')) + '/';
						}
					}
					if (gname.length > 0) {
						fullPath += gname;
					}
				}
			}
			var fullyQualifiedMetadata = { group: fullPath };

			for (i = 0; i < this.checkedList.length; ++i) {
				if (i > 0 && ((pathLen != this.checkedList[i].lastIndexOf("/")) || this.checkedList[i].substring(0, pathLen) != matchPath)) {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: fullyQualifiedMetadata });
				} else {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
				}
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty group');
		}
	},
	ApplyStatus: function () {
		var statusName = document.getElementById('statusName');
		if (statusName.value && statusName.value.length > 0 && statusName.value != 'none' && statusName.value != 'None') {
			var tagEdits = { pages: [], patch: true };
			var i;
			var metadata = { status: statusName.value };
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
			}
			for (i = 0; i < this.checkedList.length; ++i) {
				tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty status');
		}
	},
	SaveNote: function () {
		var notes = document.getElementById('notes');
		if (notes.value && notes.value.length > 0) {
			var tagEdits = { pages: [], patch: true , norefresh:true };
			var i;
			var metadata = { notes: notes.value };
			if (this.checkedList.length < 1) {
				tableOfContents.selectCurrentTOC();
			}
			for (i = 0; i < this.checkedList.length; ++i) {
				tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
			}
			this.SetMetadata(tagEdits);
		} else {
			alert('cannot apply an empty notes (use "fixed" if reviewed page was fixed)');
		}
	},
	trackMetaData: function (mdata) {
		if( helpEditor.lastPageEdited ) {
			helpEditor.ApplyChanged(helpEditor.lastPageEdited);
		}
		var tagNames = document.getElementById('tagNames');
		var groupName = document.getElementById('groupName');
		var statusName = document.getElementById('statusName');
		var pagePath = document.getElementById('pagePath');
		var notes = document.getElementById('notes');
		var pageName = document.getElementById('pageName');
		var kw = document.getElementById('keywords');
		var i;
		helpEditor.currentMedataData = mdata;
		helpEditor.lastPageEdited = tableOfContents.lastSelection ? tableOfContents.lastSelection.id : '';
		helpEditor.keywordDirty = false;
		
		if( helpEditor.suggestPathHandler ) {
			helpEditor.suggestPath = helpEditor.suggestPathHandler( mdata.keywords || "" );
			var spEle = document.getElementById("SuggestPath");
			if( spEle ) {
				if( helpEditor.suggestPath === '' ) {
					spEle.style.display = "none";
					spEle.innerHTML = "";
				} else {				
					spEle.style.display = "inline-block";							
					spEle.innerHTML = "Set "+helpEditor.suggestPath;
				}
			}
		}		
		if( tagNames ) {
			tagNames.value = mdata.tags || "";
			tagNames.className = "";
			groupName.value = mdata.group || "";
			groupName.className = "";
			notes.value = mdata.notes || "";
			notes.className = "";
			pageName.value = mdata.pagename || "";
			pageName.className = "";
			statusName.value = mdata.status || "";
			statusName.className = "";
			if( kw ) {
				var keywords = mdata.keywords || "";
				for( i = 0 ; i <  helpEditor.keywords.length ; ++i ) {
					var keywordEle = document.getElementById("keyword"+helpEditor.keywords[i]);
					if( keywordEle ) {					
						var labelEle = document.getElementById(keywordEle.id+"label");
					    if( keywords.indexOf(keywordEle.value) >= 0 ) {
							keywordEle.checked = true;
							labelEle.className = "keywordchecked";
						} else {
							keywordEle.checked = false;
							labelEle.className = ""; 
						}
					}
				}
			}
			var levels = helpServer.currentPath.split('/');
			levels.splice(levels.length - 1, 1);
			if (mdata.group && mdata.group != '') {
				var groupName = mdata.group;
				if (groupName.substring(0, 1) == '/') {
					levels = groupName.split('/');
				} else {
					while (groupName.substring(0, 3) == '../') {
						levels.splice(levels.length - 1, 1);
						groupName = groupName.substr(3);
					}
					if (groupName != '')
						levels = levels.concat(groupName.split('/'));
				}
			}			
			pagePath.value = decodeURI(levels.join('/'));
		}		
	},
 	refreshHelpTopics: function () {
			document.getElementById('refreshButton').innerHTML = "Refreshing...";
			var xmlhttp = new XMLHttpRequest();
			xmlhttp.onload = function () {
				if (this.status == 200) {
					document.getElementById('refreshButton').innerHTML = "Refreshed...";
					window.location.reload();
				}
			};
			xmlhttp.open("POST", "/admin/refresh", true);
			xmlhttp.send('');
	},
	addControls : function() {
		setTimeout(function() {
		var headerDiv = document.getElementById('header');
		var editDiv = document.createElement('div');
		editDiv.id = "editor";
		editDiv.style.height = "120px";
		editDiv.style.position = "absolute";
		editDiv.style.left = "0px";
		editDiv.style.top = "0px";
		editDiv.style.background = "#2c3e50"; 
		headerDiv.appendChild(editDiv);		
		var helpDiv = [
			'	<div style="float:left;width:107pt;" id="checkedStatus" >No Items Checked</div>',
			'	<button id="Deselect" onclick="helpEditor.Deselect()">Deselect</button>&nbsp;Tags&nbsp;',
			'	<input id="tagNames"  onkeyup="helpEditor.Changed(\'tagNames\')" ></input>',
			'   <button id="reviewButton" onclick="helpEditor.addTagText(\'review\')" >Review</button>',
			'&nbsp;Group&nbsp;',
			'	<input id="groupName"  onkeyup="helpEditor.Changed(\'groupName\')" ></input>',
			'	<button id="SuggestPath" onclick="helpEditor.SuggestPath()"></button>',
			'&nbsp;Notes&nbsp;',
			'	<input id="notes"  onkeyup="helpEditor.Changed(\'notes\')" ></input>',
			'	Status &nbsp;',
			'	<select id="statusName" onchange="helpEditor.Changed(\'statusName\')" >',
			'	  <option value="">None</option>',
			'	  <option value="pending">Pending</option>',
			'	  <option value="reject">Reject</option>',
			'	  <option value="accept">Accept</option>',
			'	</select>',			
			'	Page Name &nbsp;',
			'	<input id="pageName"  onkeyup="helpEditor.Changed(\'pageName\')" ></input>',
			'	<br/>',
			'	</div>Page Path &nbsp;',
			'	<input id="pagePath" style="width:5in"></input>',
			'	<button onclick="helpEditor.refreshHelpTopics()" id="refreshButton" >Refresh ...</button>',
			'	<button id="RevertChanged" onclick="helpEditor.RevertChanged()">Revert Changed</button>',
			'	<button id="ApplyChanged" onclick="helpEditor.ApplyChanged()">Apply Changed</button>'].join('\n');
		if( helpServer.config && helpServer.config.keywords ) {
			var i;
			var keywordList = [];
			helpDiv += "<br><div id=\"keywords\" onclick=\"helpEditor.keywordsChanged(event)\" >";
			for( i = 0 ; i < helpServer.config.keywords.length ; ++i ) {
				var  kw = helpServer.config.keywords[i];
				//if( i*2 == (helpServer.config.keywords.length & 254) )
				//	helpDiv += "<br>";	
				if( typeof kw === 'string' ) {
   			    	helpDiv += '<span><input type="checkbox" id="keyword'+kw+'" value="'+kw+'"/><label id="keyword'+kw+'label" for="keyword'+kw+'" >'+kw+'</label></span> ';
				    keywordList.push(kw);
				} else if( kw.group ) {
					var j;					
					if( kw.exclusive ) {
						helpDiv += '<div class="keywordgroup" helpexclusive="';
						for( j = 0 ; j < kw.group.length ; ++j ) {
							if( j > 0 )
								helpDiv += ",";
							helpDiv += kw.group[j];
						}
						helpDiv += '">';
					} else {
						helpDiv += '<div class="keywordgroup" >';
					}
					for( j = 0 ; j < kw.group.length ; ++j ) {
						if( typeof kw.group[j] === 'string' ) {
							var member = kw.group[j];
		   			    	helpDiv += '<span><input type="checkbox" id="keyword'+member+'" value="'+member+'"/><label id="keyword'+member+'label" for="keyword'+member+'" >'+member+'</label></span>';							
							keywordList.push(kw.group[j]);
						}
					}
					helpDiv += '</div>';
				}
			}
			helpDiv += "<button id=\"ApplyKeywords\" onclick=\"helpEditor.ApplyKeywords()\">Apply Keywords</button></div>";
			helpEditor.keywords = keywordList;
		} else {
			helpDiv += "<br>No keywords defined";
		}	 			
		editDiv.innerHTML = helpDiv;
		if( helpEditor.currentMedataData ) {
			helpEditor.trackMetaData(helpEditor.currentMedataData);
		}
		},500);
	},
	keywordsChanged :  function(event) {
		if( event.target.id.substr(0,7) == 'keyword' && event.target.id != 'keywords' ) {
			var kw = document.getElementById('keywords');
			var i;
			var keywords = '';
			for( i = 0 ; i <  helpEditor.keywords.length ; ++i ) {
				var keywordEle = document.getElementById("keyword"+helpEditor.keywords[i]);			
				if( keywordEle.checked  ) {
					if( keywords.length > 0 )
					   keywords += ",";
					keywords += keywordEle.value;
				}
			}
			helpEditor.keywordsChecked = keywords;
			helpEditor.keywordDirty = true;
			var checkBox = document.getElementById(event.target.id);
			if( checkBox.parentElement && checkBox.parentElement.parentElement ) {
				 var exclusiveList = checkBox.parentElement.parentElement.getAttribute("helpexclusive");
				 if( exclusiveList ) {
					 var grouping = exclusiveList.split(',');					 
					 for ( i = 0 ; i < grouping.length ; ++i ) {
						 var otherId = "keyword"+grouping[i];
						 if( otherId != event.target.id ) {
							 var checkBoxOther = document.getElementById(otherId);
							 checkBoxOther.checked = false;
						 }
					 }
				 }				
			}			
			helpEditor.Changed(event.target.id+'label');
			if( helpEditor.suggestPathHandler ) {
				helpEditor.suggestPath = helpEditor.suggestPathHandler( helpEditor.keywordsChecked );
				var spEle = document.getElementById("SuggestPath");
				if( spEle ) {
					if( helpEditor.suggestPath === '' ) {
						spEle.style.display = "none";
						spEle.innerHTML = "";
					} else {				
						spEle.style.display = "inline-block";							
						spEle.innerHTML = "Set "+helpEditor.suggestPath;
					}
				}
			}		
		}
	},
	ApplyKeywords :  function() {
		var kw = document.getElementById('keywords');
		if( helpEditor.keywordsChecked.length > 0 ) {
			if (this.checkedList.length > 0 ) {
				var tagEdits = { pages: [], patch: true , norefresh:true };
				var i;
				var metadata = { keywords: helpEditor.keywordsChecked };
				for (i = 0; i < this.checkedList.length; ++i) {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
				}
				this.SetMetadata(tagEdits);
			}
		} else {
			alert('cannot apply an empty keywords');
		}		
	},
	Changed : function(id) {
		var ele = document.getElementById(id);
		ele.className = "dirty";
	},
	addTagText : function(tag) {
	   // TBD  - edit the tag
	   var tagNames = document.getElementById('tagNames');
	   if( tagNames.value.indexOf(tag) < 0 ) {
		   if( tagNames.value.length > 0 )
		       tagNames.value += ","+tag;
		   else	   
			    tagNames.value = tag;
			helpEditor.Changed('tagNames');				
	   }
	},
	ApplyChanged: function(oldSelection) {
		var tagNames = document.getElementById('tagNames');
		var groupName = document.getElementById('groupName');
		var statusName = document.getElementById('statusName');
		var pagePath = document.getElementById('pagePath');
		var notes = document.getElementById('notes');
		var pageName = document.getElementById('pageName');
		var kw = document.getElementById('keywords');
		var i;
		var tagEdits = { pages: [], patch: true };
		var metadata = { };
		var matchPath = '';
		var pathLen = 0;
		var fullPath = groupName.value;
		var fullGroupMetadata = null;
		var dirty = false;
		var norefresh = true;
		
		if( tagNames ) {
			if( tagNames.className != "" ) {
				metadata.tags = tagNames.value;
				dirty = true;
				norefresh = false;
			}
			if( notes.className != "" ) {
				metadata.notes = notes.value;
				dirty = true;
			}
			if( pageName.className != "" ) {
				metadata.pagename = pageName.value;
				dirty = true;				 
			}
			if( statusName.className != "" ) {
				metadata.status = statusName.value;
				dirty = true; 
				norefresh = false;
			}
			if( helpEditor.keywordDirty ) {
				metadata.keywords = helpEditor.keywordsChecked;
				dirty = true;
			}
			if( groupName.className != "" ) {
				metadata.group = groupName.value;
				dirty = true;
				norefresh = false;
				if (this.checkedList.length > 0) {
					matchPath = this.checkedList[0];
					pathLen = matchPath.lastIndexOf("/");
					matchPath = matchPath.substring(0, pathLen);
					fullPath = matchPath + '/';
					var gname = groupName.value;
					if (gname.substring(0, 1) == '/') {
						fullPath = gname;
					} else {
						if (gname.substring(0, 3) == '../') {
							while (gname.substring(0, 3) == '../') {
								gname = gname.substring(3);
								fullPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
								fullPath = fullPath.substring(0, fullPath.lastIndexOf('/')) + '/';
							}
						}
						if (gname.length > 0) {
							fullPath += gname;
						}
					}
					fullGroupMetadata = JSON.parse(JSON.stringify(metadata));
					fullGroupMetadata.group = fullPath;
				}				
			}
		}
		if( dirty ) {
			if( oldSelection ) {
				tagEdits.pages.push({ path:oldSelection, metadata: metadata , norefresh : norefresh });
			} else if( this.checkedList.length < 1 ) {
				if( tableOfContents.lastSelection ) {
					tagEdits.pages.push({ path:tableOfContents.lastSelection.id, metadata: metadata , norefresh : norefresh });
				}
			} else if( fullGroupMetadata ) {
				for (i = 0; i < this.checkedList.length; ++i) {
					if (i > 0 && ((pathLen != this.checkedList[i].lastIndexOf("/")) || this.checkedList[i].substring(0, pathLen) != matchPath)) {
						tagEdits.pages.push({ path: this.checkedList[i], metadata: fullGroupMetadata });
					} else {
						tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata });
					}
				}
			} else {
				for (i = 0; i < this.checkedList.length; ++i) {
					tagEdits.pages.push({ path: this.checkedList[i], metadata: metadata , norefresh : norefresh });
				}			
			}
			this.SetMetadata(tagEdits);
			tagNames.className = "";
			groupName.className = "";
			notes.className = "";
			statusName.className = "";
			pageName.className = "";
			if( kw ) {
				for( i = 0 ; i <  helpEditor.keywords.length ; ++i ) {
					var keywordEle = document.getElementById("keyword"+helpEditor.keywords[i]);			
					if( keywordEle ) {					
						var labelEle = document.getElementById(keywordEle.id+"label"); 
						if( labelEle.className != "" ) {
							labelEle.className = "";
							break;
						} 
					}
				}
			}
			
		} else if( !oldSelection ) {
			alert('Nothing is yet dirty');
		}
	},
	RevertChanged : function() {
	},
	SuggestPath : function() {
		if( helpEditor.suggestPath !== ''  ) {
			var groupName = document.getElementById('groupName');
			groupName.value =  helpEditor.suggestPath;
			groupName.className = "dirty";
		}
	}
};
helpServer.trackMetaData = helpEditor.trackMetaData;
helpServer.allowCheck = true;
helpServer.onCheckChanged = function (list) {
	helpEditor.trackHREFCheckChange(list);
}
