/**
 * Incrementally update the search index (plain text) for the help system
 */
module.exports = function (config,help) {
  var http = require('http');
  var createHandler = require('github-webhook-handler');
  var handler = createHandler({ path: config.webhookPath ? config.webhookPath : '/' , secret: config.webhookSecret });

  http.createServer(function (req, res) {
    handler(req, res, function (err) {
      res.statusCode = 404;
      res.end('no such location');
    });
  }).listen(config.webhookPort);

  handler.on('error', function (err) {
    console.error('Error:', err.message);
  });

  handler.on('push', function (event) {
    console.log('Received a push event for %s to %s',
      event.payload.repository.name,
      event.payload.ref);
    help.refresh(function() {    
    });
  });

  handler.on('issues', function (event) {
    console.log('Received an issue event for % action=%s: #%d %s',
      event.payload.repository.name,
      event.payload.action,
      event.payload.issue.number,
      event.payload.issue.title);
  });
}