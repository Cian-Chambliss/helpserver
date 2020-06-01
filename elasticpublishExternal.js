/**
 * Publish the plaintext of the help to elastic search...
 */
module.exports = function (config, file , records , callback ) {
  var helpSystemIndex = config.search.index;
  var helpSystemType = config.search.type;
  var async = require('async');
  var elasticsearch = require('elasticsearch');
  var client = new elasticsearch.Client({
      host: config.search.host,
      apiVersion: '6.8'
  });
  console.log("Publish externals for file "+file);
  async.eachSeries(records, function (record, callbackLoop) {
      var id = record.id || (file + ":" + record.href);
      if( record.href ) {
        client.delete({
          index: helpSystemIndex,
          type: helpSystemType,
          id: id,
        }, function (error, response) {
            var bodyContent = {
                title: record.title,
                path: record.href,
                file: file,
                description: record.description
            };
            if( !error ) {
                console.log("Removed external "+id);
            }
            client.create({
              index: helpSystemIndex,
              type: helpSystemType,
              id: id,
              body: bodyContent
            }, function (error) {
                console.log("Created external "+JSON.stringify(bodyContent));
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