// Creates an editor in the given container for the given mode.
// - `container` should be a DOM node or unique CSS selector
// - `mode` should be one of 'uasm', 'tsim' or 'jsim' as appropriate.
var Editor = function(container, mode) {
    var self = this; // Tracking 'this' can be finicky; use 'self' instead.
    var mContainer = $(container);
    var mToolbarHolder; // Element holding the toolbar
    var mToolbar;
    var mTabHolder; // Element holding the tabs
    var mCurrentDocument = null; // Current document object
    var mSyntaxMode = mode; // The syntax mode for the editors
    var mExpectedHeight = null; // The height the entire editor view (including toolbars and tabs) should maintain
    var mUntitledDocumentCount = 0; // The number of untitled documents (used to name the next one)
    var mAutocompleter = new Editor.Autocomplete(this, mode);

    var mOpenDocuments = {}; // Mapping of document paths to editor instances.

    var mMarkedLines  = []; // List of lines we need to clear things from when requested.
   
    _.extend(this, Backbone.Events);

    // Given a list of ToolbarButtons, adds a button group.
    this.addButtonGroup = function(buttons) {
        mToolbar.addButtonGroup(buttons);
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
        return document.cm.getValue();
    };

    // Marks the given line in the given file as having an error, and displays it to the user.
    this.markErrorLine = function(filename, message, line, column) {
        var document = try_get_document(filename);
        if(!document) return false;
        var cm = document.cm;
        cm.addLineClass(line, 'background', 'cm-error-line');
        cm.addLineWidget(line, create_error_widget(message), {noHScroll: true, handleMouseEvents: true});
        focusTab(document);
        cm.scrollIntoView({line: line, ch: column});
        var handle = cm.lineInfo(line).handle;
        mMarkedLines.push({filename: filename, handle: handle});
    };

    // Clears all error markers in all files.
    this.clearErrors = function() {
        _.each(mMarkedLines, function(value) {
            if(mOpenDocuments[value.filename]) {
                var cm = mOpenDocuments[value.filename].cm;
                var line = cm.lineInfo(value.handle);
                if(!line) return;
                cm.removeLineClass(line.handle, "background", "cm-error-line");
                _.each(line.widgets, function(widget) {
                    widget.clear();
                });
            }
        });
        mMarkedLines = [];
    };


    // Highlight the given line by applying the CSS class cls
    // Returns an object with a clear() method that will remove the class again.
    this.addLineClass = function(filename, line, cls) {
        var document = try_get_document(filename);
        if(!document) return false;
        var handle = document.cm.addLineClass(line, 'background', cls);
        return {
            clear: function() {
                document.cm.removeLineClass(handle, 'background', cls);
            }
        };
    };

    // Focus on the given line in the given document (or the current if filename is null).
    // 'line' is the line number; 'chr' is the optional character on the line.
    this.showLine = function(filename, line, chr) {
        var document = try_get_document(filename);
        if(!document) return false;
        document.cm.scrollIntoView({line: line, chr: chr|0});
        return true;
    };

    // Opens a new tab with the given filename and content.
    // filename should be a full path to the file. If not given, the document will be called 'untitled'
    // If activate is true, the tab will be focused. If false, the tab will be focused only if there are
    // no other documents currently open.
    this.openTab = function(filename, content, activate) {
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
        var cm = create_cm_instance(editPane, content);
        var tab = $('<li>');

        var doc = {
            el: editPane, // jQuery element holding the editor
            tab: tab, // jQuery tab element
            cm: cm, // Editor instance
            has_location: has_location, // Whether we know this file's name (if false, we'll need to prompt)
            name: filename, // This file's name, temporary or otherwise
            generation: cm.changeGeneration() // The generation at last save. We can use this to track cleanliness of document.
        };

        var a = $('<a>', {href: '#' + id}).text(_.last(filename.split('/'))).click(function(e) { e.preventDefault(); focusTab(doc); });
        tab.append(a);
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
        cm.on('change', function(c, changeObj) {
            handle_change_tab_icon(doc);
            // Let our listeners know, too.
            self.trigger('change', filename, changeObj);
        });
        // Append all that stuff
        a.append(close);

        mTabHolder.append(tab);

        mContainer.append(editPane);

        // If we have no open documents, or we were explicitly asked to activate this document, do so.
        if(!_.size(mOpenDocuments) || activate) {
            unfocusTab(mCurrentDocument);
            focusTab(doc);
        }

        // Stash these away somewhere.
        mOpenDocuments[filename] = doc;
        // If we know how tall we should be, arrange to make sure everything still fits in that space.
        if(mExpectedHeight) self.setHeight(mExpectedHeight);
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
    this.setHeight = function(height) {
        if(!mCurrentDocument) return; // If we don't have a current document there is no height to set, so don't die over it.

        mExpectedHeight = height;
        mContainer.height(height);
        var offset = mCurrentDocument.el.position().top; // Gets the amount of unavailable space.
        _.each(mOpenDocuments, function(doc) {
            doc.cm.getWrapperElement().style.height = (height - offset) + 'px';
            doc.cm.refresh();
        });
    };

    // The below methods are private.
    var focusTab = function(doc) {
        doc.tab.find('a').tab('show');
        if(mCurrentDocument) mCurrentDocument.el.hide();
        doc.el.show().addClass('active');
        doc.cm.refresh();
        doc.cm.focus();
        mCurrentDocument = doc;
    };

    var unfocusTab = function(doc) {
        if(!doc) return;
        doc.el.removeClass("active").hide();
        doc.tab.removeClass('active');
    };

    var closeTab = function(doc, force) {
        if(!doc) return;
        if(!doc.cm.isClean(doc.generation) && !force) {
            var dialog = new ModalDialog();
            dialog.setTitle("Unsaved document");
            dialog.setContent("<p><strong>Do you want to save the changes you made to " + doc.name + "?</strong></p>"
                + "<p>Your changes will be lost if you don't save them.</p>");
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
            }
        }
        // Now get rid of this one.
        delete mOpenDocuments[doc.name];
        doc.el.remove();
        doc.tab.remove();
    };

    var create_error_widget = function(message) {
        var widget = $('<div class="cm-error-widget">');
        var span = $('<span>');
        span.text(message).appendTo(widget);
        return widget[0];
    };

    var create_cm_instance = function(container, content) {
        var cm = new CodeMirror(container[0], {
            indentUint: 4,
            lineNumbers: true,
            electricChars: true,
            matchBracktes: true,
            autoCloseBrackets: true,
            smartIndent: true,
            indentWithTabs: true,
            styleActiveLine: true,
            value: content,
            mode: mSyntaxMode,
            extraKeys: {
                Tab: function() {
                    var marks = cm.getAllMarks();
                    var cursor = cm.getCursor();
                    var closest = null;
                    var closest_mark = null;
                    var distance = Infinity;
                    for (var i = marks.length - 1; i >= 0; i--) {
                        var mark = marks[i];
                        var pos = mark.find();
                        if(pos === undefined) continue;
                        if(cursor.line >= pos.from.line - 5) {
                            if(cursor.line < pos.from.line || cursor.ch <= pos.from.ch) {
                                var new_distance = 10000 * (pos.from.line - cursor.line) + (pos.from.ch - cursor.ch);
                                if(new_distance < distance) {
                                    closest = pos;
                                    closest_mark = mark;
                                    distance = new_distance;
                                }
                            }
                        }
                    }
                    if(closest !== null) {
                        closest_mark.clear();
                        mAutocompleter.selectPlaceholder(cm, closest);
                    } else {
                        return CodeMirror.Pass;
                    }
                }
            }
        });
        cm.on('change', _.debounce(CodeMirror.commands.autocomplete, 800, false));
        return cm;
    };

    var handle_change_tab_icon = function(doc) {
        var close = doc.tab.find('.close');
        if(!doc.cm.isClean(doc.generation)) {
            close.text("\u25CF"); // U+25CF BLACK CIRCLE
        } else {
            close.text("\u00D7"); // U+00D7 MULTIPLICATION SIGN
        }
    };

    var tab_mouse_enter = function() {
        $(this).text("\u00D7"); // U+00D7 MULTIPLICATION SIGN
    };

    var create_new_document = function() {
        self.openTab(null, '', true);
    };

    var save_current_document = function() {
        if(!mCurrentDocument) return;
        do_save();
    };

    var try_get_document = function(filename) {
        var document;
        if(filename) document = mOpenDocuments[filename];
        else document = mCurrentDocument;
        if(!document) return false;
        return document;
    }

    var initialise = function() {
        // Build up our editor UI.
        mToolbarHolder = $('<div>');
        mToolbar = new Toolbar(mToolbarHolder);
        // Add some basic button groups
        self.addButtonGroup([
            new ToolbarButton('icon-file', create_new_document, "New file"),
            new ToolbarButton('icon-refresh'),
            new ToolbarButton('icon-hdd', save_current_document, "Save current file")
        ]);
        mContainer.append(mToolbarHolder);
        mContainer.css('position', 'relative');

        // Add something to hold our editor tabs
        mTabHolder = $('<ul class="nav nav-tabs">');
        mContainer.append(mTabHolder);

        $(window).on('beforeunload', handle_page_unload);

        // Do some one-time setup.
        if(!Editor.IsSetUp) {
            CodeMirror.commands.save = do_save;
            CodeMirror.commands.autocomplete = function(cm) {
                CodeMirror.showHint(cm, mAutocompleter.complete, {completeSingle: false});
            };

            // Add our keyboard shortcuts for the command to comment your code.
            CodeMirror.keyMap.macDefault['Cmd-/'] = 'toggleComment';
            CodeMirror.keyMap.pcDefault['Ctrl-/'] = 'toggleComment';

            CodeMirror.keyMap.macDefault['Ctrl-Space'] = 'autocomplete';
            CodeMirror.keyMap.pcDefault['Ctrl-Space'] = 'autocomplete';

            Editor.IsSetUp = true;
        }
    };

    var do_save = function() {
        if(!mCurrentDocument) return false;
        var current_document = mCurrentDocument; // Keep this around so we don't get confused if user changes tab.
        FileSystem.saveFile(current_document.name, current_document.cm.getValue(), function() {
            // Mark the file as clean.
            current_document.generation = current_document.cm.changeGeneration();
            handle_change_tab_icon(current_document);
        });
    };

    var handle_page_unload = function() {
        for(var name in mOpenDocuments) {
            if(!_.has(mOpenDocuments, name)) continue;
            var doc = mOpenDocuments[name];
            if(!doc.cm.isClean(doc.generation)) {
                return "You have unsaved files. If you leave the page you will lose your unsaved work.";
            }
        }
    };

    initialise();
};
Editor.Completions = {};
Editor.IsSetUp = false;
