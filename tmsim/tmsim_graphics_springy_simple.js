var assembleSpringySimple = function(container, parsedDict) {

  var graph = new Springy.Graph();

  for (key in parsedDict.states[0].args) {
    if (typeof parsedDict.states[0].args[key] === 'string') { // the array contains some functions too
      graph.addNodes(parsedDict.states[0].args[key]);
    }
  }

  graph.addNodes('halt');

  for (key in parsedDict.action) {
      if (parsedDict.action.hasOwnProperty(key)) {
        var action = parsedDict.action[key].args;
        console.log(action);
        var start_state = action[0];
        var end_state;
        if (action[2] === "*halt*") {
          end_state = 'halt';
        }
        else {
          end_state = action[2];
        }   
        var label_transition = String(action[1]) + '/' + String(action[3]) + ',' + String(action[4]); // INPUT/WRITE,MOVE (e.g. '0/1,L')
        graph.addEdges([start_state, end_state, {color: '#00A0B0', label: label_transition}]);
      }
    }

  jQuery(function(){
    var springy = jQuery(container).springy({
      graph: graph
    });
  });
}