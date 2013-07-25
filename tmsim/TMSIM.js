(function (){
	var root = this;
	var TAPE_HEIGHT = 50;
	var DIV_HEIGHT = 50;
	var TAPE_WIDTH = 30;
	var TOTAL_HEIGHT = 	250; 
	
	var TMSIM = function(container, tsm, testLists){
		var mContainer = $(container);
		var mTSM = tsm;
		var mCurrentTape;
		var mTapeList = testLists.list_of_tapes;
		var mResultList = testLists.list_of_results;
		var mResult1List = testLists.list_of_results1;
		
		var self = this;

		//TODO:change magic numbers
		this.initialise=function(){
			console.log('initalise TMSIM');
			mContainer.height(TOTAL_HEIGHT);
			var firstTape;
			//make the radio buttons for the different tests
			var testRadioButtons = $('<ul>').addClass('test_radio_buttons nav nav-pills');
			var first = true;
			for (var tapeName in mTapeList){
				var tape = mTapeList[tapeName].cloneTape();
				var radioButton = $('<li>').addClass('test_radio')
					.append('<a>'+tapeName+'</a>')
					.attr('id', tapeName.replace(/(\s|\/|\\)/g, '_'))
					.data('tape-name', tapeName);
				if (first){
					radioButton.addClass('active')
					first = false;
					firstTape = mCurrentTape = tape;
				}
				radioButton.on('click', function(e){
					toggleTape($(e.currentTarget));
				});
				testRadioButtons.append(radioButton);
			}
			var radioWrapper=$('<div>').append(testRadioButtons);
			radioWrapper.addClass('pull-center');

			//add the visual tape
			var tapeWrapper = $('<div>').addClass('tape_wrapper');
			tapeWrapper.css({
				height : DIV_HEIGHT,
				overflow : 'hidden',
				'background-color' : 'lightblue',
			})

			var tapeDiv = $('<div>').addClass('tape_div');
			tapeDiv.css({
				position : 'relative',
				top : 0,
				left : 0,
				height : DIV_HEIGHT,
				overflow : 'hidden',
			});
			tapeWrapper.append(tapeDiv);
			

			//make the state machine indicator, could be more elegant...
			var machineDiv = $('<div>').addClass('pull-center machine_div').css({
					'position':'relative',
					top:0,
					height:DIV_HEIGHT,
			});
			machineDiv.append($('<div>').addClass('arrow-up pull-center'));
				
			var labelDiv = $('<div>').addClass('machine_label pull-center')
				.css({
					height:DIV_HEIGHT,
					width:2*TAPE_WIDTH,
					border:'solid 1px black',
					background:'lightblue', 
			});//.append($('<div>').addClass(''));
			labelDiv.text(tsm.getCurrentState().name);
			machineDiv.append(labelDiv);
			listToTape(firstTape, tapeDiv);

			//appending buttons that will make the tsm progress, step
			var actionButtonDiv = $('<div>').addClass('btn-group pull-center');
			actionButtonDiv.css({
				'position' : 'relative',
				top : DIV_HEIGHT/2,
			})
			var playButton = $('<button>').addClass('btn btn-primary tape_button')
				.attr('title', 'Run')
				.append('<i class=icon-play>');
			var stopButton = $('<button>').addClass('btn btn-danger tape_button')
				.attr('title', 'Stop')
				.append('<i class=icon-stop>');
			var stepButton = $('<button>').addClass('btn btn-info tape_button')
				.attr('title', 'Step Forward')
				.append('<i class=icon-step-forward>');
			var prevStepButton = $('<button>').addClass('btn btn-info tape_button')
				.attr('title', 'Step Backward')
				.append('<i class=icon-step-backward>');
			var resetButton = $('<button>').addClass('btn btn-warning tape_button')
				.attr('title', 'Reset')
				.append('<i class=icon-fast-backward>');

			$('.tape_button').each(function(i, button){
                this.attr({
                    'data-toggle':"tooltip",
                    'data-trigger':'hover',
                    'data-container':'body',
                });
            });

			stepButton.on('click', function(){
				// self.move(tapeDiv, 'r');
				self.step();
			});
			prevStepButton.on('click', function(){
				self.move('l');
			});
			actionButtonDiv.append(prevStepButton, playButton, stopButton, stepButton, resetButton);
			mContainer.append(radioWrapper, tapeWrapper, machineDiv, actionButtonDiv);
		}
		this.step = function(){
			var stepObject = mTSM.step(null, mCurrentTape);
			// console.log(stepObject);
			// console.log(mCurrentTape.toString());
			mContainer.find('.machine_label').text(stepObject.transition.new_state);
			mContainer.find('.current_segment').text(stepObject.transition.write);
			self.move(stepObject.transition.move);
		}
		function toggleTape(buttonDiv){
			var name = buttonDiv.data('tape-name');
			mCurrentTape = mTapeList[name].cloneTape();
			mTSM.restart();
			listToTape( mCurrentTape, mContainer.find('.tape_div'));
			mContainer.find('.test_radio_buttons .active').toggleClass('active')
			buttonDiv.toggleClass('active');
		}
		function listToTape(tape, tapeDiv){
			var listToArray = tape.toArray(); 
			var currentIndex = listToArray.currentIndex;
			var array = listToArray.array;
			tapeDiv.html('');
			tapeDiv.css('left', 0)
			console.log(currentIndex);
			for (var i = 0; i < array.length; i++){
				//absolute positioning of the segment, off center to keep the currentIndex in the center

				var leftPos = (mContainer.width() - TAPE_WIDTH) / 2 + (i - currentIndex) * TAPE_WIDTH;
				var tapeData = array[i];
				
				var tape_segment = $('<div>').addClass('tape_segment')
					.css({
						'margin' : 0,
						'display' : 'inline-block',
						'position' : 'absolute',
						'left' : leftPos,
						'width' : TAPE_WIDTH - 2,
						'height' : TAPE_HEIGHT - 4
					})
					.text(tapeData);
				if(i == currentIndex)
					tape_segment.addClass('current_segment')
				tapeDiv.append(tape_segment);

			}

		}
		this.move = function(dir){
			var tapeDiv = mContainer.find('.tape_div');
			var currentPos = tapeDiv.css('left');
			var moveDir = 0;
			if(dir === 'r')
				moveDir = TAPE_WIDTH;
			else if (dir === 'l')
				moveDir = -TAPE_WIDTH
			else
				moveDir = 0;
			tapeDiv.animate({
			    left: parseInt(currentPos)+moveDir,
			 	 }, 50,  function(){
			 	 	
			 	 });
		}

		self.initialise();
	};
	root.TMSIM = TMSIM;
})();