/**
 * Extract local href anchor tags..
 */
module.exports = function ( data , parentAbsolutePath ) {
    var htmlparser = require("htmlparser2");
    var pendingHRef = null;
    var anchorContents = "";
    var localLinks = [];
    
    var parser = new htmlparser.Parser({
        onopentag: function (name, attribs) {
            if( name == "a" ) {
                if (attribs.href) {
                    var protocolPos = attribs.href.indexOf(':');
                    var protocol = null;
                    if( protocolPos > 0 ) {
                        protocol = attribs.href.substring(0,protocolPos);
                        if( protocol.indexOf('/') >= 0 || protocol.indexOf('.') >= 0 ) {
                            protocol = null;
                        }
                    }
                    if (attribs.href.substring(0, 1) != '/' && !protocol ) {
                        pendingHRef = attribs.href;
                        anchorContents = "";
                    } else if( parentAbsolutePath && parentAbsolutePath.length && parentAbsolutePath == attribs.href.substring(0,parentAbsolutePath.length)  ) {
                        pendingHRef = attribs.href.substring(parentAbsolutePath.length);
                        anchorContents = "";
                    }
                }
            }
        },
        ontext: function (text) {            
            if( pendingHRef ) {
                anchorContents += text;
            }
        },
        onclosetag: function (name) {
            if( name == "a" ) {
                if( pendingHRef ) {
                    localLinks.push({ href : pendingHRef , text : anchorContents });                    
                    pendingHRef = null;
                }                
            }
        }
    });
    parser.write(data);
    parser.end();
    return localLinks;
}