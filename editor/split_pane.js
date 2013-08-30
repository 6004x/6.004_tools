(function() {
    var root = this;

    var SplitPane = function(container, panes) {
        var self = this;
        var mContainer = $(container);
        var mHolder;
        var mPanes = [];
        var mSplitters = [];
        var mCurrentHeight = 0;
        var mCurrentWidth = 0;
	var window_margin = 5;  // a little fudge factor on pane width calcs

        _.extend(this, Backbone.Events);

        this.addPane = function(pane) {
            if(mPanes.length) {
                var splitter = $('<div>').addClass('split-splitter').css({height: mCurrentHeight}).appendTo(mHolder).append('<div>');
                mSplitters.push(splitter);
                handle_splitter(mSplitters.length - 1);
            }
            var holder = $('<div>').addClass('split-holder').css({height: mCurrentHeight, width: 0}).append($(pane)).appendTo(mHolder);
            mPanes.push(holder);
        };

        this.setPaneWidth = function(pane_number, width) {
            var old_width = mPanes[pane_number].width();
	    width = Math.floor(width);  // keep dimensions integers!
            mPanes[pane_number].css({width: width});
            if(pane_number+1 < mPanes.length) {
                mPanes[pane_number+1].css({width: mPanes[pane_number+1].width() + (old_width - width)});
            }
            self.trigger('resize', self.currentState());
        };

        var handle_splitter = function(i) {
            var splitter = mSplitters[i];
            splitter.mousedown(function(e) {
                var orig_x = e.clientX;
                var orig_left_width = mPanes[i].width();
                var orig_right_width = mPanes[i+1].width();
                $('body').mousemove(function(e) {
                    $('body').css({cursor: 'col-resize'});
                    var delta_x = (e.clientX - orig_x);
                    var new_left_width = Math.min(Math.max(0, orig_left_width + delta_x), orig_right_width + orig_left_width);
                    var new_right_width = Math.min(Math.max(0, orig_right_width - delta_x), orig_right_width + orig_left_width);
                    if(new_left_width < 30) {
                        new_right_width += new_left_width;
                        new_left_width = 0;
                    } else if(new_right_width < 30) {
                        new_left_width += new_right_width;
                        new_right_width = 0;
                    }
                    mPanes[i].css({width: new_left_width});
                    mPanes[i+1].css({width: new_right_width});
                    e.preventDefault();
                    self.trigger('resize', _.map(mPanes, function(pane) { return pane.width(); }));
                });
                $('body').mouseup(function() {
                    $('body').off('mouseup');
                    $('body').off('mousemove');
                    $('body').css({cursor: 'auto'});
                    e.preventDefault();
                });
                e.preventDefault();
            });
        };

        // Save on errors.
        this.currentState = function() {
            return _.map(mPanes, function(pane) { return pane.width(); });
        };

	// compute width available for panes = window width - total width of splitters - margin
	var window_width = function() {
	    var splitter_width = 11;   // css says 10, but sometimes reported as 11 by inspectors?
	    return $(window).width() - splitter_width*(mPanes.length - 1) - window_margin;
	}

        var initialise = function(panes) {
            mHolder = $('<div>').css({width: '100%'}).appendTo(mContainer);
            var height = $(window).height() - mHolder.offset().top - 10;
            mCurrentHeight = height;
            mHolder.css('height', height);
            _.each(panes, function(p) {
                self.addPane(p);
            });
            var width = window_width();
	    var pwidth = mPanes.length ? Math.floor(width/mPanes.length) : 0;
	    mCurrentWidth = mPanes.length * pwidth;
            _.each(_.range(mPanes.length), function(i) {
		self.setPaneWidth(i, pwidth);
            });

            $(window).resize(function() {
	        var wwidth = window_width();
                for (var i = mPanes.length - 1; i >= 0; i--) {
                    if(mPanes[i].width() > 0) {
                        var delta_width = (mCurrentWidth - wwidth)
                        var new_pane_width = Math.max(0, mPanes[i].width() - delta_width);
                        mCurrentWidth -= Math.min(mPanes[i].width(), delta_width); // Can't shrink by more than a pane width.
                        mPanes[i].css({width: new_pane_width});
                        if(mCurrentWidth <= window_width) {
                            break;
                        }
                    }
                };

                var window_height = $(window).height() - mHolder.offset().top;
                _.each(mPanes, function(pane) {
                    pane.css({height: window_height - 10});
                });
                _.each(mSplitters, function(split) {
                    split.css({height: window_height});
                });
                mHolder.css({height: window_height});
            });
        };
        initialise(panes);
    };

    root.SplitPane = SplitPane;
})();
