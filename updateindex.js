/**
 * Incrementally update the search index (plain text) for the help system
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
	if (!config.search) {
		callback(new Error('Cannot create index without search configuration'), null);
		return;
	}
	if (config.search.provider === 'elasticsearch') {
		var publishIndexDriver = function () {
			var elasticpublish = require("./elasticpublish");
			elasticpublish(config, callback);
		};
	} else {
		callback(new Error('Search provider ' + config.search.provider + ' is not supported.'), null);
	}
	fs.readFile(inputFilesList, "utf8", function (err, listData) {
		var list = JSON.parse(listData);
		fs.readFile(outputFilesList, "utf8", function (err, listData) {
			var times = JSON.parse(listData);
			var i;
			var changed = [];
			for (i = 0; i < list.length; ++i) {
				if (times[list[i].title] != list[i].mtime) {
					changed.push(list[i]);
				}
			}
			if (changed.length > 0) {
				console.log("Changes\n\n" + JSON.stringify(changed, null, "\t"));
				var timeSrc = {};

				for (i = 0; i < list.length; ++i)
					timeSrc[list[i].title] = list[i].mtime;

				for (i = 0; i < changed.length; ++i)
					publishList.push({ title: changed[i].title, path: changed[i].path });

				fs.writeFile(outputPublish, JSON.stringify(publishList), function (err) {
					fs.writeFile(outputFilesList, JSON.stringify(timeSrc), function (err) {
						var bar = null;
						if (list.length > 0) {
							bar = new ProgressBar('  building ' + list.length + ' plaintext files [:bar] :percent :etas', {
								complete: '=',
								incomplete: ' ',
								width: 20,
								total: list.length
							});
							async.eachSeries(changed, function (fo, callbackLoop) {
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
										} else {
											var ofn = fo.path.substr(fo.path.lastIndexOf("/") + 1);
											ofn = ofn.replace(".html", ".txt");
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
									publishIndexDriver(config, callback);
								});
						} else {
							publishIndexDriver(config, callback);
						}
					});
				});
			} else {
				callback(null,{ updated : true , reindexed : false } );
			}
		});
	});
}