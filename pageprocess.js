/**
 * Process page data (i.e. read in the old)
 */
module.exports = function (config, data, page, callbackPage) {
	var replaceAll = function (str, find, replace) {
		while (str.indexOf(find) >= 0)
			str = str.replace(find, replace);
		return str;
	};
	var haveConfigData = false;
	var ofn = replaceAll(replaceAll(page.path, '/', '_'), '\\', '_');
	var extensionStart = ofn.lastIndexOf('.');
	var extension = ofn.substring(extensionStart).toLowerCase();
	var manifestFile = config.generated + "manifest/" + ofn.substring(0, extensionStart) + ".json";
	var normalizeREF = function(srcName,ref) {
		if( ref.substr(0,1) != '/' &&  ref.substr(0,5) != 'http:' &&  ref.substr(0,6) != 'https:' &&  ref.substr(0,11) != 'javascript:' ) {
			var parts = srcName.split('/');
			var removeTail = 1;
			while( ref.substr(0,3) == '../' ) {
				ref = ref.substr(3);
				++removeTail;
			}
			parts.splice(parts.length-removeTail,removeTail);
			ref = parts.join('/')+'/'+ref;
		}		
	    return ref;
	};	
	
	if (extension == '.md') {
		// Convert to html first
		var marked = require('marked');
		var textData = data;
		if (!textData.indexOf)
			textData = textData.toString('utf8');
		data = marked(textData);
	}
	if (config.metadata) {
		var textData = data;
		if( !textData.indexOf || !textData.substr )
			textData = textData.toString('utf8');
		var metadataAt = textData.indexOf('<!---HELPMETADATA:');
		if (metadataAt > -1) {
			if( textData.substr ) {
				var metadataJson = textData.substr(metadataAt + 18);
				var metadataEnd = metadataJson.indexOf('--->');
				if (metadataEnd > -1)
					metadataJson = metadataJson.substring(0, metadataEnd);
				try {
					page.metadata = JSON.parse(metadataJson);
				} catch (err) {
				}
			}
		}
		if (page.metadata)
			haveConfigData = true;
	}
	if (config.dependencies || config.search) {
		var htmlparser = require("htmlparser2");
		var deps = { href: [], images: [] };
		var plainText = "";
		var pendingPlaintextSection = null;
		var multiPage = {};
		var stringJs = require('string');
		var divDepth = 0;
		var tocDiv = -1;
		var tocDepth = -1;
		var tocHash = null;
		var childBranch = null;
		var childFlattenValue = null;
		var tocAbsolutePath = null;
		var subTOC = null;
		var tocStack = [];
		var findInToc = function(tocItem,name) {
			var i;
			for( i = 0 ; i < tocItem.length ; ++i ) {
				if( tocItem[i].hash && tocItem[i].hash == name )
					return tocItem[i];
				if( tocItem[i].children ) {
					var result = findInToc(tocItem[i].children,name);
					if( result )
						return result;
				}
			}
		    return null;	
		};		
		var pathInToc = function(tocItem,name) {
			var i;
			for( i = 0 ; i < tocItem.length ; ++i ) {
				if( tocItem[i].hash && tocItem[i].hash == name )
					return tocItem[i].title;
				if( tocItem[i].children ) {
					var result = pathInToc(tocItem[i].children,name);
					if( result ) 
						return tocItem[i].title + " / " + result;
				}
			}
		    return null;	
		}
		var parser = new htmlparser.Parser({
			onopentag: function (name, attribs) {
				if (name === "a" ) {
					if( attribs.href) {
						if (attribs.href.substring(0, 1) == '#' ) {
							if (tocDepth >= 0) {
								if (attribs.href) {
									tocHash = attribs.href.substring(1);
								}
							}
						} else if (attribs.href.substring(0, 1) == '/' ) {
							tocAbsolutePath = attribs.href;
						} else if( attribs.href.substr(0,11) != 'javascript:' ) {
							deps.href.push(normalizeREF(page.path,attribs.href));
						}
						if( attribs.helpserver_folder ) {						
							childBranch = attribs.helpserver_folder;
							if( attribs.helpserver_flatten ) {
								childFlattenValue = parseInt(attribs.helpserver_flatten);
								if( childFlattenValue === NaN )
									childFlattenValue = null;
							}
						}
					}
					if(	subTOC ) {
						if (attribs.name ) {
							var item = findInToc(subTOC,attribs.name);
							if( item && item.hash ) {
								if( pendingPlaintextSection && plainText.length > 0 ) {
									multiPage[pendingPlaintextSection] = plainText;
								}
								plainText = "";
								pendingPlaintextSection = item.hash;								
							}
						}						
					}
				} else if (name === "img" && attribs.src) {
					deps.images.push(normalizeREF(page.path,attribs.src));
				} else if (name === "div") {
					if (attribs.class && attribs.class == 'helpserver_toc') {
						tocDiv = divDepth;
					}
					++divDepth;
				} else if (name === "ul") {
					if (tocDiv >= 0) {
						++tocDepth;
						if (tocStack.length <= tocDepth)
							tocStack.push([]);
						else
							tocStack[tocDepth] = [];
					}
				}
			},
			ontext: function (text) {
				if (config.search)
					plainText += stringJs(stringJs(text).decodeHTMLEntities().s);
				if (tocHash || childBranch ) {
					if (tocHash && childBranch ) {
						if( childFlattenValue && childFlattenValue > 0 ) 
							tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, hash: tocHash , childBranch : childBranch , childFlatten : childFlattenValue });
						else
  							tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, hash: tocHash , childBranch : childBranch });
					} else if( childBranch ) {
						if( tocAbsolutePath ) {
							if( childFlattenValue && childFlattenValue > 0 ) 
								tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, path: tocAbsolutePath , childBranch : childBranch , childFlatten : childFlattenValue });
							else
								tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, path: tocAbsolutePath , childBranch : childBranch });
						} else {
							if( childFlattenValue && childFlattenValue > 0 )
								tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, childBranch : childBranch , childFlatten : childFlattenValue });
							else		  
								tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, childBranch : childBranch });
						}						 
					} else {
						tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, hash: tocHash });
					}
					tocHash = null;
					tocAbsolutePath = null;
					childBranch = null;
					childFlattenValue = null;
				}
			},
			onclosetag: function (name) {
				if (name === "div") {
					--divDepth;
					if (tocDiv == divDepth) {
						tocDiv = -1;
					}
				} else if (name === "ul") {
					if (tocDiv >= 0) {
						if (tocDepth > 0) {
							var parentTree = tocStack[tocDepth - 1];
							if( parentTree.length > 0 ) 
							{
								parentTree[parentTree.length - 1].children = tocStack[tocDepth];
							}
						} else {
							subTOC = tocStack[0];
						}
						--tocDepth;
					}
				}
			}
		});
		parser.write(data);
		parser.end();
		if( pendingPlaintextSection && plainText.length > 0 ) {
			multiPage[pendingPlaintextSection] = plainText;
		}		
		if (config.dependencies) {
			page.dependencies = deps;
			if (deps.href.length > 0 || deps.images.length > 0)
				haveConfigData = true;
		}
		// Add a table of contents to the node....
		if( subTOC ) {
			page.toc = subTOC;
			haveConfigData = true;
		}
		if (config.search) {
			if( pendingPlaintextSection ) {
				var plainTextPath = config.generated + "plaintext/";
				var fs = require('fs');
				var ofnBase = ofn.replace(".html", "");
				var countDown  = 0;
				var hashList = "#HELPSERVER-TOC-ENTRY"
				for (var prop in multiPage) {
					hashList += "\n" + prop + "\t" + pathInToc(subTOC,prop);
					++countDown;
				}
				fs.writeFile(plainTextPath + ofnBase + ".txt" , hashList ,  function (err) {
					for (var prop in multiPage) {
						fs.writeFile(plainTextPath + ofnBase + "__" + prop + ".txt" , multiPage[prop], function (err) {
							--countDown;
							if( countDown == 0 ) {
								if (haveConfigData) {
									fs.writeFile(manifestFile, JSON.stringify(page, null, "  "), function (err2) {
										callbackPage(err, ofn);
									});
								} else {
									callbackPage(err, ofn);
								}
							}
						});
					}
					});					  
			} else {			
				var plainTextPath = config.generated + "plaintext/";
				var fs = require('fs');
				ofn = ofn.replace(".html", ".txt");
				plainText = replaceAll(plainText, "\r", " ");
				plainText = replaceAll(plainText, "\n", " ");
				plainText = replaceAll(plainText, "\t", " ");
				plainText = replaceAll(plainText, "             ", " ");
				plainText = replaceAll(plainText, "  ", " ");
				plainText = replaceAll(plainText, "  ", " ");
				fs.writeFile(plainTextPath + ofn, plainText, function (err) {
					if (haveConfigData) {
						fs.writeFile(manifestFile, JSON.stringify(page, null, "  "), function (err2) {
							callbackPage(err, ofn);
						});
					} else {
						callbackPage(err, ofn);
					}
				});
			}
		} else {
			if (haveConfigData) {
				fs.writeFile(manifestFile, JSON.stringify(page, null, "  "), function (err) {
					callbackPage(err, "");
				});
			} else {
				callbackPage(null, "");
			}
		}
	} else if (haveConfigData) {
		fs.writeFile(manifestFile, JSON.stringify(page, null, "  "), function (err) {
			callbackPage(err, "");
		});
	} else {
		callbackPage(null, "");
	}
}