var Mentoring = Mentoring || {};

(function() {
    function loadPageVar (sVar) {
        return decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURI(sVar).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
    }

    Mentoring.UI = function(holder, editor, split) {
        var mHolder;
        var mUI;
        var mHelpButton;
        var mSession;
        var mEditor = editor;
        var mSplitPane = split;

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
                console.log("Help session start");
                console.log(session);
                prepare_session(session);
                mHolder.find('.help-request-ui').text("Waiting for helper...");
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
            mUI = mHolder.find('.help-request-ui');
            mHelpButton.click(function(e) {
                e.preventDefault();
                display_help_prompt();
                return false;
            });
            $(holder).append(mHolder);

            if(Mentoring.Initialised) check_if_mentor();
            else Mentoring.OnInit = check_if_mentor;
        };

        var check_if_mentor = function() {
            var session = loadPageVar('session');
            var requester = loadPageVar('requester');
            if(session) {
                mUI.text("Initialising session...");
                Mentoring.Session.ProvideHelp('mentor', session, function(session) {
                    prepare_session(session);
                    mUI.text("Session initialised.");
                });
            }
        };

        var prepare_session = function(session) {
            mSession = session;
            mSession.on('negotiating', handle_negotiation_started);
            mSession.on('ready', handle_ready);
            new Mentoring.MouseRelay(session);
            Mentoring.EditorSync.Prepare(mSession, mEditor);
            new Mentoring.PaneSync(session, mSplitPane);
            window.mSession = session; // for debugging
        };

        var handle_negotiation_started = function() {
            mUI.text("Negotiating...");
        };

        var handle_ready = function() {
            mUI.text("Help session ready.");
        };

        init();
    };

    Mentoring.IsMentor = function() {
        return !!loadPageVar('session');
    };
})();
