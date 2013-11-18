var Mentoring = Mentoring || {};

(function() {
    Mentoring.EditorSync = {};

    Mentoring.EditorSync.Student = function(session, editor) {
        var mSession = session;
        var mEditor = editor;
        var mCurrentTab = null;
        var mCursorHandler;

        var init = function() {
            mSession.on('ready', initial_sync);
            mEditor.on('tab_focus', handle_editor_focus);
            mEditor.on('unfocus', handle_editor_unfocus);
            mEditor.on('close', handle_editor_close);
            mEditor.on('open', handle_editor_open);
            mCursorHandler = new Mentoring.EditorSync.CursorHandler(session, editor);
        };

        var update_current_tab = function(tab) {
            if(mCurrentTab) {
                var old_cm = mEditor.getCodemirror(tab);
                if(old_cm) {
                    old_cm.off('scroll', handle_cm_scroll);
                    old_cm.off('change', handle_cm_change);
                }
            }
            mCurrentTab = tab;
            var cm = mEditor.getCodemirror(tab);
            cm.on('scroll', handle_cm_scroll);
            cm.on('change', handle_cm_change);
        };

        var initial_sync = function() {
            // We need to go through and grab all open buffers and their contents.
            var buffers = _.map(mEditor.filenames(), function(f) {
                return {name: f, content: editor.content(f), readonly: editor.isReadonly(f)};
            });
            var activeTab = mEditor.currentFilename();
            update_current_tab(activeTab);

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
            update_current_tab(tab);
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

        var handle_cm_scroll = function(cm) {
            var scroll = cm.getScrollInfo();
            mSession.getChannel().sendMessage({
                kind: 'editor_scroll',
                left: scroll.left,
                top: scroll.top,
                tab: mCurrentTab
            });
        };

        var handle_cm_change = function(cm, change) {
            changes = [];
            do {
                changes.push({from: change.from, to: change.to, text: change.text.join('\n')});
            } while((change = change.next));
            mSession.getChannel().sendMessage({
                kind: 'editor_change',
                changes: changes,
                tab: mCurrentTab
            });
        };

        init();
    };

    Mentoring.EditorSync.Mentor = function(session, editor) {
        var mSession = session;
        var mEditor = editor;
        var mCursorHandler;

        var init = function() {
            mSession.on('editor_sync', handle_initial_sync);
            mSession.on('editor_focus', handle_focus);
            mSession.on('editor_unfocus', handle_unfocus);
            mSession.on('editor_close', handle_close);
            mSession.on('editor_open', handle_open);
            mSession.on('editor_scroll', handle_scroll);
            mSession.on('editor_change', handle_change);
            mCursorHandler = new Mentoring.EditorSync.CursorHandler(session, editor);
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
            mEditor.openTab(message.tab, message.content, true, null, message.readonly);
        };

        var handle_scroll = function(message) {
            var cm =  mEditor.getCodemirror(message.tab);
            if(!cm) return;
            cm.scrollTo(message.left, message.top);
        };

        var handle_change = function(message) {
            var cm =  mEditor.getCodemirror(message.tab);
            if(!cm) return;
            _.each(message.changes, function(change) {
                cm.replaceRange(change.text, change.from, change.to);
            });
        };

        init();
    };

    Mentoring.EditorSync.CursorHandler = function(session, editor) {
        var mSession = session;
        var mEditor = editor;
        var mCurrentTab = null;
        var mRemoteHighlights = {};

        var init = function() {
            mSession.on('editor_highlight', handle_remote_highlight);
            mEditor.on('tab_focus', handle_local_focus);
            if(mEditor.currentFilename()) {
                handle_local_focus(mEditor.currentFilename());
            }
        };

        var handle_local_focus = function(tab) {
            console.log('cursor focus');
            if(mCurrentTab) {
                var old_cm = mEditor.getCodemirror(mCurrentTab);
                if(old_cm) {
                    old_cm.off('beforeSelectionChange', handle_local_highlight);
                }
            }
            mCurrentTab = tab;
            var cm = mEditor.getCodemirror(tab);
            console.log(cm);
            cm.on('beforeSelectionChange', handle_local_highlight);
        };

        var handle_local_highlight = function(cm, selection) {
            var start = selection.anchor;
            var end = selection.head;
            if(start.line > end.line || (start.line == end.line && start.ch > end.ch)) {
                end = selection.anchor;
                start = selection.head;
            }
            mSession.getChannel().sendMessage({
                kind: 'editor_highlight',
                start: start,
                end: end,
                tab: mCurrentTab
            });
        };

        var handle_remote_highlight = function(message) {
            var tab = message.tab;
            var cm = mEditor.getCodemirror(tab);
            if(!cm) return;
            if(_.has(mRemoteHighlights, tab)) mRemoteHighlights[tab].clear();
            mRemoteHighlights[tab] = cm.markText(message.start, message.end, {className: 'remote-highlight'});
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
