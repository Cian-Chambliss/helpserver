/**
 * Incrementally update the search index (plain text) for the help system
 */
module.exports = function (config, callback) {
   var async = require('async');
   var reposList = null;
   var gitSucceeded = false;

   if( config.repoSource ) {
       if( Array.isArray(config.repoSource) ) {
           reposList = config.repoSource;
       } else {
           reposList = [ config.repoSource ];
       }
   } else {
       reposList = [config.source ];
   }
   async.eachSeries(reposList, function (repoName, callbackLoop) {
        var nodegit = require('nodegit');
        var repository;
        console.log("git pull "+repoName);
        nodegit.Repository.open(repoName )
            .then(function (repo) {
            repository = repo;
            return repository.fetchAll({
                credentials: function (url, userName) {
                    return nodegit.Cred.sshKeyFromAgent(userName);
                },
                certificateCheck: function () {
                    return 1;
                }
            });
        })
            .then(function () {
            return repository.mergeBranches("master", "origin/master");
        })
            .catch(function (err) {
                console.log("Error on pull "+err);
            if( callbackLoop ) {
                callbackLoop();
                callbackLoop = null;      
            }
        })
            .done(function () {
                gitSucceeded = true;
            if( callbackLoop ) {
                callbackLoop();
                callbackLoop = null;      
            }
    });
   },function() {
       callback(null,gitSucceeded);
   });
}