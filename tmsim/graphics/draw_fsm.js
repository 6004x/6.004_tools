// Define Force Directed Diagram using d3
// Example taken from: http://www.d3noob.org/2013/03/d3js-force-directed-graph-example-basic.html
var drawFSM = function(obj, container) {

	var width = 960;	//original: 960
	var height = 400;	//original: 500

	var force = d3.layout.force()
	    .nodes(obj.nodes)
	    .links(obj.links)
	    .size([width, height])
	    .linkDistance(150) //150
	    .charge(-300)
	    // .on("tick", tick)
	    .start();

	var svg = d3.select(container).append("svg")
	    .attr("width", width)
	    .attr("height", height);

	var path = svg.append("svg:g").selectAll("path")
	    .data(force.links())
	  .enter().append("svg:path")
	    .attr("class", "link")
	    .attr("marker-end", "url(#end)");

	var node = svg.selectAll(".node")
	    .data(force.nodes())
	  .enter().append("g")
	    .attr("class", "node");
	    //.call(force.drag);

	node.append("circle")
    	.attr("r", 25)
    	.on('click', function(d, i) {
  			console.log("node was clicked!");
  			//TODO: create click listener function
		});

   	node.append("text")
	    .attr("x", -2) //12
	    .attr("dy", ".35em")
	    .text(function(d) { return d.name; });


	var loading = svg.append("text")
	    .attr("x", width / 2)
	    .attr("y", height / 2)
	    .attr("dy", ".35em")
	    .style("text-anchor", "middle")
	    .text("Simulating. One moment please…");

	// Use a timeout to allow the rest of the page to load first.
	setTimeout(function() {
		// Run the layout a fixed number of times.
		// The ideal number of times scales with graph complexity.
		// Of course, don't run too long—you'll hang the page!
		// sourced from: http://bl.ocks.org/mbostock/1667139
		force.start();
		for (var i = 900 * 900; i > 0; --i) force.tick();
		force.stop();

		path
			.attr("d", function(d) {
				var x1 = d.source.x,
				  	y1 = d.source.y,
				  	x2 = d.target.x,
				  	y2 = d.target.y,
				  	dx = x2 - x1,
				  	dy = y2 - y1,
				  	dr = Math.sqrt(dx * dx + dy * dy),
					// Defaults for normal edge.
					drx = dr,
					dry = dr,
					xRotation = 0, // degrees
					largeArc = 0, // 1 or 0
					sweep = 1; // 1 or 0

				// Self edge.
				if ( x1 === x2 && y1 === y2 ) {
					// Fiddle with this angle to get loop oriented.
					xRotation = -45;

					// Needs to be 1.
					largeArc = 1;

					// Change sweep to change orientation of loop. 
					//sweep = 0;

					// Make drx and dry different to get an ellipse
					// instead of a circle.
					drx = 30;
					dry = 20;

					// For whatever reason the arc collapses to a point if the beginning
					// and ending points of the arc are the same, so kludge it.
					x2 = x2 + 1;
					y2 = y2 + 1;
				}
				return "M" + x1 + "," + y1 + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2;
	    	})
		    .on('click', function(d, i) {
  				console.log("path was clicked!");
  				//TODO: add click listener for transition
			});

		node
		    .attr("transform", function(d) { 
		        return "translate(" + d.x + "," + d.y + ")"; 
		    });

		loading.remove();

	}, 10);
	
	// add arrows to all of the links
	svg.append("svg:defs").selectAll("marker")
	    .data(["end"])
	  .enter().append("svg:marker")    
	    .attr("id", String)
	    .attr("viewBox", "0 -5 10 10")
	    .attr("refX", 38)
	    .attr("refY", -2.5)
	    .attr("markerWidth", 6)
	    .attr("markerHeight", 6)
	    .attr("orient", "auto")
	  .append("svg:path")
	    .attr("d", "M0,-5L10,0L0,5"); // originally: .attr("d", "M0,-5L10,0L0,5")
}