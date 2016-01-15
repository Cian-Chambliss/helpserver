/**
 * Update references on a page to reflect new base path
 */
module.exports = function (config, data, pageProc) {
    var htmlparser = require("htmlparser2");
    var replacePaths = [];
    var inTitle = false;
    var inPara = false;
    var paragraph = "";
    var getPlainText = true;
    var parser = new htmlparser.Parser({
        onopentag: function (name, attribs) {
            if (attribs.href) {
                if (attribs.href.substring(0, 1) == '/') {
                    replacePaths.push('"' + attribs.href + '"');
                    replacePaths.push("'" + attribs.href + "'");
                }
            }
            if( name == "title" && !pageProc.pageTitle ) { 
                inTitle = true;
            } else if( name == "p" ) {
                inPara = getPlainText;
            } else if( name == "meta" ) {
                 if (attribs.name && attribs.content ) {
                     if( attribs.name == "description") {
                         pageProc.pageDescription = attribs.content;
                     }
                 }
            }
        },
        ontext: function (text) {
            if( inTitle ) {
                pageProc.pageTitle = text;
            } else if( inPara ) {
                paragraph += text;                
                var sentence = paragraph.split('.');
                if( sentence.length > 2 ) {
                    getPlainText  = false;
                    paragraph = sentence.join('.'); 
                }
            }
        },
        onclosetag: function (name) {
            if( name == "title" ) {
                inTitle = false;
            } else if( name == "p" ) {                
                inPara = false;
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
    if( !pageProc.pageDescription ) {
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
    return data;
}