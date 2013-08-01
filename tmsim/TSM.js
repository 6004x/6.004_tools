
function TSM(){
	var self = this;
	var start_state;
	var current_state;
	var list_of_states;
	var list_of_symbols;
	this.longestSymbolLength = 0;
	// each state has two characteristics:
	/** 
		name: 
		transition:
			current symbol:
				[new_state, write, move]
	**/


	this.setup=function(states, symbols, startState){
		// console.log(states);
		list_of_states = states;
		list_of_symbols = symbols;
		if(startState)
			start_state = list_of_states[startState];
		else {
		//if no start state is defined, then we take the first state that was instantiated
			start_state = list_of_states[Object.keys(list_of_states)[0]];
		}
		if(list_of_symbols){
			for (var i = 0; i < list_of_symbols.length; i++){
				var symbol = list_of_symbols[i]
				if(symbol.length > self.longestSymbolLength)
					self.longestSymbolLength = symbol.length;
			}
			console.log(self.longestSymbolLength)
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
			var stepObject = this.step(tape);
			new_state = stepObject.new_state;
			state_transition = stepObject.transition;
			tape.traverse(state_transition.write, state_transition.move);
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
		
		//set the current state as the new state of the transition
		current_state = list_of_states[state_transition.new_state];
		// console.log(new_state);
		if(state_transition.new_state === '*halt*'){
			current_state = '*halt*';
			
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

