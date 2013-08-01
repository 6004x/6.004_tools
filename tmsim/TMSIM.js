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
		var halt = false;
		var simulation_done = false;
		var steps = 0;
		var speeds = [0.5, 0.5, 0.75, 1, 2, 3, 10, 100, 1000, 10000, 100000, 200000,500000]
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
				tape.endSize = mTapeList[tapeName].endSize;
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

			var stepsDiv = $('<div>').addClass('pull-right').append('Steps: ').append('<span class="stepsSpan"></span>');
			var speedDiv = $('<div>').addClass('pull-left').append('Speed: ').append('<span class="speedSpan"></span>');
			
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
					top:-10,
					height:DIV_HEIGHT,
			});
			machineDiv.append($('<div>').addClass('arrow-up pull-center'));
				
			var labelDiv = $('<div>').addClass('machine_label pull-center')
				.css({
					height:DIV_HEIGHT,
					width:2*TAPE_WIDTH,
					border:'solid 1px black',
					background:'lightblue', 
			});
			labelDiv.text(tsm.getCurrentState().name);
			machineDiv.append(labelDiv);
			listToTape(firstTape, tapeDiv);

			//appending buttons that will make the tsm progress, step
			var actionDiv = $('<div>').addClass('pull-center');
			var actionButtonDiv = $('<div>').addClass('btn-group pull-center');
			actionDiv.css({
				'position' : 'relative',
				top : 0,
			})
			var playButton = $('<button>').addClass('btn btn-success tape_button')
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
                $(this).attr({
                    'data-toggle':"tooltip",
                    'data-trigger':'hover',
                    'data-container':'body',
                });
            });

			stepButton.on('click', function(){
				 //self.move('r');
				console.log('step forward')
				if(!$(this).hasClass('disabled')){
					self.step(function(arg){
						console.log('callback')
						console.log(arg);
					});
				}
			});
			prevStepButton.on('click', function(){
				if(!$(this).hasClass('disabled'))
					self.move('l');
			});
			playButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					halt = false;
					playButton.addClass('disabled');
					stepButton.addClass('disabled');
					prevStepButton.addClass('disabled');
					self.play();
				}
			})
			resetButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					self.stop();
					playButton.removeClass('disabled');
					stepButton.removeClass('disabled');
					prevStepButton.removeClass('disabled');
					toggleTape();
				}
			});
			stopButton.on('click', function(){
				if(!$(this).hasClass('disabled')){
					self.stop();
					playButton.removeClass('disabled');
					stepButton.removeClass('disabled');
					prevStepButton.removeClass('disabled');
				}
			});

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
				value : '100',
				name : 'speed_options',
			}).addClass('speed_options')
			var radio2 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio2',
				value : '10',
				name : 'speed_options',
			}).addClass('speed_options')
			var radio3 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio3',
				value : '0',
				name : 'speed_options',
			}).addClass('speed_options')
			var radio4 = $('<input>').attr({
				type : 'radio',
				id : 'inlineRadio4',
				value : '-100000',
				name : 'speed_options',
			}).addClass('speed_options')
			label1.append(radio1);
			label2.append(radio2);
			radio2.defaultChecked;
			label3.append(radio3);
			label4.append(radio4);
			speedDiv.append(label1);
			speedDiv.append(label2);
			speedDiv.append(label3);
			speedDiv.append(label4);
			
			speedDiv.on('click', function (e) {   
				console.log(e);
				console.log('radio click');
				var speed = $('.speed_options:checked').attr('value');
				slider_speed = parseInt(speed);
				console.log(speed);
			});
			actionButtonDiv.append(prevStepButton, playButton, stopButton, stepButton, resetButton);
			actionDiv.append(actionButtonDiv);
			mContainer.append(stepsDiv, speedDiv, radioWrapper, tapeWrapper, machineDiv, speedDiv, actionDiv);

		}
		this.step = function(callback){
			var callback = callback || _.identity;
			var stepObject = mTSM.step(mCurrentTape);

			steps++;
			mContainer.find('.machine_label').text(stepObject.transition.new_state);
			mContainer.find('.machine_label').append('<br/>'+stepObject.transition.move);

			mContainer.find('.current_segment').text(stepObject.transition.write);
			mContainer.find('.prev_segment').removeClass('prev_segment')
			mContainer.find('.current_segment').addClass('prev_segment')
			
			setTimeout(function(){
				self.move(stepObject.transition.move, function(){
					listToTape();
					$('.stepsSpan').text(steps)
						callback(stepObject.new_state);			
				});
			}, slider_speed*5);
		}
		this.stop = function(){
			console.log('stop');
			halt = true;
		}
		this.play = function(){
			var new_state = tsm.getCurrentState();
			nextStep(new_state.name);

			function nextStep(new_state_name){
				if(halt){
					console.log('halted');
				}
				else if(new_state_name!='*halt*'&&new_state_name!='*error*'){
					if(slider_speed > 0){
							self.step(nextStep);
					} else {
						var i = -slider_speed;
						console.log(i + ' super speed slider')
						while( i > 0){
							var stepObject = mTSM.step(mCurrentTape);
							steps++;
							if(stepObject.transition.new_state == '*halt*' || stepObject.transition.new_state == '*error*'){
								console.log('return '+ stepObject.transition.new_state)
								listToTape();
								simulation_done = true;
								break;
							}
							i--;
						}
						if(!simulation_done)
						{	
								self.step(nextStep);
						}
					}
				}
				else {
					console.log('return '+new_state_name);
					simulation_done = true;
				}
					
			}	
		}
		function toggleTape(buttonDiv){
			buttonDiv = buttonDiv||$('.test_radio_buttons .active');
			var name = buttonDiv.data('tape-name');
			mCurrentTape = mTapeList[name].cloneTape();
			mTSM.restart();
			halt = true	;
			simulation_done = false;
			steps = 0;
			listToTape( mCurrentTape, mContainer.find('.tape_div'));
			mContainer.find('.test_radio_buttons .active').toggleClass('active')
			buttonDiv.toggleClass('active');
			$('.tape_button').removeClass('disabled');
		}
		function listToTape(tapeList, tapeDiv){
			var tapeDiv = tapeDiv || $('.tape_div');
			var tape = tapeList || mCurrentTape;

			tapeDiv.html('');
			tapeDiv.css('left', 0);
			
			var listToArray = tape.toArray(); 
			var currentIndex = listToArray.currentIndex;
			var previousIndex = listToArray.previousIndex;
			var array = listToArray.array;

			var numberOfSegments = Math.floor(mContainer.width() / TAPE_WIDTH) + 6; //3 thingy backup
			
			var startIndex = currentIndex - Math.floor((numberOfSegments / 2));
			var endIndex = currentIndex + Math.floor((numberOfSegments / 2));

			for (var i = startIndex, k = 0; i < endIndex; i++, k++){
				var leftPos = (mContainer.width() - TAPE_WIDTH) / 2 + (i - currentIndex) * TAPE_WIDTH;
				var tape_segment = $('<div>').addClass('tape_segment')
					.css({
						'left' : leftPos,
						'width' : TAPE_WIDTH - 2,
						'height' : TAPE_HEIGHT - 4
					})
				if(i < 0 || i >= array.length){
					tape_segment.text('-')
				} else if(i < array.length) {
					//in tape, so we can add the tape_segment data
					tape_segment.text(array[i]);
					if(i == currentIndex)
						tape_segment.addClass('current_segment');
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
			if(slider_speed > 0){
				tapeDiv.animate({
				    left: parseInt(currentPos)+moveDir,
				}, slider_speed,  function(){
					$('.current_segment').addClass('prev_segment');
				 	callback();
			 	 });
			}
			else {
				console.log('not animate');
				callback();
			}
		}

		self.initialise();
	};
	root.TMSIM = TMSIM;
})();