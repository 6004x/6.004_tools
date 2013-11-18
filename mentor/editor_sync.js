var Mentoring = Mentoring || {};

(function() {
    Mentoring.EditorSync = {};

    Mentoring.EditorSync.Student = function(session, editor) {
        mSession = session;
        mEditor = editor;

        var init = function() {
            mSession.on('ready', initial_sync);
        };

        var initial_sync = function() {
            // We need to go through and grab all open buffers and their contents.
            var buffers = _.map(mEditor.filenames(), function(f) {
                return {name: f, content: editor.content(f)};
            });
            var activeTab = mEditor.currentFilename();

            mSession.getChannel().sendMessage({
                kind: 'editor_sync',
                buffers: buffers,
                active: activeTab
            });
        };

        init();
    };

    Mentoring.EditorSync.Mentor = function(session, editor) {
        mSession = session;
        mEditor = editor;

        var init = function() {
            mSession.on('editor_sync', handle_initial_sync);
        };

        var handle_initial_sync = function(message) {
            _.each(message.buffers, function(buffer) {
                mEditor.openTab(buffer.name, buffer.content, false, null, true);
            });

            mEditor.focusTab(message.active);
        };

        init();
    };

    Mentoring.EditorSync.Prepare = function(session, editor) {
        if(session.isMentor()) {
            return new Mentoring.EditorSync.Mentor(session, editor);
        } else {
            return new Mentoring.EditorSync.Student(session, editor);
        }
    };
})();
