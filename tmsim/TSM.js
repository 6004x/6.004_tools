
function TSM(){
	var self=this;
	var start_state;
	var list_of_states;

	//state has two characteristics:
	/** 
		name:
		transition:
			current symbol:
				[new_state, write, move]
	**/

	var tapeList=new LinkedList();

	this.setup=function(states, startState, tape){
		console.log(states);
		tapeList.init(tape);
		list_of_states=states;
		if(startState)
			start_state=list_of_states[startState];
		else {
			start_state=list_of_states[Object.keys(list_of_states)[0]];
			console.log(Object.keys(list_of_states)[0]);
		}
		return self;
	}
	this.start=function(){
		console.log('beginning turing machine');
		var new_state=start_state;
		var valid = true;
		while(valid){
			new_state=this.step(new_state);
			if(!new_state)
				valid=false;
			
		}
		console.log('ended turing machine');
	}
	this.step=function(new_state){
		var old_state=new_state;
		var tapeRead=tapeList.peek();
		var state_transition=old_state.transition[tapeRead];
		// console.log(state_transition.new_state);
		if(state_transition.new_state === '*halt*'){
			valid=false;
			tapeList.printLL();
			console.log('halting the sm');
			return false;
		} else if (state_transition.new_state === '*error*'){
			valid=false;
			tapeList.printLL();
			console.log('encountered an error');
			return false;
		}

		new_state=list_of_states[state_transition.new_state];
		tapeList.traverse(state_transition.write, state_transition.move);
		return new_state;
	}
	return this;
}



var Tape=function(){
	var tapeList=LinkedList().append('-');

}

