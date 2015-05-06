Helpserver
==========

A library used to automate generation of table of contents from directory structer, and optionally 
populate and query against an elasticsearch index to perform full text search of static help files.

## Installation

  npm install helpserver

## Usage

The helpserver class requires some initialization parameters, which include

 - source : (required) the path that will be recursed to create a table of contents & manifest files.
 - generated : (required) the path into which the generated table of contents files will be put.
 - ignoreItems : (optional) a list of folder names to ignore when recursing the source folder.
 - search : (optional) if search feature is to be used, this becomes required.
   * provider : (required) currently only provider implemented is 'ellasticsearch'
   * host : (optional) override the host (if not specified, 'localhost:9200' is assumed)
   * index : (optional) override the index name we use (if not specified, 'helpserver' is assumed) 
   * type : (optional) override the index element type we define (if not specified, 'helppage' is assumed)
 - templatefile : (optional) name of file that contains a template for the table of contents.
   * if unspecified, the toctemplate.html file in the node_module is used.    
 - escapes : (optional) override the escapes applied to file names when generating text for the table of contents
   * If no escapes are defined, the default replacements are 
     - ".html" : "" 
     - ".md" : "" 
     - "__STAR__" : "*" 
     - "__QUESTION__" : "?" 
     - "__SLASH__" : "/" 
     - "__BACKSLASH__" : "\\" 
     - "__NAMESPACE__" : "::" 
     - "__COLON__" : ":" 
     - "__ELLIPSES__" : "..." 
     - "__HASH__" : "#" 
     - "__GT__" : ">" 
     - "__LT__" : "<" 
     - "__PIPE__" : "|"
   * Example a file called "__STAR__for_each.html" show up as "*for_each" in the generated table of contents file.
 
Generating a table of contents from a folder structure.  In the following example, we want to create a 
table of contents file that from a directory structure and contained html files.

	var Help = require('helpserver');
	var config = {
		source: '/dev/AlphaHelp/helpfiles',
		generated: '/dev/AlphaHelp/generated',
		ignoreItems: ['images', 'Orphans'] ,
		search : {
			provider: "elasticsearch"
		}
	};

	help.generate(function (err, result) {
		if (err)
			console.log("Error: " + err);
		else
			console.log('Help generated ' + result);
	});

Populate a locally running elastic search instance with plaintext from all the files (requires a generate)

	var Help = require('helpserver');
	var config = {
		source: '/dev/AlphaHelp/helpfiles',
		generated: '/dev/AlphaHelp/generated',
		ignoreItems: ['images', 'Orphans'] ,
		search : {
			provider: "elasticsearch"
		}
	};
    help.buildindex(function (err, result) {
	 	if(err)
			console.log( err );
		else
			console.log('Index built ' + JSON.stringify(result,null," "));
    });

Once an index exists, perform a query (fulltext search with greater weight given to match of a topic title)

	var Help = require('helpserver');
	var config = {
		source: '/dev/AlphaHelp/helpfiles',
		generated: '/dev/AlphaHelp/generated',
		ignoreItems: ['images', 'Orphans'] ,
		search : {
			provider: "elasticsearch"
		}
	};
	help.search('for_each',function(err,result) {
		if(err) {
			console.log(err);
		} else {
			console.log(JSON.stringify(result));		
		}
	});

## Release History

* 1.0.0 Initial release