(function (){
	var root = this;

	var TMSIM = function(container, tsm, testLists){
		var mContainer = $(container);
		var mTSM = tsm;
		var mTestLists = testLists;
		var self = this;
		//TODO:change magic numbers
		this.initialise=function(){
			console.log('initalise TMSIM');
			var tapeHeight=60;
			var tapeWidth=40;
			var tapeDiv = $('<div>').addClass('tape_div');
			tapeDiv.css({
				position:'relative',
				top:mContainer.height()/2-50,
				height:tapeHeight,
			})
			var numOfSpans = mContainer.width()/tapeWidth;
			var sideSpan = mContainer.width()%tapeWidth;
			tapeDiv.append($('<span>').addClass('side_span tape_span')
					.width(sideSpan/2+1)
					.css('margin', 0)
					.height(tapeHeight-2)
				);
			for (var i = 0; i <= mContainer.width(); i+=tapeWidth){
				tapeDiv.append($('<span>').addClass('tape_span')
					.width(tapeWidth-2)
					.css('margin', 0)
					.height(tapeHeight-2)
				);
			}
			tapeDiv.append($('<span>').addClass('side_span tape_span')
					.width(sideSpan/2+1)
					.css('margin', 0)
					.height(tapeHeight-2)
				);
			
			mContainer.append(tapeDiv);
		}
		self.initialise();
	};
	root.TMSIM = TMSIM;
})();