(function (){
	var root = this;

	var TMSIM = function(container, tsm, testLists){
		var mContainer = $(container);
		var mTSM = tsm;
		var mTapeList = testLists.list_of_tapes;
		var mResultList = testLists.list_of_results;
		var mResult1List = testLists.list_of_results1;

		var self = this;
		//TODO:change magic numbers
		this.initialise=function(){
			console.log('initalise TMSIM');
			var tapeHeight=50;
			var divHeight=50;
			var tapeWidth=30;
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
				overflow:'hidden'
			})
			var numOfSpans = mContainer.width()/tapeWidth;
			var sideSpan = mContainer.width()%tapeWidth;
			console.log(numOfSpans)
			/*mContainer.append($('<div>').append('...').addClass('side_span tape_span')
				.width(sideSpan/2)
				.css({
					position:'relative',
					top:mContainer.height()/2-tapeHeight,
					height:tapeHeight,
					'margin': 0,
				})
				.height(tapeHeight-2)
			);*/
			for (var i = -5; i <= numOfSpans+5; i++){
				tapeDiv.append($('<div>').addClass('tape_segment')
					.width(tapeWidth-2)
					.css({
						'margin': 0,
						'display': 'inline-block',
						'position':'absolute',
						'left':i*tapeWidth,
					})
					.height(tapeHeight-2)
				);
			}
			//make the state machine thingy

			var machineDiv = $('<div>').addClass('pull-center machine_div').css({
					'position':'relative',
					top:tapeHeight/2,
					height:divHeight,
			});
			machineDiv.append($('<div>').addClass('arrow-up pull-center'));
				
			machineDiv.append($('<div>').addClass('machine_label pull-center')
				.css({
					height:divHeight,
					width:2*tapeWidth,
					border:'solid 1px black',
					background:'lightblue'
			}));
			

			mContainer.append(radioWrapper, tapeDiv, machineDiv);
			self.move(tapeDiv);
		}
		var listToTape = function(tape, tapeDiv){
			var listToArray = tape.toArray(); 
			var currentIndex = tape.toArray().index;
			var array = tape.toArray().array;


		}
		this.move = function(tapeDiv){
			tapeDiv.find('.tape_segment:first').animate({
			    left: 0
			  }, {
				    duration: 1000,
				    step: function( now, fx ){
				    	
				      tapeDiv.find('.tape_segment:gt(0)' ).each(function(i, e){
				      	 console.log($(e).css('left'))
				      		$(e).css( "left", parseInt($(e).css('left'))+now );
				      });
			    	}
			  });
		}
		self.initialise();
	};
	root.TMSIM = TMSIM;
})();