Helpserver
==========

A library used to automate generation of table of contents from directory structure, and optionally 
populate and query against an elasticsearch index to perform full text search of static help files.

## Installation

  npm install helpserver
  
## API

The help server includes the methods

	.status(function(stats) {})
	
To get the status, including whats been generated, and if the index provider is running  (in the case of using search, you will 
want elasticsearch to be started before you start using the search related api calls).	

    .generate(callback(err,result) {});
	
To generate the help table of contents.


    .buildindex(callback(err,result) {});
	
To populate the search index with plaintext content of the help pages.
If a filter is defined, after the index is built, a table of contents that applies the filter is defined. 

    .refresh(callback(err,result) {});
	
To regenerate the help table and incrementally update only those pages that changed. 

    .search(pattern, callback(err,data) {})
To search the index for a pattern.
  
	
    .get(page,callback(err,data,type) { });

To retrieve a help page	or resource.

    .gettree(page,callback(err,data) { });
	
To retrieve the html tree (generated ul).

	.gettreejson(page,callback(err,data) { });
	
To retrieve the json tree ( text and paths ).
	

## Usage

The helpserver class requires some initialization parameters, which include

 - source : (required) the path that will be recursed to create a table of contents & manifest files.
 - generated : (required) the path into which the generated table of contents files will be put.
 - useGit : (optional) when a refresh is done, a pull (using git) will be done on a previously cloned git repository.
  * Caveat: to use this feature, you will need to add the dependency { "nodegit" : ">0.0.0" } to the package.json file for the project.  nodegit is not included by default as there are problems installing it on some platforms. 
 - repoSource : (optional) Path to repository - may be underneath of inside the help source.
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
     - "\_\_STAR\_\_" : "*" 
     - "\_\_QUESTION\_\_" : "?" 
     - "\_\_SLASH\_\_" : "/" 
     - "\_\_BACKSLASH\_\_" : "\\" 
     - "\_\_NAMESPACE\_\_" : "::" 
     - "\_\_COLON\_\_" : ":" 
     - "\_\_ELLIPSES\_\_" : "..." 
     - "\_\_HASH\_\_" : "#" 
     - "\_\_GT\_\_" : ">" 
     - "\_\_LT\_\_" : "<" 
     - "\_\_PIPE\_\_" : "|"
   * Example a file called "__STAR__for_each.html" show up as "*for_each" in the generated table of contents file.
 - metadata : (optional) - logical flag that indicates that html files should be scanned for metadata
   * The pattern that helpserver looks for in the HTML files is __&lt;!---HELPMETADATA: { ..JSON... } ---&gt;__ the __JSON__ embedded in the tag gets put in the search database as a field called 'metadata'.   
 - filter : (optional) - if defined, filter_name must also be defined.  This adds a required term to every query, and causes the table of contents to be filtered.
   * Example - Require the metadata.tags field to be either web or common:  "filter" : { "metdata.tags" : "web,common" }
 - filter_name : (optiona) - filter must be defined, this string is used as a prefix to any generated table of contents, json data.     
 
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
	var help = Help(config);

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
	var help = Help(config);
	
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
	var help = Help(config);
	
	help.search('for_each',function(err,result) {
		if(err) {
			console.log(err);
		} else {
			console.log(JSON.stringify(result));		
		}
	});
	
##Example help server


An express server with hooks for resolving pages, performing searchs, pulling the table of contents.  In the following example, 
the main page is <host>/main (i.e. "127.0.0.1/main" on your local machine).
    
source (/myhelp/helpfiles/) is the root of the static html files stored in a folder structure.
generated (/myhelp/generated/) is where helpserver puts any generated html content (like the table of contents).  
    

```js
var express = require('express');
var app = express();
var options = {
  "port": 80,
  "metadata" : true ,
  "dependencies" : true ,
  "source": "/myhelp/helpfiles/",
  "generated": "/myhelp/generated/",
  "ignoreItems": [
    "images",
    "Orphans"
  ],
  "search": {
    "provider": "elasticsearch"
  }
};
var Help = require('helpserver');
var help = Help(options);

app.use("/",function (req, res) {
    help.expressuse(req, res);
});

app.listen(options.port);
console.log('Listening on port '+options.port);
```	


## Release History

* 1.0.11 the latest elasticquery.js script was missing
* 1.0.10 Added 'refresh' page to allow a user to refresh content (should lock this down in the future). 
* 1.0.9 Added optional git update integration (requires adding a dependency). 
* 1.0.8 Merged the search and table of contents together + improved styling.  Added support for 'group' metadata to change add or remove structure.
* 1.0.7 Added support for .md files.
* 1.0.6 Created a single top level 'expressuse' method to encasulate all the routing.
* 1.0.5 Added support for page metadata, filters & a refresh post method.
* 1.0.4 Added get/gettree/gettreejson to api
* 1.0.3 Added stats
* 1.0.2 Fixed Git link
* 1.0.1 Added README
* 1.0.0 Initial release