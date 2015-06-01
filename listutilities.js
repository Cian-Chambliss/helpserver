/**
 * Using a flat list of titles, generate an return tree
 */
module.exports = function (config) {
	var nameReplacements = config.escapes;

	function ListUtilities() {
	};

	ListUtilities.prototype.replaceAll = function (str, find, replace) {
		while (str.indexOf(find) >= 0)
			str = str.replace(find, replace);
		return str;
	};

	ListUtilities.prototype.cleanupName = function (name) {
		var i;
		for (i = 0; i < nameReplacements.length; ++i) {
			if (name.indexOf(nameReplacements[i].from) >= 0) {
				name = this.replaceAll(name, nameReplacements[i].from, nameReplacements[i].to);
			}
		}
		return name;
	};
	var removeNumericPrefix = function (title) {
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
	};
	ListUtilities.prototype.sortTree = function (tree) {
		var i = 0;
		for (i = 0; i < tree.length; ++i) {
			if (tree[i].children && tree[i].children.length > 0)
				tree[i].children = this.sortTree(tree[i].children);
		}
		if (tree.length > 1) {
			tree.sort(function compare(a, b) {
				var aTitle = a.title.toLowerCase().trim();
				var bTitle = b.title.toLowerCase().trim();
				if (aTitle < bTitle)
					return -1;
				if (aTitle > bTitle)
					return 1;
				return 0;
			});
		}
		if (tree.length > 0) {
			for (i = 0; i < tree.length; ++i) {
				if (tree[i].title.substr(0, 1) == '_') {
					tree[i].title = removeNumericPrefix(tree[i].title);
				}
			}
		}
		return tree;
	};

	ListUtilities.prototype.expandTocChildren = function (item, list) {
		var output = [];
		var i;
		for (i = 0; i < list.length; ++i) {
			var subitem = list[i];
			var kids = null;
			if (subitem.children) {
				kids = this.expandTocChildren(item, subitem.children);
			}
			if (kids) {
				output.push({ title: subitem.title, hash: subitem.hash, path: item.path, children: kids });
			} else {
				output.push({ title: subitem.title, hash: subitem.hash, path: item.path });
			}
		}
		if (output.length)
			return output;
		return null;
	};

	ListUtilities.prototype.expandSubToc = function (tree) {
		var i = 0;
		// Children first
		for (i = 0; i < tree.length; ++i) {
			if (tree[i].children && tree[i].children.length > 0)
				tree[i].children = this.expandSubToc(tree[i].children);
		}
		// Then this level
		for (i = 0; i < tree.length; ++i) {
			if (tree[i].toc) {
				var thisToc = tree[i].toc;
				tree[i].toc = undefined;
				var tocChildren = this.expandTocChildren(tree[i], thisToc);
				if (tocChildren) {
					if (!tree[i].children)
						tree[i].children = tocChildren;
					else
						tree[i].children = tree[i].children.concat(tocChildren);
				}
			}
		}
		return tree;
	};
	
	ListUtilities.prototype.findNode = function (tree,name) {
		var i;
		for( i = 0 ; i < tree.length ; ++i )
		    if( tree[i].title.toLowerCase() == name )
				return i;
		return -1;
	}
	
	// Remove a node from the tree...
	ListUtilities.prototype.removeNode = function (tree,name) {
		if( name ) {
			var levels = name.split('/');
			if( levels.length > 0 && levels[0] === '' ) {
				levels.splice(0,1);
			}
			if( levels.length > 0 ) {
				var index = this.findNode(tree,levels[0].toLowerCase());
				if( index >= 0 ) {
					if( levels.length > 1 ) {
						if( tree[index].children ) {
							levels.splice(0,1);
							this.removeNode(tree[index].children,levels.join('/'));
						}
					} else {
						tree.splice(index,1);
					}
				}		
			}
		}
		return tree;
	};
	
	// Get a pointer to a node
	ListUtilities.prototype.getNode = function (tree,name) {
		var node = null;
		if( name ) {
			var levels = name.split('/');
			var i;
			for( i = 0 ; i < levels.length ; ++i ) {
				if( levels[i] !== '' ) {
					var index = this.findNode(tree,levels[i].toLowerCase());
					if( index >= 0 ) {
						if(  (i+1) == levels.length ) {
							node = tree[index];
							break;
						} 
						tree = tree[index].children;
					} else {
						break;
					}
				}
			}
		}	
		return node;
	};
	
	ListUtilities.prototype.addNode = function (tree,name,node) {
		if( name && node ) {
			var levels = name.split('/');
			var i;
			for( i = 0 ; i < levels.length ; ++i ) {
				if( levels[i] !== '' ) {
					var index = this.findNode(tree,levels[i].toLowerCase());
					if( index >= 0 ) {
						if(  (i+1) == levels.length ) {
							// Make sure title gets set (use case of new name)
							tree[index].title = levels[i];
							// Set the path for the node
							if( node.path )
								tree[index].path = node.path;
							// merge any child nodes....	
							if( node.children ) {
								if( tree[index].children )
									tree[index].children = tree[index].children.concat(node.children);
								else
									tree[index].children = node.children;
							}
							break;
						} else {
							if( !tree[index].children )
								tree[index].children = [];
							tree = tree[index].children;					
						} 
					} else if(  (i+1) == levels.length ) {
						node.title = levels[i];
						tree.push(node);
						break;
					} else {
						var newItem = { title : levels[i] , children : [] };
						tree.push(newItem);
						tree = newItem.children;
					}
				}
			}	
		}	
	};
	
	// Move (or rename) a node ...
	ListUtilities.prototype.moveNode = function (tree,name,newname) {
		if( name ) {
			var levels = name.split('/');
			var newlevels = newname.split('/');
			
			if( levels.length > 0 && levels[0] === '' ) {
				levels.splice(0,1);
			}
			if( newlevels.length > 0 && newlevels[0] === '' ) {
				newlevels.splice(0,1);
			}
			var needToRemoveAndAdd = true;
			// Same number of levels?
			if( levels.length == newlevels.length ) {
				var index = this.findNode(tree,levels[0].toLowerCase());
				if( index >= 0 ) {
					if( levels.length > 1 ) {
						if( levels[0] === newlevels[0] ) {
							// same? it might be a rename...
							levels.splice(0,1);
							newlevels.splice(0,1);							
							this.moveNode(tree[index].children,levels.join('/'),newlevels.join('/'));
							needToRemoveAndAdd = false;
						}
					} else {						
						tree[index].title = newname;
						needToRemoveAndAdd = false;
					}
				}
			} 
			if( needToRemoveAndAdd ) {
				// At this point, we need to alter the structure - get the node, remove from hierarchy, then re-insert it.
				var node = this.getNode(tree,name);
				if( node ) {
					this.removeNode(tree,name);
					this.addNode(tree,newname,node);
				}
			}
		}
		return tree;
	};
	
	// Convert a flat list of paths & titles into a 'tree'
	ListUtilities.prototype.treeFromList = function (flatList) {
		var tree = [];
		var i, j, k;
		var currentBranch;
		var hasSubToc = false;

		for (i = 0; i < flatList.length; ++i) {
			var item = flatList[i];
			var levels = item.path.split('/');
			var branch = tree;
			var currentLevel;
			var itemgroup = item.group;
			var lastLevel = levels.length;
			if (item.toc) {
				hasSubToc = true;
			}
			if (itemgroup) {
				if (itemgroup.substring(0, 1) == '/') {
					var filename = levels[levels.length - 1];
					levels = itemgroup.split('/');
					levels.push(filename);
					lastLevel = levels.length;
					itemgroup = null;
				} else {
					while (itemgroup.substring(0, 3) == "../") {
						itemgroup = itemgroup.substring(3);
						--lastLevel;
					}
					if (itemgroup === "")
						itemgroup = null;
				}
			}
			for (j = 0; j < lastLevel - 1; ++j) {
				currentLevel = this.cleanupName(levels[j]);
				if (currentLevel == '')
					continue;
				currentBranch = null;
				for (k = 0; k < branch.length; ++k) {
					if (branch[k].title == currentLevel) {
						currentBranch = branch[k];
						break;
					}
				}
				if (!currentBranch) {
					currentBranch = { title: currentLevel, children: [] };
					branch.push(currentBranch);
					branch = currentBranch.children;
				} else if (!currentBranch.children) {
					currentBranch.children = [];
					branch = currentBranch.children;
				} else {
					branch = currentBranch.children;
				}
			}
			if (itemgroup) {
				var itemGroups = itemgroup.split('/');
				var ig;
				for (ig = 0; ig < itemGroups.length; ++ig) {
					currentBranch = null;
					currentLevel = itemGroups[ig];
					for (k = 0; k < branch.length; ++k) {
						if (branch[k].title == currentLevel) {
							currentBranch = branch[k];
							break;
						}
					}
					if (!currentBranch) {
						currentBranch = { title: currentLevel, children: [] };
						branch.push(currentBranch);
					}
					branch = currentBranch.children;
					if (!branch) {
						currentBranch.children = [];
						branch = currentBranch.children;
					}
				}
				currentBranch = null;
				currentLevel = this.cleanupName(levels[levels.length - 1]);
				for (k = 0; k < branch.length; ++k) {
					if (branch[k].title == currentLevel) {
						currentBranch = branch[k];
						break;
					}
				}
				if (!currentBranch) {
					if (item.toc) {
						branch.push({ title: currentLevel, path: item.path, toc: item.toc });
					} else {
						branch.push({ title: currentLevel, path: item.path });
					}
				} else {
					currentBranch.path = item.path;
					if (item.toc) {
						currentBranch.toc = item.toc;
					}
				}
			} else if (levels.length > 0) {
				currentBranch = null;
				currentLevel = this.cleanupName(levels[levels.length - 1]);
				for (k = 0; k < branch.length; ++k) {
					if (branch[k].title == currentLevel) {
						currentBranch = branch[k];
						break;
					}
				}
				if (!currentBranch) {
					if (item.toc) {
						branch.push({ title: currentLevel, path: item.path, toc: item.toc });
					} else {
						branch.push({ title: currentLevel, path: item.path });
					}
				} else {
					currentBranch.path = item.path;
					if (item.toc) {
						currentBranch.toc = item.toc;
					}
				}
			}
		}
		if( config.editTOC ) {
			if( config.editTOC.remove ) {
				// remove list
				for( i = 0 ; i < config.editTOC.remove.length ; ++i ) {
					tree = this.removeNode(tree,config.editTOC.remove[i]);
				}
			}
			if( config.editTOC.move ) {
				// move list
				for( i = 0 ; i < config.editTOC.move.length ; ++i ) {
					tree = this.moveNode(tree,config.editTOC.move[i].from,config.editTOC.move[i].to);
				}
			}
		}
		tree = this.sortTree(tree);
		if (hasSubToc) {
			tree = this.expandSubToc(tree);
		}
		return tree;
	};

	// Convert a 'tree' into ul list html
	ListUtilities.prototype.treeToUL = function (tree) {
		var buildTree = function (res, isOpen) {
			var ulList = isOpen ? "<ul>\n" : "<ul style=\"display:none\">\n";
			var i;
			for (i = 0; i < res.length; ++i) {
				if (res[i].children) {
					ulList += "<li branch=\"true\" class=\"closed\" >";
				} else {
					ulList += "<li class=\"leaf\" >";
				}
				if (res[i].path) {
					if (res[i].hash)
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
		};
		return buildTree(tree, true);
	};
	return new ListUtilities();
}