(function() {
    var root = this;

    var SplitUI = function(container, top_node, bottom_node) {
        var mContainer = $(container);
        var mHeight = mContainer.height();
        var mTop = $(top_node);
        var mBottom = $(bottom_node);

        $(window).on('resize',function(){mHeight = mContainer.height();console.log(mHeight)})
        this.split = function() {
            splitSide(mTop);
            splitSide(mBottom);
            mBottom.css({
                position:'relative',
            })
        };

        this.maximiseTop = function() {
            maximise(mTop, mBottom);
        };

        this.maximiseBottom = function() {
            maximise(mBottom, mTop);
        };

        var maximise = function(maximise, minimise) {
            maximise.show().height(mHeight).css('margin-top', 0);
            minimise.hide();
        };

        var splitSide = function(pane) {
            var height = mHeight/2
            pane.show().height(height);
        };

        var initialise = function() {
            // Make sure we have the right classes in place.
            mContainer.addClass('row-fluid');
            // And our panes are both children of the container node.
            mContainer.append(mTop, mBottom);

            // Split by default.
            mTop.show();
            mBottom.show();
        };
        initialise();
    };

    root.SplitUI = SplitUI;
})();
