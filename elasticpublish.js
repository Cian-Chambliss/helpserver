/**
 * Publish the plaintext of the help to elastic search...
 */
module.exports = function (config, callback ) {
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
                var tags = null;
                var status =null;
                if( metadataInst ) {
                   if( metadataInst.tags )
                      tags = metadataInst.tags;
                   if( metadataInst.status )
                      status = metadataInst.status;
                  // Treat all pages with status that is not accept, allow or accepted as under review
                  if(  metadataInst.status && metadataInst.status.substr(0,1).toLowerCase() != "a" ) {
                      if( metadataInst.group ) {
                         if( metadataInst.pagename ) {
                              metadataInst = { tags : "review" , group : metadataInst.group , "pagename" : metadataInst.pagename };
                         } else {
                              metadataInst = { tags : "review" , group : metadataInst.group };
                         }
                      } else if( metadataInst.pagename ) {
                         metadataInst = { tags : "review" , "pagename" : metadataInst.pagename };
                      } else {
                          metadataInst = { tags : "review" };
                      }                      
                  }
                } else {
                  metadataInst = null;
                }
                if( !metadataInst ) {
                   var defaultPathMD = config.tocData.defaultPathMetadata;
                   if( defaultPathMD &&  defaultPathMD.length ) {  
                        var i;
                        for( i = 0 ; i < defaultPathMD.length ; ++i ) {
                            var pathMetadata = defaultPathMD[i];  
                            if( fo.path.substring(0,pathMetadata.name.length).toLowerCase() == pathMetadata.name.toLowerCase() ) {
                                metadataInst = pathMetadata.metadata;
                                break;
                            }
                        }
                   }
                }                
                if( content.substring(0,21) == "#HELPSERVER-TOC-ENTRY" ) {
                  var helpEntries = content.split('\n');
                  helpEntries.splice(0,1);
                  var countDown =  helpEntries.length;
                  async.eachSeries(helpEntries, function (helpEntry, callbackLoop2) {
                    var fnb = fn.replace(".txt","");
                    var helpEntryParts = helpEntry.split("\t");
                    var helpEntryHash = helpEntryParts[0];
                    var helpEntryTitle = helpEntryParts[0];
                    if( helpEntryParts.length > 1 )
                       helpEntryTitle = helpEntryParts[1];
                    fs.readFile(plainTextPath + fnb + "__"+helpEntryHash+".txt", "utf8", function (err, subcontent) {
                      if( err ) {
                          // Countdown to the last element pushed...
                          --countDown;
                          callbackLoop2();
                          if( countDown == 0 )
                             callbackLoop();                        
                      } else {
                          client.delete({
                            index: helpSystemIndex,
                            type: helpSystemType,
                            id: fo.path + "#" + helpEntryHash,
                          }, function (error, response) {
                            var bodyContent = {
                                title: fo.title + " / " +helpEntryTitle,
                                path: fo.path + "#" + helpEntryHash,
                                content: subcontent,
                                tags: tags,
                                status: status,
                                metadata: metadataInst                  
                            };
                            client.create({
                              index: helpSystemIndex,
                              type: helpSystemType,
                              id: fo.path + "#" + helpEntryHash,
                              body: bodyContent
                            }, function (error) {
                                bar.tick();
                                if (error) {
                                  unpublished.push(fo);
                                  publishStats.errors++;
                                  publishStats.errorList.push(error);
                                } else {
                                  publishStats.published++;
                                }
                                // Countdown to the last element pushed...
                                --countDown;
                                callbackLoop2();
                                if( countDown == 0 )
                                    callbackLoop();
                              });                        
                          });
                      }
                      });                    
                  });                                  
                } else {                
                  var bodyContent = {
                      title: fo.title,
                      path: fo.path,
                      content: content,
                      tags: tags,
                      status: status,
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