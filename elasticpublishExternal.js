/**
 * Publish the plaintext of the help to elastic search...
 */
module.exports = function (config, file , records , callback ) {
  var helpSystemIndex = config.search.index;
  var helpSystemType = config.search.type;
  var async = require('async');
  var elasticsearch = require('elasticsearch');
  var client = new elasticsearch.Client({
      host: config.search.host
  });
  console.log("Publish externals for file "+file);
  async.eachSeries(records, function (record, callbackLoop) {
      var id = file + ":" + record.href;
      if( record.href ) {
        client.delete({
          index: helpSystemIndex,
          type: helpSystemType,
          id: id,
        }, function (error, response) {
            var bodyContent = {
                title: record.title,
                file: file,
                href: record.href,
                description: record.description
            };
            client.create({
              index: helpSystemIndex,
              type: helpSystemType,
              id: id,
              body: bodyContent
            }, function (error) {
                console.log("error = "+error);
                callbackLoop();
            });
        });
      } else {
        callbackLoop();
      }
  },function() {
      callback(null, { updated: true, reindexed: false, publish: {} });    
  });
}  