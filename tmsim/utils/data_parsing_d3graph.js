/*
	Function: Parses Turing Machine Build Object to be Compatible for D3 Force Directed Graph Visualization

	Takes in object of the following form:
		{
			action: [ { args: ["state_1", "-", "state_2", "1", "r"] } , ... ],
			checkoff: [...],
			result: [...],
			result1: [...],
			states: [ { args: ["state_1", "state_2", "state_3"] } ],
			symbols: [ { args: ["1"] } ],
			tape: [...]
		}

	And returns an object of the following form:
		{
			links: 
				[
					{
					source: {
								index: 0,
								name: "state_1",
								x: 400,
								y: 200,
								weight: 3
							},
					target: { 
								index: 1,
								name: "state_2",
								x: 300,
								y: 100,
								weight: 2
							},
					}, ... 
				],
			nodes:
				[
					{
						index: 0,
						name: "state_2",
						x: 400,
						y: 200,
						weight: 3	
					}, ...
				]

		}
*/
// TODO: clean up function to use _Underscore JS
var createForceDirectedObj = function(tmsim_dict) {

	// jsonObj = {nodes: [], links: []}
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
		if (tmsim_dict.states[0].args.hasOwnProperty(key)) { // avoid parsing functions in array
			var state = tmsim_dict.states[0].args[key];
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
	for (key in tmsim_dict.action) {
		if (tmsim_dict.action.hasOwnProperty(key)) {
			var action = tmsim_dict.action[key].args;
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
