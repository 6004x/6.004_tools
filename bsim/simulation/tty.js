BSim.TTY = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mPendingText = '';
    var mTextHolder = $('<pre class="tty-output" tabindex="0">');

    var initialise = function() {
        mContainer.append(mTextHolder);

        var text_holder = mTextHolder[0];

        var append_text = function() {
            text_holder.textContent += mPendingText;
            mPendingText = '';
            text_holder.scrollTop = text_holder.scrollHeight;
        };

        // Appending text a character at a time stutters if we have lots of text.
        // This instead batches the text up for 50ms intervals.
        var append_text_slowly = _.throttle(append_text, 50);

        var handle_new_text = function(text) {
            mPendingText += text;
            append_text_slowly();
        };

        var clear_text = function() {
            mPendingText = '';
            text_holder.textContent = '';
        }

        mBeta.on('text:out', handle_new_text);
        mBeta.on('text:clear', clear_text);

        mContainer.keypress(function(e) {
            beta.keyboardInterrupt(e.which);
        });

        mContainer.click(function(e) {
            var offset = mContainer.offset();
            var x = e.pageX - offset.left;
            var y = e.pageY - offset.top;
            if(x < 0) x = 0;
            if(y < 0) y = 0; // This is not impossible.
            beta.mouseInterrupt(x, y);
        });
    };

    initialise();
};
