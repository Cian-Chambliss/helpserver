var tocEle = null;
var lastSelection = null;

function setSelectedPage(navToId) {
	var navTo = document.getElementById(navToId);
	if (!navTo) {
		navToId = decodeURI(navToId);
		navTo = document.getElementById(navToId);
	}
	if (navTo && lastSelection != navTo) {
		if (lastSelection != null)
			lastSelection.className = "";
		navTo.className = "selected";
		var dad = navTo.parentNode;
		while (dad) {
			if (dad.style && dad.style.display == "none") {
				dad.style.display = "";
				dad = dad.parentNode;
				dad.className = "opened";
			}
			dad = dad.parentNode;
		}
		lastSelection = navTo;
		navTo.scrollIntoView();
	}
}

function tocLoaded() {
	tocEle = document.getElementById("TOC");
	tocEle.addEventListener("click", function (e) {
		if (e.target) {
			if (e.target.id == "TOC") {
				return false;
			} else if (e.target.nodeName == "DIV") {
				if (e.target.id) {
					window.parent.checkNavigation(e.target.id, 'toc');
				}
				if (lastSelection != null)
					lastSelection.className = "";
				lastSelection = e.target;
				e.target.className = "selected";
			} else if (e.target.nodeName == "LI" && e.target.getAttribute("branch") == "true") {
				var eleB = e.target.lastElementChild;
				if (eleB.style.display == "none") {
					eleB.style.display = "";
					e.target.className = "opened";
				} else {
					eleB.style.display = "none";
					e.target.className = "closed";
				}
			}
		}
	});
	if (window.location.hash) {
		setSelectedPage(window.location.hash.substr(1));
	}
}