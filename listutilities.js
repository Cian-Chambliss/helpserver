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
	ListUtilities.prototype.sortTree = function(tree) {
		var i = 0;
		for( i = 0 ; i < tree.length ; ++i ) { 
		    if( tree[i].children && tree[i].children.length > 0 )
				tree[i].children = this.sortTree( tree[i].children );
		}			
		if( tree.length > 1 ) {
	        tree.sort(function compare(a, b) {
				var aTitle = a.title.toLowerCase().trim();
				var bTitle = b.title.toLowerCase().trim(); 
	            if ( aTitle < bTitle )
	              return -1;
	            if ( aTitle > bTitle )
	              return 1;
	            return 0;
	        });
		}
		return tree;
	}
	// Convert a flat list of paths & titles into a 'tree'
	ListUtilities.prototype.treeFromList = function (flatList) {
		var tree = [];
		var i, j, k;
		var currentBranch;
		debugger;

		for (i = 0; i < flatList.length; ++i) {
			var item = flatList[i];
			var levels = item.path.split('/');
			var branch = tree;
			var currentLevel;
			var itemgroup = item.group;
			var lastLevel = levels.length;			
			if (itemgroup) {
				if (itemgroup.substring(0, 1) == '/') {
					levels = itemgroup.split('/');
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
				for( ig = 0 ; ig < itemGroups.length ; ++ig ) {
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
					branch.push({ title: currentLevel, path: item.path });
				} else {
					currentBranch.path = item.path;
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
					branch.push({ title: currentLevel, path: item.path });
				} else {
					currentBranch.path = item.path;
				}
			}
		}
		tree = this.sortTree(tree);
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
				if (res[i].path)
					ulList += "<div id=\"" + res[i].path + "\">" + res[i].title + "</div>";
				else
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