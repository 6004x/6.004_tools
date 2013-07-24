(function (){
	var root = this;

	var TMSIM = function(container, tsm, testLists){
		var mContainer = $(container);
		var mTSM = tsm;
		var mTapeList = testLists.list_of_tapes;
		var mResultList = testLists.list_of_results;
		var mResult1List = testLists.list_of_results1;
		var tapeHeight = 50;
			var divHeight = 50;
			var tapeWidth = 30;

		var self = this;
		//TODO:change magic numbers
		this.initialise=function(){
			console.log('initalise TMSIM');
			
			var firstTape;
			//make the radio buttons for the different tests
			var testRadioButtons = $('<ul>').addClass('test_radio_buttons nav nav-pills');
			var first = true;
			for (var tapeName in mTapeList){
				var tape = mTapeList[tapeName];
				var radioButton = $('<li>').addClass('test_radio')
					.append('<a>'+tapeName+'</a>')
					.attr('id', tapeName.replace(/(\s|\/)/g, '_'));
				if (first){
					radioButton.addClass('active')
					first = false;
					firstTape = tape;
				}
				testRadioButtons.append(radioButton);
			}
			var radioWrapper=$('<div>').append(testRadioButtons);
			radioWrapper.addClass('pull-center');

			//make the visual tape
			var tapeDiv = $('<div>').addClass('tape_div');
			tapeDiv.css({
				position:'relative',
				top:mContainer.height()/2-2*tapeHeight,
				height:divHeight,
				overflow:'hidden',
			});
			
			//make the state machine thingy

			var machineDiv = $('<div>').addClass('pull-center machine_div').css({
					'position':'relative',
					//top:mContainer.height()/2+tapeHeight,
					top:tapeHeight/2,
					height:divHeight,
			});
			machineDiv.append($('<div>').addClass('arrow-up pull-center'));
				
			var labelDiv = $('<div>').addClass('machine_label pull-center')
				.css({
					height:divHeight,
					width:2*tapeWidth,
					border:'solid 1px black',
					background:'lightblue', 
			});//.append($('<div>').addClass(''));
			labelDiv.text(tsm.getCurrentState().name);
			machineDiv.append(labelDiv);
			listToTape(firstTape, tapeDiv );

			//appending buttons that will make the tsm progress, step
			var actionButtonDiv = $('<div>').addClass('btn-group pull-center');
			var playButton = $('<button>').addClass('btn btn-primary tape_button')
				.attr('title', 'Run')
				.append('<i class=icon-play>');
			var stopButton = $('<button>').addClass('btn btn-danger tape_button')
				.attr('title', 'Stop')
				.append('<i class=icon-stop>');
			var stepButton = $('<button>').addClass('btn btn-info tape_button')
				.attr('title', 'Step')
				.append('<i class=icon-step-forward>');;
			var resetButton = $('<button>').addClass('btn btn-warning tape_button')
				.attr('title', 'Reset')
				.append('<i class=icon-fast-backward>');

			$('.tape_button').each(function(i, button){
                $(button).attr({
                    'data-toggle':"tooltip",
                    'data-trigger':'hover',
                    'data-container':'body',
                });
            });

			stepButton.on('click', function(){console.log('step');self.moveRight(tapeDiv)})
			actionButtonDiv.append(playButton, stopButton, stepButton, resetButton);

			mContainer.append(radioWrapper, tapeDiv, machineDiv, actionButtonDiv);
			

		}

		var listToTape = function(tape, tapeDiv){
			var listToArray = tape.toArray(); 
			var currentIndex = listToArray.currentIndex;
			var array = listToArray.array;
			console.log(currentIndex);
			for (var i = 0; i < array.length; i++){
				//absolute positioning of the segment, off center to keep the currentIndex in the center
				var leftPos = (mContainer.width() - tapeWidth) / 2 + (i - currentIndex) * tapeWidth;
				var tapeData = array[i];
				tapeDiv.append($('<div>').addClass('tape_segment')
					.css({
						'margin' : 0,
						'display' : 'inline-block',
						'position' : 'absolute',
						'left' : leftPos,
						'width' : tapeWidth - 2,
						'height' : tapeHeight - 4
					})
					.text(tapeData)
				);
			}

		}
		this.moveRight = function(tapeDiv){
			var currentPos = tapeDiv.find('.tape_segment:first').css('left');
			console.log(currentPos);
			var old = parseInt(currentPos);
			tapeDiv.find('.tape_segment:first').animate({
			    left: parseInt(currentPos)+tapeWidth,
			 	 }, {
				    duration: 1000,
				    step: function( now, fx ){
				    	var step = now - old;
				    	console.log(step);
				      	tapeDiv.find('.tape_segment:gt(0)' ).each(function(i, e){
				      	 	//console.log($(e).css('left'))
				      		$(e).css("left", parseInt($(e).css('left'))+step );
				      	});
			    	}
			  });
		}
		self.initialise();
	};
	root.TMSIM = TMSIM;
})();