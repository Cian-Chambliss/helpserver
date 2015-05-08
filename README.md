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

    .search = function (pattern, callback(err,data) {})
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


An express server with hooks for resolving pages, performing searchs, pulling the table of contents. 

```js
var express = require('express');
var app = express();
var options = {
  "port": 80,
  "metadata" : true ,
  "dependencies" : true ,
  "source": "/dev/AlphaHelp/helpfiles/",
  "generated": "/dev/AlphaHelp/generated/",
  "templatesLocation": "/dev/AlphaHelp/templates/",
  "ignoreItems": [
    "images",
    "Orphans"
  ],
  "search": {
    "provider": "elasticsearch"
  }
};
var fs = require('fs');
var mainPageTemplate = 'No main.html template found';
var searchPageTemplate = 'No search panel found.';
var Help = require('helpserver');
var help = Help(options);

// Pull in resources
fs.readFile(options.templatesLocation+'main.html','utf8' , function(err,data) {
    if( !err ) {
        mainPageTemplate = data;
    }
});

fs.readFile(options.templatesLocation+'search_panel.html','utf8' , function(err,data) {
    if( !err ) {
        searchPageTemplate = data;
    }
});

app.use("/blank",function(req,res) {
     res.send('&nbsp;');
});

app.use("/main",function(req,res) {
     res.send(mainPageTemplate);
});

app.use("/search_panel",function(req,res) {
     res.send(searchPageTemplate);
});

app.use("/toc",function(req,res) {
    help.gettree(req.path,function(err,data) {
        res.type('html');
        if( err ) {
            res.send('error '+err);   
        } else {
            res.send(data);
        }
    });
});

app.use("/assets/",function(req, res) {
    console.log('request '+req.path+'\n');
    help.get(req.path,function(err,data,type) {
       if( err ) {
           res.send(err);
       } else {
            if( type ) {
                res.type(type);
            }
            res.send(data);           
       }
    });
});

app.use("/help/",function(req, res) {
    console.log('request '+req.path+'\n');
    help.get(req.path,function(err,data,type) {
       if( err ) {
           res.send(err);
       } else {
            if( type ) {
                res.type(type);
            }
            res.send(data);           
       }
    });
});

app.use("/search?" ,function(req, res) {
    help.search(req.query.pattern,function(err,data) {
        if( err ) {
            res.send(JSON.stringify([ { 'error' : err } ]));
        } else {
            res.send(JSON.stringify(data));
        }  
    })     
});

app.post("/refresh" ,function(req, res) {
    if( !global.refresh_locked ) {
        global.refresh_locked = true;
        help.refresh( function(err,result ) {
            global.refresh_locked = false;
            res.end("complete");
        });
    } else {
        res.end("busy");
    }
});
    

app.listen(options.port);
console.log('Listening on port '+options.port);
```	


HTML page for 'main.html'.

```html
<html>
	<head>
		<script src="/assets/helpserver-main.js"></script>
	</head>
	<body onload="helpServer.onLoad()" style="margin:0px;padding:0px;" onhashchange="helpServer.onHashChange()">
		<div style="height:100%;width:34%;float:left;border:none;">
			<iframe src="/search_panel" id="search" style="height:34%;width:100%;float:top;border:none;"></iframe>
			<iframe src="/toc" id="toc" style="height:66%;width:100%;float:top;border:none;"></iframe>
		</div>
		<iframe src="/blank" id="help" name="help" style="height:100%;width:66%;float:left;border:none;" onload="helpServer.helpFrameLoad();"></iframe>
	</body>

</html>
```

HTML page for 'search_panel.html'.

```html
<html>
	<head>
		<script src="/assets/helpserver-search.js"></script>
	</head>
	<body>
		<div style="width:15%;float:left;" >Search</div> <input id="input" style="width:70%;"/><button onclick="searchPanel.doSearch()" style = "width:10%;">Search</button><br>
		<div style="width:95%;" >Results</div> 
		<div id="results" />		
	</body>
</html>		
```

## Release History

* 1.0.5 Added support for page metadata, filters & a refresh post method.
* 1.0.4 Added get/gettree/gettreejson to api
* 1.0.3 Added stats
* 1.0.2 Fixed Git link
* 1.0.1 Added README
* 1.0.0 Initial release