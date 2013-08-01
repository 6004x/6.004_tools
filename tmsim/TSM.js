
function TSM(){
	var self=this;
	var start_state;
	var current_state;
	var list_of_states;
	// each state has two characteristics:
	/** 
		name: 
		transition:
			current symbol:
				[new_state, write, move]
	**/


	this.setup=function(states, startState){
		// console.log(states);
		list_of_states=states;
		if(startState)
			start_state=list_of_states[startState];
		else {
		//if no start state is defined, then we take the first state that was instantiated
			start_state=list_of_states[Object.keys(list_of_states)[0]];
		}
		current_state = start_state;
		return self;
	}
	this.start=function(tape){
		// console.log('beginning turing machine');
		
		var new_state=start_state;
		var valid = true;
		var stepCount=0;
		while(valid){
			new_state=this.step(tape).new_state;
			if(new_state === '*halt*' || new_state.name === '*error*')
				valid=false;
			if(stepCount>5000000){
				throw 'too many steps in the turing machine'
			}
			stepCount++;
		}
		console.log('ended turing machine with '+stepCount+' steps');
		self.restart();
		return tape;
	}
	this.step=function(stepTape, new_state){
		current_state = new_state||current_state;
		var old_state = current_state;
		var tapeRead = stepTape.peek();	
		var state_transition = current_state.transition[tapeRead];
		
		current_state = list_of_states[state_transition.new_state];
		stepTape.traverse(state_transition.write, state_transition.move);
		// console.log(new_state);
		if(state_transition.new_state === '*halt*'){
			current_state = '*halt*';
			// stepTape.printLL();
			// console.log('halting the sm');
			
		} else if (state_transition.new_state === '*error*'){
			current_state = '*error*';
			stepTape.printLL();
			console.log('encountered an error');
			
		}

		return {
			old_state : old_state,
			new_state : current_state,
			transition : state_transition,
		};
	}
	this.restart = function(){
		current_state = start_state;
	}
	this.getCurrentState = function(){
		return current_state;
	}
	return this;
}

