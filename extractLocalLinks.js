/**
 * Extract local href anchor tags..
 */
module.exports = function ( data , parentAbsolutePath ) {
    var htmlparser = require("htmlparser2");
    var pendingHRef = null;
    var anchorContents = "";
    var localLinks = [];
    var helpWaterMark = 0;
    var hasDuplicateHREF;
    
    data = data.replace("<!--orderchildren-->","<helpwatermark></helpwatermark>")
    
    var parser = new htmlparser.Parser({
        onopentag: function (name, attribs) {
            if( name == "helpwatermark" ) {
                helpWaterMark = localLinks.length;
            } else if( name == "a" ) {
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
                    if( !hasDuplicateHREF ) {
                        for(var i = 0 ; i < localLinks.length ; ++i ) {
                            if( localLinks[i].href == pendingHRef ) {
                                hasDuplicateHREF = true;
                                break;
                            }
                        }
                    } 
                    localLinks.push({ href : pendingHRef , text : anchorContents });                    
                    pendingHRef = null;
                }                
            }
        }
    });
    parser.write(data);
    parser.end();
    if( hasDuplicateHREF ) {
        if( 0 < helpWaterMark && helpWaterMark < localLinks.length ) {
           localLinks.splice(0,helpWaterMark);   
        }
        for( var i = localLinks.length-1 ; i > 0 ; --i ) {
            for( var j = 0 ; j < i ; ++j ) {
                if( localLinks[j].href == localLinks[i].href ) {
                    localLinks.splice(i,1);
                    break;
                }
            }
        }
    } 
    return localLinks;
}