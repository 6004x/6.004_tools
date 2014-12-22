var drawGraphicsPanel = function(fsmDict, container) {
	$(container).append('<div id="panel_well" class="well" style="height:220px"></div>');
	reportMissingTransitions(findMissingTransitions(fsmDict));
}

/* Function that returns missing transitions
	Runs brute-force algorithm to identify if [state,symbol] pair has transition defined
	Returns object of the following form:
	{
		[state1, symbol1] : false, 
		[state2, symbol1] : true,
		...
	}
*/
var findMissingTransitions = function(fsmDict) {
	fsmDict.symbols[0].args.push("-"); // blank state

	/* 
	transitionDict = 
		{
		 	[state1, symbol1] : false,
		 	[state1, symbol2] : false,
		 	...
		} 
	*/
	var transitionDict = {};
	for (var i=0; i<fsmDict.states[0].args.length; i++) {
		for (var j=0; j<fsmDict.symbols[0].args.length; j++) {
			var state = fsmDict.states[0].args[i];
			var symbol = fsmDict.symbols[0].args[j];
			transitionDict[[state, symbol]] = false;
		}
	}

	// converts transitionDict to have true pairs based on actions
	for (var i=0; i<fsmDict.action.length; i++) {
		console.log(fsmDict.action[i].args);
		var pair = [fsmDict.action[i].args[0], fsmDict.action[i].args[1]];
		transitionDict[pair] = true;
	}

	return transitionDict;
}

/* Function that adds helpful notes about missing transitions to panel */
var reportMissingTransitions = function(transitionDict) {
	_.each(transitionDict, function(value, key) {
		console.log(value, key);
		if (value === false) {
			$("#panel_well").append(key + " is not defined");
			console.log(key + " is not defined");
		}
	});
}
