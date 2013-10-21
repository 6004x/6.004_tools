var Mentoring = Mentoring || {};
Mentoring.UI = function(holder) {
    var mHolder;
    var mHelpButton;

    var display_help_prompt = function() {
        var dialog = new ModalDialog();
        dialog.setTitle("Request Live Help");
        dialog.setContent("Would you like a mentor to help you? This will grant them access to view your work, and start a voice chat.");
        dialog.addButton("No", "dismiss");
        dialog.addButton("Yes", begin_help_session, 'btn-primary');
        dialog.show();
    };

    var begin_help_session = function(dialog) {
        dialog.dismiss();
        Mentoring.Session.RequestHelp('student', function(session) {
            mSession = session;
        }, function(error) {
            alert(error);
        });
    };

    var init = function() {
        mHolder = $(
            '<div class="help-holder">' +
                '<div class="help-request-ui">' +
                    '<a href="#" class="help-request-button">Live Help</a>' +
                '</div>' +
            '</div>'
        );
        mHelpButton = mHolder.find('.help-request-button');
        mHelpButton.click(function(e) {
            e.preventDefault();
            display_help_prompt();
            return false;
        });
        $(holder).append(mHolder);
    };

    init();
};
