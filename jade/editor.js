// Creates an editor in the given container for the given mode.
// - `container` should be a DOM node or unique CSS selector
// - `mode` should be one of 'uasm', 'tsim' or 'jsim' as appropriate.
var Editor = function(container, mode) {
    var AUTOSAVE_TRIGGER_EVENTS = 30; // Number of events to trigger an autosave.
    var self = this; // Tracking 'this' can be finicky; use 'self' instead.
    var mContainer = $(container);
    var mSyntaxMode = mode;
    var mToolbarHolder; // Element holding the toolbar
    var mToolbar;
    var mTabHolder; // Element holding the tabs
    var mCurrentDocument = null; // Current document object
    var mExpectedHeight = null; // The height the entire editor view (including toolbars and tabs) should maintain
    var mExpectedWidth = null;
    var mUntitledDocumentCount = 0; // The number of untitled documents (used to name the next one)
    var mSaveButtons = null;   //cjt: so we can manage SAVE/SAVE ALL/REVERT buttons as a group
    var mRestoreAutosaveButton = null;
    var mShowingTips = false;
    var mTipHolder = null;
    var mOpenDocuments = {}; // Mapping of document paths to editor instances.

    _.extend(this, Backbone.Events);

    // Given a list of ToolbarButtons, adds a button group.
    this.addButtonGroup = function(buttons) {
        return mToolbar.addButtonGroup(buttons);
    };

    // Focuses the tab for the given filename.
    this.focusTab = function(filename) {
        focusTab(mOpenDocuments[filename]);
    };

    // Unfocuses the tab for the given filename.
    // Note that calling this will cause *no* tab to be focused.
    this.unfocusTab = function(filename) {
        unfocusTab(mOpenDocuments[filename]);
    };

    // Closes the tab for the given filename.
    // Focuses an adjacent tab (preferring the left tab), if any.
    this.closeTab = function(filename) {
        closeTab(mOpenDocuments[filename]);
    };


    // These are convenience functions to save on fiddling with CodeMirror directly.

    // If filename is given, returns the content of that file in the buffer
    // If filename is omitted, returns the content of the current editor
    this.content = function(filename) {
        var document = try_get_document(filename);
        if(!document) return null;
        do_autosave(document); // We assume that whenever something calls this.content, autosaving would be nice.
        return document.editor.getValue();
    };

    // Makes sure the edit buffer is displayed correctly.
    this.redraw = function() {
        if(mCurrentDocument) {
            mCurrentDocument.editor.refresh();
        }
    };

    // Opens the file at the given path.
    // filename: absolute path to the file.
    // activate: whether to focus the tab
    // callback (optional): callback when the file has been opened.
    this.openFile = function(filename, activate, callback) {
        if(_.has(mOpenDocuments, filename)) {
            focusTab(mOpenDocuments[filename]);
            return;
        }
        FileSystem.getFile(filename, function(content) {
            self.openTab(content.name, content.data, activate, content.autosave, content.shared);
            if(callback)
                callback(content.name, content.data);
        }, function() {
            PassiveAlert("Failed to open " + filename);
        });
    };

    // Opens a new tab with the given filename and content.
    // filename should be a full path to the file. If not given, the document will be called 'untitled'
    // If activate is true, the tab will be focused. If false, the tab will be focused only if there are
    // no other documents currently open.
    this.openTab = function(filename, content, activate, autosaved_content, is_readonly) {
        // We can't open a file if we already have one at the same path (it wouldn't make sense and breaks things)
        if(_.has(mOpenDocuments, filename)) {
            focusTab(mOpenDocuments[filename]);
            return;
        }
        var has_location = true;
        // If no filename is given, invent one. We'll need to prompt later.
        if(!filename) {
            has_location = false;
            filename = '*untitled ' + (++mUntitledDocumentCount);
        }
        var id = _.uniqueId('edit_tab');
        var editPane = $('<div>', {'class': 'tab-pane', id: id}).hide();
        mContainer.append(editPane);
        var editor = new jade_view.Jade(editPane, filename, !!is_readonly);
        var tab = $('<li>');

        var doc = {
            el: editPane, // jQuery element holding the editor
            tab: tab, // jQuery tab element
            editor: editor, // Editor instance
            hasLocation: has_location, // Whether we know this file's name (if false, we'll need to prompt)
            name: filename, // This file's name, temporary or otherwise
            generation: editor.changeGeneration(), // The generation at last save. We can use this to track cleanliness of document.
            autosaveGeneration: editor.changeGeneration(), // Generation of the last autosave.
            isAutosaving: false, // Prevents multiple simultaneous save attempts
            n: 0, // Counts changes until we autosave.
            autosaved: autosaved_content || null,
            readonly: is_readonly    //cjt: for managing SAVE/SAVE ALL/REVERT buttons
        };

        //cjt: var label = _.last(filename.split('/'));
        var label = filename;
        var a = $('<a>', {href: '#' + id}).text(label).click(function(e) { e.preventDefault(); focusTab(doc); });
        tab.append(a);

        //cjt: let user know this file is read-only!
        if (is_readonly) a.append('<span style="color:red"> (read only)</span>');

        // Build us a 'close' button. It uses an X when the document is clean and a circle when dirty, except
        // when hovered over.
        var close = $('<button class="close">&times;</button>').click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeTab(doc);
        }).css({
            'margin-top': -2,
            'margin-left': 5,
            'margin-right': -7
        }).on('mouseenter', tab_mouse_enter).on('mouseleave', function() { handle_change_tab_icon(doc); });
        editor.on('change', function(c, changeObj) {
            handle_change_tab_icon(doc);
            // Let our listeners know, too.
            self.trigger('change', filename, changeObj);
        });
        // Handle autosaving as appropriate.
        editor.on('cursorActivity', function() {
            doc.n++;
            if(doc.n >= AUTOSAVE_TRIGGER_EVENTS) {
                doc.n = 0;
                do_autosave(doc);
            }
        });
        // Append all that stuff
        a.append(close);

        mTabHolder.append(tab);

        // Make sure we aren't still showing initial tips.
        clear_initial_tips();

        //mContainer.append(editPane);

        // If we have no open documents, or we were explicitly asked to activate this document, do so.
        if(!_.size(mOpenDocuments) || activate) {
            unfocusTab(mCurrentDocument);
            focusTab(doc);
        }

        // Stash these away somewhere.
        mOpenDocuments[filename] = doc;
        store_tabs();
        // If we know how tall we should be, arrange to make sure everything still fits in that space.
        if(mExpectedHeight) self.resize(mExpectedWidth,mExpectedHeight);
        // HACK: make sure something understands our window size.
        $(window).resize();
    };

    // Returns the filename of the currently focused document. If there is no such document, returns null.
    this.currentFilename = function() {
        return mCurrentDocument ? mCurrentDocument.name : null;
    };
    this.currentTab = this.currentFilename; // legacy

    // Returns a list of filenames of currently open documents.
    this.filenames = function() {
        return _.pluck(mOpenDocuments, 'name');
    };

    // Sets the vertical height of the entire editor (including toolbars, etc.), in pixels.
    // This should be called whenever the available display area changes.
    // (Why does doing anything vertically suck so much?)
    this.resize = function(width,height) {
        mExpectedWidth = width;
        mExpectedHeight = height;

        if(!mCurrentDocument) return; // If we don't have a current document there is no height to set, so don't die over it.

        mContainer.height(height);
        mContainer.width(width);

        // leave room for editor buttons and file tabs
        height -= $('.btn-toolbar',mContainer).outerHeight(true) + $('.nav-tabs',mContainer).outerHeight(true);

        _.each(mOpenDocuments, function(doc) {
            doc.editor.resize(width,height);
            //doc.editor.refresh();
        });
    };

    // Removes focus from the editor.
    this.blur = function() {
        if(!mCurrentDocument) return; // If we don't have a current document we can't be focused anyway.

        mCurrentDocument.editor.blur();
    };

    // The below methods are private.
    var focusTab = function(doc) {
        doc.tab.find('a').tab('show');
        if(mCurrentDocument) mCurrentDocument.el.hide();
        doc.el.show().addClass('active');
        doc.editor.refresh();
        doc.editor.focus();
        mCurrentDocument = doc;
        if(doc.autosaved) {
            mRestoreAutosaveButton.show();
        } else {
            mRestoreAutosaveButton.hide();
        }
        //cjt: user can't save or revert read-only buffers
        if (doc.readonly) {
            mSaveButtons.hide();
        } else {
            mSaveButtons.show();
        }
    };

    var unfocusTab = function(doc) {
        if(!doc) return;
        doc.el.removeClass("active").hide();
        doc.tab.removeClass('active');
    };

    var closeTab = function(doc, force) {
        if(!doc) return;
        if(!doc.editor.isClean(doc.generation) && !force) {
            var dialog = new ModalDialog();
            dialog.setTitle("Unsaved document");
            dialog.setContent("<p><strong>Do you want to save the changes you made to " + doc.name + "?</strong></p>" +
                "<p>Your changes will be lost if you don't save them.</p>");
            dialog.addButton("Don't save", function() {
                closeTab(doc, true);
                dialog.dismiss();
            }, "btn-danger");
            dialog.addButton("Cancel", "dismiss");
            dialog.addButton("Save", function() {
                do_save();
                closeTab(doc, true);
                dialog.dismiss();
            }, "btn-primary");
            dialog.show();
            return;
        }
        // Figure out what document we should open next by taking siblings of our object.
        var sibling = doc.tab.prev(); // Try left first
        if(!sibling.length) sibling = doc.tab.next(); // Then try right
        if(sibling.length) {
            // Now we need to find the appropriate doc element.
            // TODO: we could attach this to the tab?
            var new_doc = _.find(_.values(mOpenDocuments), function(e) { return e.tab[0] == sibling[0];});
            if(new_doc) {
                focusTab(new_doc); // Focus the document, assuming we found it.
            } else {
                mRestoreAutosaveButton.hide();
            }
        } else {
            mRestoreAutosaveButton.hide();
        }
        // Now get rid of this one.
        delete mOpenDocuments[doc.name];
        doc.el.remove();
        doc.tab.remove();

        store_tabs();
    };

    var create_error_widget = function(message) {
        var widget = $('<div class="cm-error-widget">');
        var span = $('<span>');
        span.text(message).appendTo(widget);
        return widget[0];
    };

    var handle_change_tab_icon = function(doc) {
        var close = doc.tab.find('.close');
        if(!doc.editor.isClean(doc.generation)) {
            close.text("\u25CF"); // U+25CF BLACK CIRCLE
        } else {
            close.text("\u00D7"); // U+00D7 MULTIPLICATION SIGN
        }
    };

    var tab_mouse_enter = function() {
        $(this).text("\u00D7"); // U+00D7 MULTIPLICATION SIGN
    };

    var save_current_document = function() {
        if(!mCurrentDocument) return;
        do_save();
    };

    var save_all_documents = function() {
        _.each(mOpenDocuments, function(document) {
            if(!document.editor.isClean(document.generation)) {
                do_save(document);
            }
        });
    };

    this.get_all_documents = function() {
        var result = {};
        for(var name in mOpenDocuments) {
            if(!_.has(mOpenDocuments, name)) continue;
            var doc = mOpenDocuments[name];
            result[name] = doc.editor.getValue();
        }
        return result;
    };

    var revert_current_document = function() {
        if(!mCurrentDocument) return;
        var document = mCurrentDocument; // we don't want to dump this in the wrong buffer!
        FileSystem.getBackup(document.name, function(content) {
            document.editor.setValue(content.data);
        }, function(content) {
            PassiveAlert("Revert failed; unable to load old version.", 'error');
        });
    };

    var restore_autosave = function() {
        if(!mCurrentDocument) return;
        mCurrentDocument.editor.setValue(mCurrentDocument.autosaved);
        clear_autosave(mCurrentDocument);
    };

    var clear_autosave = function(document) {
        document.autosaved = null;
        if(mCurrentDocument == document) {
            mRestoreAutosaveButton.hide();
        }
    };

    var try_get_document = function(filename) {
        var document;
        if(filename) document = mOpenDocuments[filename];
        else document = mCurrentDocument;
        if(!document) return false;
        return document;
    };

    var run_simulation = function(handler) {
        $('#split_pane').click();
        var pane = $('#simulation-pane');
        pane.empty();

        if (mCurrentDocument) {
            // whenever a simuulation is run, autosaving would be nice.
            do_autosave(mCurrentDocument);
            handler(mCurrentDocument.editor,pane);
        }
    };

    var initialise = function() {
        // Build up our editor UI.
        mToolbarHolder = $('<div>');
        mToolbar = new Toolbar(mToolbarHolder);
        // Add some basic button groups
        //cjt: save reference to this button grouop
        mSaveButtons = self.addButtonGroup([
            new ToolbarButton('Save', save_current_document, "Save current file"),
            new ToolbarButton('Save All', save_all_documents, "Save all open buffers"),
            new ToolbarButton('Revert', revert_current_document, "Revert the current buffer to an earlier state.")
        ]);
        mRestoreAutosaveButton = self.addButtonGroup([
            new ToolbarButton('Restore Autosave', restore_autosave, "There is an autosaved document more recent than your last save.", "btn-warning")
        ]).hide();

        var sim_group = [];
        $.each(schematic_view.schematic_tools,function (index,info) {
            sim_group.push(new ToolbarButton(info[0],function() { run_simulation(info[2]); },info[1]));
        });
        self.addButtonGroup(sim_group);

        mContainer.append(mToolbarHolder);
        mContainer.css('position', 'relative');

        // Add something to hold our editor tabs
        mTabHolder = $('<ul class="nav nav-tabs">');
        mContainer.append(mTabHolder);

        $(window).on('beforeunload', handle_page_unload);

        if(!Editor.IsSetUp) {
            // Do some one-time setup.

            Editor.IsSetUp = true;
        }

        // Load any prior tabs we have or show some handy tips.
        if(!restore_tabs()) display_initial_tips();
    };

    var do_save = function(document) {
        if(!document) document = mCurrentDocument;
        if(!document) return false;
        FileSystem.saveFile(document.name, document.editor.getValue(), function() {
            // Mark the file as clean.
            document.editor.clear_modified();
            document.generation = document.editor.changeGeneration();
            document.autosaveGeneration = document.generation;
            clear_autosave(document);
            handle_change_tab_icon(document);
        });
    };

    var do_autosave = function(document) {
        if(document.editor.isClean(document.autosaveGeneration) || document.isAutosaving) return;
        document.isAutosaving = true;
        clear_autosave(document);
        var generation = document.editor.changeGeneration();
        FileSystem.makeAutoSave(document.name, document.editor.getValue(), function() {
            document.isAutosaving = false;
            document.autosaveGeneration = generation;
        }, function() {
            document.isAutosaving = false;
            console.warn("Autosave failed.");
        });
    };

    var handle_page_unload = function() {
        for(var name in mOpenDocuments) {
            if(!_.has(mOpenDocuments, name)) continue;
            var doc = mOpenDocuments[name];
            if(!doc.editor.isClean(doc.generation)) {
                return "You have unsaved files. If you leave the page you will lose your unsaved work.";
            }
        }
    };

    var store_tabs = function() {
        localStorage['6004_' + mSyntaxMode + '_tabs'] = JSON.stringify(self.filenames());
    };

    var restore_tabs = function() {
        var filenames = localStorage['6004_' + mSyntaxMode + '_tabs'];
        if(!filenames) return false; // Default state
        filenames = JSON.parse(filenames);
        _.each(filenames, function(f) { self.openFile(f, false); });
        return !!filenames.length;
    };

    // Re-opens whatever tabs the user had open last time.
    // Returns true if there are any such tabs, false otherwise.
    var display_initial_tips = function() {
        if(!_.isEmpty(mOpenDocuments)) return;
        var tip = "To create a file or folder, hover over the desired parent folder on the left and click the " +
            "new file or new folder icons. To open a file or folder, single click it in the list on the left. " +
            "You can move files by dragging them from their existing location to the desired one.";
        mTipHolder = $('<div class="editor-tips">').html(tip);
        mContainer.append(mTipHolder);
        mShowingTips = true;
    };

    var clear_initial_tips = function() {
        if(!mShowingTips) return;
        mShowingTips = false;
        mTipHolder.remove();
    };

    initialise();
};
Editor.Completions = {};
Editor.IsSetUp = false;
