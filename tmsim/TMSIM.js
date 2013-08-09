(function (){
	var root = this;

	var TAPE_HEIGHT = 50;
	var DIV_HEIGHT = 50;
	var TAPE_WIDTH = 30;
	var TOTAL_HEIGHT = 	300; 
	var ANIMATION_SPEED = 10;
	var old_speed = 300;
	var TMSIM = function( filename, container, tsm, testLists){
		var mContainer = $(container);
		var mTSM = tsm;
		var mFileName = filename;
		//max of either the default tape width or the max length of the longest symbol
		var mTAPE_WIDTH = (mTSM.longestSymbolLength * 10 > TAPE_WIDTH) ? mTSM.longestSymbolLength * 10 : TAPE_WIDTH;
		var mCurrentTape;
		var mTapeList = testLists.list_of_tapes;
		var mResultList = testLists.list_of_results;
		var mResult1List = testLists.list_of_results1;
		var self = this;
		var slider_speed = old_speed;
		var pauseSimulation = false;
		var simulation_done = false;
		var steps = 0;
		var preventAnimate = false;
		//TODO:change magic numbers
		this.initialise=function(){
			console.log('initalise TMSIM');
			// console.log(mTSM);
			mContainer.height(TOTAL_HEIGHT);
			var firstTape;
			//make the radio buttons for the different tests
			var testRadioButtons = $('<ul>').addClass('test_radio_buttons nav nav-pills');
			var first = true;
			//attach each test button to the nav-pills div
			var i = 0;
			for (var tapeName in mTapeList){
				var tape = mTapeList[tapeName].cloneTape();
				tape.endSize = mTapeList[tapeName].endSize;
				var radioButton = $('<li>').addClass('test_radio')
					.append('<a>'+tapeName+'</a>')
					.attr('id', 'tape'+i)
					.data('sanitized_name', tapeName.replace(/(\s|\/|\\)/g, '_'))
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
				i++;
			}
			//make the test buttons centered//
			var headingDiv = $('<div>').append(testRadioButtons);
			headingDiv.addClass('pull-center');

			var stepsDiv = $('<div>').addClass('pull-right').append('Steps: ').append('<span class="stepsSpan"></span>');
			
			//add the visual tape wrapper
			var tapeWrapper = $('<div>').addClass('tape_wrapper');
			tapeWrapper.css({
				height : DIV_HEIGHT,
				overflow : 'hidden',
				'background-color' : 'lightblue',
			})
			//the div will hold all the segments and move along with the segments
			var tapeDiv = $('<div>').addClass('tape_div');
			tapeDiv.css({
				position : 'relative',
				height : DIV_HEIGHT,
			});
			tapeWrapper.append(tapeDiv);
			//populate the tape
			listToTape(firstTape);

			//make the state machine indicator, could be more elegant...
			var machineDiv = $('<div>').addClass('pull-center machine_div').css({
					'position':'relative',
					top:-10,
					height:DIV_HEIGHT,
			});
			machineDiv.append($('<div>').addClass('arrow-up pull-center'));
			//label will have spot for current state and direction
			var labelDiv = $('<div>').addClass('machine_label pull-center')
				.css({
					height:DIV_HEIGHT,
					width:2*mTAPE_WIDTH,
					border:'solid 1px black',
					background:'lightblue', 
				})
				.html('<span class = "curr_state"></span><br/><span class = "move_dir"></>');
			machineDiv.append(labelDiv);
			//transition div, shows the previous and current transition
			var transitionsDiv = $('<div>').addClass('transitions pull-left');
			var transitionDiv = $('<div>').addClass('transition_div').html(
				'( <span class = "curr_state"></span>, \
				<span class = "read_symbol"></span> ) &rarr;\
				( <span class = "new_state"></span>,  \
				<span class = "write_symbol"></span>,  \
				<span class = "move_dir"></span> )'
			);
			var oldTransitionDiv = $('<div>').addClass('old_transition_div muted').html(
				'( <span class = "old_curr_state"></span>, \
				<span class = "old_read_symbol"></span> ) &rarr;\
				( <span class = "old_new_state"></span>,  \
				<span class = "old_write_symbol"></span>,  \
				<span class = "old_move_dir"></span> )'
			);
			transitionsDiv.append(transitionDiv, oldTransitionDiv);
			machineDiv.append(transitionsDiv);

			//appending control buttons
			var actionDiv = $('<div>').addClass('pull-center btn-toolbar action_button_div');
			var actionButtonDiv = $('<div>').addClass('btn-group');
			actionDiv.css({
				'position' : 'relative',
				top : 0,
			})
			var playButton = $('<button>').addClass('btn btn-success play_button tape_button')
				.attr('title', 'Run')
				.append('<i class = "icon-play">');
			var pauseButton = $('<button>').addClass('btn btn-danger pause_button tape_button')
				.attr('title', 'Pause')
				.append('<i class = "icon-pause">');
			var stepButton = $('<button>').addClass('btn btn-info step_button tape_button')
				.attr('title', 'Step Forward')
				.append('<i class = "icon-step-forward">');
			var prevStepButton = $('<button>').addClass('btn btn-info prev_step_button tape_button')
				.attr('title', 'Step Backward')
				.append('<i class = "icon-step-backward>"');
			var resetButton = $('<button>').addClass('btn btn-warning reset_button tape_button')
				.attr('title', 'Reset')
				.append('<i class = "icon-fast-backward">');
			
			$('.tape_button').each(function(i, button){
                $(button).attr({
                    'data-toggle':"tooltip",
                    'data-trigger':'hover',
                    'data-container':'body',
                });
            });
            var lastClick = (new Date()).getTime();
            var tempSpeed = slider_speed;
			stepButton.on('click', function(){
				console.log('step forward')
				if(!$(this).hasClass('disabled')){
					// mContainer.find('.tape_div').stop(true, true);
					// mContainer.find('.transition_div').stop(true, true);
					var d = new Date();
			        var t = d.getTime();
			        if(t - lastClick < 1000) {
			             console.log(t-lastClick);
			            mContainer.find('.tape_div').finish();
						mContainer.find('.transition_div').finish();
						preventAnimate = true;
			        } else {
			        	preventAnimate = false;
			        }
			        lastClick = t;
					
					listToTape();
					self.stepAction(function(arg){
						listToTape();
					});
				}
			});
			prevStepButton.on('click', function(){
				if(!$(this).hasClass('disabled'))
					self.animateTape('l');
			});
			playButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					playButton.addClass('disabled');
					stepButton.addClass('disabled');
					prevStepButton.addClass('disabled');
					self.play(function(){
						console.log('play callback')
					});
				}
			})
			resetButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					self.pause();
					playButton.removeClass('disabled');
					stepButton.removeClass('disabled');
					pauseButton.removeClass('disabled');
					prevStepButton.removeClass('disabled');
					toggleTape();
				}
			});
			pauseButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					self.pause();
					playButton.removeClass('disabled');
					stepButton.removeClass('disabled');
					prevStepButton.removeClass('disabled');
				}
			});

			var allTestsButton = $('<button>').addClass('btn btn-info all_tests_button tape_button')
				.attr('title', 'All Tests')
				.append('<i class = "icon-fast-forward"></i> All Tests');

			allTestsButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					self.allTests();
				}
			})

			var nextButton = $('<button>').addClass('btn btn-warning next_button tape_button')
				.attr('title', 'Next Tape')
				.append('<i class = "icon-arrow-right">')
				.css('visibility', 'hidden')
			;

			nextButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					var nextTape = mContainer.find('.test_radio_buttons .active').attr('id')
					console.log(nextTape);
					var nextNum = parseInt(nextTape.slice(4)) +1;
					if(mContainer.find('.test_radio_buttons #tape'+nextNum).length > 0)
						toggleTape(mContainer.find('.test_radio_buttons #tape'+nextNum));
					else
						console.log('no next tape');
				}
			})

			//speed radio button indicators
			var speedDiv = $('<div>').addClass('speed_div pull-right span5').css({
				'margin': '8px',
			});
			var label1 = $('<label>').addClass('speed_options radio inline radio-inline').append('Slow');
			var label2 = $('<label>').addClass('speed_options radio inline radio-inline').append('Medium');
			var label3 = $('<label>').addClass('speed_options radio inline radio-inline').append('Fast');
			var label4 = $('<label>').addClass('speed_options radio inline radio-inline').append('I want it done now');
			var radio1 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio1',
				value : '300',
				name : 'speed_options',
			}).addClass('speed_options');
			var radio2 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio2',
				value : '100',
				name : 'speed_options',
			}).addClass('speed_options');
			var radio3 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio3',
				value : '0',
				name : 'speed_options',
			}).addClass('speed_options');
			var radio4 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio4',
				value : '-100000',
				name : 'speed_options',
			}).addClass('speed_options');
			switch(old_speed){
				case 300 : radio1.attr('checked', ''); break;
				case 100 : radio2.attr('checked', ''); break;
				case 0 : radio3.attr('checked', ''); break;
				case -100000 : radio4.attr('checked', ''); break;
				default : radio1.attr('checked', '');
			}
			label1.append(radio1);
			label2.append(radio2);
			label3.append(radio3);
			label4.append(radio4);
			speedDiv.append(label1);
			speedDiv.append(label2);
			speedDiv.append(label3);
			speedDiv.append(label4);
			//update the speed when a radio button is clicked
			speedDiv.on('click', function (e) {
				console.log('radio click');
				var speed = $('.speed_options:checked').attr('value');
				slider_speed = parseInt(speed);
				if(slider_speed <= 0)
					preventAnimate = true;
				else
					preventAnimate = false;
				old_speed = slider_speed;
			});

			actionButtonDiv.append(resetButton, /*prevStepButton,*/ playButton, pauseButton, stepButton);
			actionDiv.append(allTestsButton, actionButtonDiv, nextButton);

			var feedbackDiv = $('<div>').addClass('feedback_div').css({
				'position' : 'absolute',
				'left' : 5,
				'top' : (TOTAL_HEIGHT - TAPE_HEIGHT) / 2 ,
				'margin' : '5px',
			})
			var legendDiv = $('<div>').addClass('legend_div').css({
				'position' : 'absolute',
				'right' : 5,
				'top' : (TOTAL_HEIGHT - TAPE_HEIGHT) / 2 ,
				'margin' : '5px',
			})
			var greenDiv = $('<div>').append('<span class = "curr_state">GREEN</span> marks the current state');
			var redDiv = $('<div>').append('<span class = "read_symbol">RED</span> marks the current read symbol');
			var blueDiv = $('<div>').append('<span class = "write_symbol">BLUE</span> marks the previous written symbol');
			legendDiv.append(greenDiv, redDiv, blueDiv)

			mContainer.append(stepsDiv, speedDiv, headingDiv, feedbackDiv, legendDiv, tapeWrapper, machineDiv, speedDiv, actionDiv);
			toggleTape();
		}
		var oldLineClassDelete;
		this.stepAction = function(callback){
			var callback = callback || _.identity;
			mContainer.find('.transition_div .read_symbol').text(mCurrentTape.peek());
			try{
				var stepObject = mTSM.step(mCurrentTape);
				var state_transition = stepObject.transition;
				mCurrentTape.traverse(state_transition.write, state_transition.move);
				steps++;
			
				mContainer.find('.transition_div .curr_state').text(stepObject.old_state.name);
				//oops
				mContainer.find('.transition_div .new_state').text(stepObject.transition.new_state);
				mContainer.find('.transition_div .write_symbol').text(stepObject.transition.write);
				mContainer.find('.transition_div .move_dir').text(stepObject.transition.move);

				mContainer.find('.machine_label .move_dir').text(stepObject.transition.move);
				mContainer.find('.tape_div .current_segment').text(stepObject.transition.write);

				mContainer.find('.tape_div .prev_segment').removeClass('prev_segment');
				mContainer.find('.tape_div .read_symbol').removeClass('read_symbol');
				mContainer.find('.tape_div .current_segment').addClass('prev_segment');
				// if(!preventAnimate)
				if(oldLineClassDelete)
					oldLineClassDelete.clear();
				oldLineClassDelete = editor.addLineClass(mFileName, state_transition.lineNumber-1, 'highlight-line');
				function updateTransitionDiv(){
					mContainer.find('.transition_div').css({
						'top' : 0,
						'font-size' : 'large',
						'opacity' : 1,
					});
					mContainer.find('.machine_label .curr_state').text(stepObject.transition.new_state);
					mContainer.find('.old_transition_div .old_curr_state').text(stepObject.old_state.name)
					mContainer.find('.old_transition_div .old_read_symbol').text(mContainer.find('.transition_div .read_symbol').text())
					mContainer.find('.old_transition_div .old_new_state').text(stepObject.transition.new_state)
					mContainer.find('.old_transition_div .old_write_symbol').text(stepObject.transition.write)
					mContainer.find('.old_transition_div .old_move_dir').text(stepObject.transition.move)
					mContainer.find('.transition_div .curr_state').text(stepObject.transition.new_state);
					mContainer.find('.transition_div .read_symbol').text(mCurrentTape.peek());
					try{
						if(!(mTSM.getCurrentState() === '*halt*' || mTSM.getCurrentState() === '*error*')){
							var nextStepObject = mTSM.stepPeek(mCurrentTape);
							var nextState_transition = nextStepObject.transition;
							
						
							mContainer.find('.transition_div .new_state').text(nextState_transition.new_state);
							mContainer.find('.transition_div .write_symbol').text(nextState_transition.write_symbol);
							mContainer.find('.transition_div .move_dir').text(nextState_transition.move);
						} else {
							mContainer.find('.transition_div .new_state').text('');
							mContainer.find('.transition_div .write_symbol').text('');
							mContainer.find('.transition_div .move_dir').text('');
						}
					} catch (e) {
						console.log(e.stack);
						mContainer.find('.transition_div .new_state').text('');
						mContainer.find('.transition_div .write_symbol').text('');
						mContainer.find('.transition_div .move_dir').text('');
					}
					
					
					$('.stepsSpan').text(steps)

					if(stepObject.transition.new_state === '*halt*'){
						console.log('halt');
					}
					listToTape();
					callback(stepObject.new_state);	
				}
				//timeout needed for pause button to interrupt, i don't know why though.
				setTimeout(function(){
					self.animateTape(stepObject.transition.move, function(){
						//prepare for an animation.
						mContainer.find('.transition_div').css({
							'position' : 'relative',
							'height' : mContainer.find('.transition_div').height()
						});
						if(!preventAnimate) {
							mContainer.find('.transition_div').animate({
									'top' : 18,
									'font-size' : 12,
									'opacity' : 0,
								}, slider_speed/2, function(){
									updateTransitionDiv();
								});
						} else {
							updateTransitionDiv();
						}
					});
				}, slider_speed*2);
			} catch (e) {
				console.log(e.stack);

				$('.feedback_div').html('state '+ mTSM.getCurrentState().name + ' has no action for symbol ' + mCurrentTape.peek());
			}
		}
		this.allTests = function(){
			var count = 0;
			var results = [];
			nextTest();
			function nextTest(){
				var tapeButton = $('#tape'+count);
				if(count < Object.keys(mTapeList).length){
					toggleTape(tapeButton);
					self.play(function(passed){
						count++;
						results.push(passed);
						if(passed){
							setTimeout(function(){

								nextTest();
							}, 0)
						}
						else {
							console.log('not passed')
							doneTests(results);
						}
					});
				} else {
					doneTests(results);
				}

			}
			
		}
		function doneTests(results){
			console.log(results);
		}
		//callback executed when test is halted
		this.play = function(callback){

			pauseSimulation = false;
			var new_state = tsm.getCurrentState();
			nextStep(new_state.name);
			function nextStep(new_state_name){
				if(pauseSimulation){
					console.log('pauseSimulationed');
				}
				else if(new_state_name != '*halt*' && new_state_name != '*error*'){
					if(slider_speed >= 0){
						self.stepAction(nextStep);
					} else {
						var i = -slider_speed;
						while( i > 0){
							try{
								var stepObject = mTSM.step(mCurrentTape);
								var state_transition = stepObject.transition;
								mCurrentTape.traverse(state_transition.write, state_transition.move);
								steps++;
							
								if(stepObject.transition.new_state == '*halt*' || stepObject.transition.new_state == '*error*'){
									console.log('return '+ stepObject.transition.new_state)
									halt(callback);
									listToTape();
									simulation_done = true;
									break;
								}
								i--;
							} catch (e) {
								console.log(e.stack);
								$('.feedback_div').html(e.stack);
							}
						}
						if(!simulation_done) {	
								self.stepAction(nextStep);
						}
					}
				}
				else {
					console.log('return '+new_state_name);
					halt(callback);
					listToTape();
					simulation_done = true;
				}
					
			}	
		}

		this.pause = function(){
			console.log('pause');
			pauseSimulation = true;
		}
		function halt(callback){
			mContainer.find('.play_button').addClass('disabled');
			mContainer.find('.step_button').addClass('disabled');
			mContainer.find('.pause_button').addClass('disabled');
			$('.stepsSpan').text(steps)
			listToTape();
			
			var name = mCurrentTape.name;
			var result = mResultList[name] ? mResultList[name] : mResult1List[name];
			
			if(result){
				console.log(result)
				var feedback  = '';
				var color = '';
				var passedTest = false;
				if(result instanceof TapeList){
					passedTest = result.equals(mCurrentTape);
				}
				else{
					passedTest = result === mCurrentTape.peek();
				}
				console.log(passedTest)
				console.log(result.toString());
				console.log(mCurrentTape.toString());
				feedback = passedTest ? 'pass' : 'fail';
				color = passedTest ? 'green' : 'red';
				mContainer.find('.result_div').text(feedback).css('color', color);
				var testNumber = parseInt(mContainer.find('.test_radio_buttons .active').attr('id').slice(4));
				//check if there is another test after this one, if so, then show the next button
				//shows only if it passes
				if(passedTest && mContainer.find('.test_radio_buttons #tape' + (testNumber+ 1)).length > 0)
					mContainer.find('.next_button').css('visibility', 'visible');
				callback(passedTest);
			}
			

		}
		
		function toggleTape(tapeButton){
			tapeButton = tapeButton||$('.test_radio_buttons .active');
			var name = tapeButton.data('tape-name');
			mCurrentTape = mTapeList[name].cloneTape();
			mTSM.restart();
			pauseSimulation = true	;
			simulation_done = false;
			steps = 0;
			console.log('toggle tape ' + mCurrentTape.toString());
			listToTape();
			mContainer.find('.test_radio_buttons .active').toggleClass('active')
			tapeButton.toggleClass('active');
			mContainer.find('.machine_label .curr_state').text(tsm.getCurrentState().name);
			mContainer.find('.machine_label .move_dir').text('');
			mContainer.find('.transition_div .curr_state').text(mTSM.getCurrentState().name);
			mContainer.find('.transition_div .read_symbol').text(mCurrentTape.peek());
			mContainer.find('.transition_div .new_state').text('');
			mContainer.find('.transition_div .write_symbol').text('');
			mContainer.find('.transition_div .move_dir').text('');

			mContainer.find('.old_transition_div span').text('');

			mContainer.find('.next_button').css('visibility', 'hidden');
			var result = mResultList[name] ? mResultList[name] : mResult1List[name];
			if(result && result.toString)
				result = result.toString();
			mContainer.find('.feedback_div').html('<p>This is tape ' + name + ', looking for ' + result + '</p>');
			mContainer.find('.feedback_div').append('<span class = "result_div"></span>');

			$('.tape_button').removeClass('disabled');
		}
		function listToTape(tapeList){
			var tapeDiv = $('.tape_div');
			var tape = tapeList || mCurrentTape;

			tapeDiv.html('');
			tapeDiv.css('left', 0);
			
			var listToArray = tape.toArray(); 
			var currentIndex = listToArray.currentIndex;
			var previousIndex = listToArray.previousIndex;
			var array = listToArray.array;

			var numberOfSegments = Math.floor(mContainer.width() / mTAPE_WIDTH) + 6; //3 segment on ech side for backup
		
			var startIndex = currentIndex - Math.floor((numberOfSegments / 2));
			var endIndex = currentIndex + Math.floor((numberOfSegments / 2));

			for (var i = startIndex, k = 0; i < endIndex; i++, k++){
				var leftPos = (mContainer.width() - mTAPE_WIDTH) / 2 + (i - currentIndex) * mTAPE_WIDTH;
				var tape_segment = $('<div>').addClass('tape_segment')
					.css({
						'left' : leftPos,
						'width' : mTAPE_WIDTH - 2,
						'height' : TAPE_HEIGHT - 4
					})
				if(i < 0 || i >= array.length){
					tape_segment.text('-')
				} else if(i < array.length) {
					//in tape, so we can add the tape_segment data
					tape_segment.text(array[i]);
					if(i == currentIndex)
						tape_segment.addClass('current_segment read_symbol');
					else if (i == previousIndex)
						tape_segment.addClass('prev_segment');
					else if(i - 1 == currentIndex )
						tape_segment.addClass('right_segment');
					else if(i + 1 == currentIndex )
						tape_segment.addClass('segment_segment');
					
				}
				tapeDiv.append(tape_segment);
			}
		}
		this.animateTape = function(dir, callback){
			var tapeDiv = mContainer.find('.tape_div');
			var currentPos = tapeDiv.css('left');
			var moveDir = 0;
			if(dir === 'r')
				moveDir = mTAPE_WIDTH;
			else if (dir === 'l')
				moveDir = -mTAPE_WIDTH;
			else
				moveDir = 0;
			if(slider_speed >= 0 && !preventAnimate){
				tapeDiv.animate({
				    left: parseInt(currentPos)+moveDir,
				}, slider_speed,  function(){
					$('.current_segment').addClass('prev_segment');
				 	callback();
			 	 });
			}
			else {
				callback();
			}
		}

		self.initialise();
	};
	root.TMSIM = TMSIM;
})();