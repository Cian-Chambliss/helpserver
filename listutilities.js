/**
 * Using a flat list of titles, generate an return tree
 */
module.exports = function (config) {
    var nameReplacements = config.escapes;

    function ListUtilities() {
    };

    ListUtilities.prototype.replaceAll = function (str, find, replace) {
        if( str.indexOf(find) >= 0 ) {
            str = str.split(find).join(replace);
        }
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
        var length = 0;
        while (length < title.length) {
            var chr = title.substr(length, 1);
            if ('0' <= chr && chr <= '9') {
                ++length;
            } else if (chr === '_') {
                ++length;
                var newtitle = title.substring(length);
                if (newtitle && newtitle !== '')
                    title = newtitle;
                break;
            } else {
                break;
            }
        }
        return title;
    };
    ListUtilities.prototype.removeDigitPrefix = function (title) {
        return removeNumericPrefix(title);
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
                if (tree[i].title.substr(0, 1) === '_') {
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
                        tree[i].children = this.mergeNode(tree[i].children.concat(tocChildren));
                }
            }
        }
        return tree;
    };

    ListUtilities.prototype.findNode = function (tree, name) {
        var i;
        for (i = 0; i < tree.length; ++i)
            if (tree[i].title.trim().toLowerCase() === name)
                return i;
        return -1;
    }
	
    // Remove a node from the tree...
    ListUtilities.prototype.removeNode = function (tree, name) {
        if (name) {
            var levels = name.split('/');
            if (levels.length > 0 && levels[0] === '') {
                levels.splice(0, 1);
            }
            if (levels.length > 0) {
                var index = this.findNode(tree, levels[0].trim().toLowerCase());
                if (index >= 0) {
                    if (levels.length > 1) {
                        if (tree[index].children) {
                            levels.splice(0, 1);
                            this.removeNode(tree[index].children, levels.join('/'));
                        }
                    } else {
                        tree.splice(index, 1);
                    }
                }
            }
        }
        return tree;
    };
	
    // Get a pointer to a node
    ListUtilities.prototype.getNode = function (tree, name) {
        var node = null;
        if (name) {
            var levels = name.split('/');
            var i;
            for (i = 0; i < levels.length; ++i) {
                if (levels[i] !== '') {
                    var index = this.findNode(tree, levels[i].trim().toLowerCase());
                    if (index >= 0) {
                        if ((i + 1) === levels.length) {
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

    ListUtilities.prototype.mergeNode = function (tree) {
        var i, j;
        for (i = 0; i < tree.length; ++i) {
            var itemName = tree[i].title.toLowerCase();
            for (j = tree.length - 1; j > i; --j) {
                if (tree[j].title.toLowerCase() === itemName) {
                    if (!tree[i].path && tree[j].path) {
                        tree[i].path = tree[j].path;
                    }
                    if (tree[j].children) {
                        if (tree[i].children) {
                            tree[i].children = this.mergeNode(tree[i].children.concat(tree[j].children));
                        } else {
                            tree[i].children = tree[j].children;
                        }
                    }
                    tree.splice(j, 1);
                }
            }
        }
        return tree;
    }

    ListUtilities.prototype.addNode = function (tree, name, node) {
        var topTree = tree;
        if (name && node) {
            var levels = name.split('/');
            var i;
            for (i = 0; i < levels.length; ++i) {
                if (levels[i] !== '') {
                    var index = this.findNode(tree, levels[i].trim().toLowerCase());
                    if (index >= 0) {
                        if ((i + 1) === levels.length) {
                            // Make sure title gets set (use case of new name)
                            tree[index].title = levels[i];
                            // Set the path for the node
                            if (node.path)
                                tree[index].path = node.path;
                            // merge any child nodes....	
                            if (node.children) {
                                if (tree[index].children)
                                    tree[index].children = this.mergeNode(tree[index].children.concat(node.children));
                                else
                                    tree[index].children = node.children;
                            }
                            break;
                        } else {
                            if (!tree[index].children)
                                tree[index].children = [];
                            tree = tree[index].children;
                        }
                    } else if ((i + 1) === levels.length) {
                        node.title = levels[i];
                        tree.push(node);
                        break;
                    } else {
                        var newItem = { title: levels[i], children: [] };
                        tree.push(newItem);
                        tree = newItem.children;
                    }
                }
            }
        }
        return topTree;
    };
	
    // Move (or rename) a node ...
    ListUtilities.prototype.moveNode = function (tree, name, newname) {
        if (name) {
            var levels = name.split('/');
            var newlevels = newname.split('/');

            if (levels.length > 0 && levels[0] === '') {
                levels.splice(0, 1);
            }
            if (levels.length > 0) {
                if (levels[levels.length - 1] === '') {
                    levels.splice(levels.length - 1, 1);
                    if (levels.join() === '')
                        name = '';
                }
            }
            if (newlevels.length > 0 && newlevels[0] === '') {
                newlevels.splice(0, 1);
            }
            if (newlevels.length > 0) {
                if (newlevels[newlevels.length - 1] === '') {
                    newlevels.splice(newlevels.length - 1, 1);
                    if (newlevels.join() === '')
                        newname = '';
                }
            }
            var needToRemoveAndAdd = true;
            // Same number of levels?
            if (levels.length > 0) {
                if (levels.length === newlevels.length) {
                    var index = this.findNode(tree, levels[0].trim().toLowerCase());
                    if (index >= 0) {
                        if (levels.length > 1) {
                            if (levels[0] === newlevels[0]) {
                                // same? it might be a rename...
                                levels.splice(0, 1);
                                newlevels.splice(0, 1);
                                tree[index].children = this.moveNode(tree[index].children, levels.join('/'), newlevels.join('/'));
                                needToRemoveAndAdd = false;
                            }
                        } else {
                            if (newname.substring(0, 1) === '/' && newname.length > 1) {
                                tree[index].title = newname.substring(1);
                            } else {
                                tree[index].title = newname;
                            }
                            tree = this.mergeNode(tree);
                            needToRemoveAndAdd = false;
                        }
                    }
                }
            }
            if (needToRemoveAndAdd) {
                // At this point, we need to alter the structure - get the node, remove from hierarchy, then re-insert it.
                var node = this.getNode(tree, name);
                if (node) {
                    tree = this.removeNode(tree, name);
                    if (newname) {
                        tree = this.addNode(tree, newname, node);
                    } else if (node.children) {
                        var i;
                        for (i = 0; i < node.children.length; ++i) {
                            tree = this.addNode(tree, node.children[i].title, node.children[i]);
                        }
                    }
                }
            }
        }
        return tree;
    };
    ListUtilities.prototype.FlattenBranches = function (tree, childrenFlatten) {
        var flatTree = [];
        var i;
        if (tree.length <= childrenFlatten) {
            // If count of entries is under the threshhold, lets re-order the tree 
            for (i = 0; i < tree.length; ++i) {
                if (tree[i].children && !tree[i].path) {
                    // Merge parents without content into the tree...
                    flatTree = flatTree.concat(this.FlattenBranches(tree[i].children, childrenFlatten));
                } else {
                    flatTree.push(tree[i]);
                }
            }
            tree = flatTree;
        } else {
            // Else recurse...
            var needFlattenPass = false;
            for (i = 0; i < tree.length; ++i) {
                if (tree[i].children) {
                    if (!tree[i].path) {
                        // propogate deep titles on singletons to the top node
                        if (tree[i].children.length === 1) {
                            var singleTon = tree[i].children[0];
                            if (!singleTon.path && singleTon.children) {
                                while (singleTon.children.length === 1 && !singleTon.children[0].path) {
                                    singleTon = singleTon.children[0];
                                }
                                tree[i].title = singleTon.title;
                            }
                        }
                    }
                    tree[i].children = this.FlattenBranches(tree[i].children, childrenFlatten);
                    if (tree[i].children && tree[i].children.length < 1)
                        delete tree[i].children;
                    if (!tree[i].path) {
                        if (tree[i].children.length <= childrenFlatten) {
                            needFlattenPass = true;
                        }
                    }
                }
            }
            // And if we find children that can be merged up, do so... 
            if (needFlattenPass) {
                for (i = 0; i < tree.length; ++i) {
                    if (tree[i].children && tree[i].children.length <= childrenFlatten && !tree[i].path) {
                        // Merge parents without content into the tree...
                        flatTree = flatTree.concat(this.FlattenBranches(tree[i].children, childrenFlatten));
                    } else {
                        flatTree.push(tree[i]);
                    }
                }
                tree = flatTree;
            }
        }
        return tree;
    }
    // This function will alter a tree structure to match the 'toc' structure - if path is missing, toc entry will be a leaf
    ListUtilities.prototype.EditTreeUsingTOC = function (tree, toc, topPage) {
        var newTree = toc;
        var listUtil = this;
        var decorateNewTree = function (items) {
            var i;
            for (i = 0; i < items.length; ++i) {
                if (items[i].hash && !items[i].path) {
                    items[i].path = "/" + topPage;
                }
                if (items[i].children) {
                    if (items[i].childBranch)
                        console.log("Child branch " + items[i].childBranch + " is not on a leaf - ignored.");
                    decorateNewTree(items[i].children);
                } else if (items[i].childBranch) {
                    var levels = items[i].childBranch.trim().toLowerCase().split('/');
                    var j;
                    var treeNode = tree;
                    for (j = 0; j < levels.length; ++j) {
                        if (levels[j].length > 0) {
                            var treeNodeIndex = listUtil.findNode(treeNode, levels[j]);
                            if (treeNodeIndex >= 0) {
                                treeNode = treeNode[treeNodeIndex].children;
                            } else {
                                treeNode = null;
                                console.log("Not found  " + levels[j]);
                                break;
                            }
                        }
                    }
                    if (treeNode) {
                        if (items[i].childFlatten) {
                            items[i].children = listUtil.FlattenBranches(treeNode, items[i].childFlatten);
                            if (items[i].children && items[i].children.length < 1)
                                delete items[i].children;
                        } else {
                            items[i].children = treeNode;
                        }
                        console.log("Added child folder " + items[i].childBranch);
                    } else {
                        console.log("Missing child folder " + items[i].childBranch);
                    }
                    delete items[i].childBranch;
                }
                items[i].ignoreBreadcrumbs = true;
            }
        };
        decorateNewTree(newTree);
        //tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, hash: tocHash , childBranch : childBranch });
        return newTree;
    };	
	/*
	var checkDuplicates = function(tree,message) {
		var i , j;
		var result = false;
		for( i = 0 ; i < tree.length-1 ; ++i ) {
			for( j = i+1 ; j < tree.length ; ++j ) {
				if( tree[i].title == tree[j].title ) {
					result = true;
					console.log('Dups at '+ tree[i].title+" for "+message);
					break;
				}
			}
		} 
		return result;		
	};*/
	
    // Convert a flat list of paths & titles into a 'tree'
    ListUtilities.prototype.treeFromList = function (flatList, altToc) {
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
            var itempagename = item.pagename;
            var lastLevel = levels.length;
            if (item.toc) {
                hasSubToc = true;
            }
            if (itemgroup) {
                itemgroup = itemgroup.trim();
                if (itemgroup.substring(0, 1) === '/') {
                    var filename = levels[levels.length - 1];
                    levels = itemgroup.split('/');
                    levels.push(filename);
                    lastLevel = levels.length;
                    itemgroup = null;
                } else {
                    while (itemgroup.substring(0, 3) === "../") {
                        itemgroup = itemgroup.substring(3);
                        --lastLevel;
                    }
                    if (itemgroup === "")
                        itemgroup = null;
                }
            }
            for (j = 0; j < lastLevel - 1; ++j) {
                currentLevel = this.cleanupName(levels[j]);
                if (currentLevel === '')
                    continue;
                currentBranch = null;
                for (k = 0; k < branch.length; ++k) {
                    if (branch[k].title === currentLevel) {
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
            // Lets skip index.html - these should be brought to the parent node...
            if (item.path.indexOf("/index.html") > 0 || item.path.indexOf("/index.xml") > 0) {
                if (currentBranch) {
                    if (!currentBranch.path) {
                        currentBranch.path = item.path;
                    }
                }
                continue;
            }
            if (itemgroup) {
                var itemGroups = itemgroup.split('/');
                var ig;
                for (ig = 0; ig < itemGroups.length; ++ig) {
                    currentBranch = null;
                    currentLevel = itemGroups[ig];
                    for (k = 0; k < branch.length; ++k) {
                        if (branch[k].title === currentLevel) {
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
                    if (branch[k].title === currentLevel) {
                        currentBranch = branch[k];
                        break;
                    }
                }
                if (!currentBranch) {
                    if (item.toc) {
                        if (itempagename) {
                            branch.push({ title: itempagename, path: item.path, toc: item.toc });
                        } else {
                            branch.push({ title: currentLevel, path: item.path, toc: item.toc });
                        }
                    } else if (itempagename) {
                        branch.push({ title: itempagename, path: item.path });
                    } else {
                        branch.push({ title: currentLevel, path: item.path });
                    }
                } else {
                    currentBranch.path = item.path;
                    if (item.toc) {
                        currentBranch.toc = item.toc;
                    }
                    if (itempagename) {
                        currentBranch.title = itempagename;
                    }
                }
            } else if (levels.length > 0) {
                currentBranch = null;
                currentLevel = this.cleanupName(levels[levels.length - 1]);
                for (k = 0; k < branch.length; ++k) {
                    if (branch[k].title === currentLevel) {
                        currentBranch = branch[k];
                        break;
                    }
                }
                if (!currentBranch) {
                    if (item.toc) {
                        if (itempagename) {
                            branch.push({ title: itempagename, path: item.path, toc: item.toc });
                        } else {
                            branch.push({ title: currentLevel, path: item.path, toc: item.toc });
                        }
                    } else if (itempagename) {
                        branch.push({ title: itempagename, path: item.path });
                    } else {
                        branch.push({ title: currentLevel, path: item.path });
                    }
                } else {
                    currentBranch.path = item.path;
                    if (item.toc) {
                        currentBranch.toc = item.toc;
                    }
                    if (itempagename) {
                        currentBranch.title = itempagename;
                    }
                }
            }
        }
        var currentTopPage = config.topPage;
        var treeParent = null;
        if (altToc && altToc.length) {
            // AltTocs are trimed from path
            var findBranch = altToc.split('/');
            var i;
            if (tree.children)
                tree = tree.children;
            for (i = 1; i < findBranch.length - 1; ++i) {
                var index = this.findNode(tree, findBranch[i].trim().toLowerCase());
                if (index >= 0) {
                    treeParent = tree[index]; 
                    tree = tree[index].children;
                    if (!tree)
                        break;
                } else {
                    tree = null;
                    break;
                }
            }            
            if (!tree)
                tree = [];
            else if( treeParent ) {
                if( treeParent.path ) {
                    var indexXMLPathPos = treeParent.path.indexOf("/index.xml");
                    if( indexXMLPathPos > 0 ) {
                        var parentXMLPath = treeParent.path.substring(0,indexXMLPathPos+1);
                        // make sure that all subbranchs have an 'index.xml' - we autoGenerate this..
                        var populateEmptyBranches = function(items,parentXMLPath) {
                            if( items ) {
                                var i = 0;
                                for( i = 0 ; i < items.length ; ++i ) {
                                    if( items[i].children ) {
                                        if( !items[i].path ) {
                                            items[i].path = parentXMLPath + items[i].title + "/index.xml";
                                        }
                                        populateEmptyBranches(items[i].children, parentXMLPath + items[i].title + "/" );
                                    }
                                }
                            }
                        };
                        populateEmptyBranches(tree,parentXMLPath )
                    }
                }
            }    
            currentTopPage = null;
        } else if (config.editTOC) {
            if (config.editTOC.remove) {
                // remove list
                for (i = 0; i < config.editTOC.remove.length; ++i) {
                    tree = this.removeNode(tree, config.editTOC.remove[i]);
                }
            }
            if (config.editTOC.move) {
                // move list
                for (i = 0; i < config.editTOC.move.length; ++i) {
                    tree = this.moveNode(tree, config.editTOC.move[i].from, config.editTOC.move[i].to);
                }
            }
            // Prune empty sections --
            for (i = tree.length - 1; i >= 0; --i) {
                if (!tree[i].path && !tree[i].toc && !tree[i].children) {
                    tree.splice(i, 1);
                } else if (!tree[i].path && !tree[i].toc) {
                    if (tree[i].children.length === 0)
                        tree.splice(i, 1);
                } else if (!tree[i].children) {
                    console.log("Warning - empty branch detected " + tree[i].title);
                }
            }
        }
        tree = this.sortTree(tree);
        if (hasSubToc) {
            tree = this.expandSubToc(tree);
        }
        if (currentTopPage) {
            var topPagePath = currentTopPage;
            if (topPagePath.substring(0, 1) !== "/")
                topPagePath = "/" + topPagePath;
            if (config.topPageMetadata && config.topPageMetadata.toc) {
                // TBD hack the tree....
                console.log("Page content re-organized using TOC from " + currentTopPage);
                tree = this.EditTreeUsingTOC(tree, config.topPageMetadata.toc, currentTopPage);
            } else {
                console.log("Top page " + currentTopPage + " has no TOC");
            }
            return { title: "/", path: topPagePath, children: tree };
        }
        if( treeParent && treeParent.path )   
            return { title: "/", path : treeParent.path , children: tree };     
        return { title: "/", children: tree };
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
                } else {
                    ulList += "<div>" + res[i].title + "</div>";
                }
                if (res[i].children)
                    ulList += buildTree(res[i].children, false);
                ulList += "</li>\n"
            }
            ulList += "</ul>\n";
            return ulList;
        };
        return buildTree(tree, true);
    };
    ListUtilities.prototype.expandChildPage = function( settings , callback ) {
         if( settings.path.indexOf('/index.') >= 0 ) {
             this.loadOrCreateIndexPage(settings.config,settings.path.replace("/index.","/index.flatten."),'_all',function(err,data) {
                 if( !err ) {
                     if( settings.config.events.embedXmlPage )
                         data = settings.config.events.embedXmlPage(data,settings);
                     callback(data);
                 } else {
                     callback(null);
                 }
             },true);
         } else {
             var fs = require("fs");
             fs.readFile(settings.filename,"utf8",function(err,data) {
                 if( !err ) {
                     if( settings.config.events.embedXmlPage )
                         data = settings.config.events.embedXmlPage(data,settings);
                     callback(data);
                 } else {
                     callback(null);
                 }
             })
         }
    };
    ListUtilities.prototype.loadOrCreateIndexPage = function (config, path, flt, callback,expand) {
        // Create an index page on demand (if not found...)
        var lu = this;
        var originalPath = path;
        var genereratedExtension = ".html";
        var generatedTopic = config.generated + "topics/" + this.replaceAll(path, "/", "_") + (config.filter_name ? config.filter_name : '_all');
        var fs = require("fs");
        var normalizedPath = path;
        if( expand ) {
            normalizedPath = normalizedPath.replace("/index.flatten.","/index.");
        }
        var indexTemplatePos = normalizedPath.indexOf("/index.xml");
        var xmlTemplate = null;
        var lists = [];
        var orderData = [];
        
        if (indexTemplatePos > 0) {
            path = normalizedPath.substring(0, indexTemplatePos);
            generatedTopic += ".xml";
            genereratedExtension = ".xml";
        } else {
            indexTemplatePos = normalizedPath.indexOf("/index.md");
            if (indexTemplatePos > 0) {
                path = path.substring(0, indexTemplatePos);
                generatedTopic += ".md";
                genereratedExtension = ".md";
            } else {            
                indexTemplatePos = path.indexOf("/index.html");
                if (indexTemplatePos > 0) {
                    generatedTopic += ".html";
                    path = path.substring(0, indexTemplatePos);
                }
            }
        }
        fs.readFile(generatedTopic, "utf8", function (err, data) {
            if (err) {
                // TBD - create (and load) the page just-in-time - using the table of contents....
                var filterStuctureName = config.generated + flt + config.structurefile;
                if (config.tocData.altTocs) {
                    var altTocs = config.tocData.altTocs;
                    var i;
                    for (i = 0; i < altTocs.length; ++i) {
                        if ((path+"/").substring(0, altTocs[i].length).toLowerCase() === altTocs[i].toLowerCase()) {
                            var altTocClean = lu.replaceAll(altTocs[i], '/', '_');
                            filterStuctureName = config.generated + altTocClean + flt + config.structurefile;
                            break;
                        }
                    }
                }
                var generatePage = function () {                    
                    fs.readFile(filterStuctureName, "utf8", function (err, tocData) {                        
                        if (err) {
                            console.log('TOC to generate page from was not found');
                            callback(new Error('Page not found!'), null);
                        } else {
                            var toc = JSON.parse(tocData);
                            var findPageChildren = function (children, lPath) {
                                if (children) {
                                    var result = null;
                                    var i;
                                    for (i = 0; i < children.length; ++i) {
                                        if (children[i].path) {
                                            var testPath = children[i].path.toLowerCase();
                                            var lastPos = testPath.lastIndexOf('/');
                                            if (lastPos > 0) {
                                                testPath = testPath.substring(0, lastPos);
                                                if (lPath.length <= testPath.length) {
                                                    if (testPath.substring(0, lPath.length) === lPath) {
                                                        if ( (children[i].path.indexOf("/index.xml") === lPath.length 
                                                           || children[i].path.indexOf("/index.html") === lPath.length 
                                                            ) 
                                                           && children[i].children
                                                            ) {
                                                            return children[i].children;
                                                        } else {
                                                            return children;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    for (i = 0; i < children.length; ++i) {
                                        result = findPageChildren(children[i].children, lPath);
                                        if (result)
                                            return result;
                                    }
                                    return null;
                                }
                            };
                            var pageChildren = null;
                            
                            // Build a complete list...
                            if( lists.length > 0 ) {
                                var i;
                                for( i = 0 ; i < lists.length ; ++i ) {
                                    var listPtr = findPageChildren(toc.children, lists[i].fullPath.toLowerCase());
                                    lists[i].children = listPtr;
                                    if( listPtr ) {
                                        var j = 0;
                                        for( j = 0 ; j < listPtr.length ; ++j ) {
                                            listPtr[j].listParent = lists[i];
                                        }
                                        if( pageChildren ) {
                                            pageChildren = pageChildren.concat(listPtr);
                                        } else
                                            pageChildren = listPtr;
                                    } else {
                                        console.log('Warning: no children for '+lists[i].fullPath); 
                                    }
                                }
                            }
                            
                            if (pageChildren) {
                                // good - We have a list of page, lets build an HTML
                                var async = require('async');
                                async.eachSeries(pageChildren, function (pageEntry, callbackLoop) {
                                    var pathName = pageEntry.path;
                                    if (!pathName) {
                                        if( pageEntry.listParent ) {
                                            pathName = pageEntry.listParent.fullPath + "/" + pageEntry.title;
                                        } else {
                                            pathName = path + "/" + pageEntry.title;
                                        }
                                    }
                                    var extensionIndex = pathName.lastIndexOf('.');
                                    var isFolder = true;
                                    if (extensionIndex > 0 && pathName.substr(extensionIndex + 1).indexOf('/') < 0) 
                                        isFolder = false;
                                    if( expand ) {
                                        lu.expandChildPage({config :config , filename : (config.source + pathName)
                                          , path : pathName , isFolder : isFolder
                                          , name : pageEntry.title 
                                          , format : genereratedExtension 
                                          , all : pageChildren
                                           }, function(snippet) {
                                            pageEntry.listParent.content.push( snippet );
                                            callbackLoop();
                                        });                                  
                                    } else if (config.events.pageIndexer) {
                                        config.events.pageIndexer({ 
                                            filename : (config.source + pathName)
                                          , path : pathName , isFolder : isFolder
                                          , name : pageEntry.title 
                                          , format : genereratedExtension 
                                          , all : pageChildren
                                          }, function (snippet) {
                                            pageEntry.listParent.content.push( snippet );
                                            callbackLoop();
                                        });
                                    } else {
                                        callbackLoop();
                                    }
                                 }, function () {
                                    // Finished the page...
                                    console.log("++++Create the page" );
                                    var htmlText = "";
                                    if( xmlTemplate )
                                        htmlText = xmlTemplate;
                                    else    
                                        htmlText = "";
                                    if( lists.length > 0 ) {
                                        var i , j , k;
                                        var reorderChildren = false;
                                        for( i = 0 ; i < lists.length ; ++i ) {
                                            if( orderData.length > 1 ) {
                                                // reorder the items in the list
                                                var listRemainder =  lists[i].content;
                                                var newList = [];
                                                for( j = 0 ; j < orderData.length ; ++j ) {
                                                    var bestMatch = -1;
                                                    for( k = 0 ; k < listRemainder.length ; ++k ) {
                                                        if( listRemainder[k].toLowerCase().indexOf('/'+orderData[j]+'.') >= 0 ) {
                                                            bestMatch = k;
                                                            break;
                                                        } else {
                                                            // If the user provided an extension, lets not add a trialing '.'
                                                            var orderExtn = orderData[j].lastIndexOf('.');
                                                            if( orderExtn > 0 ) {
                                                                orderExtn = orderData[j].substring(orderExtn);
                                                                if( orderExtn === ".html" || orderExtn === ".xml" || orderExtn === ".md" ) {
                                                                    if( listRemainder[k].toLowerCase().indexOf('/'+orderData[j]) >= 0 ) {
                                                                        bestMatch = k;
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                    if( bestMatch < 0 ) {
                                                        for( k = 0 ; k < listRemainder.length ; ++k ) {
                                                            if( listRemainder[k].toLowerCase().indexOf(orderData[j]) >= 0 ) {
                                                                bestMatch = k;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if( bestMatch >= 0 ) {
                                                        newList.push(listRemainder[bestMatch]);
                                                        listRemainder.splice(bestMatch,1);
                                                    }
                                                }
                                                if( newList.length > 0 ) {
                                                    if( listRemainder.length > 0 ) {
                                                        newList = newList.concat(listRemainder);
                                                    }
                                                    lists[i].content = newList;
                                                    reorderChildren = true;
                                                }
                                            }
                                            if( expand ) {
                                                htmlText = lu.replaceAll(htmlText, '<!--list:'+lists[i].listDef+'-->', "<pages>"+lists[i].content.join("\n")+"</pages>" ); 
                                            } else if( config.events.wrapIndex ) {                                            
                                                htmlText = lu.replaceAll(htmlText, '<!--list:'+lists[i].listDef+'-->', config.events.wrapIndex({ format  : genereratedExtension , content : lists[i].content.join("\n") }) );
                                            } else {
                                                htmlText = lu.replaceAll(htmlText, '<!--list:'+lists[i].listDef+'-->', lists[i].content.join("\n") );
                                            }
                                            if( reorderChildren ) {
                                                if( genereratedExtension === ".xml" ) {                                                    
                                                    htmlText = htmlText.replace("<page","<page reorder-children=\"true\"");
                                                } else {
                                                    htmlText = htmlText.replace(">","><!--orderchildren-->");
                                                }
                                            }                                            
                                        }
                                    }
                                    if( htmlText.indexOf('</page>') !== htmlText.lastIndexOf('</page>') ) {
                                        console.log("!!!++++Nested content detected!!!" );
                                    } 
                                    
                                    fs.writeFile(generatedTopic, htmlText, function (err) {
                                        if( genereratedExtension === ".xml" ) {
                                            callback(null, htmlText, "xml");
                                        } else if( genereratedExtension === ".md" ) {
                                            callback(null, htmlText, "md");
                                        } else {
                                            callback(null, htmlText, "html");
                                        }
                                    });
                                });
                            } else {
                                if (xmlTemplate) {
                                    // No templates where expanded, but we have a page - lets just copy the content to avoid recalculation
                                    if (xmlTemplate.indexOf('<!--list:') >= 0) {
                                        console.log('Warning: embedded lists were not expanded for ' + path);
                                    }
                                    fs.writeFile(generatedTopic, xmlTemplate, function (err) {
                                        if( genereratedExtension === ".xml" ) {
                                            callback(null, xmlTemplate, "xml");
                                        } else if( genereratedExtension === ".md" ) {
                                            callback(null, xmlTemplate, "md");
                                        } else {
                                            callback(null, xmlTemplate, "html");
                                        }
                                    });                                    
                                } else {
                                    console.log('path not found in TOC for ' + path);
                                    callback(new Error('Page not found!'), null);
                                }
                            }
                        }
                    });
                };                
                if (indexTemplatePos > 0) {
                    // If there was an index file, use it as a template....
                    fs.readFile(config.source + normalizedPath, "utf8", function (err, xmlData) {
                        if (err) {                            
                            console.log("Could not read template file " + normalizedPath);
                            if( config.events.getDefaultIndexTemplate ) {
                                xmlTemplate = config.events.getDefaultIndexTemplate({ format: genereratedExtension , path : originalPath , filename : config.source + originalPath });
                            } else {
                                xmlTemplate = "<!--list:.-->";
                            }
                            lists.push({ listDef: '.', fullPath: path , content : [] });
                        } else {
                            var embeddedLists = xmlData.split('<!--list:');
                            if (embeddedLists.length > 1) {                                
                                var i;
                                var orderDataPos = xmlData.indexOf("<!--order:");
                                if( orderDataPos >= 0 ) {
                                    orderData = xmlData.substring(orderDataPos+10);
                                    orderData = orderData.split("-->")[0].trim().toLowerCase();
                                    orderData = orderData.split("\n");
                                    for( i = 0 ; i < orderData.length ; ++i ) {
                                        orderData[i] = orderData[i].trim();
                                    }                                     
                                }     
                                for (i = 1; i < embeddedLists.length; ++i) {
                                    var endPath = embeddedLists[i].indexOf('-->');
                                    if (endPath > 0) {
                                        var relPath = embeddedLists[i].substring(0, endPath);
                                        var j;
                                        var listItem = null;
                                        for (j = 0; j < lists.length; ++j) {
                                            if (lists[j].listDef === relPath) {
                                                listItem = lists[j];
                                                break;
                                            }
                                        }
                                        if (!listItem) {
                                            var fullPath = path;
                                            if (relPath.length > 0) {
                                                if (relPath.substring(0, 1) === '.') {
                                                    if (relPath.length > 1) {
                                                        fullPath += relPath.substring(1);
                                                    }
                                                } else if (relPath.substring(0, 1) === '/') {
                                                    fullPath += relPath;
                                                } else {
                                                    fullPath += "/" + relPath;
                                                }
                                            }
                                            lists.push({ listDef: relPath, fullPath: fullPath , content : [] });
                                        }
                                    }
                                }
                                console.log( 'Look for' + JSON.stringify(lists) );
                            }
                            xmlTemplate = xmlData;
                        }
                        generatePage();
                    });
                } else {
                    // If this is just a folder - lets get the default template for html page and go...
                    if( config.events.getDefaultIndexTemplate ) {
                        xmlTemplate = config.events.getDefaultIndexTemplate({ format: genereratedExtension , path : originalPath , filename : config.source + originalPath });
                    } else {
                        xmlTemplate = "<!--list:.-->";
                    }
                    lists.push({ listDef: '.', fullPath: path , content : [] });
                    generatePage();
                }
            } else {
                console.log("++++Loaded from CACHE: "+path);
                if( genereratedExtension === ".xml" ) {
                    callback(null, data, "xml");
                } else if( genereratedExtension === ".md" ) {
                    callback(null, data, "md");
                } else {
                    callback(null, data, "html");
                }
            }
        });
    };
    ListUtilities.prototype.loadOrCreateTranslatedPage = function (config, path, flt, callback) {
        // Perform server side xslt transformation
        var lu = this;
        var generatedTopic = config.generated + "topics/" + this.replaceAll(path, "/", "_") + (config.filter_name ? config.filter_name : '_all');
        generatedTopic = generatedTopic.toLowerCase(); // ignore case in the cache logic...
        var fs = require("fs");
        path = lu.replaceAll(path,".xml_html",".xml");
        
        fs.readFile(generatedTopic, "utf8", function (err, data) {
            if (err) {
                if( path.indexOf("/index.xml") > 0 ) {
                    lu.loadOrCreateIndexPage(config,path,flt,function(err,data) {
                       if( err ) {
                           callback(err,null,null);
                       } else {
                          var generatedIndexFile = lu.replaceAll(generatedTopic,".xml_html",".xml")+".xml";
                          config.events.translateXML( generatedIndexFile, generatedTopic ,function(err,data) {
                              if( !err ) {
                                  if ( data && !data.indexOf) {
                                      data = data.toString('utf8');
                                  }
                                  if( data && data.length > 0 ) {
                                      data += "<!--basePath:"+path+"-->";
                                      fs.writeFile(generatedTopic,data);
                                  } else {
                                      fs.unlink(generatedTopic);
                                      err = "Page is Empty";
                                  }
                              }
                              callback(err,data,"html");
                          });
                       }
                    },false);
                 } else if( path.indexOf("/index.flatten.xml") > 0 ) {
                    lu.loadOrCreateIndexPage(config,path,flt,function(err,data) {
                       if( err ) {
                           callback(err,null,null);
                       } else {
                          var generatedIndexFile = lu.replaceAll(generatedTopic,".xml_html",".xml")+".xml";
                          config.events.translateXML( generatedIndexFile, generatedTopic ,function(err,data) {
                              if( !err ) {
                                  if ( data && !data.indexOf) {
                                      data = data.toString('utf8');
                                  }
                                  if( data && data.length > 0 ) {
                                     data += "<!--basePath:"+path+"-->";
                                     fs.writeFile(generatedTopic,data);
                                  } else {
                                     fs.unlink(generatedTopic);
                                     err = "Page is Empty"; 
                                  }
                              }
                              callback(err,data,"html");
                          });
                       }
                    },true);                
               } else {
                    config.events.translateXML(config.source + path,generatedTopic,function(err,data) {
                        if( !err ) {
                            if ( data && !data.indexOf) {
                                data = data.toString('utf8');
                            }
                            if( data && data.length > 0 ) {
                               data += "<!--basePath:"+path+"-->";
                               fs.writeFile(generatedTopic,data);
                            } else {
                               fs.unlink(generatedTopic);
                               err = "Page is Empty"; 
                            }
                        }
                        callback(err,data,"html");
                    });
                }
            } else {
                callback(null,data,"html");
            }
        });
    }
    ListUtilities.prototype.cleanupIndexPages = function (config) {
        var topicsPath = config.generated + "topics";
        var fs = require("fs");
        fs.readdir(topicsPath, function (err, list) {
            var async = require('async');
            async.eachSeries(list, function (item, callbackLoop) {
                fs.unlink(topicsPath + "/" + item, function () {
                    if (err) {
                        console.log("removing topic " + item + " error :" + err);
                    }
                    callbackLoop();
                });
            });
        });
    };
    return new ListUtilities();
}