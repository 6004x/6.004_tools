(function() {
    var root = this;

    var SplitUI = function(container, left_node, right_node) {
        var mContainer = $(container);
        var mLeft = $(left_node);
        var mRight = $(right_node);
        var mState = 'split';

        this.split = function() {
            splitSide(mLeft);
            splitSide(mRight);
            mState = 'split';
        };

        this.maximiseLeft = function() {
            maximise(mLeft, mRight);
            mState = 'left';
        };

        this.maximiseRight = function() {
            maximise(mRight, mLeft);
            mState = 'right';
        };

        var maximise = function(maximise, minimise) {
            maximise.show().addClass('span12 maximised').removeClass('span6');
            minimise.hide();
        };

        var splitSide = function(pane) {
            pane.show().addClass('span6').removeClass('span12 maximised');
        };

        this.currentState = function() {
            return mState;
        };

        var initialise = function() {
            // Make sure we have the right classes in place.
            mContainer.addClass('row-fluid');
            // And our panes are both children of the container node.
            mContainer.append(mLeft, mRight);

            // Split by default.
            mLeft.show().addClass('span6').removeClass('span12');;
            mRight.show().addClass('span6');
            mState = 'split';
        };
        initialise();
    };

    root.SplitUI = SplitUI;
})();
