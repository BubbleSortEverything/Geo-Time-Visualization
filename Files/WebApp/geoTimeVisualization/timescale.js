// Via http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
// Necessary for highlighting time intervals properly
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var timescale = (function() {
  var data = { oid: 0, col: "#000000", nam: "Geologic Time", children: [] },
      interval_hash = { 0: data },
      currentInterval,
      dragStart, transformStart;

  return {

    "init": function(div) {
      var w = 960,
          h = 130,
          x = d3.scale.linear().range([0, w - 5]),
          y = d3.scale.linear().range([0, h]),
          newX = 0.01;

      var drag = d3.behavior.drag()
        .origin(function() { 
          var t = d3.select(".timescale g");
          return {x: -newX, y: 0};
        })
        .on("dragstart", function() {
          dragStart = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
          transformStart = d3.transform(d3.select(".timescale").select("g").attr("transform")).translate;

          d3.event.sourceEvent.stopPropagation();
        })
        .on("drag", function() {
          var currentDrag = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
          newX = (dragStart[0] - currentDrag[0]);

          d3.select(".timescale").select("g")
            .attr("transform", function() {
              return "translate(" + [ parseInt(transformStart[0] + -newX), 0 ] + ")scale(" + parseInt(d3.select(".timescale").style("width"))/961 + ")";
            });
        });

     

      // Add class timescale to whatever div was supplied
      d3.select("#" + div).attr("class", "timescale");

      // Create the SVG for the chart
      var time = d3.select("#" + div).append("svg:svg")
          .attr("width", w)
          .attr("height", h)
          .append("g");

      var scale = time.append("g")
        .attr("id", "tickBar")
        .attr("transform", "translate(0,125)");

      // Load the time scale data 
      d3.json("intervals.json", function(error, result) {
        console.log(result)
        for(var i=0; i < result.records.length; i++) {
          var r = result.records[i];
          r.children = [];
          r.pid = r.pid || 0;
          r.abr = r.abr || r.nam.charAt(0);
          r.mid = parseInt((r.eag + r.lag) / 2),
          r.total = r.eag - r.lag;
          interval_hash[r.oid] = r;
          interval_hash[r.pid].children.push(r);
        }

          // Create a new d3 partition layout
        var partition = d3.layout.partition()
            .sort(function(d) { d3.ascending(d); })
            .value(function(d) { return d.total; });

        var rectGroup = time.append("g")
          .attr("id", "rectGroup");
        // Create the rectangles
        rectGroup.selectAll("rect")
            .data(partition.nodes(data))
          .enter().append("svg:rect")
            .attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y); })
            .attr("width", function(d) { return x(d.dx); })
            .attr("height", function(d) { return y(d.dy); })
            .attr("fill", function(d) { return d.col || "#000000"; })
            .attr("id", function(d) { return "t" + d.oid; })
            .style("opacity", 0.83)
            .call(drag)
            .on("click", function(d) {
              timescale.goTo(d);
            });

        // Scale bar for the bottom of the graph
        var scaleBar = scale.selectAll("rect")
            .data(partition.nodes(data));

        var hash = scaleBar.enter().append("g")
          .attr("class", function(d) {return "tickGroup s" + d.lvl})
          .attr("transform", function(d) { return "translate(" + x(d.x) + ", 0)"});

        hash.append("line")
          .attr("x1", 0)
          .attr("y1", 7.5)
          .attr("x2", 0)
          .attr("y2", 12)
          .style("stroke-width", "0.05em");

        hash.append("text")
          .attr("x", 0)
          .attr("y", 20)
          .style("text-anchor", function(d) { return (d.eag == 0.0117) ? "end" : "middle"; })
          .style("font-size", "0.65em")
          .style("fill", "#777")
          .text(function(d) {return d.eag});

        // Create a tick for year 0
        var now = scale.append("g")
          .data([{x:1, y:0}])
          .attr("class", "tickGroup s1 s2 s3 s4 s5")
          .attr("transform","translate(955, 0)");

        now.append("line")
          .attr("x1", 0)
          .attr("y1", 7.5)
          .attr("x2", 0)
          .attr("y2", 12)
          .style("stroke-width", "0.05em");

        now.append("text")
          .attr("x", 0)
          .attr("y", 20)
          .attr("id", "now")
          .style("text-anchor", "end")
          .style("font-size", "0.65em")
          .style("fill", "#777")
          .text("0");

        var textGroup = time.append("g")
          .attr("id", "textGroup");

        // Add the full labels
        textGroup.selectAll("fullName")
            .data(partition.nodes(data))
          .enter().append("svg:text")
            .text(function(d) { return d.nam; })
            .attr("x", 1)
            .attr("y", function(d) { return y(d.y) + 15;})
            .attr("width", function() { return this.getComputedTextLength(); })
            .attr("height", function(d) { return y(d.dy); })
            .attr("class", function(d) { return "fullName level" + d.lvl; })
            .attr("id", function(d) { return "l" + d.oid; })
            .attr("x", function(d) { return timescale.labelX(d); })
            .call(drag)
            .on("click", function(d) {
              timescale.goTo(d);
            });

        // Add the abbreviations
        textGroup.selectAll("abbrevs")
            .data(partition.nodes(data))
          .enter().append("svg:text")
            .attr("x", 1)
            .attr("y", function(d) { return y(d.y) + 15; })
            .attr("width", 30)
            .attr("height", function(d) { return y(d.dy); })
            .text(function(d) { return d.abr || d.nam.charAt(0); })
            .attr("class", function(d) { return "abbr level" + d.lvl; })
            .attr("id", function(d) { return "a" + d.oid; })
            .attr("x", function(d) { return timescale.labelAbbrX(d); })
            .on("click", function(d) {
              timescale.goTo(d);
            });

        // Position the labels for the first time
        timescale.goTo(interval_hash[0]);

        // Remove the Geologic time abbreviation
        d3.select(".abbr.levelundefined").remove();

        // Open to Phanerozoic 
        timescale.goTo(interval_hash[751]);

      }); // End PaleoDB json callback

      //attach window resize listener to the window
      d3.select(window).on("resize", timescale.resize);

      // Size time scale to window
      timescale.resize();

    },

    "labelLevels": function(d) {
      // Center whichever interval was clicked
      d3.select("#l" + d.oid).attr("x", 430);

      // Position all the parent labels in the middle of the scale
      if (typeof d.parent !== 'undefined') {
        var depth = d.depth,
            loc = "d.parent";
        for (var i=0; i<depth;i++) {
          var parent = eval(loc).nam;
          d3.selectAll('.abbr').filter(function(d) {
            return d.nam === parent;
          }).attr("x", 430);
          d3.selectAll('.fullName').filter(function(d) {
            return d.nam === parent;
          }).attr("x", 430);
          loc += ".parent";
        }
        d3.selectAll('.abbr').filter(function(d) {
          return d.nam === parent;
        }).attr("x", 430);
        d3.selectAll('.fullName').filter(function(d) {
          return d.nam === parent;
        }).attr("x", 430);
      }
    },

    "labelAbbrX": function(d) {
      var rectWidth = parseFloat(d3.select("#t" + d.oid).attr("width")),
          rectX = parseFloat(d3.select("#t" + d.oid).attr("x"));

      var labelWidth;
      // Doesn't work in every browser. Try to get the text length, if it fails use a default value
      try {
        labelWidth = d3.select("#a" + d.oid).node().getComputedTextLength();
      } catch(err) {
        labelWidth = 11;
      }

      if (rectWidth - 8 < labelWidth) {
         d3.select("#a" + d.oid).style("display", "none");
      }
      return rectX + (rectWidth - labelWidth) / 2;
    },

    "labelX": function(d) {
      var rectWidth = parseFloat(d3.select("#t" + d.oid).attr("width")),
          rectX = parseFloat(d3.select("#t" + d.oid).attr("x"));

      var labelWidth;
      try {
        labelWidth = d3.select("#l" + d.oid).node().getComputedTextLength();
      } catch(err) {
        labelWidth = 25;
      }

      if (rectWidth - 8 < labelWidth) {
         d3.select("#l" + d.oid).style("display", "none");
      } else {
        d3.select("#a" + d.oid).style("display", "none");
      }

      return rectX + (rectWidth - labelWidth) / 2;
    },

    "labelY": function(d) {
      var rectHeight = parseFloat(d3.select("#t" + d.oid).attr("height")), 
          rectY = parseFloat(d3.select("#t" + d.oid).attr("y")),
          labelHeight = d3.select("#l" + d.oid).node().getBBox().height,
          scale = parseInt(d3.select(".timescale").style("width"))/961;

      return (rectY * 0.8) + ((rectHeight - labelHeight) / 2) + 8;
    },

    "labelAbbrY": function(d) {
      var rectHeight = parseFloat(d3.select("#t" + d.oid).attr("height")), 
          rectY = parseFloat(d3.select("#t" + d.oid).attr("y")),
          labelHeight = d3.select("#l" + d.oid).node().getBBox().height,
          scale = parseInt(d3.select(".timescale").style("width"))/961;

      return (rectY * 0.8) + (rectHeight - labelHeight) / 2;
    },

    // Zooms the graph to a given time interval
    // Accepts a data point or a named interval
    "goTo": function(d) {
      // alert(d.nam);
      // var queryUrl = "virtuoso.nkn.uidaho.edu:8890/sparql/?default-graph-uri=&query=prefix+tssc%3A+%3Chttp%3A%2F%2Fdeeptimekb.org%2Ftssc%23%3E%0D%0Aprefix+tsnc%3A+%3Chttp%3A%2F%2Fdeeptimekb.org%2Ftsnc%23%3E%0D%0Aprefix+dc%3A+%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%3E%0D%0Aprefix+dcterms%3A+%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Fterms%2F%3E%0D%0Aprefix+foaf%3A+%3Chttp%3A%2F%2Fxmlns.com%2Ffoaf%2F0.1%2F%3E%0D%0Aprefix+geo%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0Aprefix+gts%3A+%3Chttp%3A%2F%2Fresource.geosciml.org%2Fontology%2Ftimescale%2Fgts%23%3E%0D%0Aprefix+isc%3A+%3Chttp%3A%2F%2Fresource.geosciml.org%2Fclassifier%2Fics%2Fischart%2F%3E%0D%0Aprefix+owl%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23%3E%0D%0Aprefix+rank%3A+%3Chttp%3A%2F%2Fresource.geosciml.org%2Fontology%2Ftimescale%2Frank%2F%3E%0D%0Aprefix+rdf%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0D%0Aprefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0Aprefix+samfl%3A+%3Chttp%3A%2F%2Fdef.seegrid.csiro.au%2Fontology%2Fom%2Fsam-lite%23%3E%0D%0Aprefix+sf%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fsf%23%3E%0D%0Aprefix+skos%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0D%0Aprefix+sosa%3A+%3Chttp%3A%2F%2Fwww.w3.org%2Fns%2Fsosa%2F%3E%0D%0Aprefix+thors%3A+%3Chttp%3A%2F%2Fresource.geosciml.org%2Fontology%2Ftimescale%2Fthors%23%3E%0D%0Aprefix+time%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2006%2Ftime%23%3E%0D%0Aprefix+ts%3A+%3Chttp%3A%2F%2Fresource.geosciml.org%2Fvocabulary%2Ftimescale%2F%3E%0D%0Aprefix+vann%3A+%3Chttp%3A%2F%2Fpurl.org%2Fvocab%2Fvann%2F%3E%0D%0Aprefix+void%3A+%3Chttp%3A%2F%2Frdfs.org%2Fns%2Fvoid%23%3E%0D%0Aprefix+xkos%3A+%3Chttp%3A%2F%2Frdf-vocabulary.ddialliance.org%2Fxkos%23%3E%0D%0Aprefix+xsd%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0D%0A%0D%0ASELECT+++%3Fs%0D%0A%0D%0AWHERE%0D%0A%7B%0D%0A++GRAPH+%3Chttp%3A%2F%2Fdeeptimekb.org%2Ftsnewzealand%3E%0D%0A+++%7B%0D%0A++++%3Fs+rdf%3Atype+gts%3AEpoch%3B%0D%0A+++++++time%3AhasBeginning+%3Fbeg+%3B%0D%0A+++++++time%3AhasEnd+%3Fend+.%0D%0A++++%3Fbeg+time%3AinTemporalPosition+%3FbegTime+.%0D%0A++++%3Fend+time%3AinTemporalPosition+%3FendTime+.%0D%0A++++%3FbegTime+time%3AnumericPosition+%3FbegTimeValue+.%0D%0A++++%3FendTime+time%3AnumericPosition+%3FendTimeValue+.%0D%0A+++++++filter%28%3FbegTimeValue+%3E+1.0+%26%26+%3FendTimeValue+%3C+36.7%29.%0D%0A++++%7D%0D%0A%7D&format=text%2Fhtml&timeout=0&debug=on&run=+Run+Query+"
      function httpGetAsync(theUrl) {
        var xmlHttp = new XMLHttpRequest();
        // alert(xmlHttp); //  alert xmlHttp
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                //query worked
                //###########################################################################################
                // alert(xmlHttp.responseText);
                document.getElementById('dbinfo').innerHTML = xmlHttp.responseText;
                var queryResults = xmlHttp.responseText
                // alert(queryResults);
                //  sending information to html file
                if (window.DOMParser)
                {
                    parser = new DOMParser();
                    xmlDoc = parser.parseFromString(queryResults, "text/xml");
                }
                else // Internet Explorer
                {
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = false;
                    xmlDoc.loadXML(queryResults);
                }
                //xmlHttp.abort();

                queryValue = xmlDoc.getElementsByTagName("uri")[0].childNodes[0].nodeValue;
                // alert(queryValue);
                //############################################################################################

                   
                
            }
        }
        xmlHttp.open("GET", theUrl, true);
        xmlHttp.send(null);
    }
    //sparql query
     var query = [

    "prefix skos: <http://www.w3.org/2004/02/skos/core#>",
    "prefix gts: <http://resource.geosciml.org/ontology/timescale/gts#>",
    "select ?s ?Dbpedia",
    "where { graph<http://dbpedia.org> {", 
    "?s rdfs:label \"" + d.nam + "\"@en.",
    "?s dbo:abstract ?Dbpedia.",
    "filter (lang(?Dbpedia)=\"en\") }}"

    // "prefix gts: <http://resource.geosciml.org/ontology/timescale/gts#>",
    // "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
    // "prefix skos: <http://www.w3.org/2004/02/skos/core#>",
    // "prefix isc: <http://resource.geosciml.org/classifier/ics/ischart/>",
    // "SELECT ?age WHERE { GRAPH <http://deeptimekb.org/tsnewzealand> {",
    // "?age rdf:type gts:Age; skos:broaderTransitive ?broaderTransitive .",
    // "filter(?broaderTransitive = isc:Jurassic). } }"

   ].join(" ");

   //add in &format=application%2Fsparql-results%2Bjson

  //url for the query
  //var url = "http://virtuoso.nkn.uidaho.edu:8890/sparql";
  var url = "http://dbpedia.org/sparql"
  var queryUrl = url + "?query=" + encodeURIComponent(query);
  //query call default-graph-uri=&
  //var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=SELECT+%3Fs+%3Fp+%3Fo+WHERE+%7B%0D%0A++++++%3Fs+%3Fp+%3Fo+.+%7D%0D%0A++++++LIMIT+20&format=text%2Fhtml&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=30000&debug=on&run=+Run+Query+";
  //var queryUrl = "http://virtuoso.nkn.uidaho.edu:8890/sparql/?default-graph-uri=&query=SELECT+%3Fs+%3Fp+%3Fo%0D%0A%0D%0AWHERE%0D%0A%0D%0A%7B%0D%0A%0D%0AGRAPH+%3Chttp%3A%2F%2Fdeeptimekb.org%2Ftsnewzealand%3E%0D%0A%0D%0A%7B%0D%0A%0D%0A%3Fs+%3Fp+%3Fo+.%0D%0A%0D%0A%7D%0D%0A%0D%0A%7D%0D%0A%0D%0ALIMIT+20&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on&run=+Run+Query+";
  httpGetAsync(queryUrl);


  var queryUrlKGraph = "http://virtuoso.nkn.uidaho.edu:8890/sparql/?default-graph-uri=&query=prefix+time%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2006%2Ftime%23%3E++%0D%0A%0D%0Aprefix+gts%3A+%3Chttp%3A%2F%2Fresource.geosciml.org%2Fontology%2Ftimescale%2Fgts%23%3E++%0D%0A%0D%0Aprefix+rdf%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E+%0D%0Aprefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0A%0D%0ASELECT+%3Fs+%3FbegTimeValue++%3FendTimeValue+WHERE++%0D%0A%0D%0A%7B++%0D%0A%0D%0AGRAPH+%3Chttp%3A%2F%2Fdeeptimekb.org%2Ftsnewzealand%3E++%0D%0A%0D%0A%7B++%0D%0A%0D%0A%3Fepoch+rdf%3Atype+gts%3AGeochronologicEra%3B+%0D%0A+%0D%0Ardfs%3Alabel+%3Fs+%3B%0D%0A%0D%0Atime%3AhasBeginning+%3Fbeg+%3B++%0D%0A%0D%0Atime%3AhasEnd+%3Fend+.++%0D%0A%0D%0A%3Fbeg+time%3AinTemporalPosition+%3FbegTime+.++%0D%0A%0D%0A%3Fend+time%3AinTemporalPosition+%3FendTime+.++%0D%0A%0D%0A%3FbegTime+time%3AnumericPosition+%3FbegTimeValue+.++%0D%0A%0D%0A%3FendTime+time%3AnumericPosition+%3FendTimeValue+.++%0D%0A++%0D%0Afilter+%28STRSTARTS%28%3Fs%2C+%22" + d.nam + "%22%29%29%0D%0A%0D%0A%7D++%0D%0A%0D%0A%7D+&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on&run=+Run+Query+";
  
  $.ajax({ 
    dataType: "jsonp",
    url: queryUrlKGraph,
    success: function(data) {   
      
      
      
      // get the table element in this the web page
     
     var table = $("#results");
     $("#results").empty()
      
      // get the sparql variables from the 'head' of the data.
      var headerVars = data.head.vars; 
 
      // using the vars, make some table headers and add them to the table;
      var trHeaders = getTableHeaders(headerVars);
      table.append(trHeaders);  
      
      // grab the actual results from the data.                                          
     var bindings = data.results.bindings;
                                               
      // for each result, make a table row and add it to the table. 
    
    for(rowIdx in bindings){
       table.append(getTableRow(headerVars, bindings[rowIdx]));
    
  }
  drawMap(data);

  }});

  function getTableHeaders(headerVars) {                                
    var trHeaders = $("<tr></tr>");     
    for(var i in headerVars) {    
      trHeaders.append( $("<th>" + headerVars[i] + "</th>") ); 
    }
    return trHeaders;
  }                              
  
  function getTableRow(headerVars, rowData) {
    var tr = $("<tr></tr>");                                 
    
    for(var i in headerVars) {             
      tr.append(getTableCell(headerVars[i], rowData));
    } 
    
    return tr;     
  }  
  
  function getTableCell(fieldName, rowData){
    var td = $("<td></td>");
 
    var fieldData = rowData[fieldName];
   if (fieldData == null) { 	 
   td.html(" "); 
    
 }			//
  else	{					//
       td.html( fieldData["value"] );  
 }
    return td;      
  }






     

      if (typeof d == "string") {
        var d = d3.selectAll('rect').filter(function(e) {
          return e.nam === d;
        });
        d = d[0][0].__data__;
      } else if (d.children) {
        if (d.children.length < 1) {
          var d = d.parent;
        }
      } else {
        var d = d;
      }

      // Stores the currently focused time interval for state restoration purposes
      timescale.currentInterval = d;

      // Adjust the bottom scale
      var depth = (d.depth != 'undefined') ? parseInt(d.depth) + 1 : 1;
      d3.selectAll(".scale").style("display", "none");
      d3.selectAll(".tickGroup").style("display", "none");
      d3.selectAll(".s" + depth).style("display", "block");

      // Reset panning  
      d3.select(".timescale g")
        .attr("transform", function() {
          return "scale(" + parseInt(d3.select(".timescale").style("width"))/961 + ")";
        });

      // var n keeps track of the transition
      var n = 0,
          x = d3.scale.linear().range([5, 955]);

      x.domain([d.x, d.x + d.dx]);

      // "Hide" the labels during the transition
      // Cannot calculate the correct position if display:none is used
      d3.selectAll(".fullName")
        .style("fill", "rgba(0,0,0,0)")
        .style("display", "block");

      d3.selectAll(".abbr")
        .style("fill", "rgba(0,0,0,0)")
        .style("display", "block");

      d3.selectAll(".tickGroup").transition()
        .duration(750)
        .attr("transform", function(d) {
          d3.select(this).selectAll("text").style("text-anchor", "middle");
          if (x(d.x) == 5) {
            d3.select(this).select("text")
              .style("text-anchor", "start");
          } else if (x(d.x) == 955) {
            d3.select(this).select("text")
              .style("text-anchor", "end");
          }
          return "translate(" + x(d.x) + ", 0)"; 
        });

      // When complete, calls labelTrans() 
      d3.selectAll("rect").transition()
        .duration(750)
        .each(function(){ ++n; })
        .attr("x", function(d) { return x(d.x); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .each("end", function() { if (!--n) { timescale.labelTrans(d); }});

    },

    "labelTrans": function(d) {
      // var n keeps track of the transition
      var n = 0,
          x = d3.scale.linear().range([0, 955]),
          y = d3.scale.linear().range([0, 120]);

      x.domain([d.x, d.x + d.dx]);

      // Move the full names
      d3.selectAll(".fullName").transition()
        .duration(10)
        .each(function(){ ++n; })
        .attr("x", function(d) { return timescale.labelX(d); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
        .each("end", function() { if (!--n) { timescale.labelLevels(d); }});

      // Move the abbreviations
      d3.selectAll(".abbr").transition()
        .duration(300)
        .each(function(){ ++n; })
        .attr("x", function(d) { return timescale.labelAbbrX(d); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
        .each("end", function() { 
          if (!--n) {
            timescale.labelLevels(d);
            d3.select("#l0").style("fill", "#fff");
          } else {
            d3.selectAll(".fullName").style("fill", "#333");
            d3.selectAll(".abbr").style("fill", "#333");
          }
        });
      timescale.resize();
    },

    // Highlight a given time interval
    "highlight": function(d) {
      d3.selectAll("rect").style("stroke", "#fff");
      if (d.cxi) {
        var id = d.cxi;
        d3.selectAll("rect#t" + d.cxi).style("stroke", "#000").moveToFront();
        d3.selectAll("#l" + d.cxi).moveToFront();
      } else if (typeof d == "string") {
        var id = d3.selectAll('rect').filter(function(e) {
          return e.nam === d;
        }).attr("id");
        id = id.replace("t", "");
      } else {
        var id = d3.select(d).attr("id");
        id = id.replace("p", "");
      }

      d3.selectAll("rect#t" + id).style("stroke", "#000").moveToFront();
      d3.selectAll("#l" + id).moveToFront();
      d3.selectAll(".abbr").moveToFront();
    },

    // Unhighlight a time interval by resetting the stroke of all rectangles
    "unhighlight": function() {
      d3.selectAll("rect").style("stroke", "#fff");
    },

    "resize": function() {
      d3.select(".timescale g")
        .attr("transform", function() {
          return "scale(" + parseInt(d3.select(".timescale").style("width"))/961 + ")";
        });

      d3.select(".timescale svg")
        .style("width", function() {
          return d3.select(".timescale").style("width");
         })
        .style("height", function() {
          return parseInt(d3.select(".timescale").style("width")) * 0.25 + "px";
        });

    },

    /* Interval hash can be exposed publically so that the time scale data can be used 
       for other things, such as maps */
    //"interval_hash": interval_hash,

    // Method for getting the currently zoomed-to interval - useful for preserving states
    "currentInterval": currentInterval
  }
})();