module.exports = function (settings, basePath) {
	var fs = require('fs');
	var async = require('async');
	var elasticsearch = require('elasticsearch');
	var client = new elasticsearch.Client({ host: (settings.host || 'localhost:9200') });
	var queryDef = { "match_all": {} };
	client.search({
		index: (settings.index || 'helpserver'),
		body: {
			from: 0,
			size: 10000,
			query: queryDef,
			_source: ["title", "path"]
		}
	}, function (error, response) {
		if (error) {
			console.log("error:" + error);
		} else {
			async.eachSeries(response.hits.hits, function (fo, callbackLoop) {
				var pathPart = fo._source.path.split('#')[0];
				fs.exists(basePath + pathPart, function (exists) {
					if (!exists) {
						client.delete({
							index: (settings.index || 'helpserver'),
							type: (settings.type || "helppage"),
							id: fo._source.path,
						}, function (error, response) {
							console.log('remove reference ' + fo._source.path);
							callbackLoop();
						});
					} else {
						callbackLoop();
					}
				});
			});
		}
	});
}