/**
 * Build the search index (plain text) for the help system
 */
module.exports = function (config, callback) {
	var async = require('async');
	var htmlToText = require('html-to-text');
	var fs = require('fs');
	var inputFilesList = config.generated + config.flatfile;
	var plainTextPath = config.generated + "plaintext/";
	var outputFilesList = plainTextPath + "filelist.json";
	var outputPublish = plainTextPath + "publish.json";
	var publishList = [];
	var callStatus = { converted: 0, errors: 0, errorList: [] };
	var ProgressBar = require('progress');
	var replaceAll = function (str, find, replace) {
		while (str.indexOf(find) >= 0)
			str = str.replace(find, replace);
		return str;
	};
	if( !config.search ) {
		callback( new Error('Cannot create index without search configuration'), null);
		return;		
	}
	if( config.search.provider === 'elasticsearch' ) {
		var publishIndexDriver = function () {
			var elasticpublish = require("./elasticpublish");
			elasticpublish(config,callback);
		};
	} else {
		callback( new Error('Search provider '+config.search.provider+' is not supported.'), null);		
	}
	
	// quicky check to see that plaintext folder exists (since we generate this)
	if (!fs.existsSync(plainTextPath)) {
		fs.mkdirSync(plainTextPath);
	}

	fs.readFile(inputFilesList, "utf8", function (err, listData) {
		if (err) {
			callback(err, null);
			return;
		}
		var list = JSON.parse(listData);
		var i;
	
		// create keyed lookup
		var timeSrc = {};
		for (i = 0; i < list.length; ++i)
			timeSrc[list[i].title] = list[i].mtime;

		for (i = 0; i < list.length; ++i)
			publishList.push({ title: list[i].title, path: list[i].path });

		fs.writeFile(outputPublish, JSON.stringify(publishList), function (err) {
			if (err) {
				callback(err, null);
				return;
			}
			fs.writeFile(outputFilesList, JSON.stringify(timeSrc), function (err) {
				if (err) {
					callback(err, null);
					return;
				}
				var bar = new ProgressBar('  building '+list.length+' plaintext files [:bar] :percent :etas', {
					complete: '=',
					incomplete: ' ',
					width: 20,
					total: list.length
				});
				
				async.eachSeries(list, function (fo, callbackLoop) {
					bar.tick();
					htmlToText.fromFile(fo.file, {
						wordwrap: 150,
						ignoreImage: true,
						ignoreHR: true
					}, function (err, textData) {
							var ofn = replaceAll(replaceAll(fo.path, '/', '_'), '\\', '_');
							ofn = ofn.replace(".html", ".txt");
							if (err) {
								callStatus.errors++;
								callStatus.errorList.push({ file: ofn, error: err });
								callbackLoop();
							} else {
								fs.writeFile(plainTextPath + ofn, textData, function (err) {
									if (err) {
										callStatus.errors++;
										callStatus.errorList.push({ file: ofn, error: err });
									} else {
										callStatus.converted++;
									}
									callbackLoop();
								});
							}
						});
				}, function () {
						publishIndexDriver();
					});
			});
		});
	});
}