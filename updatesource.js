/**
 * Incrementally update the search index (plain text) for the help system
 */
module.exports = function (config, callback) {
   const simpleGit = require('simple-git');
   var reposList = null;
   var gitSucceeded = true;

   if( config.repoSource ) {
       if( Array.isArray(config.repoSource) ) {
           reposList = config.repoSource;
       } else {
           reposList = [ config.repoSource ];
       }
   } else {
       reposList = [config.source ];
   }
   var countDown = reposList.length;
   var i = 0;


   async function pullDownSource(path) {
        try {
            const git = simpleGit({baseDir:path, binary: 'git'});
            await git.pull();
            --countDown;
        } catch(e) {
            gitSucceeded = false;
            --countDown;
        }
        if( countDown < 1 ) {
            callback(null,gitSucceeded);
        }
   }
   if( reposList.length > 0 ) {
        for( i = 0 ; i < reposList.length ; ++i ) {
            pullDownSource(reposList[i]);
        }
    } else {
        callback(null,false);
    }
}