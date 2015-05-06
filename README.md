Helpserver
==========

A library used to automate generation of table of contents from directory structer, and optionally 
populate and query against an elasticsearch index to perform full text search of static help files.

## Installation

  npm install helpserver

## Usage

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
