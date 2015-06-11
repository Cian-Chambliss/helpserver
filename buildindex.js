/**
 * Build the search index (plain text) for the help system
 */
module.exports = function (config, callback) {
	var async = require('async');
	var pageProcessor = require('./pageprocess');
	var fs = require('fs');
	var inputFilesList = config.generated + config.flatfile;
	var plainTextPath = config.generated + "plaintext/";
	var manifestPath = config.generated + "manifest/";
	var topicsPath = config.generated + "topics/";
	var outputFilesList = plainTextPath + "filelist.json";
	var outputPublish = plainTextPath + "publish.json";
	var publishList = [];
	var callStatus = { converted: 0, errors: 0, errorList: [] };
	var ProgressBar = require('progress');
	if (!config.search && !config.metadata && !config.dependencies) {
		callback(new Error('Cannot create index without search configuration'), null);
		return;
	}
	if (!config.search) {
		// just doing dependencies and metatags
		var publishIndexDriver = function () {
			callback(null, { updated: true, reindexed: false });
		}
	} else if (config.search.provider === 'elasticsearch') {
		var publishIndexDriver = function () {
			var elasticpublish = require("./elasticpublish");
			elasticpublish(config, callback);
		};
	} else {
		callback(new Error('Search provider ' + config.search.provider + ' is not supported.'), null);
	}
	
	// quicky check to see that plaintext folder exists (since we generate this)
	if (!fs.existsSync(plainTextPath)) {
		fs.mkdirSync(plainTextPath);
	}
	// quicky check to see that manifest folder exists (since we generate this)
	if (!fs.existsSync(manifestPath)) {
		fs.mkdirSync(manifestPath);
	}
	if (!fs.existsSync(topicsPath)) {
		fs.mkdirSync(topicsPath);
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
			timeSrc[list[i].path] = list[i].mtime;

		fs.writeFile(outputFilesList, JSON.stringify(timeSrc), function (err) {
			if (err) {
				callback(err, null);
				return;
			}
			var bar = new ProgressBar('  building ' + list.length + ' plaintext files [:bar] :percent :etas', {
				complete: '=',
				incomplete: ' ',
				width: 20,
				total: list.length
			});

			async.eachSeries(list, function (fo, callbackLoop) {
				bar.tick();
				fs.readFile(fo.file, function (err, data) {
					if (err) {
						callStatus.errors++;
						callStatus.errorList.push({ file: fo.file, error: err });
						callbackLoop();
					} else {
						pageProcessor(config, data, fo, function (err, textfilename) {
							if (err) {
								callStatus.errors++;
								callStatus.errorList.push({ file: textfilename, error: err });
							} else {
								callStatus.converted++;
							}
							if( fo.toc ) {
								publishList.push({ title: fo.title, path: fo.path, metadata: fo.metadata , toc : fo.toc });
							} else {
								publishList.push({ title: fo.title, path: fo.path, metadata: fo.metadata });
							}
							callbackLoop();
						});
					}
				});
			}, function () {
					fs.writeFile(outputPublish, JSON.stringify(publishList), function (err) {
						if (err) {
							callback(err, null);
							return;
						}
						publishIndexDriver();
					});
				});
		});
	});
}