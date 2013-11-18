var Mentoring = Mentoring || {};

(function() {
    Mentoring.PaneSync = function(session, pane) {
        var mSession = session;
        var mPane = pane;
        var mIsResizing = false;

        var init = function() {
            mPane.on('resize', handle_local_resize);
            mSession.on('pane_resize', handle_remote_resize);
        };

        var handle_local_resize = function(sizes) {
            if(mIsResizing) return;
            mSession.getChannel().sendMessage({
                kind: 'pane_resize',
                sizes: sizes
            });
        };

        var handle_remote_resize = function(message) {
            mIsResizing = true;
            var sizes = message.sizes;
            for(var i = 0; i < sizes.length; ++i) {
                console.log("Setting pane " + i + " to " + sizes[i]);
                mPane.setPaneWidth(i, sizes[i]);
            }
            mIsResizing = false;
        };

        init();
    };
})();
