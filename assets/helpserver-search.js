var searchPanel = { 
   doSearch: function () {
      var ele = document.getElementById("input");
      if( window.parent.helpServer )
         window.parent.helpServer.searchTerm = ele.value;
      if (ele.value != '') {
         var command = "/search?pattern=" + ele.value;
         var xmlhttp = new XMLHttpRequest();
         xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
               var resultList = JSON.parse(xmlhttp.responseText);
               var html = '';
               var i;
               for (i = 0; i < resultList.length; ++i) {
                  html += "<a href=\"/help/" + resultList[i].path + "\" target=\"help\">" + resultList[i].title + "</a><br>";
               }
               document.getElementById("results").innerHTML = html;
            }
         };
         xmlhttp.open("GET", command, true);
         xmlhttp.send();
      }
   }
};
