module.exports = function (config, pattern, callback, startAt, maximum , getDescription , lookIn ) {
  var helpSystemIndex = config.search.index;
  var elasticsearch = require('elasticsearch');
  var client = new elasticsearch.Client({
    host: config.search.host
  });
  var queryDef = null;  
  if( lookIn && lookIn != '' ) {
     if( lookIn != "title" )
        lookIn = "all";
  } else {
      lookIn = "all";  
  }  
  if (pattern && pattern != '') {
    if( lookIn == "title" ) {
        queryDef = {
          bool: {
            should: [
              { match: { title: { query: pattern, operator: "and", boost: 4 } } },
              { match: { title: { query: pattern, boost: 2 } } },
            ]
          }
        };
    } else {
        queryDef = {
          bool: {
            should: [
              { match: { title: { query: pattern, operator: "and", boost: 4 } } },
              { match: { content: { query: pattern, operator: "and", boost: 3 } } },
              { match: { title: { query: pattern, boost: 2 } } },
              { match: { content: pattern } }
            ]
          }
        };
    }
    var symbols = "";
    if( config.events.extractSymbols ) {
        symbols = config.events.extractSymbols(pattern);
        if( symbols.length > 1 ) {
            queryDef.bool.should.push({match:{ symbols : { query : symbols , boost : 3 }}});   
        }
    }
    if (config.filter) {
      queryDef.bool.must = [{ match: config.filter }];
    }
  } else if (config.filter) {
    lookIn = "";
    if( config.filter.missing && config.filter.missing.field )
       queryDef = { filtered : { filter: config.filter } };   
    else if( config.filter.exists && config.filter.exists.field )
       queryDef = { filtered : { filter: config.filter } };        
    else
       queryDef = { match: config.filter };
  } else {
    lookIn = "";
    queryDef = { "match_all": {} };
  }
  if (!startAt) {
    startAt = 0;
  }
  if (!maximum) {
    maximum = 10;
  }
  var columnSelection = null;
  if( getDescription ) {
      columnSelection = ["title", "path", "description" , "metadata" , "toc" ]
  } else if( lookIn == "title" ) {
     columnSelection = ["title", "path"];
  } else {
      columnSelection = ["title", "path", "metadata" , "toc" ]
  }
  client.search({
    index: helpSystemIndex,
    body: {
      from: startAt,
      size: maximum,
      query: queryDef,
      _source: columnSelection
    }
  }, function (error, response) {
      if (error) {
        console.log('Query:'+error);
        callback(error, null);
      } else {
        var results = [], srcArray = response.hits.hits;
        var i;
        var patterns = null;
        var matchTitle = null;
        if( lookIn == "title" && maximum >= 1000 ) {
           patterns = pattern.toLowerCase().split('|');
           for( var i = 0 ; i < patterns.length ; ++i ) {
              patterns[i] = patterns[i].split(" ");
           }
           matchTitle = function(orPatterns,title) {               
              title = title.toLowerCase();
              for( var i = 0 ; i < orPatterns.length ; ++i ) {
                var andPatterns = orPatterns[i];
                if( andPatterns.length > 0 ) {
                  var score = 0;
                  for( var j = 0 ; j < andPatterns.length ; ++j ) {
                    if( title.indexOf(andPatterns[j]) >= 0 ) {
                        ++score;
                    }
                  }
                  if( score == andPatterns.length ) {
                    return true;
                  }
                }
              }
              return false;
          }
        }
        for (i = 0; i < srcArray.length; ++i) {
          var item = srcArray[i]._source;
          var description = item.description || "";
          if( matchTitle ) {
              if( !matchTitle( patterns , item.title ) ) {
                continue;
              }
          }
          if (item.metadata && item.metadata.group) {
            if (item.metadata && item.metadata.pagename ) {
              if( getDescription ) {
                    if (item.metadata.istopic) {
                        results.push({ title: item.title, description : description , path: item.path, group: item.metadata.group, istopic: item.metadata.istopic , pagename : item.metadata.pagename });
                    } else {
                        results.push({ title: item.title, description : description ,path: item.path, group: item.metadata.group , pagename : item.metadata.pagename });
                    }                    
              } else {
                    if (item.metadata.istopic) {
                        results.push({ title: item.title, path: item.path, group: item.metadata.group, istopic: item.metadata.istopic , pagename : item.metadata.pagename });
                    } else {
                        results.push({ title: item.title, path: item.path, group: item.metadata.group , pagename : item.metadata.pagename });
                    }
              }              
            } else if( getDescription ) {
              if (item.metadata.istopic) {
                results.push({ title: item.title,description : description , path: item.path, group: item.metadata.group, istopic: item.metadata.istopic });
              } else {
                results.push({ title: item.title,description : description , path: item.path, group: item.metadata.group });
              }
            } else {              
              if (item.metadata.istopic) {
                results.push({ title: item.title, path: item.path, group: item.metadata.group, istopic: item.metadata.istopic });
              } else {
                results.push({ title: item.title, path: item.path, group: item.metadata.group });
              }
            }
          } else if( getDescription ) {
            if (item.metadata && item.metadata.pagename ) {
              results.push({ title: item.title,description : description , path: item.path , pagename : item.metadata.pagename });
            } else {
              results.push({ title: item.title,description : description , path: item.path });
            }
          } else {
            if (item.metadata && item.metadata.pagename ) {
              results.push({ title: item.title, path: item.path , pagename : item.metadata.pagename });
            } else {
              results.push({ title: item.title, path: item.path });
            }
          } 
          if( item.toc ) {
            results[ results.length - 1 ].toc = item.toc;
          }  
        }        
        callback(null, results);
      }
    });
};