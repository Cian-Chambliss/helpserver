module.exports = function (config, pattern, callback) {
  var helpSystemIndex = config.search.index;
  var elasticsearch = require('elasticsearch');
  var client = new elasticsearch.Client({
    host: config.search.host
  });
  client.search({
    index: helpSystemIndex,
    body: {
      query: {
        bool: {
          should: [
            { match: { title: { query: pattern, operator: "and", boost: 4 } } },
            { match: { content: { query: pattern, operator: "and", boost: 3 } } },
            { match: { title: { query: pattern, boost: 2 } } },
            { match: { content: pattern } }
          ]
        }
      },
      _source: ["title", "path"]
    }
  }, function (error, response) {
      if (error) {
        callback(error,null);
      } else {
        var results = [], srcArray = response.hits.hits;
        var i;
        for (i = 0; i < srcArray.length; ++i)
          results.push(srcArray[i]._source);
        callback(null,results);
      }
    });
};