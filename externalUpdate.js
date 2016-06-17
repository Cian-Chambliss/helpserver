module.exports = function (config, callback ) {
    var fs = require("fs");
    var extFilePublish = config.generated + "externalPublish.json";
    var oldExternal = [];
    var newExternal = [];
    var difference = [];
    var publishChanges = function(file,nextLoop) {
        console.log("TBD Publish changes to "+file);
        nextLoop();
    };
    var completeCompare = function() {
        var async = require('async');
        async.eachSeries(difference, function (entry, callbackLoop) {
            publishChanges(entry.file,callbackLoop);
        },function() {        
            fs.writeFile(extFilePublish,JSON.stringify(newExternal),function(err) {
                callback(null,{});
            });
        });
    };
    fs.readFile(extFilePublish,"utf8",function(err,data) {
        if( !err ) {
            oldExternal = JSON.parse(data);
        }
        fs.readdir(config.external ,function (err, list) {
            var countdown = list.length;
            list.forEach(function (file) {
                fs.stat(config.external+file, function (err, stat) {
                    if( !err) {
                        if( !stat.isDirectory()) {
                            var changed = true;
                            var entry =  { file : file , mtime : (""+stat.mtime) };
                            newExternal.push(entry);
                            for(var i = 0 ; i < oldExternal.length ; ++i ) {
                                if( oldExternal[i].file == file ) {
                                    if( oldExternal[i].mtime == (""+stat.mtime) ) {
                                        changed = false;
                                    }
                                    break;
                                }
                            }
                            if( changed ) {
                                difference.push(entry);
                            }
                        }
                    }
                    --countdown;
                    if( countdown == 0 ) {
                        completeCompare();
                    }
                });
            });
        });
        
    })
}