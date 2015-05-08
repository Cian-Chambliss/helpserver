/**
 * Build the generated files for the help system.
 */
module.exports = function (config, callback) {
  var folder = config.source;
  var nameReplacements = config.escapes;
  var ignoreItems = config.ignoreItems || [];
  var inputTemplateFileName = config.templatefile;
  var outputFileName = config.generated + config.structurefile;
  var outputUlFileName = config.generated + config.htmlfile;
  var outputFilesList = config.generated + config.flatfile;
  var flatList = [];
  var replaceAll = function(str, find, replace) {
    while (str.indexOf(find) >= 0)
      str = str.replace(find, replace);
    return str;
  };

  var fs = require('fs');
  var path = require('path');
  var ignoreItem = function (name) {
    var i = 0;
    for (i = 0; i < ignoreItems.length; ++i) {
      if (ignoreItems[i] == name)
        return true;
    }
    return false;
  }
  var cleanupFileName = function (name) {
    name = replaceAll(name,"\\", "/");
    var start = name.indexOf(folder);
    if (start >= 0) {
      name = "/" + name.substr(start + folder.length);
    }
    return name;
  };
  var cleanupName = function (name) {
    var i;
    for (i = 0; i < nameReplacements.length; ++i) {
      if (name.indexOf(nameReplacements[i].from) >= 0) {
        name = replaceAll(name,nameReplacements[i].from, nameReplacements[i].to);
      }
    }
    return name;
  };
  var walk = function (folder, done) {
    var results = [];
    var names = [];
    fs.readdir(folder, function (err, list) {
      if (err) {
        done(err);
        return;
      }
      var pending = list.length;
      if (!pending) return done(null, results);
      list.forEach(function (file) {
        var html = file;
        var cleanName;
        var duplicateEntry;
        var pagePath;
        file = path.resolve(folder, file);
        fs.stat(file, function (err, stat) {
          if (ignoreItem(html)) {
            if (!--pending) done(null, results);
          } else if (stat && stat.isDirectory()) {
            (function () {
              var folderEntry;
              cleanName = cleanupName(html);
              duplicateEntry = names.indexOf(cleanName);
              if (duplicateEntry < 0) {
                folderEntry = { html: cleanName, children: [] }
                results.push(folderEntry);
                names.push(cleanName);
              } else {
                folderEntry = results[duplicateEntry];
                folderEntry.children = [];
              }
              walk(file, function (err, res) {
                folderEntry.children = res;
                if (!--pending) done(null, results);
              });
            } ());
          } else {
            if (file.indexOf(".html") > -1) {
              cleanName = cleanupName(html);
              duplicateEntry = names.indexOf(cleanName);
              pagePath = cleanupFileName(file);
              if (duplicateEntry < 0) {
                results.push({ html: cleanName, path: pagePath });
                names.push(cleanName);
              } else {
                results[duplicateEntry].path = pagePath;
              }
              flatList.push({ title: cleanName, file: file, path: pagePath, mtime: stat ? stat.mtime : null });
            }
            if (!--pending) done(null, results);
          }
        });
      });
    });
  };

  walk(folder, function (err, results) {
    if (err) {
      callback(err,null);
      return;
    }
    fs.writeFile(outputFileName, JSON.stringify(results), function (err) {
      if (err) {
        callback(err,null);
        return;
      }
      console.log("Generated: " + outputFileName);
      var makeList = function (res, isOpen) {
        var i;
        var ulList = isOpen ? "<ul>\n" : "<ul style=\"display:none\">\n";
        for (i = 0; i < res.length; ++i) {
          if (res[i].children) {
            ulList += "<li branch=\"true\" class=\"closed\" >";
          } else {
            ulList += "<li class=\"leaf\" >";
          }
          if (res[i].path)
            ulList += "<div id=\"" + res[i].path + "\">" + res[i].html + "</div>";
          else
            ulList += "<div>" + res[i].html + "</div>";
          if (res[i].children)
            ulList += makeList(res[i].children, false);
          ulList += "</li>\n"
        }
        ulList += "</ul>\n";
        return ulList;
      };
      fs.readFile(inputTemplateFileName, "utf8", function (err, templateData) {
        if( err ) {
            callback(err,null);
            return;          
        }
        var ulPage = makeList(results, true);
        ulPage = templateData.replace("{{placeholder}}", ulPage);
        fs.writeFile(outputUlFileName, ulPage, function (err) {
          if (err) {
            callback(err,null);
            return;
          }
          console.log("Generated: " + outputUlFileName);
          fs.writeFile(outputFilesList, JSON.stringify(flatList), function (err, templateData) {
            if (err) {
              callback(err,null);
              return;
            }
            console.log("Generated: " + outputFilesList);
            callback(null,true);
          });
        });
      });
    });
  });
}