(function() {
    var root = this;

    var SplitUI = function(container, top_node, bottom_node) {
        var mContainer = $(container);
        var mHeight = window.innerHeight;
        var mTop = $(top_node);
        var mBottom = $(bottom_node);

        $(window).on('resize',function(){mHeight = mContainer.height();})
        this.split = function() {
            splitSide(mTop);
            splitSide(mBottom);
            mBottom.css({
                position : 'relative',
                height : mHeight - mTop.css('height'),
            })
        };

        this.maximiseTop = function() {
            maximise(mTop, mBottom);
        };

        this.maximiseBottom = function() {
            maximise(mBottom, mTop);
        };

        var maximise = function(maximise, minimise) {
            maximise.show().css({
                'margin-top' : 0,
                'height' : mHeight,
            });
            minimise.hide();
        };

        var splitSide = function(pane) {
            pane.show();

        };

        var initialise = function() {
            // Make sure we have the right classes in place.
            mContainer.addClass('row-fluid');
            // And our panes are both children of the container node.
            mContainer.append(mTop, mBottom);

            // Split by default.
            maximise(mBottom, mTop)
        };
        initialise();

    };

    root.SplitUI = SplitUI;
})();
