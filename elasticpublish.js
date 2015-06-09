/**
 * Publish the plaintext of the help to elastic search...
 */
module.exports = function (config, callback) {
  var async = require('async');
  var plainTextPath = config.generated + "plaintext/";
  var inputPublish = plainTextPath + "publish.json";
  var outputUnpublished = plainTextPath + "unpublished.json";
  var fs = require('fs');
  var helpSystemIndex = config.search.index;
  var helpSystemType = config.search.type;
  var ProgressBar = require('progress');
  var unpublished = [];
  var publishStats = { published: 0, errors: 0, errorList: [] };
  var replaceAll = function (str, find, replace) {
    while (str.indexOf(find) >= 0)
      str = str.replace(find, replace);
    return str;
  };
  fs.readFile(inputPublish, "utf8", function (err, listData) {
    var list = JSON.parse(listData);
    if (list.length > 0) {
      var elasticsearch = require('elasticsearch');
      var client = new elasticsearch.Client({
        host: config.search.host
      });
      var bar = new ProgressBar('  publishing ' + list.length + ' elastic search records [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: list.length
      });

      async.eachSeries(list, function (fo, callbackLoop) {
        var fn = replaceAll(replaceAll(fo.path, '/', '_'), '\\', '_');
        fn = fn.replace(".html", ".txt");
        fs.readFile(plainTextPath + fn, "utf8", function (err, content) {
          if (err && !fo.isDelete) {
            bar.tick();
            unpublished.push(fo);
            publishStats.errors++;
            publishStats.errorList.push(err);
            callbackLoop();
            return false;
          }
          client.delete({
            index: helpSystemIndex,
            type: helpSystemType,
            id: fo.path,
          }, function (error, response) {
              if (fo.isDelete) {
                // if this is a deletion, we are done with this entry
                console.log('deleted item '+fo.path+' '+error+"\n\n");
                publishStats.published++;
                callbackLoop();
              } else {
                var metadataInst = fo.metadata;
                if( metadataInst ) {
                  // Treat all pages with status that is not accept, allow or accepted as under review
                  if(  metadataInst.status && metadataInst.status.substr(0,1).toLowerCase() != "a" ) {
                      if( metadataInst.group ) {
                          metadataInst = { tags : "review" , group : metadataInst.group };
                      } else {
                          metadataInst = { tags : "review" };
                      }                      
                  }
                } else {
                  metadataInst = null;
                }
                
                var bodyContent = {
                    title: fo.title,
                    path: fo.path,
                    content: content,
                    metadata: metadataInst                  
                };
                if( fo.toc )
                  bodyContent.toc = fo.toc;
                client.create({
                  index: helpSystemIndex,
                  type: helpSystemType,
                  id: fo.path,
                  body: bodyContent
                }, function (error) {
                    bar.tick();
                    if (error) {
                      unpublished.push(fo);
                      publishStats.errors++;
                      publishStats.errorList.push(error);
                      callbackLoop();
                    } else {
                      publishStats.published++;
                      callbackLoop();
                    }
                  });
              }
            });
        });
      }, function () {
          // unpublished files get kept around (so that an update will retry any failed writes)
          fs.writeFile(outputUnpublished, JSON.stringify(unpublished), function (err) {
            callback(err, { updated: true, reindexed: false, publish: publishStats });
          });
        });
    }
  });
}  