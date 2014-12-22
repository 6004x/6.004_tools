var assembleFSMGraphicsPanel = function(diagram_container, panel_container, parsedDict) {

	console.log(parsedDict);

	// Draw FSM diagram
	$(diagram_container).empty();
	var fsmObj = createForceDirectedObj(parsedDict);
	drawFSM(fsmObj, diagram_container);

	// Draw Graphics Editing Panel
	$(panel_container).empty();
	drawGraphicsPanel(parsedDict, panel_container);
	// TODO: draw the panel
	// Parse data for initial state of the panel
	// TODO: add /listeners/... click listeners for the clicks
}
