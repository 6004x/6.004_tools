var assembleGraphicsEditor = function(container, parsedDict) {    

    console.log("parsedDict of the FSM: ");
    console.log(parsedDict);

	/* PURE RAPHAEL ATTEMPTS */
    var r = Raphael("holder", "100%", 200);

    var states = {}; // object relating statename : state shape
    var states_center = {}; // object relating statenaem : state center coord [x,y]
    var x = 100;
    var y = 150;
    var y_mult = -1;
    for (key in parsedDict.states[0].args) {
    	if (typeof parsedDict.states[0].args[key] === 'string') { // the array contains some functions too
	    	var state = parsedDict.states[0].args[key];
	    	var state_shape = r.ellipse(x, y, 60, 40);
	    	state_shape.attr({fill: "#00C2C6", stroke: "#00C2C6", "fill-opacity": .1, "stroke-width": 2}); //, cursor: "move"
	    	r.text(x,y, state);
	    	states[state] = state_shape;
	    	states_center[state] = [x,y];
	    	x = x + 200;
	    	y = y + y_mult*100;
	    	y_mult = y_mult*-1;
	    }
    }

    var connections = []; // array of all transitions

    for (key in parsedDict.action) {
    	if (parsedDict.action.hasOwnProperty(key)) {
	    	var action = parsedDict.action[key].args;
	    	var start_state = action[0];
	    	var end_state = action[2];
	    	// start and end coordinates for transition line
	    	var start_x = states_center[start_state][0];
	    	var start_y = states_center[start_state][1];
	    	var end_x;
	    	var end_y;

	    	if (end_state === "*halt*") {
	    		console.log("found a *halt*");
	    		end_x = states_center[start_state][0];
	    		end_y = states_center[start_state][1];
	    	}
	    	else {
	    		end_x = states_center[end_state][0];
	    		end_y = states_center[end_state][1];
	    	}	    	
	    	var curve_x = String((start_x+end_x)/2 + 50);	//TODO: fix
	    	var curve_y = String((start_y+end_y)/2 + 50); 	//TODO: fix

	    	var new_transition = r.path("M"+String(start_x) + " " + String(start_y) + "Q " + curve_x + " " + curve_y + " " + String(end_x) + " " + String(end_y));
	    	//var new_transition = r.path("M"+start_x + " " + start_y + "L" + end_x + " " + end_y);
	    	//var new_transition = r.connection(states[start_state], states[end_state], "#000");
	    	connections.push(new_transition);
    	}
    }

    // TODO: add click listeners for the lines
    // trigger event on click: http://stackoverflow.com/questions/11951469/fire-event-in-raphael-js

    console.log("completed Raphael functions");

}
