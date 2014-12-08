var assembleFSMGraphicsPanel = function(container, parsedDict) {

	// Draw FSM diagram
	$(container).empty();
	var fsmObj = createForceDirectedObj(parsedDict);
	drawFSM(fsmObj, container);

	// Draw Graphics Editing Panel
	// TODO: draw the panel
	// Parse data for initial state of the panel
	// TODO: add /listeners/... click listeners for the clicks
}
