(function (){
	var root = this;
	var TAPE_HEIGHT = 50;
	var DIV_HEIGHT = 50;
	var TAPE_WIDTH = 30;
	var TOTAL_HEIGHT = 	250; 
	var ANIMATION_SPEED = 10;
	var TMSIM = function(container, tsm, testLists){
		var mContainer = $(container);
		var mTSM = tsm;
		var mCurrentTape;
		var mTapeList = testLists.list_of_tapes;
		var mResultList = testLists.list_of_results;
		var mResult1List = testLists.list_of_results1;
		var self = this;
		var slider_speed = 5;

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
				 //self.move('r');
				console.log('step forward')
				self.step(function(arg){
					console.log('callback ' + arg)
				});
			});
			prevStepButton.on('click', function(){
				self.move('l');
			});
			playButton.on('click', function(){
				self.play();
			})
			resetButton.on('click', function(){
				toggleTape();
			})
			actionButtonDiv.append(prevStepButton, playButton, stopButton, stepButton, resetButton);
			mContainer.append(radioWrapper, tapeWrapper, machineDiv, actionButtonDiv);
		}
		this.step = function(callback){
			var stepObject = mTSM.step(mCurrentTape);
			mContainer.find('.machine_label').text(stepObject.transition.new_state);
			mContainer.find('.machine_label').append('<br/>'+stepObject.transition.move);

			mContainer.find('.current_segment').text(stepObject.transition.write);
			self.move(stepObject.transition.move, function(){
				console.log('callback');
				callback(stepObject.new_state);
			});

			
		}
		this.play = function(){
			var new_state = tsm.getCurrentState();
			console.log(new_state);
			nextStep(new_state.name);

			function nextStep(new_state_name){
				if(new_state_name!='*halt*'||new_state_name!='*error*'){
					updateSliderSpeed();
					setTimeout(function(){
						self.step(nextStep);
					}, ANIMATION_SPEED*slider_speed*5);
				}
				else 
					console.log('return done')
			}
					
		}
		function updateSliderSpeed(){
			console.log('update');
		}
		function toggleTape(buttonDiv){
			buttonDiv = buttonDiv||$('.test_radio_buttons .active');
			var name = buttonDiv.data('tape-name');
			mCurrentTape = mTapeList[name].cloneTape();
			mTSM.restart();
			listToTape( mCurrentTape, mContainer.find('.tape_div'));
			mContainer.find('.test_radio_buttons .active').toggleClass('active')
			buttonDiv.toggleClass('active');
		}
		function listToTape(tape, tapeDiv){
			var sizes = tape.getSizes();
			if(tape.getSizes()){
				console.log(tape.getSizes());
			}	
			var listToArray = tape.toArray(); 
			var currentIndex = listToArray.currentIndex;
			var array = listToArray.array;
			tapeDiv.html('');
			tapeDiv.css('left', 0)
			console.log(currentIndex);
			var end = 0;
			for (var i = -sizes.leftSize-15; i < 0; i++){
				var leftPos = (mContainer.width() - TAPE_WIDTH) / 2 + (i - currentIndex) * TAPE_WIDTH;
				tapeDiv.append($('<div>').addClass('tape_segment')
					.css({
						'left' : leftPos,
						'width' : TAPE_WIDTH - 2,
						'height' : TAPE_HEIGHT - 4
					})
					.text('-')
				);
			}
			for (var i = 0; i < array.length; i++){
				//absolute positioning of the segment, off center to keep the currentIndex in the center

				var leftPos = (mContainer.width() - TAPE_WIDTH) / 2 + (i - currentIndex) * TAPE_WIDTH;
				var tapeData = array[i];
				
				var tape_segment = $('<div>').addClass('tape_segment')
					.css({
						'left' : leftPos,
						'width' : TAPE_WIDTH - 2,
						'height' : TAPE_HEIGHT - 4
					})
					.text(tapeData);
				if(i == currentIndex)
					tape_segment.addClass('current_segment');
				if(i - 1 == currentIndex )
					tape_segment.addClass('right_segment');
				if(i + 1 == currentIndex )
					tape_segment.addClass('left_segment');
				
				tapeDiv.append(tape_segment);
				end = i
			}
			for (var i = end+1; i < sizes.rightSize+15; i++){
				var leftPos = (mContainer.width() - TAPE_WIDTH) / 2 + (i - currentIndex) * TAPE_WIDTH;
				tapeDiv.append($('<div>').addClass('tape_segment')
					.css({
						'left' : leftPos,
						'width' : TAPE_WIDTH - 2,
						'height' : TAPE_HEIGHT - 4
					})
					.text('-')
				);
			}
		}
		this.move = function(dir, callback){
			var tapeDiv = mContainer.find('.tape_div');
			var currentPos = tapeDiv.css('left');
			var moveDir = 0;
			if(dir === 'r')
				moveDir = TAPE_WIDTH;
			else if (dir === 'l')
				moveDir = -TAPE_WIDTH
			else
				moveDir = 0;
			var prev, prev_2;
			var penultimate = false, ultimate = false;
			tapeDiv.animate({
			    left: parseInt(currentPos)+moveDir,
			 	 }, ANIMATION_SPEED*slider_speed,  function(){
				 	callback();
			 	 	if(moveDir != '-'){
				 	 	$('.tape_segment').each(function(i, e){
				 	 		if($(this).hasClass('current_segment')){
				 	 			penultimate = true;
				 	 			if(dir === 'r'){
				 	 				$(this).removeClass('current_segment').addClass('right_segment');
				 	 				prev.addClass('current_segment').removeClass('left_segment');
				 	 				prev_2.addClass('left_segment');
				 	 			} else if (dir === 'l'){
				 	 				prev.removeClass('left_segment');
				 	 				$(this).removeClass('current_segment').addClass('left_segment');
				 	 			}
				 	 		} else if (penultimate){
				 	 			if(dir === 'r'){
				 	 				$(this).removeClass('right_segment');
				 	 				return false;
				 	 			} else if (dir === 'l'){
				 	 				$(this).addClass('current_segment').removeClass('right_segment');
				 	 				penultimate = false;
				 	 				ultimate  = true;
				 	 			}
				 	 		} else if (ultimate){
				 	 			$(this).addClass('right_segment');
				 	 			return false;
				 	 		}
				 	 		prev_2 = prev;
				 	 		prev = $(this);
				 	 	});
				 	 }
				 	 
			 	 });
			
		}

		self.initialise();
	};
	root.TMSIM = TMSIM;
})();