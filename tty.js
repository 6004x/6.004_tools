BSim.TTY = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mTextHolder = $('<pre class="tty-output">');

    var initialise = function() {
        mContainer.append(mTextHolder);

        var text_holder = mTextHolder[0];
        mBeta.on('out:text', function(text) {
            // Testing suggests that this is by far the quickest way to append text.
            text_holder.appendChild(document.createTextNode(text));
            // Make sure whatever we just added is actually in view.
            text_holder.scrollTop = text_holder.scrollHeight;
        });
    };

    initialise();
};
