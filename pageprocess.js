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
	var manifestFile = config.generated + "manifest/" + ofn.replace(".html",".json");	
	if( config.metadata ) {
		var textData = data;
		if( !textData.indexOf )
			textData = textData.toString('utf8');
		var metadataAt = textData.indexOf('<!---HELPMETADATA:');
		if (metadataAt > -1) {
			var metadataJson = textData.substr( metadataAt + 18 );
			var metadataEnd = metadataJson.indexOf('--->');
			if (metadataEnd > -1)
				metadataJson = metadataJson.substring(0, metadataEnd);
			try {
				page.metadata = JSON.parse(metadataJson);
			} catch (err) {				
			}
		}
		if( page.metadata )
			haveConfigData = true;
	}
	if (config.dependencies || config.search) {
		var htmlparser = require("htmlparser2");
		var deps = { href: [], images: [] };
		var plainText = "";
		var stringJs = require('string');
		var parser = new htmlparser.Parser({
			onopentag: function (name, attribs) {
				if (name === "a" && attribs.href) {
					deps.href.push(attribs.href);
				} else if (name === "img" && attribs.src) {
					deps.images.push(attribs.src);
				}
			},
			ontext: function (text) {
				if (config.search)				
					plainText += stringJs( stringJs(text).decodeHTMLEntities().s );
			},
			onclosetag: function (tagname) {
			}
		});
		parser.write(data);
		parser.end();
		if (config.dependencies) {
			page.dependencies = deps;
			if( deps.href.length > 0 || deps.images.length > 0 )
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
				if ( haveConfigData ) {
					fs.writeFile( manifestFile , JSON.stringify(page,null,"  ") , function (err2) {
						callbackPage(err,ofn);	
					});
				} else {
					callbackPage(err,ofn);
				}
			});
		} else {
			if ( haveConfigData ) {
				fs.writeFile( manifestFile , JSON.stringify(page,null,"  ") , function (err) {
					callbackPage(err,"");	
				});
			} else {
				callbackPage(null,"");
			}
		}
	} else if ( haveConfigData ) { 
		fs.writeFile( manifestFile , JSON.stringify(page,null,"  ") , function (err) {
			callbackPage(err,"");	
		});
	} else {
		callbackPage(null,"");
	}
}