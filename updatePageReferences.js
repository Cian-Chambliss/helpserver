/**
 * Update references on a page to reflect new base path
 */
module.exports = function (config, data, paths) {
    var htmlparser = require("htmlparser2");
    var replacePaths = [];
    var parser = new htmlparser.Parser({
        onopentag: function (name, attribs) {
            if (attribs.href) {
                if (attribs.href.substring(0, 1) == '/') {
                    replacePaths.push('"' + attribs.href + '"');
                    replacePaths.push("'" + attribs.href + "'");
                }
            }
        },
        ontext: function (text) {
        },
        onclosetag: function (name) {
        }
    });
    parser.write(data);
    parser.end();
    // Set the absolute path
    if (replacePaths.length > 0) {
        var i;
        for (i = 0; i < replacePaths.length; ++i) {
            var replacePath = replacePaths[i];
            var replacement = replacePath.substring(0, 1) + paths.basepath + replacePath.substring(1);
            if (replacePath !== replacement) {
                while (data.indexOf(replacePath) >= 0) {
                    data = data.replace(replacePath, replacement);
                }
            }
        }
    }
    return data;
}