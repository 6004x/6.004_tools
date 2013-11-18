var Mentoring = Mentoring || {};

(function() {
    Mentoring.EditorSync = {};

    Mentoring.EditorSync.Student = function(session, editor) {
        mSession = session;
        mEditor = editor;

        var init = function() {
            mSession.on('ready', initial_sync);
            mEditor.on('focus', handle_editor_focus);
            mEditor.on('unfocus', handle_editor_unfocus);
            mEditor.on('close', handle_editor_close);
            mEditor.on('open', handle_editor_open);
        };

        var initial_sync = function() {
            // We need to go through and grab all open buffers and their contents.
            var buffers = _.map(mEditor.filenames(), function(f) {
                return {name: f, content: editor.content(f), readonly: editor.isReadonly(f)};
            });
            var activeTab = mEditor.currentFilename();

            mSession.getChannel().sendMessage({
                kind: 'editor_sync',
                buffers: buffers,
                active: activeTab
            });
        };

        var handle_editor_focus = function(tab) {
            mSession.getChannel().sendMessage({
                kind: 'editor_focus',
                tab: tab
            });
        };

        var handle_editor_unfocus = function(tab) {
            mSession.getChannel().sendMessage({
                kind: 'editor_unfocus',
                tab: tab
            });
        };

        var handle_editor_close = function(tab) {
            mSession.getChannel().sendMessage({
                kind: 'editor_close',
                tab: tab
            });
        };

        var handle_editor_open = function(tab, content, is_readonly) {
            mSession.getChannel().sendMessage({
                kind: 'editor_open',
                tab: tab,
                content: content,
                readonly: is_readonly
            });
        };

        init();
    };

    Mentoring.EditorSync.Mentor = function(session, editor) {
        mSession = session;
        mEditor = editor;

        var init = function() {
            mSession.on('editor_sync', handle_initial_sync);
            mSession.on('editor_focus', handle_focus);
            mSession.on('editor_unfocus', handle_unfocus);
            mSession.on('editor_close', handle_close);
            mSession.on('editor_open', handle_open);
        };

        var handle_initial_sync = function(message) {
            _.each(message.buffers, function(buffer) {
                mEditor.openTab(buffer.name, buffer.content, false, null, buffer.readonly);
            });

            mEditor.focusTab(message.active);
        };

        var handle_focus = function(message) {
            mEditor.focusTab(message.tab);
        };

        var handle_unfocus = function(message) {
            mEditor.unfocusTab(message.tab);
        };

        var handle_close = function(message) {
            mEditor.closeTab(message.tab);
        };

        var handle_open = function(message) {
            console.log('open');
            console.log(message);
            mEditor.openTab(message.tab, message.content, true, null, message.readonly);
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
