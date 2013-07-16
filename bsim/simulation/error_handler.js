BSim.Beta.ErrorHandler = function(beta) {
    var mBeta = beta;

    var handle_error = function(e) {
        var dialog = new ModalDialog();
        dialog.setTitle("Runtime Error").setContent(e.message);
        dialog.addButton("Dismiss", "dismiss");
        dialog.show();
    };

    var initialise = function() {
        mBeta.on('error', handle_error);
    };
    initialise();
};
