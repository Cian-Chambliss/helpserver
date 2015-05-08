/**
 * Entry point to helpserver utilities 
 */
module.exports = function (config) {
  var fs = require('fs');
  var modulePath = 'node_modules/helpserver/';
  function HelpServerUtil() {
    if (!config || !config.hasOwnProperty('source') || !config.hasOwnProperty('generated')) {
      throw new Error('configuration must be passed that includes at least the source & generated folders { source : <sourcefolder > , generated : <generatedfilefolder> ... }');
    }
    if (config.hasOwnProperty('search')) {
      if (!config.search.hasOwnProperty('provider')) {
        throw new Error('Configuration search must define a provider ... }');
      }
      //-------------- Handle parameter checking/defaults for supported search providers...
      if (config.search.provider === 'elasticsearch') {
        if (!config.search.hasOwnProperty('index')) {
          config.search.index = 'helpserver';
        }
        if (!config.search.hasOwnProperty('type')) {
          config.search.type = 'helppage';
        }
        if (!config.search.hasOwnProperty('host')) {
          config.search.host = 'localhost:9200';
        }
      } else {
        throw new Error('Configuration provider not supported ... }');
      }
    }
    if (!config.hasOwnProperty('filter_name')) {
         config.filter_name = '';
    }
    if (config.filter) {
      if (!config.search) {
            throw new Error('Filter requires search parameters to be defined ... }');
      }
      if (config.filter_name == '') {
            throw new Error('Filter requires a filter_name to be defined ... }');
      }
    } else if (config.filter_name != '') {
      throw new Error('Filter_name requires a filter to be defined ... }');
    }

    if (!config.hasOwnProperty('escapes')) {
      config.escapes = [
        { from: ".html", to: "" }
        , { from: ".md", to: "" }
        , { from: "__STAR__", to: "*" }
        , { from: "__QUESTION__", to: "?" }
        , { from: "__SLASH__", to: "/" }
        , { from: "__BACKSLASH__", to: "\\" }
        , { from: "__NAMESPACE__", to: "::" }
        , { from: "__COLON__", to: ":" }
        , { from: "__ELLIPSES__", to: "..." }
        , { from: "__HASH__", to: "#" }
        , { from: "__GT__", to: ">" }
        , { from: "__LT__", to: "<" }
        , { from: "__PIPE__", to: "|" }
      ];
    }
    if (!config.hasOwnProperty('templatefile')) {
      config.templatefile = modulePath + "toctemplate.html";
    }
    if (!config.hasOwnProperty('structurefile')) {
      config.structurefile = "tree.json";
    }
    if (!config.hasOwnProperty('htmlfile')) {
      config.htmlfile = "tree.html";
    }
    if (!config.hasOwnProperty('flatfile')) {
      config.flatfile = "list.json";
    }
    var terminatePath = function (path) {
      var lastChar = path.substring(path.length - 1);
      if (lastChar !== '\\' && lastChar !== '/')
        path += '/';
      return path;
    }
    config.source = terminatePath(config.source);
    config.generated = terminatePath(config.generated);
  }
  
  // status determines if index server is running (if specified) as well as existence of required files...
  HelpServerUtil.prototype.status = function (callback) {
    var stats = { htmlTreeExists: false, jsonTreeExists: false, indexServiceRunning: false, indexExists: false, indexCount: 0 };
    fs.exists(config.generated + config.htmlfile, function (htmlExists) {
      stats.htmlTreeExists = htmlExists;
      fs.exists(config.generated + config.structurefile, function (jsonExists) {
        stats.jsonTreeExists = jsonExists;
        if (config.search) {
          var elasticsearch = require('elasticsearch');
          var client = new elasticsearch.Client({ host: config.search.host });
          client.ping({ requestTimeout: 10000 }, function (error) {
            if (!error) {
              stats.indexServiceRunning = true;
              client.count({
                index: config.search.index
              }, function (error, response) {
                  if (!error && response.count) {
                    stats.indexCount = response.count;
                  }
                  callback(stats);
                });
            } else {
              callback(stats);
            }
          });
        }
      });
    });
  }
  
  // Get a help page or resource (image css). or help resource
  HelpServerUtil.prototype.get = function (page, callback) {
    var extension = null;
    var extensionPos = page.lastIndexOf('.');
    if (extensionPos > 0)
      extension = page.substring(extensionPos + 1).toLowerCase();
    var relativePath = unescape(page.substring(1));
    if (!extension) {
      // TBD - generate Table of contents...
      callback(new Error('Page not found!'), null);
    } else if (extension == "html" || extension == "htm") {
      fs.readFile(config.source + relativePath, "utf8", function (err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, data, "html");
        }
      });
    } else if (extension == "css") {
      var helpServerFile = relativePath.lastIndexOf("helpserver-");
      if (helpServerFile > -1) {
        fs.readFile(modulePath + 'assets/' + relativePath.substr(helpServerFile), "utf8", function (err, data) {
          if (err) {
            console.log(modulePath + 'assets/' + relativePath.substr(helpServerFile));
            callback(err, null);
          } else {
            callback(null, data, "css");
          }
        });
      } else {
        fs.readFile(config.source + relativePath, "utf8", function (err, data) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, data, "css");
          }
        });
      }
    } else if (extension == "js") {
      var helpServerFile = relativePath.lastIndexOf("helpserver-");
      if (helpServerFile > -1) {
        fs.readFile(modulePath + 'assets/' + relativePath.substr(helpServerFile), "utf8", function (err, data) {
          if (err) {
            console.log(modulePath + 'assets/' + relativePath.substr(helpServerFile));
            callback(err, null);
          } else {
            callback(null, data, "js");
          }
        });
      } else {
        fs.readFile(config.source + relativePath, "utf8", function (err, data) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, data, "js");
          }
        });
      }
    } else {
      fs.readFile(config.source + relativePath, function (err, data) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, data, "extension");
        }
      }
        );
    }
  }
  
  // Get the table of contents
  HelpServerUtil.prototype.gettree = function (page, callback) {
    fs.readFile(config.generated + config.filter_name + config.htmlfile, 'utf8', function (err, data) {
      callback(err, data);
    });
  }


  // Get the table of contents
  HelpServerUtil.prototype.gettreejson = function (page, callback) {
    fs.readFile(config.generated + config.filter_name + config.structurefile, 'utf8', function (err, data) {
      callback(err, data);
    });
  }
   
  // Generate table of contents and optionally populate the search engine with plaintext version of the data
  HelpServerUtil.prototype.generate = function (callback) {
    if (!callback) {
      callback = function (err, result) {
        if (err) {
          console.log("Error :" + err);
        } else {
          console.log("Generate complete!");
        }
      }
    }
    if (typeof (callback) !== 'function') {
      throw new Error('First parameter must be a callback function');
    }
    var buildlist = require('./buildlist');
    buildlist(config, callback);
  }
  
  // After any indices are generated, we should make sure to update the filter
  HelpServerUtil.prototype.generateFiltered = function (callback) {
    if (!callback) {
      callback = function (err, result) {
        if (err) {
          console.log("Error :" + err);
        } else {
          console.log("Generate complete!");
        }
      }
    }
    if (config.filter) {
         var elasticquery = require("./elasticquery");
         elasticquery(config, '', function (err, results) {
            if (err) {
               callback(err, null);
               return;
            }
            var ListUtilities = require('./listutilities');
            var lu = new ListUtilities(config);
            var tree = lu.treeFromList(results);
            var treeUL = lu.treeToUL(tree);
            fs.readFile(config.templatefile, "utf8", function (err, templateData) {
               if (err) {
                  callback(err, null);
                  return;
               }
               treeUL = templateData.replace("{{placeholder}}", treeUL);

               fs.writeFile(config.generated + config.filter_name + config.htmlfile, treeUL, function (err) {
                  if (err) {
              callback(err, null);
              return;
                  }
                  fs.writeFile(config.generated + config.filter_name + config.structurefile, JSON.stringify(tree), function (err) {
              if (err) {
                callback(err, null);
                return;
              }
              callback(null, true);
                  });
               });
            });
         }, 0, 100000);
      };
   }
  
  
   // Generate entire index (generate had to be run) 
   HelpServerUtil.prototype.buildindex = function (callback) {
      var genFiltered = this.generateFiltered;
      if (!callback) {
         callback = function (err, result) {
            if (err) {
               console.log("Error :" + err);
            } else {
               console.log("BuildIndex complete!");
            }
         };
      }
      if (typeof (callback) !== 'function') {
      throw new Error('First parameter must be a callback function');
      }
      var buildlist = require('./buildindex');
      if (config.filter) {
         buildlist(config, function (err, info) {
            genFiltered(function (err2, result2) {
               callback(err, info);
            });
         });
      } else {
         buildlist(config, callback);
      }
   }
  
   // refresh help from repo, and rebuild TOC 
   HelpServerUtil.prototype.refresh = function (callback) {
      var genFiltered = this.generateFiltered;
      if (callback && typeof (callback) === 'function') {
      callback(null, true);
      }
      var rebuildContent = function () {
      var handler = function (err, result) {
            if (err) {
               callback(err, null);
            } else if (config.search) {
               var updateindex = require('./updateindex');
               updateindex(config, callback);
            } else {
               callback(null, { updated: true });
            }
      };
      var buildlist = require('./buildlist');
      buildlist(config, function (err, result) {
            if (config.filter) {
               genFiltered(function (err2, result2) {
                  handler(err, result);
               });
            } else {
               handler(err, result);
            }
      });
      };
      // optional step 1 - update the content using git...
      rebuildContent();
   }

   // perform a pattern seach, returns 'path' portion of help
   HelpServerUtil.prototype.search = function (pattern, callback) {
      if (!callback || typeof (callback) !== 'function') {
      throw new Error('Second parameter must be a callback function');
      }
      if (!pattern || typeof (pattern) !== 'string') {
      callback(new Error('First parameter must be a string'), []);
      } else if (!config.hasOwnProperty('search')) {
      callback(new Error('Search were settings not specified'), []);
      } else {
      var elasticquery = require("./elasticquery");
      elasticquery(config, pattern, callback);
      }
   }

   return new HelpServerUtil();
}
