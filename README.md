Helpserver
==========

A library used to automate generation of table of contents from directory structure, and optionally 
populate and query against an elasticsearch index to perform full text search of static help files.

## Installation

  npm install helpserver
  
## HelpServer Specific Page Content

The helpserver processes the HTML to extract the plaintext for performing text search against, but it also looks for comments and classes.

Metadata is included on a page in the form of a comment "&lt;!---HELPMETADATA:" - for example: 

```html
<!---HELPMETADATA: { "tags" : "expert" } --->
```

Changing the location of a help pages location in the table of contents - the group metadata tag, this can be relative - for example.

```html
<!---HELPMETADATA: { "group" : "Subtopic" } --->
```

Will move the page to aunder a child branch called 'subtopic'.

```html
<!---HELPMETADATA: { "group" : "../Sibling/Kid" } --->
```

Will move the page to under a Kid topic under the Sibling topic that gets added a level up.

```html
<!---HELPMETADATA: { "group" : "/New Features/Create Document" } --->
```

Will move the page to an absolute position in the TOC (top level branch 'New Features' under sub topic 'Create Document'


This is used by the filter logic to allow a subset of the pages to be exposed based on content (i.e show me 'expert' pages). 

If a div of class 'helpserver_toc' exists in a page, we look for ul and li tags that contain anchor tags that reference the document, for example if your
help page contains this 

```html
<div class="helperserver_toc" >
   <ul>
     <li><a href="#Intro">Intro</a> </li>
     <li><a href="#API">API</a>
       <ul>
          <li><a href="#Query">Query</a> </li>
          <li><a href="#Metadata">Retrieve Metadata</a> </li>
       </ul>     
     </li>
   </ul>
</div>
```

Then helpserver will add child tags of 'Intro', 'Api' with children 'Query' and 'Retrieve Metadata' for the help page.

## The 'editTOC' page

The editToc setting points to a help page in the help folder that will be displayed on the documentation page when no sections are selected.

Using helperserver_toc in the top level page changes the structure at the top - in addition to an id, the anchor tags in the **li** tags support 
an attribute of 'helpserver_folder' to include branches of the tree.  another optional attribute called helperserver_flatten will automatically flatten 
folders with 'helperserver_flatten' or fewer entries.

For example, if you had a folder structure of your help system like this:

```
/help/Guide
/help/Guide/HasOnePage
/help/Tutorial
/help/Tutorial/Hello World
/help/Tutorial/Complex Application
/help/API
/help/API/Client-Side
/help/API/Server-Side
```  
And a main help page called "main.html" that was assigned through having the "editToc" set to "main.html" in the settings file.
The leaf nodes of the ui/li tree that have helpserver_folder will get populated with the specified branch of help - if there are folder beneath a level,
the folders will be added recursively.

The helperserver_flatten=1 on the Guide ensures that the folder HasOnePage (which in this example contains a single help page) will be removed from the
table of contents and treated as a sibling of the other pages in Guide.  Not surprisingly, if we used  helperserver_flatten=2, then a folder with two of
fewer help pages would have been 'flattened' into the parent level.

```html
contents of /help/main.html
<div class="helperserver_toc" >
   <ul>
     <li><a href="#/Guide" helpserver_folder="/Guide" helperserver_flatten="1" >Guide</a> </li>
     <li><a href="#/Tutorial" helpserver_folder="/Tutorial" >Tutorials</a> </li>
     <li><a href="#/API">API</a>
       <ul>
          <li><a href="#/API/Client-Side"  helpserver_folder="/API/Client-Side">Client Side API</a> </li>
          <li><a href="#/API/Server-Side"  helpserver_folder="/API/Server0-Side">Server Side API</a> </li>
       </ul>     
     </li>
   </ul>
</div>
<h1 name="/Guide" >Guide</h1>
The guide will give you an overview of the features.
<h1 name="/Tutorial" >Tutorials</h1>
The Tutorials will provide hands on experience with the product.
<h1 name="/API" >Client and Server side API</h1>
There are different APIs for the client side and the server side.
<h1 name="/Client-Side" >Client Side API</h1>
API's that you can program on the client side using HTML5 & javascript
<h1 name="/Server-Side" >Server Side API</h1>
API's you can use of the Server side for business logic
```
  
  
## API

The help server includes the methods


  .expressuse(req, res)

To handle top level express route (let helpserver handle all the routing).  
  

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

    .gettree(page,allowEncoding,callback(err,data) { });
	
To retrieve the html tree (generated ul) , allowEncoding is the encoding we expect (i.e. deflate returns a gzip deflated version).

	.gettreejson(page,allowEncoding,callback(err,data) { });
	
To retrieve the json tree ( text and paths ) , allowEncoding is the encoding we expect (i.e. deflate returns a gzip deflated version).
	

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
 - filter_name : (optional) - filter must be defined, this string is used as a prefix to any generated table of contents, json data.
 - isAdmin : (optional) - allows the configuration to do refresh and to set metadata.
 - useGit: (optional) does a pull from a git repo on 'repoSource' before every 'refresh' call
 - repoSource: (optional) path to git repo on system.
 - webhookPort : (optional) port to listen for webhook notifications on.
 - webhookPath : (optional) base path for webhook notifications.
 - webhookSecret: (optional) secret for webhook.
 - configurations : (optional) - different filters / handlers.
   * In the example at the bottom, the help page path is /novice/main  and /expert/main for displaying easy pages, or easy+expert pages,  admin allows refresh and setmetadata calls, which are otherwise not authorized.
 - topPage : (optional) - Top page to display when nothing is selected in the table of contents.  (a helperserver_toc section can be used to redefine the top level of the table of contents for documentation).   
 - editTOC : (optional) - remove or move branches from the table of contents.
   * remove - array of strings.
   * move - Move (or rename) a branch, useful for array of objects with properties "from" and "to".  
 - responseHeader" : (optional) - adds headers to all responses
 
Example custom responseHeader - Enable CORS access to page - useful if you want to be able to embed helpserver in a site that is on another domain. 
 
```json  
 "responseHeader" : {
     "Access-Control-Allow-Origin" : "*" ,
     "Access-Control-Allow-Headers" : "Origin, X-Requested-With, Content-Type, Accept"
  } ,
```     
 
Generating a table of contents from a folder structure.  In the following example, we want to create a 
table of contents file that from a directory structure and contained html files.

```js
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
```

Populate a locally running elastic search instance with plaintext from all the files (requires a generate)

```js
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
```

Once an index exists, perform a query (fulltext search with greater weight given to match of a topic title)

```js
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
```
## Example Help Settings

For out examples, we are placing the configuration for the help server in a json file we will call settings.json. 

The settings file properties are set

 - port : 80 - this is ignored by helpserver, as the top level script establishes the route. 
 - metadata : true - indicates that we support embedded metadata in the HTML - comments that follow the pattern   __&lt;!---HELPMETADATA: { ..JSON... } ---&gt;__
 - dependencies : true - generates a list of dependencies, a simple array of href and images on a page, and stores the result in a manifest file.
 - source : Our help files start in folder /myhelp/helpfiles/
 - generated: Our intermediate files are stored in /myhelp/generated/ - must be writeable (like generated table of contents, plaintext, and extracted metdatadata and dependency files).
 - ignoreItems: ["images","css"] Any folder with the name 'images' or 'css' gets ignored, as they are assumed to hold assets for the pages in the folder, not contain help.
 - search: { "provider": "elasticsearch" } - Currently the only option, if ommitted, you cannot use the full text search methods.
 - useGit: true - indicates that our help is stored in a git repository, and when a 'refresh' is done, a pull will done against the repository first
 - repoSource: "/myhelp/helpfiles" - the path for our git repository, may match, include, or be beneath the source folder.
 - webhookPort: 9001 - indicates that our help server is using git webhook, and a refresh will automatically occur any time a push is done to the repository.
 - webhookPath: "/" - the base path for the webhook url.
 - webhookSecret: "mywebhooksecretcode" - The secret that was entered when the webhook was added to github. 
 - configurations: filters for the help.
   * novice - This is the handler for a path called 'novice' this is a user assigned name, it will be the top level route '<host>/novice/main' will be the 'novice' help page
   * expert - This is the handler for a path called 'expert', also user assigned the url '<host>/expert/main' will be the 'novice' expert page
   * admin - This would not be a requirement normally if we are using webhooks, but this provides the interface for doing a manual 'refresh' - '<host>/admin/refresh display a page with a refresh button that allows help to be refreshed from the browser,  it is useful for local testing where setting up a webhook can be more of a pain.
    
```json
{
  "port": 80,
  "metadata" : true ,
  "dependencies" : true ,
  "source": "/myhelp/helpfiles/",
  "generated": "/myhelp/generated/",
  "ignoreItems": [ "images" , "css" ],
  "search": {
    "provider": "elasticsearch"
  } ,
  "useGit": true,
  "repoSource": "/myhelp/helpfiles" ,  
  "webhookPort" : 9001 ,
  "webhookPath" : "/" , 
  "webhookSecret" : "mywebhooksecretcode" ,
  "configurations" : {
    "novice" : {
        "filter_name" : "novice" ,
        "filter" : { "metadata.tags" : "easy" }
    } ,
    "expert" : {
        "filter_name" : "expert" ,
        "filter" : { "metadata.tags" : "easy,expert" }
    },
    "admin" : {
        "isAdmin" : true
    }
  }  
}
```
	
## Example help server


An express server with hooks for resolving pages, performing searchs, pulling the table of contents.  In the following example, 
the main page is <host>/main (i.e. "127.0.0.1/main" on your local machine).
    
source (/myhelp/helpfiles/) is the root of the static html files stored in a folder structure.
generated (/myhelp/generated/) is where helpserver puts any generated html content (like the table of contents).  
    

```js
var express = require('express');
var app = express();
var options = require("./settings");
var Help = require('helpserver');
var help = Help(options);

app.use("/",function (req, res) {
    help.expressuse(req, res);
});

app.listen(options.port);
console.log('Listening on port '+options.port);
```	
## Initialize the Elasticsearch index

A script to initialize Elastic Search index, this must be done before the the help server can be used, and depending on the size of your help system, this might take a while.

```js
var express = require('express');
var app = express();
var options = require("./settings");
var Help = require('helpserver');
var help = Help(options);

// First build the table of contents
help.status(function (stats) {
	if (options.search && !stats.indexServiceRunning) {
		console.log('Cannot initialize indexes without '+options.search.provider+' instance running.');
	} else {
		help.generate(function (err, result) {
			if (err)
				console.log("Error: " + err);
			else {
				console.log('Help generated');
				// Then build the index
				help.buildindex(function (err, result) {
					if (err)
						console.log(err);
					else
						console.log('Indexes built ' + JSON.stringify(result, null, " "));
				});
			}
		});
	}
});
```

## Release History

* 1.0.63 Added support for altToc and folder level default metadata (in the config) 
* 1.0.60 Added support for XSLT - source pages that are XML get remapped using the config.xslt file (stored in assets) 
* 1.0.59 Added structuring to the search for entries inside a page (avoids repitition on multiple hits in a page) 
* 1.0.58 Added logic to prune empty child lists. 
* 1.0.57 Pages with 'SubTOC' now get individual elastic search records for each 'section'.  
* 1.0.56 Cosmetic fixes  + pages with local TOC get local breadcrumbs 
* 1.0.55 Added local table of contents and added selection of search items. 
* 1.0.53 Added a server health endpoint called 'diag' (determine if updates are received and if busy processing updates).
* 1.0.52 Added filtering of index.html, which is assumed to represent the 'parent' (i.e. folder) node.
* 1.0.51 Added support for both gzip & deflate (microsoft edge doesn't appear to work with deflate even though it has the accept header) 
* 1.0.50 Changed helperserver_flatten to propogate the deepest 'singleton' title - this removes unused 'general' titles. 
* 1.0.49 Added support for new helperserver_flatten function, don't cache the metadata for the top level page (always re-read).
* 1.0.48 Added setting for top level 'overview' of table of contents. 
* 1.0.47 Cleanup of handling for copy entries to root (elimiate levels of tree) 
* 1.0.46 CSS style sheet changes to cause helperserver_toc to be hidden.
* 1.0.45 Added slight indent to TOC style + fixed breadcrumb display for subtoc 
* 1.0.44 Fixed embedded TOC in help pages to work with the single page DIV loading
* 1.0.43 Added pruning of empty branches after branches are moved + merge '/' folder at root into the root.
* 1.0.42 Fixed dupplicate name merge bug in virtual 'move' of toc entries.
* 1.0.41 Added support for breadcrumbs - and generated TOC pages for folders that don't have an associated page. 
* 1.0.40 Added replacePath option to allow basepath to be remapped (useful for crosssite access where path may come in with prefix other than filter)
* 1.0.39 Added ability to override the prefix on search (so that we don't redirect page on search on cross-domain) - also, added default filter spec when using a service. 
* 1.0.38 Added ability to override the host. 
* 1.0.37 Fixed CSS style for TOC so that it is isolated from the page content (ul/li in main page was getting messed up).
* 1.0.36 Fixed initial selection of TOC (was broken when TOC moved to a top level div) 
* 1.0.35 Added logic to 'diffuse' the id of the the last clicked TOC entry - this is required to prevent scrolling that the browser automatically does when the current page hash is altered.
* 1.0.34 Use gradient rather than indent to denote level in TOC (results is less space taken up by TOC). 
* 1.0.33 Implemented non-iframe version of find-in-page. 
* 1.0.32 Added new SVG icons that work against dark background.
* 1.0.31 Remove iframe from standard main.html example template - have technique to inject base path & fix content on the fly. 
* 1.0.30 Moved TOC and search out of iframe and in to the top page.  use the JSON data to generate the TOC on the fly.
* 1.0.29 For IE, disable 'deflate', as IE doesn't support at (need to add compress options that IE does support),  updated boyd and html tag styles to play nice with IE.  
* 1.0.28 Added postMessage/"message" event to allow embedding. 
* 1.0.27 Fixes to 'move nodes' logic when re-organizing table of contents after population. 
* 1.0.26 Added limit and offset parameters to search - default search to 50 (instead of elastic search default of 10). 
* 1.0.25 Added editTOC to postprocess TOC (remove or move paths)- but keeping pages. Added notes to edit.
* 1.0.24 Added page table of contents (so that a branch of the toc can have multiple entries for a page). added support for customization of response through reponseHeader property.  
* 1.0.23 Added post-process of titles to remove _###_ (where # is a digit)  so that titles don't always have to show up alphabetically.
* 1.0.22 Added post-process recursive sorting of the table of contents so that groups don't alter the sort order. Changed metadata functions + added patch. 
* 1.0.21 Changed 'saved file times' to use the path instead of the title - path is guarrenteed unique, and is used as the key.  Added tracking of 'deletions' to the udpateindex.js script. 
* 1.0.20 module path is now relative to the startup path (main) so that service will load resources from the correct location.
* 1.0.19 fixed problems in error handling, addressed double page load when navigating from inside the help iframe. 
* 1.0.18 through 1.0.16 - fixes for deployment 
* 1.0.15 improved documentation 
* 1.0.15 improved documentation 
* 1.0.14 added support for github webhook notification to drive the refresh.
* 1.0.13 added support for multiple, added nodegit to packages.
* 1.0.12 the latest elasticpublish.js script was missing 
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