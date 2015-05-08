var tableOfContents = {
	tocEle: null,
	lastSelection: null,
	setSelectedPage: function (navToId) {
		var navTo = document.getElementById(navToId);
		if (!navTo) {
			navToId = decodeURI(navToId);
			navTo = document.getElementById(navToId);
		}
		if (navTo && this.lastSelection != navTo) {
			if (this.lastSelection != null)
				this.lastSelection.className = "";
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
			this.lastSelection = navTo;
			navTo.scrollIntoView();
		}
	},
	tocLoaded: function () {
		this.tocEle = document.getElementById("TOC");
		this.tocEle.addEventListener("click", function (e) {
			if (e.target) {
				if (e.target.id == "TOC") {
					return false;
				} else if (e.target.nodeName == "DIV") {
					if (e.target.id) {
						window.parent.helpServer.checkNavigation(e.target.id, 'toc');
					}
					if (this.lastSelection != null)
						this.lastSelection.className = "";
					this.lastSelection = e.target;
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
			this.setSelectedPage(window.location.hash.substr(1));
		}
	}
};