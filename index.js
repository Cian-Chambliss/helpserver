/**
 * Entry point to helpserver utilities 
 */
module.exports = function (config) {
    var replaceAll = function (str, find, replace) {
        while (str.indexOf(find) >= 0)
            str = str.replace(find, replace);
        return str;
    };
    var fs = require('fs');
    var path = require('path');
    var appDir = replaceAll(path.dirname(require.main.filename), "\\", "/") + '/';
    var modulePath = appDir + 'node_modules/helpserver/';
    var configurations = {}; // Child configurations (filters & permissions added to views)
    var configurationObjects = {}; // Child configuration objects
    var filters = {};
    var assets = {};
    var defaultFilter = config.defaultFilter || '_all';
    var serverHealth = { refreshCount: 0, busyInRefresh: false, gitResult: "None", gitPullCount: 0, whoCalled: "" };

    var loadAssetUTF8 = function (name, callback) {
        if (assets[name]) {
            callback(null, assets[name]);
        } else {
            // First try the asset folder under modules...
            fs.readFile(config.assetpath + 'assets/' + name, "utf8", function (err, data) {
                if (err) {
                    console.log(config.assetpath + 'assets/' + name + " not found - using default.");
                    // Next try the module asset folder
                    fs.readFile(modulePath + 'assets/' + name, "utf8", function (err, data) {
                        if (err) {
                            console.log('cant read asset ' + modulePath + 'assets/' + name)
                            callback(err, null);
                        } else {
                            assets[name] = data;
                            callback(null, data);
                        }
                    });
                } else {
                    assets[name] = data;
                    callback(null, data);
                }
            });
        }
    };

    function HelpServerUtil(config) {
        this.config = config;
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
                , { from: ".xml", to: "" }
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
        if (!config.hasOwnProperty('xslt')) {
            config.xslt = '';
        }

        if (!config.hasOwnProperty('pageIndexer')) {
            config.pageIndexer = null;
        }
        if (!config.hasOwnProperty('wrapIndex')) {
            config.wrapIndex = null;
        }
        if (!config.hasOwnProperty('getDefaultIndexTemplate')) {
            config.getDefaultIndexTemplate = null;
        }
        if (!config.hasOwnProperty('translateXML')) {
            config.translateXML = null;
        }
        if (!config.hasOwnProperty('altTocs')) {
            config.altTocs = [];
        }
        if (!config.hasOwnProperty('defaultPathMetadata')) {
            config.defaultPathMetadata = [];
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
        if (!config.hasOwnProperty('assetpath')) {
            config.assetpath = __dirname;
        }
        var terminatePath = function (path) {
            var lastChar = path.substring(path.length - 1);
            if (lastChar !== '\\' && lastChar !== '/')
                path += '/';
            return path;
        };
        config.source = terminatePath(config.source);
        config.generated = terminatePath(config.generated);
      
        // Create a dummy filter for 'all'   
        if (!filters["_all"]) {
            filters["_all"] = {
                filter_name: '_all',
                source: config.source,
                generated: config.generated,
                search: config.search,
                escapes: config.escapes,
                xslt: config.xslt,
                pageIndexer: config.pageIndexer,
                wrapIndex: config.wrapIndex,
                getDefaultIndexTemplate: config.getDefaultIndexTemplate,
                translateXML: config.translateXML,
                altTocs: config.altTocs,
                defaultPathMetadata: config.defaultPathMetadata,
                templatefile: config.templatefile,
                structurefile: config.structurefile,
                htmlfile: config.htmlfile,
                flatfile: config.flatfile,
                assetpath: config.assetpath,
                useGit: config.useGit,
                repoSource: config.repoSource,
                isAdmin: config.isAdmin
            };
        }
       
        // Collect a filter if it is not already included    
        if (config.filter_name && config.filter && !filters[config.filter_name]) {
            filters[config.filter_name] = config;
        }
        // Setup Configurations
        if (config.configurations) {
            for (var configName in config.configurations) {
                var configDef = config.configurations[configName];
                configurations[configName] = {
                    source: configDef.source ? configDef.source : config.source,
                    generated: configDef.generated ? configDef.generated : config.generated,
                    search: configDef.search ? configDef.search : config.search,
                    filter_name: configDef.filter_name ? configDef.filter_name : config.filter_name,
                    filter: configDef.filter ? configDef.filter : config.filter,
                    escapes: configDef.escapes ? configDef.escapes : config.escapes,
                    xslt: configDef.xslt ? configDef.xslt : config.xslt,
                    pageIndexer: configDef.pageIndexer ? configDef.pageIndexer : config.pageIndexer,
                    wrapIndex: configDef.wrapIndex ? configDef.wrapIndex : config.wrapIndex,
                    getDefaultIndexTemplate: configDef.getDefaultIndexTemplate ? configDef.getDefaultIndexTemplate : config.getDefaultIndexTemplate,
                    translateXML: configDef.translateXML ? configDef.translateXML : config.translateXML,
                    altTocs: configDef.altTocs ? configDef.altTocs : config.altTocs,
                    defaultPathMetadata: configDef.defaultPathMetadata ? configDef.defaultPathMetadata : config.defaultPathMetadata,
                    templatefile: configDef.templatefile ? configDef.templatefile : config.templatefile,
                    structurefile: configDef.structurefile ? configDef.structurefile : config.structurefile,
                    htmlfile: configDef.htmlfile ? configDef.htmlfile : config.htmlfile,
                    flatfile: configDef.flatfile ? configDef.flatfile : config.flatfile,
                    assetpath: configDef.assetpath ? configDef.assetpath : config.assetpath,
                    useGit: configDef.useGit ? configDef.useGit : config.useGit,
                    repoSource: configDef.repoSource ? configDef.repoSource : config.repoSource,
                    isAdmin: configDef.isAdmin ? configDef.isAdmin : config.isAdmin,
                    responseHeader: configDef.responseHeader ? configDef.responseHeader : config.responseHeader,
                    editTOC: configDef.editTOC ? configDef.editTOC : config.editTOC,
                    topPage: configDef.topPage ? configDef.topPage : config.topPage,
                    topPageMetadata: null
                };
                // Collect all the filters - first occurence of every type (this is for building refresh lists)...
                if (configDef.filter_name && configDef.filter && !filters[configDef.filter_name]) {
                    filters[configDef.filter_name] = configurations[configName];
                }
            }
        }
    }  
 
    // status determines if index server is running (if specified) as well as existence of required files...
    HelpServerUtil.prototype.status = function (callback) {
        var stats = { htmlTreeExists: false, jsonTreeExists: false, indexServiceRunning: false, indexExists: false, indexCount: 0, filtersExist: 0, filtersMissing: 0 };
        var filterNames = [];

        // Get all the 'filters' that we need to regenerate...
        for (var configName in filters) {
            filterNames.push(configName);
        }

        fs.exists(config.generated + config.htmlfile, function (htmlExists) {
            stats.htmlTreeExists = htmlExists;
            fs.exists(config.generated + config.structurefile, function (jsonExists) {
                var async = require('async');
                stats.jsonTreeExists = jsonExists;

                async.eachSeries(filterNames, function (filterName, callbackLoop) {
                    fs.exists("", function (exists) {
                        if (exists)
                            ++stats.filtersExist;
                        else
                            ++stats.filtersMissing;
                        callbackLoop();
                    });
                }, function () {
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
                    } else {
                        callback(stats);
                    }
                });
            });
        });
    };
 
    // Get a help page or resource (image css). or help resource
    HelpServerUtil.prototype.get = function (page, callback) {
        var extension = null;
        var extensionPos = page.lastIndexOf('.');
        if (extensionPos > 0)
            extension = page.substring(extensionPos + 1).toLowerCase();
        var relativePath = unescape(page.substring(1));
        if (!extension) {
            var ListUtilities = require('./listutilities');
            var lu = new ListUtilities(config);
            lu.loadOrCreateIndexPage(this.config, decodeURI(page), (this.config.filter_name ? this.config.filter_name : defaultFilter), callback);
        } else if (extension == "xml_html" && config.translateXML) {
            var ListUtilities = require('./listutilities');
            var lu = new ListUtilities(config);
            lu.loadOrCreateTranslatedPage(this.config, decodeURI(page), (this.config.filter_name ? this.config.filter_name : defaultFilter), callback);
        } else if (extension == "html" || extension == "htm" || extension == "xml") {
            if (page.indexOf("/index.") > 0) {
                if (page.indexOf("/index.xml") > 0
                    || page.indexOf("/index.md") > 0
                    || page.indexOf("/index.html") > 0
                    ) {
                    // Support <!--list--> generically 
                    var ListUtilities = require('./listutilities');
                    var lu = new ListUtilities(config);
                    lu.loadOrCreateIndexPage(this.config, decodeURI(page), (this.config.filter_name ? this.config.filter_name : defaultFilter), callback);
                } else {
                    fs.readFile(config.source + relativePath, "utf8", function (err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data, "html");
                        }
                    });
                }
            } else {
                fs.readFile(config.source + relativePath, "utf8", function (err, data) {
                    if (err) {
                        callback(err, null);
                    } else {
                        var redirectPos = -1;
                        if (data.length < 1024) {
                            // Look for refresh
                            redirectPos = data.indexOf('<!--redirect:');
                            if (redirectPos >= 0) {
                                data = data.substring(redirectPos + 13);
                                redirectPos = data.indexOf('-->');
                                if (redirectPos > 0) {
                                    data = data.substring(0, redirectPos);
                                }
                                var lastPathPos = data.lastIndexOf('/');
                                var basePath = '/';
                                if (lastPathPos > 0) {
                                    basePath = data.substring(0, lastPathPos + 1);
                                }
                                fs.readFile(config.source + data, "utf8", function (err, dataredirect) {
                                    if (err) {
                                        callback(err, null);
                                    } else {
                                        callback(null, "<!--base:" + basePath + "-->" + dataredirect, "html");
                                    }
                                });
                            }
                        }
                        if (redirectPos < 0) {
                            callback(null, data, "html");
                        }
                    }
                });
            }
        } else if (extension == "md") {
            fs.readFile(config.source + relativePath, "utf8", function (err, data) {
                if (err) {
                    callback(err, null);
                } else {
                    var marked = require('marked');
                    callback(null, marked(data), "html");
                }
            });
        } else if (extension == "css" || extension == "svg") {
            var helpServerFile = relativePath.lastIndexOf("helpserver-");
            if (helpServerFile > -1) {
                loadAssetUTF8(relativePath.substr(helpServerFile), function (err, data) {
                    if (err) {
                        console.log(modulePath + 'assets/' + relativePath.substr(helpServerFile));
                        callback(err, null);
                    } else {
                        callback(null, data, extension);
                    }
                });
            } else {
                fs.readFile(config.source + relativePath, "utf8", function (err, data) {
                    if (err) {
                        var endPath = relativePath.indexOf('/');
                        if (endPath >= 0)
                            relativePath = relativePath.substring(endPath + 1);
                        loadAssetUTF8(relativePath, function (err, data) {
                            if (err) {
                                console.log(modulePath + 'assets/' + relativePath.substr(helpServerFile));
                                callback(err, null);
                            } else {
                                callback(null, data, extension);
                            }
                        });
                    } else {
                        callback(null, data, extension);
                    }
                });
            }
        } else if (extension == "js") {
            var helpServerFile = relativePath.lastIndexOf("helpserver-");
            if (helpServerFile > -1) {
                fs.readFile(modulePath + 'assets/' + relativePath.substr(helpServerFile), "utf8", function (err, data) {
                    if (err) {
                        var endPath = relativePath.indexOf('/');
                        if (endPath >= 0)
                            relativePath = relativePath.substring(endPath + 1);
                        loadAssetUTF8(relativePath, function (err, data) {
                            if (err) {
                                console.log(modulePath + 'assets/' + relativePath.substr(helpServerFile));
                                callback(err, null);
                            } else {
                                callback(null, data, extension);
                            }
                        });
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
    };

    var readOptimizedFile = function (filename, acceptEncoding, callback) {
        if (!acceptEncoding) {
            acceptEncoding = '';
        }
        // If caller accepts 'deflated' files
        if (acceptEncoding.match(/\bgzip\b/)) {
            fs.readFile(filename + '.gzip', function (err, data) {
                if (!err) {
                    callback(err, data, 'gzip');
                } else {
                    // fallback to the source file
                    if (acceptEncoding.match(/\bdeflate\b/)) {
                        // .. First look for .deflate file
                        fs.readFile(filename + '.deflate', function (err, data) {
                            if (!err) {
                                callback(err, data, 'deflate');
                            } else {
                                // fallback to the source file
                                fs.readFile(filename, 'utf8', function (err, data) {
                                    callback(err, data, null);
                                });
                            }
                        });
                    }
                }
            });
        } else if (acceptEncoding.match(/\bdeflate\b/)) {
            // .. First look for .deflate file
            fs.readFile(filename + '.deflate', function (err, data) {
                if (!err) {
                    callback(err, data, 'deflate');
                } else {
                    // fallback to the source file
                    fs.readFile(filename, 'utf8', function (err, data) {
                        callback(err, data, null);
                    });
                }
            });
        } else {
            // Just read the file.
            fs.readFile(filename, 'utf8', function (err, data) {
                callback(err, data, null);
            });
        }
    };
  
    // Get the table of contents
    HelpServerUtil.prototype.gettree = function (page, acceptEncoding, callback) {
        readOptimizedFile(this.config.generated + (this.config.filter_name ? this.config.filter_name : defaultFilter) + this.config.htmlfile, acceptEncoding, callback);
    };

    // Get the table of contents
    HelpServerUtil.prototype.gettreejson = function (page, acceptEncoding, callback) {
        readOptimizedFile(this.config.generated + (this.config.filter_name ? this.config.filter_name : defaultFilter) + this.config.structurefile, acceptEncoding, callback);
    };

    HelpServerUtil.prototype.getAltToc = function (page, acceptEncoding, callback) {
        var extensionPos = page.lastIndexOf('.');
        if (extensionPos > 0) {
            if (page.substring(extensionPos).toLowerCase() == '.json') {
                page = page.substring(0, extensionPos) + "/";
            }
        }
        var generatedTopic = config.generated + replaceAll(page, "/", "_") + (this.config.filter_name ? this.config.filter_name : defaultFilter) + "tree.json";
        readOptimizedFile(generatedTopic, acceptEncoding, callback);
    };

   
    // Generate table of contents and optionally populate the search engine with plaintext version of the data
    HelpServerUtil.prototype.generate = function (callback) {
        if (!callback) {
            callback = function (err, result) {
                if (err) {
                    console.log("Error :" + err);
                } else {
                    console.log("Generate complete!");
                }
            };
        }
        if (typeof (callback) !== 'function') {
            throw new Error('First parameter must be a callback function');
        }
        var buildlist = require('./buildlist');
        buildlist(config, callback);
    };
  
    // After any indices are generated, we should make sure to update the filter
    HelpServerUtil.prototype.generateFiltered = function (callback) {
        var filterNames = [];
        var rememberErr = null;
        var i;

        if (!callback) {
            callback = function (err, result) {
                if (err) {
                    console.log("Error :" + err);
                } else {
                    console.log("Generate complete!");
                }
            };
        }

        // Get all the 'filters' that we need to regenerate...
        for (var configName in filters) {
            filterNames.push({ filterName: configName, altToc: null });
            for (i = 0; i < config.altTocs.length; ++i) {
                filterNames.push({ filterName: configName, altToc: config.altTocs[i] });
            }
        }

        // look through all the filters...
        if (filterNames.length > 0) {
            var async = require('async');
            var zlib = require('zlib');
            var elasticquery = require("./elasticquery");
            var ListUtilities = require('./listutilities');
            var topicsPath = config.generated + "topics/";

            console.log('Generating filters');

            async.eachSeries(filterNames, function (filterEntry, callbackLoop) {
                var cfg = filters[filterEntry.filterName];
                console.log('Generate filter for ' + filterEntry.filterName);

                var handleQueryResults = function (err, results) {
                    if (err) {
                        rememberErr = err;
                        callbackLoop();
                        return;
                    }
                    var lu = new ListUtilities(cfg);
                    results.sort(function compare(a, b) {
                        if (a.title < b.title)
                            return -1;
                        if (a.title > b.title)
                            return 1;
                        return 0;
                    });

                    var tree = lu.treeFromList(results, filterEntry.altToc);
                    var treeUL = lu.treeToUL(tree.children);

                    console.log('Saving filtered list...');

                    fs.readFile(cfg.templatefile, "utf8", function (err, templateData) {
                        if (err) {
                            rememberErr = err;
                            callbackLoop();
                            return;
                        }
                        treeUL = templateData.replace("{{placeholder}}", treeUL);
                        var filterFilebaseName = cfg.generated + cfg.filter_name + cfg.htmlfile;
                        var filterStuctureName = cfg.generated + cfg.filter_name + cfg.structurefile;
                        if (filterEntry.altToc) {
                            var altTocClean = replaceAll(filterEntry.altToc, '/', '_')
                            filterFilebaseName = cfg.generated + altTocClean + cfg.filter_name + cfg.htmlfile;
                            filterStuctureName = cfg.generated + altTocClean + cfg.filter_name + cfg.structurefile;
                        }
                        fs.writeFile(filterFilebaseName, treeUL, function (err) {
                            zlib.deflate(treeUL, function (err, packeddata) {
                                fs.writeFile(filterFilebaseName + '.deflate', packeddata, function (err) {
                                    if (err) {
                                        rememberErr = err;
                                        callbackLoop();
                                        return;
                                    }
                                    var jsonString = JSON.stringify(tree);
                                    console.log('Zipping json...');
                                    fs.writeFile(filterStuctureName, jsonString, function (err) {
                                        zlib.deflate(jsonString, function (err, packeddata2) {
                                            console.log('DEFLATE...');
                                            fs.writeFile(filterStuctureName + ".deflate", packeddata2, function (err) {
                                                if (err) {
                                                    rememberErr = err;
                                                }
                                                zlib.gzip(jsonString, function (err, packeddata3) {
                                                    console.log('GZIP...');
                                                    fs.writeFile(filterStuctureName + ".gzip", packeddata3, function (err) {
                                                        if (err) {
                                                            rememberErr = err;
                                                        }
                                                        callbackLoop();
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                };
                if (cfg.topPage) {
                    var manifestFile = config.generated + "manifest/_" + replaceAll(unescape(cfg.topPage), '/', '_').replace(".html", ".json");
                    fs.readFile(manifestFile, function (err, data) {
                        if (err)
                            console.log("Error reading " + manifestFile);
                        if (!err && data && data !== "")
                            cfg.topPageMetadata = JSON.parse(data);
                        elasticquery(cfg, '', handleQueryResults, 0, 100000);
                    });
                } else {
                    elasticquery(cfg, '', handleQueryResults, 0, 100000);
                }
            }, function () {
                if (rememberErr)
                    callback(rememberErr, null);
                else
                    callback(null, true);
            });
        } else {
            console.log('No filters defined');
        };
    };
  
  
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
        buildlist(config, function (err, info) {
            genFiltered(function (err2, result2) {
                callback(err, info);
            });
        });
    };
  
    // refresh help from repo, and rebuild TOC 
    HelpServerUtil.prototype.refresh = function (callback) {
        // Remove all generated pages....
        var ListUtilities = require('./listutilities');
        var lu = new ListUtilities(config);
        lu.cleanupIndexPages(config);
        // generated pages will be rebuilt on demand...
        var rebuildContent = function (help) {
            var handler = function (err, result) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, { updated: true });
                }
            };
            var buildlist = require('./buildlist');
            buildlist(config, function (err, result) {
                if (config.search) {
                    var updateindex = require('./updateindex');
                    updateindex(config, function () {
                        help.generateFiltered(function (err2, result2) {
                            handler(err, result);
                        })
                    });
                } else {
                    help.generateFiltered(function (err2, result2) {
                        handler(err, result);
                    });
                }
            });
        };
        // optional step 1 - update the content using git...
        if (config.useGit) {
            var updatesource = require('./updatesource');
            var help = this;
            updatesource(config, function (err, result) {
                if (err) {
                    console.log('Update did not work ' + err);
                    serverHealth.gitResult = 'Update did not work ' + err;
                } else {
                    console.log('Update succeeded!');
                    serverHealth.gitResult = 'Update succeeded!';
                    serverHealth.gitPullCount++;
                    rebuildContent(help);
                }
            });
        } else {
            rebuildContent(this);
        }
    };

    // perform a pattern seach, returns 'path' portion of help
    HelpServerUtil.prototype.search = function (pattern, callback, startAt, limit) {
        if (!callback || typeof (callback) !== 'function') {
            throw new Error('Second parameter must be a callback function');
        }
        if (!pattern || typeof (pattern) !== 'string') {
            callback(new Error('First parameter must be a string'), []);
        } else if (!config.hasOwnProperty('search')) {
            callback(new Error('Search were settings not specified'), []);
        } else {
            var elasticquery = require("./elasticquery");
            if (limit && limit > 0 && startAt >= 0)
                elasticquery(this.config, pattern, callback, startAt, limit);
            else
                elasticquery(this.config, pattern, callback);
        }
    };
   
    // Get metadata for am item
    HelpServerUtil.prototype.getmetadata = function (path, callback) {
        var manifestFile = config.generated + "manifest/" + replaceAll(unescape(path), '/', '_').replace(".html", ".json");
        fs.readFile(manifestFile, function (err, data) {
            if (err || !data) {
                callback("{}");
            } else {
                var textData = data;
                if (!textData.indexOf)
                    textData = textData.toString('utf8');
                var obj = JSON.parse(textData);
                if (obj.metadata)
                    callback(obj.metadata);
                else
                    callback({});
            }
        });
    };
  
 
    // Set metadata for am item
    HelpServerUtil.prototype.setmetadata = function (path, metadata, callback, batchMode) {
        var help = this;
        debugger;
        try {
            if (path && path !== '/') {
                var relativePath = unescape(path.substring(1));
                var fn = config.source + relativePath;
                fs.readFile(fn, "utf8", function (err, data) {
                    if (err) {
                        console.log('setmetadata ' + err);
                        callback(false);
                    } else {
                        var newMetaData = '<!---HELPMETADATA: ' + JSON.stringify(metadata) + ' --->';
                        var pos = data.lastIndexOf('<!---HELPMETADATA:');
                        var newData = data;
                        if (pos >= 0) {
                            var subStr = data.substring(pos);
                            var endPos = subStr.indexOf('--->');
                            if (endPos >= 0) {
                                subStr = subStr.substring(0, endPos + 4);
                                newData = data.replace(subStr, newMetaData);
                            }
                        } else {
                            var pos = data.lastIndexOf('</body');
                            if (pos > 0) {
                                newData = data.substring(0, pos) + "\n" + newMetaData + "\n" + data.substring(pos);
                            } else {
                                newData = data + "\n" + newMetaData;
                            }
                        }
                        if (newData != data) {
                            debugger;
                            fs.writeFile(fn, newData, function () {
                                if (err) {
                                    console.log('setmetadata write ' + err);
                                    callback(metadata);
                                } else if (batchMode || metadata.norefresh) {
                                    callback(metadata);
                                } else {
                                    help.refresh(function () {
                                        callback(metadata);
                                    });
                                }
                            });
                        } else {
                            callback(metadata);
                        }
                    }
                });
            } else {
                // Array support - for multiple pages...
                var sanitizedCommands = [];
                var outputArray = [];
                var async = require('async');
                var sresult = metadata.toString();
                if (metadata && metadata.pages && metadata.pages.length) {
                    var i;
                    if ((typeof (metadata.pages[0])) == "string") {
                        // Get metadata for multiple pages....
                        for (i = 0; i < metadata.pages.length; ++i) {
                            if (typeof (metadata.pages[i]) == "string") {
                                sanitizedCommands.push(metadata.pages[i]);
                            }
                        }
                        async.eachSeries(sanitizedCommands, function (path, callbackLoop) {
                            help.getmetadata(path, function (data) {
                                outputArray.push({ path: path, metadata: data });
                                callbackLoop();
                            });
                        }, function () {
                            callback(outputArray);
                        });
                    } else {
                        // Set metadata for multiple pages....
                        for (i = 0; i < metadata.pages.length; ++i) {
                            var mdata = metadata.pages[i];
                            if (typeof (mdata) == "object") {
                                if (mdata.path && mdata.metadata && typeof mdata.metadata == "object") {
                                    sanitizedCommands.push(mdata);
                                }
                            }
                        }
                        var lastCmd = sanitizedCommands[sanitizedCommands.length - 1].path;
                        async.eachSeries(sanitizedCommands, function (mdata, callbackLoop) {
                            if (metadata.patch) {
                                help.patchmetadata(mdata.path, mdata.metadata, function (result) {
                                    outputArray.push({ path: path, set: result });
                                    callbackLoop();
                                }, (mdata.path !== lastCmd || metadata.norefresh));
                            } else {
                                help.setmetadata(mdata.path, mdata.metadata, function (result) {
                                    outputArray.push({ path: path, set: result });
                                    callbackLoop();
                                }, (mdata.path !== lastCmd || metadata.norefresh));
                            }
                        }, function () {
                            callback(outputArray);
                        });
                    }
                } else {
                    callback([]);
                }
            }
        } catch (err) {
            console.log(err + " data " + JSON.stringify(metadata));
            callback(false);
        }
    };

    // Patch metadata gets the old metadata, and merges in changes...  
    HelpServerUtil.prototype.patchmetadata = function (path, metadata, callback, batchMode) {
        var help = this;
        help.getmetadata(path, function (data) {
            var propName;
            for (propName in metadata) {
                data[propName] = metadata[propName];
            }
            help.setmetadata(path, data, function (result) {
                callback(data);
            }, (batchMode || metadata.norefresh));
        });
    };


    HelpServerUtil.prototype.isAdmin = function () {
        return this.config.isAdmin ? true : false;
    };

    // Create required table of contents and index files...
    HelpServerUtil.prototype.initializeIfFirstTime = function (callback) {
        var genFiltered = this.generateFiltered;
        this.status(function (stats) {
            if (stats.htmlTreeExists) {
                // we don't need to regenerated the tree
                if (stats.filtersMissing > 0) {
                    genFiltered(function (err2, result2) {
                        callback(err2, result2);
                    });
                } else {
                    callback(null, true);
                }
            } else if (config.search && !stats.indexServiceRunning) {
                callback(new Error('Cannot initialize indexes without ' + config.search.provider + ' instance running.'), false);
            } else {
                help.generate(function (err, result) {
                    if (err)
                        callback(err, false);
                    else {
                        console.log('Help generated');
                        // Then build the index
                        help.buildindex(function (err, result) {
                            if (err)
                                callback(err, false);
                            else {
                                if (stats.filtersMissing > 0) {
                                    genFiltered(function (err2, result2) {
                                        callback(err2, result2);
                                    });
                                } else {
                                    callback(null, true);
                                }
                            }
                        });
                    }
                });
            }
        });
    };


    HelpServerUtil.prototype.onSendExpress = function (res) {
        if (this.config.responseHeader) {
            var headerName;
            for (headerName in this.config.responseHeader) {
                res.header(headerName, this.config.responseHeader[headerName]);
            }
        }
    };

    var help = new HelpServerUtil(config);

    var expressHandler = {
        "blank": function (hlp, path, req, res) {
            hlp.onSendExpress(res);
            res.send('&nbsp;');
        },

        "main": function (hlp, path, req, res) {
            loadAssetUTF8("main.html", function (err, data) {
                if (err) {
                    res.status(404).send('Not found');
                } else {
                    res.type('html');
                    hlp.onSendExpress(res);
                    res.send(data);
                }
            });
        },
        "edit": function (hlp, path, req, res) {
            loadAssetUTF8("edit.html", function (err, data) {
                if (err) {
                    res.status(404).send('Not found');
                } else {
                    res.type('html');
                    hlp.onSendExpress(res);
                    res.send(data);
                }
            });
        },
        "search_panel": function (hlp, path, req, res) {
            loadAssetUTF8("search.html", function (err, data) {
                if (err) {
                    res.status(404).send('Not found');
                } else {
                    res.type('html');
                    hlp.onSendExpress(res);
                    res.send(data);
                }
            });
        },
        "toc": function (hlp, path, req, res) {
            var acceptEncoding = req.headers['accept-encoding'];
            var userAgent = req.headers['user-agent'];
            if (userAgent.indexOf("Trident/") > 0)
                acceptEncoding = null;
            hlp.gettree(path, acceptEncoding, function (err, data, encoding) {
                if (err) {
                    res.type('html');
                    hlp.onSendExpress(res);
                    res.send('error ' + err);
                } else {
                    if (encoding) {
                        res.set({ 'Content-Encoding': encoding, 'Content-Type': 'text/html; charset=utf-8' });
                        hlp.onSendExpress(res);
                        res.send(data);
                    } else {
                        res.type('html');
                        hlp.onSendExpress(res);
                        res.send(data);
                    }
                }
            });
        },
        "toc.json": function (hlp, path, req, res) {
            var acceptEncoding = req.headers['accept-encoding'];
            var userAgent = req.headers['user-agent'];
            if (userAgent.indexOf("Trident/") > 0)
                acceptEncoding = null;
            hlp.gettreejson(path, acceptEncoding, function (err, data, encoding) {
                if (err) {
                    res.type('json');
                    hlp.onSendExpress(res);
                    res.send('error ' + err);
                } else {
                    if (encoding) {
                        res.set({ 'Content-Encoding': encoding, 'Content-Type': 'text/json; charset=utf-8' });
                        hlp.onSendExpress(res);
                        res.send(data);
                    } else {
                        res.type('html');
                        hlp.onSendExpress(res);
                        res.send(data);
                    }
                }
            });
        },
        "assets": function (hlp, path, req, res) {
            hlp.get(path, function (err, data, type) {
                if (err) {
                    hlp.onSendExpress(res);
                    res.send(err);
                } else {
                    if (type) {
                        res.type(type);
                    }
                    hlp.onSendExpress(res);
                    res.send(data);
                }
            });
        },

        "help": function (hlp, path, req, res) {
            hlp.get(path, function (err, data, type) {
                if (err) {
                    hlp.onSendExpress(res);
                    res.send(err);
                } else {
                    if (type) {
                        res.type(type);
                    }
                    hlp.onSendExpress(res);
                    res.send(data);
                }
            });
        },
        "altToc": function (hlp, path, req, res) {
            var acceptEncoding = req.headers['accept-encoding'];
            var userAgent = req.headers['user-agent'];
            if (userAgent.indexOf("Trident/") > 0)
                acceptEncoding = null;
            hlp.getAltToc(path, acceptEncoding, function (err, data, encoding) {
                if (err) {
                    hlp.onSendExpress(res);
                    res.send(err);
                } else {
                    if (encoding) {
                        res.set({ 'Content-Encoding': encoding, 'Content-Type': 'text/json; charset=utf-8' });
                        hlp.onSendExpress(res);
                        res.send(data);
                    } else {
                        res.type('html');
                        hlp.onSendExpress(res);
                        res.send(data);
                    }
                }
            });
        },

        "search": function (hlp, path, req, res) {
            var offset = 0;
            var limit = 0;
            if (req.query.limit)
                limit = parseInt(req.query.limit);
            if (req.query.offset)
                offset = parseInt(req.query.offset);
            hlp.search(req.query.pattern, function (err, data) {
                if (err) {
                    hlp.onSendExpress(res);
                    res.send(JSON.stringify([{ 'error': err }]));
                } else {
                    hlp.onSendExpress(res);
                    var i = 0;
                    if (data.length > 0) {
                        var ListUtilities = require('./listutilities');
                        var lu = new ListUtilities(config);
                        for (i = 0; i < data.length; ++i) {
                            data[i].title = lu.removeDigitPrefix(data[i].title);
                        }
                    }
                    res.send(JSON.stringify(data));
                }
            }, offset, limit);
        },

        "refresh": function (hlp, path, req, res) {
            if (hlp.isAdmin() || req.connection.remoteAddress == "::ffff:127.0.0.1") {
                if (req.method == 'POST') {
                    serverHealth.refreshCount++;
                    if (!global.refresh_locked) {
                        serverHealth.busyInRefresh = true;
                        global.refresh_locked = true;
                        hlp.refresh(function (err, result) {
                            global.refresh_locked = false;
                            serverHealth.busyInRefresh = false;
                            res.end("complete");
                        });
                    } else {
                        res.end("busy");
                    }
                } else {
                    loadAssetUTF8("refresh.html", function (err, data) {
                        if (err) {
                            res.status(404).send('Not found');
                        } else {
                            res.type('html');
                            hlp.onSendExpress(res);
                            res.send(data);
                        }
                    });
                }
            } else {
                res.status(401).send('Not authorized from ' + req.connection.remoteAddress);
            }
        },
        "metadata": function (hlp, path, req, res) {
            if (req.method == 'POST') {
                if (hlp.isAdmin()) {
                    if (req.body) {
                        hlp.setmetadata(path, req.body, function (data) {
                            hlp.onSendExpress(res);
                            res.send(JSON.stringify({ result: data }));
                        });
                    } else {
                        res.status(400).send('Bad request - body is missing');
                    }
                } else {
                    res.status(401).send('Not authorized');
                }
            } else {
                hlp.getmetadata(path, function (data) {
                    res.type('json');
                    hlp.onSendExpress(res);
                    res.send(JSON.stringify(data));
                });
            }
        },
        "config": function (hlp, path, req, res) {
            res.type('json');
            hlp.onSendExpress(res);
            res.send(JSON.stringify({ escapes: config.escapes, keywords: config.keywords, altTocs: config.altTocs }));
        },
        "diag": function (hlp, path, req, res) {
            res.type('json');
            hlp.onSendExpress(res);
            serverHealth.whoCalled = req.connection.remoteAddress;
            res.send(JSON.stringify(serverHealth));
        },
        "xslt": function (hlp, path, req, res) {
            if (config.xslt) {
                loadAssetUTF8(config.xslt, function (err, data) {
                    if (err) {
                        res.status(404).send('Not found');
                    } else {
                        res.type('html');
                        hlp.onSendExpress(res);
                        res.send(data);
                    }
                });
            } else {
                res.status(404).send('Not found');
            }
        },
        "topic": function (hlp, path, req, res) {
            var searchResultProcess = function (err, data) {
                if (err) {
                    hlp.onSendExpress(res);
                    res.send("");
                } else {
                    // search through the data
                    var foundItem = null;
                    var i;
                    if (data.length > 1) {
                        for (i = 0; i < data.length; ++i) {
                            if (data[i].title.toLowerCase() == req.query.topic.toLowerCase()) {
                                foundItem = data[i];
                            }
                        }
                        if (!foundItem)
                            foundItem = data[0];
                    }
                    if (foundItem) {
                        if (foundItem.hash) {
                            help.onSendExpress(res);
                            res.send(foundItem.path + "#" + foundItem.hash);
                        } else {
                            help.onSendExpress(res);
                            res.send(foundItem.path);
                        }
                    } else {
                        // TBD - show the 'not-found' page with results...
                        help.onSendExpress(res);
                        res.send("");
                    }
                }
            };
            if (req.query.hint) {
                // Look for file match first (i.e. relative lookup)
                var endOfPath = req.query.hint.lastIndexOf('/');
                if (endOfPath > 0) {
                    fs.readdir(config.source + req.query.hint.substring(0, endOfPath), function (err, list) {
                        var resolved = false;
                        if (!err && list) {
                            var find = req.query.hint.substring(endOfPath + 1).toLowerCase();
                            if (list.length > 0) {
                                var i;
                                for (i = 0; i < list.length; ++i) {
                                    if (list[i].toLowerCase().indexOf(find) >= 0) {
                                        resolved = true;
                                        help.onSendExpress(res);
                                        res.send(req.query.hint.substring(0, endOfPath) + "/" + list[i]);
                                        break;
                                    }
                                }
                            }
                        }
                        if (!resolved)
                            hlp.search(req.query.topic, searchResultProcess);
                    });
                } else {
                    hlp.search(req.query.topic, searchResultProcess);
                }
            } else {
                hlp.search(req.query.topic, searchResultProcess);
            }
        }
    };
   
    // Express generic entry point
    HelpServerUtil.prototype.expressuse = function (req, res) {
        var pathValue = req.path;
        if (config.replacePath) {
            var i;
            for (i = 0; i < config.replacePath.length; ++i) {
                if (pathValue.substring(0, config.replacePath[i].from.length) == config.replacePath[i].from) {
                    pathValue = config.replacePath[i].to + pathValue.substring(config.replacePath[i].from.length);
                    break;
                }
            }
        }
        var items = pathValue.split('/');
        if (!pathValue || pathValue == '' || pathValue == '/') {
            if (config.defaultPage && config.defaultPage != '' && config.defaultPage != '/') {
                return res.redirect(config.defaultPage);
            }
        }
        var handler = expressHandler[items[1]];
        if (handler) {
            handler(help, '/' + items.slice(2).join('/'), req, res);
        } else {
            var altConfig = configurationObjects[items[1]];
            if (altConfig) {
                handler = expressHandler[items[2]];
                if (handler) {
                    handler(altConfig, '/' + items.slice(3).join('/'), req, res);
                } else {
                    res.status(404).send('Not found');
                }
            } else {
                res.status(404).send('Not found');
            }
        }
    };
  
    // If webhookport is defined, lets listen on it
    if (config.webhookPort) {
        var webhooklisten = require("./webhooklisten");
        webhooklisten(config, help);
    }


    for (var configName in configurations) {
        // Create a helpservice object with a different config...
        configurationObjects[configName] = new HelpServerUtil(configurations[configName]);
    };

    return help;
};
