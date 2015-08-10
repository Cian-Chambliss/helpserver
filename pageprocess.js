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
		if (!textData.indexOf)
			textData = textData.toString('utf8');
		var metadataAt = textData.indexOf('<!---HELPMETADATA:');
		if (metadataAt > -1) {
			var metadataJson = textData.substr(metadataAt + 18);
			var metadataEnd = metadataJson.indexOf('--->');
			if (metadataEnd > -1)
				metadataJson = metadataJson.substring(0, metadataEnd);
			try {
				page.metadata = JSON.parse(metadataJson);
			} catch (err) {
			}
		}
		if (page.metadata)
			haveConfigData = true;
	}
	if (config.dependencies || config.search) {
		var htmlparser = require("htmlparser2");
		var deps = { href: [], images: [] };
		var plainText = "";
		var stringJs = require('string');
		var divDepth = 0;
		var tocDiv = -1;
		var tocDepth = -1;
		var tocHash = null;
		var subTOC = null;
		var tocStack = [];

		var parser = new htmlparser.Parser({
			onopentag: function (name, attribs) {
				if (name === "a" && attribs.href) {
					if (attribs.href.substring(0, 1) == '#' ) {
						if (tocDepth >= 0) {
							if (attribs.href) {
								tocHash = attribs.href.substring(1);
							}
						}
					} else if( attribs.href.substr(0,11) != 'javascript:' ) {
						deps.href.push(normalizeREF(page.path,attribs.href));
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
				if (tocHash) {
					tocStack[tocDepth].push({ title: stringJs(text).decodeHTMLEntities().s, hash: tocHash });
					tocHash = null;
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