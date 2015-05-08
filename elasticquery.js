module.exports = function (config, pattern, callback, startAt, maximum) {
  var helpSystemIndex = config.search.index;
  var elasticsearch = require('elasticsearch');
  var client = new elasticsearch.Client({
    host: config.search.host
  });
  var queryDef = null;
  if (pattern && pattern != '') {
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
      if (config.filter) {
         queryDef.bool.must = [{ match: config.filter }];
      }
  } else if (config.filter) {
    queryDef = { match: config.filter };
  } else {
    queryDef = { "match_all": {} };
  }
   if (!startAt) {
      startAt = 0;
   }
  if (!maximum) {
    maximum = 10;
  }
  client.search({
    index: helpSystemIndex,
    body: {
      from: startAt,
      size: maximum,
      query: queryDef,
      _source: ["title", "path"]
    }
  }, function (error, response) {
      if (error) {
        callback(error, null);
      } else {
        var results = [], srcArray = response.hits.hits;
        var i;
        for (i = 0; i < srcArray.length; ++i)
          results.push(srcArray[i]._source);
        callback(null, results);
      }
    });
};