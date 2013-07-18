
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

	var mTape=new LinkedList();

	this.setup=function(states, startState, tape, tapeIndex){
		console.log(states);
		mTape.init(tape, tapeIndex);
		list_of_states=states;
		if(startState)
			start_state=list_of_states[startState];
		else {
		//if no start state is defined, then we take the first state that was instantiated
			start_state=list_of_states[Object.keys(list_of_states)[0]];
			console.log(Object.keys(list_of_states)[0]);
		}
		return self;
	}
	this.replaceTape = function(tape){
		mTape = tape;
		console.log('attaching new tape');
	}
	this.editTape = function(tape, tapeIndex){
		mTape.init(tape, tapeIndex);
	}
	this.start=function(){
		// console.log('beginning turing machine');
		var new_state=start_state;
		var valid = true;
		while(valid){
			new_state=this.step(new_state);
			if(!new_state)
				valid=false;
			
		}
		// console.log('ended turing machine');
		return mTape;
	}
	this.step=function(new_state){
		var old_state=new_state;
		var tapeRead=mTape.peek();
		var state_transition=old_state.transition[tapeRead];
		
		new_state=list_of_states[state_transition.new_state];
		mTape.traverse(state_transition.write, state_transition.move);
		// console.log(new_state);
		if(state_transition.new_state === '*halt*'){
			valid=false;
			// mTape.printLL();
			// console.log('halting the sm');
			return false;
		} else if (state_transition.new_state === '*error*'){
			valid=false;
			mTape.printLL();
			console.log('encountered an error');
			return false;
		}

		return new_state;
	}
	this.compare = function(tape){
		//compares tape to mTape
		return mTape.equals(tape);
	}
	return this;
}



var Tape=function(){
	var tapeList=LinkedList().append('-');
}

