/**
 * Update references on a page to reflect new base path
 */
module.exports = function(config, data, pageProc) {
    var htmlparser = require("htmlparser2");
    var replacePaths = [];
    var inTitle = false;
    var inPara = false;
    var paragraph = "";
    var getPlainText = true;
    var getLinks = false;
    var linksDefinition = "";
    var replaceLinks = [];
    var pendingName = null;
    var pendingText = "";
    var localNames = [];
    var processEmbeddedLinks = function(linksDef) {
        var parts = linksDef.split("<a");
        if (parts.length > 1) {
            var i;
            for (i = 1; i < parts.length; ++i) {
                var content = parts[i].split(">");
                if (content.length > 1) {
                    var tagAttribs = content[0];
                    var treeLookup = false;
                    var targetPos = tagAttribs.indexOf("target=");
                    var targetAttrib = "";
                    if (targetPos >= 0) {
                        targetAttrib = tagAttribs.substring(targetPos + 7).trim();
                        if (targetAttrib.substring(0, 1) === '"') {
                            targetAttrib = ' target="' + targetAttrib.split('"')[1] + '"';
                        } else if (targetAttrib.substring(0, 1) === "'") {
                            targetAttrib = ' target="' + targetAttrib.split("'")[1] + '"';
                        } else {
                            targetAttrib = "";
                        }
                    }
                    if (pageProc.basepath) {
                        var hrefPos = tagAttribs.indexOf("href=");
                        if (hrefPos >= 0) {
                            var replaceAttrib = tagAttribs.substring(hrefPos + 5).trim();
                            if (replaceAttrib.substring(0, 1) === '"' || replaceAttrib.substring(0, 1) === "'") {
                                if (replaceAttrib.substring(1, 2) === '/') {
                                    if (replaceAttrib.indexOf("/index?search=") < 0) {
                                        tagAttribs = tagAttribs.substring(0, hrefPos + 6) + pageProc.basepath + replaceAttrib.substring(1);
                                    }
                                }
                            }
                        } else if (pageProc.indexLinks) {
                            treeLookup = true;
                        }
                    }
                    content = content[1].split("</a")[0];
                    if (treeLookup) {
                        var findRef = pageProc.lookupLink(pageProc.indexLinks, content.trim());
                        if (findRef) {
                            tagAttribs = "href=\"" + findRef + "\"";
                        }
                    }
                    var extn = tagAttribs.lastIndexOf('.');
                    var searchTag = "[" + content + "]";
                    if (extn > 0) {
                        extn = tagAttribs.substring(extn + 1).split('"')[0].toLowerCase();
                        if (extn === 'jpg' || extn === 'png' || extn === 'bmp' || extn === 'gif' || extn === 'jpeg' || extn === 'svg') {
                            content = "<img src=" + tagAttribs.substring(6) + "/>";
                            //console.log(content);
                        } else {
                            tagAttribs += " class=\"embedded-link;\"";
                        }
                    }
                    var replacement = "<a " + tagAttribs + targetAttrib + ">" + content + "</a>";
                    if (replacement.indexOf('$') >= 0) {
                        replacement = replacement.split('$').join('$$');
                    }
                    replaceLinks.push({ search: searchTag, replace: replacement });
                }
            }
        }
    };

    var parser = new htmlparser.Parser({
        onopentag: function(name, attribs) {
            if (attribs.href) {
                if (attribs.href.substring(0, 1) === '/' && attribs.href.indexOf('/index?search=') < 0) {
                    replacePaths.push('"' + attribs.href + '"');
                    replacePaths.push("'" + attribs.href + "'");
                }
            }
            if (name === "title" && !pageProc.pageTitle) {
                inTitle = true;
            } else if (name === "p") {
                inPara = getPlainText;
                if (attribs.name) {
                    pendingName = attribs.name;
                    pendingText = "";
                }
            } else if (name === "meta") {
                if (attribs.name && attribs.content) {
                    if (attribs.name === "description") {
                        pageProc.pageDescription = attribs.content;
                    }
                }
            } else if (attribs.name) {
                pendingName = attribs.name;
                pendingText = "";
            } else if (name === "script") {
                if (attribs.id === "definePageLinks" || attribs.type === "text/xmldata") {
                    getLinks = true;
                }
            }
        },
        ontext: function(text) {
            if (inTitle) {
                pageProc.pageTitle = text;
            } else if (inPara) {
                paragraph += text;
                var sentence = paragraph.split('.');
                if (sentence.length > 2) {
                    getPlainText = false;
                    paragraph = sentence.join('.');
                }
            } else if (getLinks) {
                linksDefinition += text;
            }
            if (pendingName) {
                pendingText += text;
            }
        },
        onclosetag: function(name) {
            if (name === "title") {
                inTitle = false;
            } else if (name === "p") {
                inPara = false;
            } else if (name === "script") {
                if (getLinks) {
                    getLinks = false;
                    if (linksDefinition !== "") {
                        processEmbeddedLinks(linksDefinition);
                    }
                }
            }
            if (pendingName) {
                if (pendingText.length) {
                    localNames.push({ name: pendingName, content: pendingText });
                }
                pendingName = null;
            }
        }
    });
    parser.write(data);
    parser.end();
    // Set the absolute path
    if (replacePaths.length > 0) {
        var i;
        for (i = 0; i < replacePaths.length; ++i) {
            var replacePath = replacePaths[i];
            var replacement = replacePath.substring(0, 1) + pageProc.basepath + replacePath.substring(1);
            if (replacePath !== replacement) {
                while (data.indexOf(replacePath) >= 0) {
                    data = data.replace(replacePath, replacement);
                }
            }
        }
    }
    if (replaceLinks.length > 0) {
        for (i = 0; i < replaceLinks.length; ++i) {
            while (data.indexOf(replaceLinks[i].search) >= 0) {
                data = data.replace(replaceLinks[i].search, replaceLinks[i].replace);
            }
        }
    }
    if (!pageProc.pageDescription) {
        while (paragraph.indexOf('\r') >= 0) {
            paragraph = paragraph.replace('\r', ' ');
        }
        while (paragraph.indexOf('\n') >= 0) {
            paragraph = paragraph.replace('\n', ' ');
        }
        while (paragraph.indexOf('\t') >= 0) {
            paragraph = paragraph.replace('\t', ' ');
        }
        while (paragraph.indexOf('&nbsp;') >= 0) {
            paragraph = paragraph.replace('&nbsp;', ' ');
        }
        while (paragraph.indexOf('"') >= 0) {
            paragraph = paragraph.replace('"', "'");
        }
        while (paragraph.indexOf('  ') >= 0) {
            paragraph = paragraph.replace('  ', ' ');
        }
        pageProc.pageDescription = paragraph;
    }
    pageProc.localNames = localNames;
    if (config.events) {
        if (config.events.postProcessContent) {
            data = config.events.postProcessContent(data,pageProc.urlBasePath);
        }
    }
    return data;
}