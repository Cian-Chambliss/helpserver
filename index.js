/**
 * Entry point to helpserver utilities 
 */
module.exports = function (config) {
    var replaceAll = function (str, find, replace) {
        while (str.indexOf(find) >= 0)
            str = str.replace(find, replace);
        return str;
    };
    var safeReplace = function( text , replacements ) {
        for( var i = 0 ; i < replacements.length ; ++i ) {
            if( text.indexOf(replacements[i].search) >= 0 ) {
                text = text.split(replacements[i].search).join(replacements[i].replace);
            }
        }
        return text;
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
    var serverHealth = { refreshCount: 0, busyInRefresh: false, gitResult: "None", gitPullCount: 0, whoCalled: "", revisionCount: 1 };
    var absolutePath = "/";
    var actualLinks = null;
    var logoHREF = (config.logoHref || "http://www.google.com");
    var topmostPage = config.topmostPage || "";
    var cleanupHREF = function(path) {
        if( path.substring(0,1) == '/' ) { 
            if( path.substring(0,absolutePath).toLowerCase() != absolutePath.toLowerCase() ) {
                return absolutePath + path.substring(1);
            }    
        }
        return path;
    }

    if (config.proxy) {
        var proxyBasePath = null;
        var proxyHostStart = config.proxy.indexOf("://");
        if (proxyHostStart >= 0) {
            proxyBasePath = config.proxy.substring(proxyHostStart + 3).split('/');
        } else {
            proxyBasePath = config.proxy.split('/');
        }
        if (proxyBasePath.length > 1) {
            absolutePath = '/' + proxyBasePath.slice(1).join('/');
        }
    }
    var pathPages = absolutePath + "pages/";
    var indexLinks = null;
    var loadIndex = function( callback ) { callback({}); }
    if( config.events ) {
        if( config.events.loadIndex ) {
            loadIndex = config.events.loadIndex;
        }    
    }
    
    // Try and read revision...    
    fs.readFile(config.generated + "revision.txt", "utf8", function (err, data) {
        if (!err) {
            serverHealth.revisionCount = Number(data);
        }
    });

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
        if (!config.hasOwnProperty('proxy')) {
            config.proxy = null;
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
        if (!config.hasOwnProperty('library')) {
            config.library = [];
        }
        if (!config.hasOwnProperty('events')) {
            config.events = {};
        };

        if (!config.hasOwnProperty('tocData')) {
            config.tocData = {};
        }
        if (!config.tocData.hasOwnProperty('altTocs')) {
            config.tocData.altTocs = [];
        }
        if (!config.tocData.hasOwnProperty('defaultPathMetadata')) {
            config.tocData.defaultPathMetadata = [];
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
                proxy: config.proxy,
                generated: config.generated,
                search: config.search,
                escapes: config.escapes,
                xslt: config.xslt,
                events: config.events,
                tocData: config.tocData,
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
                    proxy: configDef.proxy ? configDef.proxy : config.proxy,
                    generated: configDef.generated ? configDef.generated : config.generated,
                    search: configDef.search ? configDef.search : config.search,
                    filter_name: configDef.filter_name ? configDef.filter_name : config.filter_name,
                    filter: configDef.filter ? configDef.filter : config.filter,
                    escapes: configDef.escapes ? configDef.escapes : config.escapes,
                    xslt: configDef.xslt ? configDef.xslt : config.xslt,
                    events: configDef.events ? configDef.events : config.events,
                    tocData: configDef.tocData ? configDef.tocData : config.tocData,
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

    var pagesManifestArray = ["CACHE MANIFEST"
        , ""
        , "#Version __helpversionnumber__"
        , "NETWORK:"
        , "*"
        , "CACHE:"
        , "/assets/helpserver-toc.css"
        , "/assets/helpserver-polyfills.js"
        , "/assets/theme.css"
        , "/assets/helpserver-page.css"
        , "/assets/helpserver-page.js"
        , "/assets/helpserver-main.css"
        , "/toc_loader/__filter__" + (config.structurefile || "tree.json").replace(".json", ".js")
    ];
    //var manifestTOCName = (this.config.filter_name ? this.config.filter_name : defaultFilter) + this.config.structurefile.replace(".json",".js");
    if (absolutePath.length > 1) {
        var i;
        for (i = 0; i < pagesManifestArray.length; ++i) {
            if (pagesManifestArray[i].substring(0, 1) == "/") {
                pagesManifestArray[i] = absolutePath + pagesManifestArray[i].substring(1);
            }
        }
    }
    var altTocs = config.tocData.altTocs;
    if (altTocs && altTocs.length) {
        for (i = 0; i < altTocs.length; ++i) {
            pagesManifestArray.push("/toc_loader/" + replaceAll(altTocs[i], "/", "_") + "__filter__" + (config.structurefile || "tree.json").replace(".json", ".js"));
        }
    }
    var pagesManifest = pagesManifestArray.join("\n");
    //"<html manifest=\"/appcache/__filter__.appcache\" >",    
    var standardPageTemplate =
        [
            "<html>",
            "<head>",
            "<link href=\"/assets/helpserver-toc.css\" rel=\"stylesheet\"/>",
            "<script src=\"/assets/helpserver-polyfills.js\" type=\"text/javascript\" charset=\"utf-8\"></script>",
            "<link href=\"/assets/theme.css\" rel=\"stylesheet\"/>",
            "<link href=\"/assets/helpserver-page.css\" rel=\"stylesheet\"/>",
            "<link href=\"/assets/helpserver-main.css\" rel=\"stylesheet\"/>",
            "<script src=\"/assets/helpserver-page.js\" type=\"text/javascript\" charset=\"utf-8\"/></script>",
            "<!--tocloader-->",
            "</head>",
            "<body onload=\"initialize()\" >",
            "<div id=\"main\" onclick=\"document.body.classList.remove('showTOC');\">",
            "<div id=\"help\" name=\"help\">",
            "<ul id=\"breadcrumbs\" class=\"crumbs\"><!--breadcrumbs--></ul>",
            "<div id=\"relatedTopics\"><!--related--></div>",
            "<!--body-->",
            "</div></div>",
            "<div id=\"header\" onclick=\"document.body.classList.remove('showTOC');\">",
            "<div id=\"logo\" onclick=\"window.location='<!--logohref-->';\" ></div>",
            "</div>",
            "<div id=\"toolbar\"></div>",
            "<button id=\"toTopButton\" onclick=\"document.getElementById('main').scrollTop = 0;\"  style=\"position: absolute; right: 18px; bottom: 0px;\"></button>",
            "<div id=\"search\"></div>",
            "</body></html>"
        ].join("\n");

    var standardSearchTemplate = "<!--body-->";

    var fixupTemplate = function (html) {
        if (absolutePath.length > 1) {
            html = replaceAll(html, '"/assets', '"' + absolutePath + "assets");
            html = replaceAll(html, '"/appcache', '"' + absolutePath + "appcache");
            html = replaceAll(html, '"/pages', '"' + absolutePath + "pages");
        }
        return html.replace("<!--logohref-->", logoHREF);
    };

    if (config.pageTemplate) {
        loadAssetUTF8(config.pageTemplate, function (err, data) {
            if (!err) {
                standardPageTemplate = data
            }
            standardPageTemplate = fixupTemplate(standardPageTemplate);
        });
    } else {
        standardPageTemplate = fixupTemplate(standardPageTemplate);
    }
    if (config.searchTemplate) {
        loadAssetUTF8(config.searchTemplate, function (err, data) {
            if (!err) {
                standardSearchTemplate = data;
                standardSearchTemplate = fixupTemplate(standardSearchTemplate);
            }
        });
    }
    HelpServerUtil.prototype.lookupLink = function(symName) {
        if( indexLinks ) {
           return indexLinks[symName.toLowerCase()];
        }
        return null;
    }
    var treeData = {};
    var parentIndexData = {};
    HelpServerUtil.prototype.getPage = function (page, fromPath, req, callback,printed) {
        var hlp = this;
        page = decodeURI(page);
        var relativePath = page.substring(1);
        var thisFiltername = (this.config.filter_name ? this.config.filter_name : defaultFilter);
        var treeName = thisFiltername + this.config.structurefile;
        var tocName = treeName.replace(".json", ".js");
        var extension = null;
        var extensionPos = page.lastIndexOf('.');
        var GenerateLibrary = function (book, nested) {
            var i;
            var html = "";
            if (book && book.length > 0) {
                if (nested)
                    html = "<ul>";
                else
                    html = "<ul id=\"library\" >";
                for (i = 0; i < book.length; ++i) {
                    html += "<li>";
                    if (book[i].href) {
                        html += "<a href=\"" + cleanupHREF(book[i].href) + "\" >" + book[i].title + "</a>";
                    } else {
                        html += "<a href=\"#\">" + book[i].title + "</a>";
                    }
                    if (book[i].books) {
                        html += GenerateLibrary(book[i].books, true);
                    }
                    html += "</li>";
                }
                html += "</ul>"
            }
            return html;
        };
        var harvestBreadcrumbs = function (book, breadcrumbs, basePath) {
            var i;
            var match = null;
            if (book && book.length > 0) {
                for (i = 0; i < book.length; ++i) {
                    if (book[i].breadcrumb) {
                        breadcrumbs.push(book[i]);
                        if (book[i].href) {
                            if (!basePath) {
                                var pathLen = book[i].href.lastIndexOf('/');
                                if (pathLen >= 0) {
                                    var pathCompare = book[i].href.substring(0, pathLen + 1);
                                    if (pathCompare == '/' || pathCompare == '/pages/') {
                                        match = book[i].breadcrumb;
                                    }
                                }
                            } else if (book[i].href.indexOf(basePath) >= 0) {
                                match = book[i].breadcrumb;
                            }
                        }
                    }
                    if (book[i].books) {
                        var test = harvestBreadcrumbs(book[i].books, breadcrumbs, basePath);
                        if (test)
                            match = test;
                    }
                }
            }
            return match;
        };
        var decorateTitle = config.events.decorateTitle || function(title) { return title; };
        var generateNavigation = function (tree,relativePath,page,deepestAltToc,relatedPageOrder,getRelations) {
            var breadcrumbs = "";
            var related = "";
            var parentUrl = "#";
            var childUrl = "#";
            var previousUrl = "#";
            var nextUrl = "#";
            var pageTitle = null;

            if (tree && tree.children) {
                var searchTopic = "/" + relativePath.toLowerCase();
                var kidsLevel = null;
                var firstChild = null;
                var firstChildParent = null;
                var indexOfKid = -1;
                var parentOfNode = null;

                var recurseNavTree = function (kids) {
                    if (kids.length) {
                        for (var i = 0; i < kids.length; ++i) {
                            if (kids[i].path && kids[i].path.toLowerCase() == searchTopic) {
                                pageTitle = kids[i].title;
                                kidsLevel = kids;
                                indexOfKid = i;
                                if (kids[i].children && kids[i].children.length) {
                                    firstChild = kids[i].children[0];
                                    firstChildParent = kids[i];
                                }
                                return [kids[i]];
                            } else if (kids[i].children) {
                                var childResult = recurseNavTree(kids[i].children);
                                if (childResult) {
                                    if (!parentOfNode) {
                                        parentOfNode = kids[i];
                                    }
                                    return [kids[i]].concat(childResult);
                                }
                            }
                        }
                    }
                    return null;
                };
                var branches = recurseNavTree(tree.children);
                var booksBranches = [];
                var currentBook = harvestBreadcrumbs(config.library, booksBranches, deepestAltToc);
                if (booksBranches.length < 2) {
                    currentBook = null;
                } else if( !currentBook && config.library ) {
                    booksBranches = [];
                    kidsLevel = null;
                    branches = null;
                } 
                if (!kidsLevel && !currentBook && !config.library ) {
                    kidsLevel = tree.children;
                }
                if( page == topmostPage && !currentBook && config.library ) {
                    breadcrumbs += "<li>";
                    breadcrumbs += "Main";
                    breadcrumbs += "</li>";
                    if( config.library ) {
                        kidsLevel = null;   
                    }
                } else if (branches || currentBook) {
                    //breadcrumbs = "<ul>";
                    //breadcrumb
                    if (currentBook) {
                        breadcrumbs += "<li>";
                        if( topmostPage.length > 1 ) {
                            breadcrumbs += "<a href=\"" + pathPages + topmostPage.substring(1) + "\">Main</a>";
                        } else {
                            breadcrumbs += "Main";
                        }
                        breadcrumbs += "</li>";
                    }
                    if (tree.path) {
                        breadcrumbs += "<li>";
                        breadcrumbs += "<a href=\"" + pathPages + tree.path.substring(1) + "\">";
                        if (currentBook) {
                            breadcrumbs += currentBook;
                        } else if (!tree.title || tree.title == '/') {
                            breadcrumbs += "Main";
                        } else {
                            breadcrumbs += decorateTitle(tree.title);
                        }
                        breadcrumbs += "</a>";
                        breadcrumbs += "</li>";
                    }
                    if (branches && branches.length > 0) {
                        for (var i = 0; i < branches.length - 1; ++i) {
                            breadcrumbs += "<li>";
                            if (branches[i].path) {
                                breadcrumbs += "<a href=\"" + pathPages + branches[i].path.substring(1) + "\">";
                                breadcrumbs += decorateTitle( branches[i].title );
                                breadcrumbs += "</a>";
                            } else {
                                breadcrumbs += branches[i].title;
                            }
                            breadcrumbs += "</li>";
                        }
                    }
                    if( pageTitle && getRelations ) {
                        breadcrumbs += "<li>";
                        breadcrumbs += decorateTitle(pageTitle);
                        breadcrumbs += "</li>";
                    }
                    //breadcrumbs += "</ul>";
                } else if( topmostPage.length > 1 && getRelations ) {
                    breadcrumbs += "<li>";
                    if( topmostPage.length > 1 ) {
                        breadcrumbs += "<a href=\"" + pathPages + topmostPage.substring(1) + "\">Main</a>";
                    } else {
                        breadcrumbs += "Main";
                    }
                    breadcrumbs += "</li>";
                }
                var fixupRelativeHref = function( href ) {
                    if( page.indexOf("/index.") >= 0 && href.substring(0,1) != '/' ) {
                         href = "../" +href;
                     } else {
                         href = cleanupHREF(href);
                    }
                    return href;
                }
                if( getRelations ) {
                    if( relatedPageOrder.reorder ) {
                        related = "<ul>";
                        for (var i = 0; i < relatedPageOrder.links.length ; ++i ) {
                            var linkitem = relatedPageOrder.links[i];
                            related += "<li><a href=\"" +fixupRelativeHref(linkitem.href)+"\">";
                            related += linkitem.text;
                            related += "</a></li>";                            
                        }
                        related += "</ul>";
                    } else if (kidsLevel) {
                        related = "<ul>";
                        for (var i = 0; i < kidsLevel.length; ++i) {
                            if (kidsLevel[i].path) {
                                related += "<li>";
                                related += "<a href=\"" + pathPages + kidsLevel[i].path.substring(1);
                                if (i == indexOfKid)
                                    related += "\" class=\"selected\" >";
                                else
                                    related += "\">";
                                related += decorateTitle(kidsLevel[i].title);
                                related += "</a>";
                                related += "</li>";
                            }
                        }
                        related += "</ul>";
                    } else if (currentBook) {
                        related = "<ul>";
                        for (var i = 0; i < booksBranches.length; ++i) {
                            related += "<li>";
                            related += "<a href=\"" + cleanupHREF(booksBranches[i].href);
                            if (booksBranches[i].breadcrumb == currentBook)
                                related += "\" class=\"selected\" >";
                            else
                                related += "\">";
                            related += booksBranches[i].breadcrumb;
                            related += "</a>";
                            related += "</li>";
                        }
                        related += "</ul>";
                    }
                }
            }
            if (firstChild && firstChild.path) {
                childUrl = pathPages + firstChild.path.substring(1);
            }
            if (parentOfNode && parentOfNode.path) {
                parentUrl = pathPages + parentOfNode.path.substring(1);
            }
            if (kidsLevel) {
                if( relatedPageOrder && relatedPageOrder.reorder ) {
                    var getJustName = function(path) {
                        if( path ) {
                            var justName = path.split("/");
                            var justNameElems = justName.length; 
                            justName = justName[justNameElems-1].split('.')[0].toLowerCase();
                            if( justName == 'index' && justNameElems > 1 ) {
                                justName = path.split("/")[justNameElems-2].toLowerCase();
                            } 
                            return justName;
                        }
                        return null;
                    };
                    var justName = getJustName(kidsLevel[indexOfKid].path );
                    for (var i = 0; i < relatedPageOrder.links.length ; ++i ) {
                        var linkitem = relatedPageOrder.links[i];
                        if( justName == getJustName(linkitem.href) ) {
                            if( i > 0 && relatedPageOrder.links[i].href ) {
                               previousUrl = fixupRelativeHref( relatedPageOrder.links[i-1].href );
                            }
                            if( i < (relatedPageOrder.links.length-1) && relatedPageOrder.links[i+1].href ) {
                               nextUrl = fixupRelativeHref( relatedPageOrder.links[i+1].href );
                            }
                            break;
                        }
                    }
                } else {
                    if (indexOfKid > 0 && kidsLevel[indexOfKid - 1].path) {
                        previousUrl = pathPages + kidsLevel[indexOfKid - 1].path.substring(1);
                    }
                    if (indexOfKid < (kidsLevel.length - 1) && kidsLevel[indexOfKid + 1].path) {
                        nextUrl = pathPages + kidsLevel[indexOfKid + 1].path.substring(1);
                    }
                }
            }
            if (!pageTitle) {
                pageTitle = relativePath;
                var pathPartOffset = pageTitle.lastIndexOf('/');
                if (pathPartOffset >= 0) {
                    pageTitle = pageTitle.substring(pathPartOffset + 1);
                }
                var extensionPartOffset = pageTitle.lastIndexOf('.');
                if (extensionPartOffset > 0) {
                    pageTitle = pageTitle.substring(0, extensionPartOffset);
                }
            }
            return { breadcrumbs: breadcrumbs, related: related, parentUrl: parentUrl, childUrl: childUrl, previousUrl: previousUrl, nextUrl: nextUrl, pageTitle: pageTitle };
        };
        var getTreeForPath = function(searchPath) {
            var treeName = thisFiltername + hlp.config.structurefile;
            var tocName = treeName.replace(".json", ".js");
            var altTocs = hlp.config.tocData.altTocs;
            var deepestAltToc = null;
            if (altTocs && altTocs.length > 0) {
                var i;
                for (i = 0; i < altTocs.length; ++i) {
                    var prefix = altTocs[i];
                    if (searchPath.substring(0, prefix.length) == prefix.toLowerCase()) {
                        if (!deepestAltToc)
                            deepestAltToc = prefix;
                        else if (deepestAltToc.length < prefix.length)
                            deepestAltToc = prefix;
                    }
                }
                if (deepestAltToc) {
                    var deepestAltTocFN = replaceAll(deepestAltToc, "/", "_");
                    tocName = deepestAltTocFN + tocName;
                    treeName = deepestAltTocFN + treeName;                   
                }
            }
            return { treeName : treeName , tocName : tocName , deepestAltToc : deepestAltToc };
        };
            
        if (extensionPos > 0)
            extension = page.substring(extensionPos + 1).toLowerCase();

        if (extension == "html" || extension == "xml" || extension == "md") {
            var pathResults = getTreeForPath( "/" + relativePath.toLowerCase() );
            var deepestAltToc;
            tocName = pathResults.tocName
            treeName = pathResults.treeName;
            deepestAltToc = pathResults.deepestAltToc;

            var processWebPage = function (htmlText, tree, relatedPageOrder ) {
                var lowText = htmlText.toLowerCase();
                var descriptionTagPos = lowText.indexOf("<meta name=\"description\"");
                var titleTagPos = lowText.indexOf("<title");                
                var lastModifiedPos = lowText.indexOf(" http-equiv=\"last-modified\"" );
                var bodyAt = lowText.indexOf('<body');
                var lastModified = "";
                if( lastModifiedPos >= 0 ) {
                    lastModified = lowText.substring(lastModifiedPos);
                    lastModifiedPos = lastModified.indexOf("content=");
                    if( lastModifiedPos > 0 ) {
                        lastModified = lastModified.substring(lastModifiedPos+8).trim();
                        if( lastModified.substring(0,1) == "\"" ) {
                            lastModified = lastModified.split("\"")[1];
                            lastModified = lastModified.split("@")[0];
                        } else {
                            lastModified = "";                         
                        }
                    } else {
                        lastModified = "";
                    }                    
                    //<meta http-equiv="last-modified" content="YYYY-MM-DD@hh:mm:ss TMZ" />
                }
                if (bodyAt >= 0) {
                    var endBodyAt = lowText.indexOf('</body');
                    if (endBodyAt >= 0) {
                        htmlText = "<div " + htmlText.substring(bodyAt + 5, endBodyAt) + "</div>";
                    }
                }
                var pageProcessor = require('./updatePageReferences');
                var pageProc = {
                    basepath: "/pages"
                    , imagepath: ""
                    , pageTitle: null
                    , pageDescription: null
                    , localNames: []
                    , indexLinks: indexLinks
                };
                var pagesAt = fromPath.indexOf("/pages");
                if (pagesAt > 0) {
                    pageProc.basepath = fromPath.substring(0, pagesAt + 6);
                }
                if (absolutePath.length > 0) {
                    if (pageProc.basepath.substring(0, absolutePath.length) != absolutePath) {
                        pageProc.basepath = absolutePath + pageProc.basepath.substring(1);
                    }
                }
                if (pagesAt >= 0) {
                    if (pagesAt > 0)
                        pageProc.imagepath = fromPath.substring(0, pagesAt);
                    pageProc.imagepath += "/help";
                    pageProc.imagepath += fromPath.substring(pagesAt + 6);
                }
                htmlText = pageProcessor(config, htmlText, pageProc);
                var tocLoader = "<script src=\"" + absolutePath + "toc_loader/" + tocName + "\" defer></script>";
                tocLoader = "";
                var navigationText = generateNavigation(tree,relativePath,page,deepestAltToc,relatedPageOrder,true);
                var fullPage = standardPageTemplate;
                if( printed ) {
                    fullPage = ["<html>",
            "<head>",
            "<link href=\"/assets/theme.css\" rel=\"stylesheet\"/>",
            "<link href=\"/assets/print.css\" rel=\"stylesheet\"/>",
            "<body >",
            "<!--body-->",
            "</body></html>"].join("\n");
                }
                var title = navigationText.pageTitle;
                var feedback = "?subject=Problem with page:"+title+" ["+page+"]"+"&body=Describe problem with the "+page+" documentation page:";
                if( lastModified != "" ) {
                    lastModified = "Page Last Checked on "+lastModified;
                }
                if( navigationText.related == "" && navigationText.parentUrl == '#' && navigationText.childUrl == '#' && navigationText.previousUrl == '#' && navigationText.nextUrl == '#') {
                    fullPage = fullPage.replace("id=\"page-nav\"","id=\"page-nav\" class=\"page-nav-empty\"");
                }
                var pageSourceComment = "";
                if( config.events.addPageSourceComment ) {
                    var symName = null;
                    // extract the first H1, establish if there is a symbolic link
                    var topicStart = htmlText.indexOf("<h1");
                    if (topicStart > 0) {
                        var topicEnd = htmlText.indexOf("</h1>");
                        topicStart += 3;
                        if (topicEnd > topicStart) {
                            symName = htmlText.substring(topicStart, topicEnd).trim();
                            topicStart = symName.indexOf('>');
                            if( topicStart >= 0 ) {
                                symName = symName.substring(topicStart+1);
                                var lookupTopic = indexLinks[symName.toLowerCase()];
                                if( lookupTopic ) {
                                    if( lookupTopic.indexOf(page.replace('.xml_html','.xml')) < 0 ) {
                                        symName = null;
                                    }
                                } else {
                                    symName = null;
                                }
                            } else {
                                symName = null;
                            }
                        }
                    }                    
                    pageSourceComment = config.events.addPageSourceComment(page,symName);
                }
                var localToc = "";
                if( config.events.generateLocalToc && pageProc.localNames.length > 0 ) {
                    localToc = config.events.generateLocalToc(pageProc.localNames);
                    if( localToc.indexOf('id="inline-toc"') > 0 ) {
                        var insertPos = htmlText.indexOf("</h1>");
                        if( insertPos > 0 ) {
                           // add the Toc inline, after the first top level header..
                           insertPos += 5;
                           htmlText = htmlText.substring(0,insertPos) + "\n" + localToc + htmlText.substring(insertPos);
                           localToc = "";
                        }  
                    }
                }                
                fullPage = safeReplace(fullPage,[
                    {search:"<!--navparent-->", replace:navigationText.parentUrl},
                    {search:"<!--navchild-->", replace:navigationText.childUrl},
                    {search:"<!--navprevious-->", replace:navigationText.previousUrl},
                    {search:"<!--navnext-->", replace:navigationText.nextUrl},
                    {search:"<!--search--->", replace:absolutePath + "pages/search"},
                    {search:"<!--pagetopic--->", replace:title},
                    {search:"<!--pagedescription--->", replace:pageProc.pageDescription},
                    {search:"<!--library--->", replace:GenerateLibrary(config.library)},
                    {search:"<!--feedback-->",replace:feedback},
                    {search:"<!--lastmodified--->", replace:lastModified},
                    {search:"<!--pagesourcecomment-->",replace:pageSourceComment},
                    {search:"__filter__", replace:thisFiltername},
                    {search:"<!--tocloader-->", replace:tocLoader},
                    {search:"<!--related-->", replace:navigationText.related},
                    {search:"<!--breadcrumbs-->", replace:navigationText.breadcrumbs},
                    {search:"<!--body-->", replace:htmlText},
                    {search:"<!--localtoc-->", replace:localToc }
                ]);
                return fullPage;
            };
            var findClosestFilename = function (path, getFilenameCallback) {
                var findClosest = function (path) {
                    path = path.toLowerCase();
                    var i;
                    var pathPartOffset = path.lastIndexOf('/');
                    var pathPart = "";
                    var namePart = path;
                    var sameToExtn = null;
                    var sameName = null;
                    if (pathPartOffset >= 0) {
                        pathPart = path.substring(0, pathPartOffset + 1);
                        namePart = path.substring(pathPartOffset + 1);
                        var namePartOffset = namePart.lastIndexOf('.');
                        if (namePartOffset > 0) {
                            namePart = namePart.substring(0, namePartOffset);
                        }
                    }
                    for (i = 0; i < actualLinks.length; ++i) {
                        var filename = actualLinks[i].toLowerCase();
                        if (filename == path)
                            return filename;
                        var fileNameOffset = filename.lastIndexOf('/');
                        if (fileNameOffset >= 0) {
                            var filenameName = filename.substring(fileNameOffset + 1);
                            var filenamePartOffset = filenameName.lastIndexOf('.');
                            if (filenamePartOffset > 0) {
                                filenameName = filenameName.substring(0, filenamePartOffset);
                            }
                            if (filenameName == namePart) {
                                if (pathPart == filename.substring(0, fileNameOffset + 1)) {
                                    sameToExtn = actualLinks[i];
                                } else {
                                    sameName = actualLinks[i];
                                }
                            }
                        }
                    }
                    if (sameToExtn)
                        return sameToExtn;
                    return sameName;
                };
                if (actualLinks) {
                    getFilenameCallback(findClosest(path));
                } else {
                    fs.readFile(config.generated + config.flatfile, function (errFiles, dataFiles) {
                        if (errFiles) {
                            getFilenameCallback(null);
                        } else {
                            var files = JSON.parse(dataFiles);
                            var i;
                            actualLinks = [];
                            for (i = 0; i < files.length; ++i) {
                                actualLinks.push(files[i].path);
                            }
                            getFilenameCallback(findClosest(path));
                        }
                    });
                }
            };
            var getPageParentAndCallback = function(data) {
                var treePtr = treeData[treeName]; 
                var parentIndexFile = "";
                if( treePtr ) {
                    var pagePathLength = page.lastIndexOf('/');
                    if( pagePathLength > 0 ) {
                        var fname = page.substring(pagePathLength+1);
                        parentIndexFile = page.substring(0,pagePathLength);
                        if( fname == "index.html" || fname == "index.xml" || fname == "index.md" || fname == "index.xml_html" ) {
                            pagePathLength = parentIndexFile.lastIndexOf('/');
                            if( pagePathLength > 0 ) {
                                parentIndexFile = page.substring(0,pagePathLength+1);
                            } else {
                                parentIndexFile = "";
                            }
                        } else {
                            parentIndexFile += "/";
                        }
                        if( parentIndexFile.length > 0 ) {
                            var lookForIndexPage = function(treeBranch) {
                                if( treeBranch.path ) {
                                    var endOfPath = treeBranch.path.lastIndexOf('/');
                                    if( endOfPath >= 0 ) {
                                        ++endOfPath;
                                        var fname = treeBranch.path.substring(endOfPath);
                                        if( fname == "index.html" || fname == "index.xml" || fname == "index.md" ) {
                                            if( treeBranch.path.substring(0,endOfPath) == parentIndexFile ) {
                                                parentIndexFile = treeBranch.path;
                                                return true;
                                            }                                            
                                        }
                                    }
                                }
                                if( treeBranch.children ) {
                                    var i;
                                    for( i = 0 ; i < treeBranch.children.length ; ++i ) {
                                        if( lookForIndexPage(treeBranch.children[i]) )
                                           return true;
                                    }
                                }
                                return false;
                            };
                            if( !lookForIndexPage(treePtr) ) {
                                parentIndexFile = "";
                            }
                        }
                    }
                }
                if( parentIndexFile.length > 0 ) {
                    var parentIndexPtr = parentIndexData[parentIndexFile];
                    if( parentIndexPtr ) {
                        callback(null, processWebPage(data, treePtr,parentIndexPtr), "html");                        
                    } else {
                        fs.readFile( config.source + parentIndexFile.substring(1), "utf8" , function(err,parentData) {                            
                            var translateIndexPage = false;
                            var parentAbsolutePath = page.substring(0,page.lastIndexOf('/')+1);
                            if( err ) {
                                parentData = "";
                            }
                            if( parentData.indexOf("<!--orderchildren-->") >= 0 ) {
                                var extractLocalLinks = require("./extractLocalLinks.js");
                                var treeLocalLinks = extractLocalLinks(parentData,parentAbsolutePath);
                                if( treeLocalLinks.length > 0 ) {
                                    parentIndexData[parentIndexFile] = { reorder : true , links : treeLocalLinks };
                                } else {
                                    parentIndexData[parentIndexFile] = { reorder : false };
                                }
                            } else if( parentData.indexOf("<!--order:") >= 0 ) {
                                // Regenerate links..
                                translateIndexPage = true;
                            } else {
                                parentIndexData[parentIndexFile] = { reorder : false };
                            }
                            if( translateIndexPage ) {
                                var ListUtilities = require('./listutilities');
                                var lu = new ListUtilities(config);
                                var parentPagepage = parentIndexFile.replace(".xml", ".xml_html");
                                lu.loadOrCreateTranslatedPage(hlp.config, parentPagepage, (hlp.config.filter_name ? hlp.config.filter_name : defaultFilter), function (parenterr, parentGenData, parenttype) {
                                    if (parenterr) {
                                        parentIndexData[parentIndexFile] = { reorder : false };
                                    } else {
                                        var extractLocalLinks = require("./extractLocalLinks.js");
                                        var treeLocalLinks = extractLocalLinks(parentGenData,parentAbsolutePath);
                                        if( treeLocalLinks.length > 0 ) {
                                            parentIndexData[parentIndexFile] = { reorder : true , links : treeLocalLinks };
                                        } else {
                                            parentIndexData[parentIndexFile] = { reorder : false };
                                        }                                       
                                    }
                                    callback(null, processWebPage(data, treePtr,parentIndexData[parentIndexFile]), "html");
                                });
                            } else {
                                parentIndexPtr = parentIndexData[parentIndexFile];
                                callback(null, processWebPage(data, treePtr,parentIndexPtr), "html");
                            }
                        });
                    }                      
                } else {                
                    callback(null, processWebPage(data, treePtr,{ reorder : false }), "html");
                }
            };
            var processPageAndCallback = function(data) {
                var afterLinksLoaded = function() {
                    if (!treeData[treeName]) {
                        fs.readFile(config.generated + treeName, "utf8", function (err, jsonTreeData) {
                            if (!err) {
                                treeData[treeName] = JSON.parse(jsonTreeData);
                            }
                            getPageParentAndCallback(data);
                        });
                    } else {
                        getPageParentAndCallback(data);
                    }
                };
                if( !indexLinks ) {
                    loadIndex( function(result) {                        
                        indexLinks = result;
                        afterLinksLoaded();  
                    });
                } else {
                   afterLinksLoaded();
                }
            };
            
            var findClosestLink = function (err, path, resolvedLink) {
                // First lowercase the path (for case insensite compares)
                var lcpath = path.toLowerCase();
                var brokenLinkFile = config.generated + "broken/" + replaceAll(lcpath, "/", "_");
                fs.readFile(brokenLinkFile, "utf8", function (errbroke, databroke) {
                    if (errbroke) {
                        // Need to perform a lookup
                        findClosestFilename("/" + relativePath, function (actualFilename) {
                            if (actualFilename) {
                                var actualExtensionPos = actualFilename.lastIndexOf('.');
                                var actualExtension = "";
                                if (actualExtensionPos > 0)
                                    actualExtension = actualFilename.substring(actualExtensionPos + 1).toLowerCase();
                                if (actualExtension == "xml") {
                                    var ListUtilities = require('./listutilities');
                                    var lu = new ListUtilities(config);
                                    actualFilename = actualFilename.replace(".xml", ".xml_html");
                                    lu.loadOrCreateTranslatedPage(hlp.config, actualFilename, (hlp.config.filter_name ? hlp.config.filter_name : defaultFilter), function (errActual, dataActual, type) {
                                        if (errActual) {
                                            resolvedLink(err, null);
                                        } else {
                                            dataActual = dataActual + "<!--Broken Link To:" + page + "-->";
                                            fs.writeFile(brokenLinkFile, dataActual, function (err) {
                                                resolvedLink(null, dataActual);
                                            });
                                        }
                                    });
                                } else {
                                    fs.readFile(config.source + actualFilename, "utf8", function (errActual, dataActual) {
                                        if (errActual) {
                                            resolvedLink(err, null);
                                        } else {
                                            dataActual = dataActual + "<!--Broken Link To:" + page + "-->";
                                            fs.writeFile(brokenLinkFile, dataActual, function (err) {
                                                resolvedLink(null, dataActual);
                                            });
                                        }
                                    });
                                }
                            } else {
                                resolvedLink(err, null);
                            }
                        });
                    } else {
                        resolvedLink(null, databroke);
                    }
                });
            };

            if (extension == "xml") {
                // First Pre-process XML using XSLT...
                var ListUtilities = require('./listutilities');
                var lu = new ListUtilities(config);
                page = page.replace(".xml", ".xml_html");
                lu.loadOrCreateTranslatedPage(this.config, page, (this.config.filter_name ? this.config.filter_name : defaultFilter), function (err, data, type) {
                    if (err) {
                        findClosestLink(err, relativePath, function (err2, badLinkData) {
                            if (err2) {
                                callback(err2, null);
                            } else {
                                processPageAndCallback(badLinkData);
                            }
                        });
                    } else {
                         processPageAndCallback(data);
                    }
                });
            } else if (page.indexOf("/index.html") > 0) {
                    // Support <!--list--> generically 
                    var ListUtilities = require('./listutilities');
                    var lu = new ListUtilities(config);
                    lu.loadOrCreateIndexPage(this.config, decodeURI(page), (this.config.filter_name ? this.config.filter_name : defaultFilter), function (err, data, type) {
                        if (err) {
                            findClosestLink(err, relativePath, function (err2, badLinkData) {
                                if (err2) {
                                    callback(err2, null);
                                } else {
                                    processPageAndCallback(badLinkData);
                                }
                            });
                        } else {
                            processPageAndCallback(data);
                        }
                    });
                } else {
                    fs.readFile(config.source + relativePath, "utf8", function (err, data) {
                        if (err) {
                            findClosestLink(err, relativePath, function (err2, badLinkData) {
                                if (err2) {
                                    callback(err2, null);
                                } else {
                                    processPageAndCallback(badLinkData);
                                }
                            });
                        } else {
                            processPageAndCallback(data);
                        }
                    });
                }
            } else if (page == "/search" && req.query.pattern) {
                var offset = 0;
                var limit = 10;
                if (req.query.limit)
                    limit = parseInt(req.query.limit);
                if (req.query.offset)
                    offset = parseInt(req.query.offset);
                hlp.search(req.query.pattern, function (err, data) {
                    if (err) {
                        callback(null, "Error: " + err, "html");
                    } else {
                        var async = require('async');
                        var searchResults = "<dl class=\"search-results\">";
                        if (data.length > 0) {
                            var moreResults = 0;
                            if (data.length > limit) {
                               data.splice(limit,1);   
                               moreResults = offset + limit;
                            }
                            var ListUtilities = require('./listutilities');
                            var lu = new ListUtilities(config);
                            async.eachSeries(data, function (searchResultItem, callbackLoop) {
                                var pathResults = getTreeForPath( searchResultItem.path.toLowerCase() );
                                var treeName = pathResults.treeName;
                                var deepestAltToc = pathResults.deepestAltToc;
                                var addSearchItem = function(treePtr) {
                                    searchResults += "<dt>";
                                    searchResults += "<a href=\"" + pathPages + searchResultItem.path.substring(1) + "\">";
                                    searchResults += lu.removeDigitPrefix(searchResultItem.title);
                                    searchResults += "</a>";
                                    searchResults += "</dt>";
                                    searchResults += "<dd>";
                                    searchResults += "<div class=\"search-address\">" + pathPages + searchResultItem.path.substring(1) + "</div>";
                                    if( searchResultItem.description ) {
                                        searchResults += "<div class=\"search-description\">" +searchResultItem.description + "</div>";
                                    }
                                    var navigationText = generateNavigation(treePtr,searchResultItem.path.substring(1),searchResultItem.path,deepestAltToc,null,false);
                                    if( navigationText.breadcrumbs ) {
                                        searchResults += "<div class=\"search-breadcrumbs\"><ul>" +  navigationText.breadcrumbs+ "</ul></div>";
                                    }
                                    searchResults += "</dd>";
                                    callbackLoop();
                                };
                                if (treeName && !treeData[treeName]) {
                                    fs.readFile(config.generated + treeName, "utf8", function (err, jsonTreeData) {
                                        if (!err) {
                                            treeData[treeName] = JSON.parse(jsonTreeData);
                                        }
                                        addSearchItem(treeData[treeName]);
                                    });
                                } else {
                                    addSearchItem(treeData[treeName]);
                                }                               
                            },function() {
                                searchResults += "</dl>";
                                if( moreResults > 0 || offset > 0 ) {
                                    searchResults += "<div class=\"search-more\">";
                                    if( offset > 0 ) {
                                        searchResults += "<a href=\""+absolutePath + "pages/search?pattern="+req.query.pattern+"\">Page 1</a>";
                                        if( offset > limit ) {
                                            var startOffset = limit;
                                            var searchPageNumber = 2;
                                            while( offset > startOffset ) {
                                                searchResults += "<a href=\""+absolutePath + "pages/search?pattern="+req.query.pattern+"&offset="+startOffset+"\">Page "+searchPageNumber+"</a>";
                                                searchPageNumber += 1;
                                                startOffset += limit;
                                            }
                                        }
                                    }
                                    if( moreResults > 0 ) {
                                        searchResults += "<a href=\""+absolutePath + "pages/search?pattern="+req.query.pattern+"&offset="+moreResults+"\">More...</a>";
                                    }
                                    searchResults += "</div>";
                                }
                                
                                var fullPage = safeReplace(standardSearchTemplate,[
                                    {search:"<!--body-->", replace:searchResults},
                                    {search:"<!--search--->", replace:absolutePath + "pages/search"},
                                    {search:"<!--searchpattern--->", replace: req.query.pattern},
                                    {search:"<!--library--->", replace: GenerateLibrary(config.library)}
                                    ]);
                                callback(null, fullPage , "html");
                            });
                        } else {
                            searchResults += "<dt>No Results Found</dt>";
                            searchResults += "</dl>";
                                var fullPage = safeReplace(standardSearchTemplate,[
                                    {search:"<!--body-->", replace:searchResults},
                                    {search:"<!--search--->", replace:absolutePath + "pages/search"},
                                    {search:"<!--searchpattern--->", replace: req.query.pattern},
                                    {search:"<!--library--->", replace: GenerateLibrary(config.library)}
                                    ]);
                            callback(null,  fullPage , "html");
                        }
                    }
                }, offset, limit+1, true);
            } else if (page == "/unknown_reference" && req.query.page) {
                var content = standardSearchTemplate;
                var searchForPattern = unescape(req.query.page);
                if (searchForPattern.lastIndexOf("/") >= 0) {
                    searchForPattern = searchForPattern.substring(searchForPattern.lastIndexOf("/") + 1);
                }
                if (searchForPattern.lastIndexOf(".") > 0) {
                    searchForPattern = searchForPattern.substring(0, searchForPattern.lastIndexOf("."));
                }
                content = content.replace("<!--searchpattern--->", searchForPattern).replace("<!--search--->", absolutePath + "pages/search");
                content = content.replace("<!--body-->", "Unknown Reference '" + req.query.page + "'");
                callback(null, content, "html");
            } else if (page == "/ambiguous_reference" && req.query.page) {
                var content = standardSearchTemplate;
                var searchForPattern = unescape(req.query.page);
                if (searchForPattern.lastIndexOf("/") >= 0) {
                    searchForPattern = searchForPattern.substring(searchForPattern.lastIndexOf("/") + 1);
                }
                if (searchForPattern.lastIndexOf(".") > 0) {
                    searchForPattern = searchForPattern.substring(0, searchForPattern.lastIndexOf("."));
                }
                content = content.replace("<!--searchpattern--->", searchForPattern).replace("<!--search--->", absolutePath + "pages/search");
                content = content.replace("<!--body-->", "Ambiguous Reference '" + req.query.page + "'");
                callback(null, content, "html");
            } else {
                // ...Else assume its a resource (i.e. JPEG/PNG etc...)
                if( extension ) {
                    this.get(page, callback);
                } else {
                    fs.stat(config.source + relativePath,function(err,stats) {
                        if( !err  && stats && stats.isDirectory()) {
                            hlp.getPage(page+"/index.xml",fromPath, req,callback);
                        } else {
                            hlp.get(page, callback);
                        }
                    });
                }
            }
        };
        HelpServerUtil.prototype.getTocLoader = function (page, fromPath, callback) {
            page = decodeURI(page);
            var relativePath = page.substring(1);
            var jsonToJsPage = function (json) {
                var completedPage = page;
                var endPath = completedPage.lastIndexOf('/');
                if (endPath >= 0) {
                    completedPage = completedPage.substring(endPath + 1);
                }
                // Simple populate
                return "tableOfContents.populateTree(" + json + ',"' + completedPage + '");';
            };  
            // USE JSON file as basis for TOC - if query parameters limit view, return a sparse TOC
            fs.readFile(config.generated + relativePath + "on", "utf8", function (err, data) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, jsonToJsPage(data), "html");
                }
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
            } else if (extension == "xml_html" && config.events.translateXML) {
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
                                    if (absolutePath.length > 1) {
                                        if (relativePath.indexOf("helpserver-main.js") >= 0) {
                                            data = data.replace('absolutePath: "/"', 'absolutePath: "' + absolutePath + '"');
                                        }
                                    }
                                    callback(null, data, extension);
                                }
                            });
                        } else {
                            if (absolutePath.length > 1) {
                                if (relativePath.indexOf("helpserver-main.js") >= 0) {
                                    data = data.replace('absolutePath: "/"', 'absolutePath: "' + absolutePath + '"');
                                }
                            }
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
                        callback(null, data, extension);
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
                var altTocs = config.tocData.altTocs;
                for (i = 0; i < altTocs.length; ++i) {
                    filterNames.push({ filterName: configName, altToc: altTocs[i] });
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
                    } else if( cfg.search ) {
                        elasticquery(cfg, '', handleQueryResults, 0, 100000);
                    } else {
                        // Return ALL records...
                        //      columnSelection = ["title", "path", "metadata" , "toc" ]
                        var leadPath = path.resolve( cfg.source ).toLowerCase();
                        leadPath = replaceAll(leadPath,'\\','/');
                        fs.readFile( cfg.generated + cfg.flatfile , "utf8" , function(err,flatList) {
                             var data = [] , rawData = null;
                             if( !err ) {
                                 try {
                                     rawData = JSON.parse(flatList);
                                     var i;
                                     for( i = 0 ; i < rawData.length ; ++i ) {
                                         var pathName = rawData[i].file;
                                         pathName = replaceAll(pathName,'\\','/');
                                         if( pathName.toLowerCase().substring(0,leadPath.length) == leadPath ) {
                                             pathName = pathName.substring(leadPath.length);
                                         }
                                         data.push({title : rawData[i].title , path : pathName });
                                     }
                                 } catch( err ) {
                                     
                                 }
                             }
                             handleQueryResults(err,data);
                        });
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
                if (config.events.beforeRefresh) {
                    config.events.beforeRefresh();
                }
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
                        ++serverHealth.revisionCount;
                        // Force a reload of the tree cache
                        treeData = {};
                        indexLinks = null;
                        parentIndexData = {};
                        actualLinks = null;
                        fs.writeFile(config.generated + "revision.txt", "" + serverHealth.revisionCount, function (err) {
                            if (err) {
                                console.log("Error saving revision");
                            }
                        });
                    }
                });
            } else {
                rebuildContent(this);
            }
        };

        // perform a pattern seach, returns 'path' portion of help
        HelpServerUtil.prototype.search = function (pattern, callback, startAt, limit, getDescription ) {
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
                    elasticquery(this.config, pattern, callback, startAt, limit,getDescription);
                else
                    elasticquery(this.config, pattern, callback,null,null,getDescription);
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
        
        
        var topicResolveLow = function(hlp, path, req, res,raw) {
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
                                if( raw ) {
                                    help.onSendExpress(res);
                                    res.send(foundItem.path + "#" + foundItem.hash);
                                } else {
                                    res.redirect('/pages'+foundItem.path + "#" + foundItem.hash);
                                }
                            } else if( raw ) {                                
                                help.onSendExpress(res);
                                res.send(foundItem.path);
                            } else {
                                res.redirect('/pages'+foundItem.path);
                            }
                        } else if( raw ) { 
                            // TBD - show the 'not-found' page with results...
                            help.onSendExpress(res);
                            res.send("");
                        } else {
                            res.redirect('/pages/search?topic='+req.query.topic);
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
                                            if( raw ) {
                                                res.send(req.query.hint.substring(0, endOfPath) + "/" + list[i]);
                                            } else {
                                                req.redirect('/pages'+req.query.hint.substring(0, endOfPath) + "/" + list[i]);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!resolved) {
                                 hlp.search(req.query.topic, searchResultProcess);
                            }                            
                        });
                    } else {
                        hlp.search(req.query.topic, searchResultProcess);
                    }
                } else {
                    hlp.search(req.query.topic, searchResultProcess);
                }
        };


        var expressHandler = {
            "blank": function (hlp, path, req, res) {
                hlp.onSendExpress(res);
                res.send('&nbsp;');
            },

            "main": function (hlp, path, req, res) {
                loadAssetUTF8("main.html", function (err, data) {
                    if (absolutePath.length > 1) {
                        data = replaceAll(data, '"/assets', '"' + absolutePath + "assets");
                    }
                    if (err) {
                        res.status(404).send(path + ' Not found');
                    } else {
                        res.type('html');
                        hlp.onSendExpress(res);
                        res.send(data);
                    }
                });
            },
            "pages": function (hlp, path, req, res) {
                hlp.getPage(path, req.path, req, function (err, data, type) {
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
            "print": function (hlp, path, req, res) {
                hlp.getPage(path, req.path, req, function (err, data, type) {
                    if (err) {
                        hlp.onSendExpress(res);
                        res.send(err);
                    } else {
                        data = replaceAll(data,"<ul style=\"display:none\">","<ul>");
                        if (type) {
                            res.type(type);
                        }
                        hlp.onSendExpress(res);
                        res.send(data);
                    }
                },true);
            },
            "appcache": function (hlp, path, req, res) {
                var manifest = replaceAll(pagesManifest, "__filter__", path.substring(1).replace(".appcache", ""));
                manifest = manifest.replace("__helpversionnumber__", "" + serverHealth.revisionCount);
                res.type("text/cache-manifest");
                hlp.onSendExpress(res);
                res.send(manifest);
            },
            "toc_loader": function (hlp, path, req, res) {
                hlp.getTocLoader(path, req.path, function (err, data, type) {
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
            "edit": function (hlp, path, req, res) {
                loadAssetUTF8("edit.html", function (err, data) {
                    if (err) {
                        res.status(404).send(path + ' Not found');
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
                        res.status(404).send(path + ' Not found');
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
                var getDescription = false;
                if (req.query.limit)
                    limit = parseInt(req.query.limit);
                if (req.query.offset)
                    offset = parseInt(req.query.offset);
                if (req.query.description)
                    getDescription = true;
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
                }, offset, limit , getDescription );
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
                                res.status(404).send(path + ' Not found');
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
                res.send(JSON.stringify({ escapes: config.escapes, keywords: config.keywords, altTocs: config.tocData.altTocs, proxy: config.proxy, absolutePath: absolutePath }));
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
                            res.status(404).send(path + ' Not found');
                        } else {
                            res.type('html');
                            hlp.onSendExpress(res);
                            res.send(data);
                        }
                    });
                } else {
                    res.status(404).send(path + ' Not found');
                }
            },
            "files.json": function (hlp, path, req, res) {
                fs.readFile(config.generated + config.flatfile, function (errFiles, dataFiles) {
                    if (errFiles) {
                        res.status(404).send(config.flatfile + ' Not found');
                    } else {
                        var files = JSON.parse(dataFiles);
                        var i;
                        var links = [];
                        for (i = 0; i < files.length; ++i) {
                            links.push(files[i].path);
                        }
                        res.type('json');
                        hlp.onSendExpress(res);
                        res.send(JSON.stringify(links));
                    }
                });
            },
            "topic": function (hlp, path, req, res) {
                topicResolveLow(hlp, path, req, res,true);
            },
            "topicPage": function (hlp, path, req, res) {
                topicResolveLow(hlp, path, req, res,false);
            },
            "index" : function(hlp, path, req, res) {
                path = decodeURI(path);
                var name = null;
                if( path.length > 1 ) {
                   name = path.substring(1).trim().toLowerCase();
                }
                var loadPage = function() {
                    var href = indexLinks[name];
                    if( href ) {
                        res.redirect(href);
                    } else {
                        res.redirect(absolutePath+"pages/search?pattern="+path.substring(1));
                    }      
                };
                if( indexLinks ) {
                    loadPage();
                } else {
                    loadIndex( function(result) {                        
                        indexLinks = result;
                        loadPage();  
                    });
                }
            }
        };
        
        // Express generic entry point
        HelpServerUtil.prototype.expressuse = function (req, res) {
            var pathValue = req.path;
            var altConfig = help;
        
            // Strip off the absolute path if present (allows direct testing of site)
            if (absolutePath.length > 1) {
                if (pathValue.indexOf(absolutePath) == 0) {
                    pathValue = pathValue.substring(absolutePath.length - 1);
                } else {
                    console.log('Warning Unprotected path' + pathValue);
                }
            }

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
                    pathValue = config.defaultPage;
                    items = pathValue.split('/');
                }
            }
            var handler = expressHandler[items[1]];
            if (handler) {
                if (config.defaultPage && config.defaultPage != '' && config.defaultPage != '/') {
                    var defaultItems = config.defaultPage.split('/');
                    if (config.defaultPage.length > 1) {
                        var lookupConfig = configurationObjects[defaultItems[1]];
                        if( lookupConfig ) {
                            altConfig = lookupConfig;
                        }
                    }
                }
                handler(altConfig, '/' + items.slice(2).join('/'), req, res);
            } else {
                altConfig = configurationObjects[items[1]];
                if (altConfig) {
                    handler = expressHandler[items[2]];
                    if (handler) {
                        handler(altConfig, '/' + items.slice(3).join('/'), req, res);
                    } else {
                        res.status(404).send(pathValue + ' Not found');
                    }
                } else {
                    res.status(404).send(pathValue + ' Not found');
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
