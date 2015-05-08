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
	
	// Convert a flat list of paths & titles into a 'tree'
	ListUtilities.prototype.treeFromList = function (flatList) {
		var tree = [];
		var i, j, k;
		var currentBranch;

		for (i = 0; i < flatList.length; ++i) {
			var item = flatList[i];
			var levels = item.path.split('/');
			var branch = tree;
			var currentLevel;
			for (j = 0; j < levels.length - 1; ++j) {				
				currentLevel = this.cleanupName(levels[j]);
				if( currentLevel == '' )
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
			currentBranch = null;
			currentLevel = this.cleanupName(levels[levels.length - 1]);
			for (k = 0; k < branch.length; ++k) {
				if (branch[k].title == currentLevel) {
					currentBranch = branch;
					break;
				}
			}
			if (!currentBranch) {
				branch.push({ title: currentLevel, path: item.path });
			} else {
				currentBranch.path = item.path;
			}
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