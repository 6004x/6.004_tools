var assembleD3 = function(container, parsedDict) {

	var width = 960;	//original: 960
	var height = 400;	//original: 500

	// FUNCTION: Create object of states (nodes) and transitions (links)
	var createObj = function(tmsim_dict) {
		var jsonObj = {};	
		jsonObj.nodes = [];
		jsonObj.links = [];
		// dictionary relating state to position in nodes array
		var state_to_pos = {};
		var x_val = 20;			// pre-set x start values
		var y_val = -20;		// pre-set y start values
		// get all the nodes
		var pos = 0;
		for (key in tmsim_dict.states[0].args) {
			if (parsedDict.states[0].args.hasOwnProperty(key)) { // avoid parsing functions in array
				console.log(key);
				var state = parsedDict.states[0].args[key];
				// create item {"name":STATE_NAME, "x": PRESET_VAL, "y": PRESET_VAL}
				item = {};
				item ["name"] = state;
				//item ["group"] = 1;
				if (key === 0) { item ["fixed"] = true; }
				// item ["x"] = x_val;
				// item ["y"] = y_val;
				x_val = x_val + 20;
				y_val = y_val*-1;
				// update state_to_pos object
				state_to_pos [state] = pos;
				pos++;
				// push item into jsonObj.nodes
				jsonObj.nodes.push(item);
			}
		}
		// TODO: conditional -- only add *halt* if user has defined a state with *halt*
		// TODO: add *error* state
		// TODO: conditional -- only add *error* if user has defined a state with *error*
		// add *halt* as a state
		jsonObj.nodes.push({"name":"*halt*", "group": pos});
		state_to_pos ["*halt*"] = pos;
		// get all the links
		for (key in parsedDict.action) {
			if (parsedDict.action.hasOwnProperty(key)) {
				var action = parsedDict.action[key].args;
				var start_state = action[0];
				var end_state = action[2];

				item = {};
				item ["source"] = state_to_pos[start_state];
				item ["target"] = state_to_pos[end_state];
				item ["value"] = 1;

				jsonObj.links.push(item);
			}
		}
	 	return jsonObj; // {"nodes":[{...},...], "links":[{...},...]}
	}

	var obj = createObj(parsedDict);
	console.log(obj);

	// Define Force Directed Diagram using d3
	// Example taken from: http://www.d3noob.org/2013/03/d3js-force-directed-graph-example-basic.html

	var force = d3.layout.force()
	    .nodes(obj.nodes)
	    .links(obj.links)
	    .size([width, height])
	    .linkDistance(300) //150
	    .charge(-300)
	    // .on("tick", tick)
	    .start();

	var svg = d3.select("#holder").append("svg")
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
    	.attr("r", 25);

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
		for (var i = 100 * 100; i > 0; --i) force.tick();
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
	    	});

		node
		    .attr("transform", function(d) { 
		        return "translate(" + d.x + "," + d.y + ")"; 
		    });

		loading.remove();

	}, 10);

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
