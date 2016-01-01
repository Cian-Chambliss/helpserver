// Set up standard page elements...
function initialize() {
    var toolbarContent = ["	<button id=\"toolbarTOCButton\" onclick=\"document.body.classList.toggle('showTOC',!document.body.classList.contains('showTOC'));\" style=\"position: absolute; left: 18px;\">",
        "		<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "			<defs>",
        "				<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "					<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "					<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "					<feComponentTransfer>",
        "						<feFuncA type=\"linear\" slope=\"1\"/>",
        "					</feComponentTransfer>",
        "					<feMerge> ",
        "						<feMergeNode/>",
        "						<feMergeNode in=\"SourceGraphic\"/>",
        "					</feMerge>",
        "				</filter>",
        "			</defs>",
        "			<path d=\"m 13.014649,15 a 1.0000999,1.0000999 0 1 0 0,2 l 17.970702,0 a 1.0000999,1.0000999 0 1 0 0,-2 l -17.970702,0 z m 0,6 a 1.0000999,1.0000999 0 1 0 0,2 l 17.970702,0 a 1.0000999,1.0000999 0 1 0 0,-2 l -17.970702,0 z m 0,6 a 1.0000999,1.0000999 0 1 0 0,2 l 17.970702,0 a 1.0000999,1.0000999 0 1 0 0,-2 l -17.970702,0 z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "		</svg>",
        "	</button>",
        "	<button onclick=\"document.body.classList.add('search'); document.getElementById('searchInput').focus()\"  style=\"position: absolute; right: 18px;\">",
        "		<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "			<defs>",
        "				<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "					<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "					<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "					<feComponentTransfer>",
        "						<feFuncA type=\"linear\" slope=\"1\"/>",
        "					</feComponentTransfer>",
        "					<feMerge>",
        "						<feMergeNode/>",
        "						<feMergeNode in=\"SourceGraphic\"/>",
        "					</feMerge>",
        "				</filter>",
        "			</defs>",
        "			<path d=\"m 20.741949,11.740364 c -4.406433,0 -8,3.593567 -8,8 0,4.406433 3.593567,8 8,8 1.561891,0 3.016201,-0.459127 4.25,-1.238281 l 4.482422,5.378906 a 1.0001,1.0001 0 1 0 1.535156,-1.28125 l -4.470703,-5.365234 c 1.361245,-1.43534 2.203125,-3.367695 2.203125,-5.494141 0,-4.406433 -3.593567,-8 -8,-8 z m 0,2 c 3.325553,0 6,2.674447 6,6 0,3.325553 -2.674447,6 -6,6 -3.325553,0 -6,-2.674447 -6,-6 0,-3.325553 2.674447,-6 6,-6 z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "		</svg>",
        "	</button>"
    ].join("\n");
    var toolbarEle = document.getElementById("toolbar");
    toolbarEle.innerHTML = toolbarContent;

    var toTopButtonContent = [
        "	<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "		<defs>",
        "			<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "				<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "				<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "				<feComponentTransfer>",
        "					<feFuncA type=\"linear\" slope=\"1\"/>",
        "				</feComponentTransfer>",
        "				<feMerge>",
        "					<feMergeNode/>",
        "					<feMergeNode in=\"SourceGraphic\"/>",
        "				</feMerge>",
        "			</filter>",
        "		</defs>",
        "		<path d=\"m 21.988281,18.201172 a 1.0001015,1.0001015 0 0 0 -0.697265,0.294922 l -5.5625,5.585937 a 1.0005858,1.0005858 0 1 0 1.417968,1.41211 L 22,20.621094 l 4.853516,4.873047 a 1.0005858,1.0005858 0 1 0 1.417968,-1.41211 l -5.5625,-5.585937 a 1.0001015,1.0001015 0 0 0 -0.720703,-0.294922 z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "	</svg>"
    ].join("\n");
    var toTopButtonEle = document.getElementById("toTopButton");
    toTopButtonEle.innerHTML = toTopButtonContent;

    var searchContent = ["	<div id=\"searchToolbar\">",
        "		<div id=\"searchField\"><input id=\"searchInput\" placeholder=\"Search...\" onkeyup=\"var keyCode = event.charCode || event.keyCode; if(keyCode == 13){ tableOfContents.search();} else if(keyCode == 27){ tableOfContents.searchClear();}\" /></div>",
        "		<button id=\"searchButton\" onclick=\"tableOfContents.search();\" >Search</button>",
        "		<button id=\"searchClose\" onclick=\"document.body.classList.remove('search');\">",
        "			<svg width=\"44\" height=\"44\" xmlns=\"http://www.w3.org/2000/svg\">",
        "				<defs>",
        "					<filter id=\"dropshadow\" height=\"130%\" width=\"130%\">",
        "						<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"1\"/>",
        "						<feOffset dx=\"0\" dy=\"0\" result=\"offsetblur\"/>",
        "						<feComponentTransfer>",
        "							<feFuncA type=\"linear\" slope=\"1\"/>",
        "						</feComponentTransfer>",
        "						<feMerge> ",
        "							<feMergeNode/>",
        "							<feMergeNode in=\"SourceGraphic\"/>",
        "						</feMerge>",
        "					</filter>",
        "				</defs>",
        "				<path d=\"m 13,12 a 1.0000999,1.0000999 0 0 0 -0.697266,1.716797 L 20.585938,22 12.302734,30.283203 a 1.0000999,1.0000999 0 1 0 1.414063,1.414063 L 22,23.414062 l 8.283203,8.283204 a 1.0000999,1.0000999 0 1 0 1.414063,-1.414063 L 23.414062,22 31.697266,13.716797 A 1.0000999,1.0000999 0 0 0 30.970703,12 a 1.0000999,1.0000999 0 0 0 -0.6875,0.302734 L 22,20.585938 13.716797,12.302734 A 1.0000999,1.0000999 0 0 0 13,12 Z\" fill=\"#fff\" filter=\"url(#dropshadow)\" />",
        "			</svg>",
        "		</button>",
        "	</div>",
        "	<div id=\"searchResults\">",
        "	</div>"
    ].join("\n");
    var searchEle = document.getElementById("search");
    searchEle.innerHTML = searchContent;

};
var helpServer = {
    navigateClosestTopic: function (topic) {
        var fromPath = window.location.pathname;
        var pagesAt = fromPath.indexOf("/pages");
        if (pagesAt >= 0) {
            fromPath = fromPath.substring(pagesAt + 6);
        }
        alert('Find closest text='+topic+"&from="+fromPath);
    }
}
var tableOfContents = {
    anchorPrefix: "",
    search: function () {
        var ele = document.getElementById("searchInput");
        this.searchText = ele.value;
        if (ele.value != '') {
            var command = "/search?limit=50&pattern=" + ele.value;
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    var resultList = JSON.parse(xmlhttp.responseText);
                    var html = '';
                    var i;
                    var prefix = tableOfContents.anchorPrefix;
                    if (!prefix) {
                        var pagesAt = window.location.pathname.indexOf("/pages");
                        if (pagesAt >= 0) {
                            prefix = window.location.pathname.substring(0, pagesAt + 6);
                        }
                    }
                    for (i = 0; i < resultList.length; ++i) {
                        html += "<div><a href=\"" + prefix + resultList[i].path + "\" id=\"search_" + resultList[i].path + "\" class=\"searchUnselected\" "
                        html += ">" + resultList[i].title + "</a></div>";
                    }
                    var headerEle = document.getElementById('header');
                    document.getElementById("searchResults").innerHTML = html;
                }
            };
            xmlhttp.open("GET", command, true);
            xmlhttp.send();
        }
    }
};