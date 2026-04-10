/**
 * Incrementally update the search index (plain text) for the help system
 */
module.exports = function (config,help) {
  var http = require('http');
  var startWebhookServer = function(createHandler) {
    if (createHandler && createHandler.default && typeof createHandler.default === 'function') {
      createHandler = createHandler.default;
    }
    if (typeof createHandler !== 'function') {
      throw new Error('Invalid github-webhook-handler export');
    }
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
  };

  try {
    startWebhookServer(require('github-webhook-handler'));
  } catch (err) {
    if (err && err.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      import('github-webhook-handler').then(startWebhookServer).catch(function(importErr) {
        console.error('Error loading github-webhook-handler:', importErr.message);
      });
    } else {
      throw err;
    }
  }
}
