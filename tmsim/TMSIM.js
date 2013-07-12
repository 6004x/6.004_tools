var TMSIM = function(data){
	
}

function TSM(){
	var self=this;
	var curr_state;
	var list_of_states;

	//state has two characteristics:
	/** 
		state name:
		transition:
			current symbol:
				[(state name)', write, move]
	**/

	var tapeList=new LinkedList();

	this.setup=function(states, startState, tape){
		console.log(states);
		tapeList.init(tape);
		list_of_states=states;
		start_state=list_of_states[startState];
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
		// console.log(state_transition.next_state);
		if(state_transition.next_state === '*halt*'){
			valid=false;
			tapeList.printLL();
			console.log('halting the sm');
			return false;
		} else if (state_transition.next_state === '*error*'){
			valid=false;
			tapeList.printLL();
			console.log('encountered an error');
			return false;
		}

		new_state=list_of_states[state_transition.next_state];
		tapeList.traverse(state_transition.write, state_transition.move);
		return new_state;
	}
	return this;
}



var Tape=function(){
	var tapeList=LinkedList().append('-');

}


var busyBeaver5={
	'A':{
		name:'A',
		transition:{
			'-':{
				next_state:'B',
				write:'1',
				move:'r'
			},
			'1':{
				next_state:'C',
				write:'1',
				move:'l'
			},
		},
	},
	'B':{
		name:'B',
		transition:{
			'-':{
				next_state:'A',
				write:'-',
				move:'l'
			},
			'1':{
				next_state:'D',
				write:'-',
				move:'l'
			},
		}
	},
	'C':{
		name:'C',
		transition:{
			'-':{
				next_state:'A',
				write:'1',
				move:'l'
			},
			'1':{
				next_state:'*halt*',
				write:'1',
				move:'l'
			},
		}
	},
	'D':{
		name:'D',
		transition:{
			'-':{
				next_state:'B',
				write:'1',
				move:'l'
			},
			'1':{
				next_state:'E',
				write:'1',
				move:'r'
			},
		},
	},
	'E':{
		name:'E',
		transition:{
			'-':{
				next_state:'D',
				write:'-',
				move:'r'
			},
			'1':{
				next_state:'B',
				write:'-',
				move:'r'
			},
		},
	},	
};

var firstTSM={
	'b':{
		name:'b',
		transition:{
			'-':{
				next_state:'c',
				write:'0',
				move:'l',
			},
			'0':{
				next_state:'*halt*',
				write:'-',
				move:'l',
			}
		}
	},
	'c':{
		name:'c',
		transition:{
			'-':{
				next_state:'e',
				write:'-',
				move:'l',
			},
			'0':{
				next_state:'*halt*',
				write:'-',
				move:'l',
			}
		}
	},
	'e':{
		name:'e',
		transition:{
			'-':{
				next_state:'f',
				write:'1',
				move:'l',
			},
			'0':{
				next_state:'*halt*',
				write:'-',
				move:'l',
			}
		}
	},
	'f':{
		name:'f',
		transition:{
			'-':{
				next_state:'b',
				write:'-',
				move:'l',
			},
			'0':{
				next_state:'*halt*',
				write:'-',
				move:'l',
			}
		}
	},
}
//should be [0,-,1,-]
var testArr=[];
for(var i=0; i<24; i++){
	testArr.push('-');
}
testArr.push('0');
firsttsmTest=TSM().setup(firstTSM, 'b', testArr).start();

var busyBeaver3={
	'A':{
		name:'A',
		transition:{
			'-':{
				next_state:'B',
				write:'1',
				move:'r',
			},
			'1':{
				next_state:'C',
				move:'l',
				write:'1',
			}
		}
	},
	'B':{
		name:'B',
		transition:{
			'-':{
				next_state:'A',
				write:'1',
				move:'l',
			},
			'1':{
				next_state:'B',
				move:'r',
				write:'1',
			}
		}
	},
	'C':{
		name:'C',
		transition:{
			'-':{
				next_state:'B',
				write:'1',
				move:'l',
			},
			'1':{
				next_state:'*halt*',
				move:'-',
				write:'1',
			}
		}
	}
}
var tsmTest=TSM().setup(busyBeaver5, 'A').start();


