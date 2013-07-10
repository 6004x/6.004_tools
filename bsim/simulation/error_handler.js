BSim.Beta.ErrorHandler = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mModal = null;
    var mBody = null;

    var handle_error = function(e) {
        mBody.text(e.message);
        mModal.modal('show');
    };

    var initialise = function() {
        mModal = $('\
            <div class="modal hide fade">\
                <div class="modal-header">\
                    <button class="close" data-dismiss="modal">&times;</button>\
                    <h3>Runtime Error</h3>\
                </div>\
                <div class="modal-body">\
                    <p>Error message</p>\
                </div>\
                <div class="modal-footer">\
                    <a href="#" class="btn" data-dismiss="modal">Dismiss</a>\
                </div>\
            </div>');
        mBody = mModal.find('.modal-body > p');
        mContainer.append(mModal);

        mBeta.on('error', handle_error);
    };
    initialise();
};
