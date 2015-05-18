/**
 * Incrementally update the search index (plain text) for the help system
 */
module.exports = function (config, callback) {
   var nodegit = require('nodegit');
   var repository;
   nodegit.Repository.open(config.repoSource ? config.repoSource : config.source )
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
       callback(err,false);      
   })
      .done(function () {
      callback(null,true);
   });
}