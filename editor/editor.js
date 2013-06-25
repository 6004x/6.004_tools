var Editor = function(container, mode) {
    var self = this; // Tracking 'this' can be finicky; use 'self' instead.
    var mContainer = $(container);
    var mToolbarHolder; // Element holding the toolbar
    var mTabHolder; // Element holding the tabs
    var mCurrentDocument = null; // Current document object
    var mSyntaxMode = mode; // The syntax mode for the editors
    var mExpectedHeight = null; // The height the entire editor view (including toolbars and tabs) should maintain
    var mUntitledDocumentCount = 0; // The number of untitled documents (used to name the next one)

    var mOpenDocuments = {}; // Mapping of document paths to editor instances.

    this.addButtonGroup = function(buttons) {
        var group = $('<div class="btn-group">');
        _.each(buttons, function(button) {
            button.render(group);
        });
        mToolbarHolder.append(group);
    };

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

    var closeTab = function(doc) {
        if(!doc) return;
        if(!doc.cm.isClean(doc.generation)) {
            alert("Document has unsaved changes!\nTODO: Handle this.");
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

    this.focusTab = function(filename) {
        focusTab(mOpenDocuments[filename]);
    };

    this.unfocusTab = function(filename) {
        unfocusTab(mOpenDocuments[filename]);
    };

    this.closeTab = function(filename) {
        closeTab(mOpenDocuments[filename]);
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
            mode: mode
        });
        cm.on('save', function() {
            alert("This would save, if it had anything to save to.");
        });
        return cm;
    };

    var handle_change_tab_icon = function(doc) {
        var close = doc.tab.find('.close');
        if(!doc.cm.isClean(doc.generation)) {
            close.text("\u25CF"); // U+25CF BLACK CIRCLE
        } else {
            close.text("\u00D7"); // U+00D7 MULTILPICATION SIGN
        }
    };

    var tab_mouse_enter = function() {
        $(this).text("\u00D7"); // U+00D7 MULTILPICATION SIGN
    };

    this.openTab = function(filename, content, activate) {
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

        var a = $('<a>', {href: '#' + id}).text(filename).click(function(e) { e.preventDefault(); focusTab(doc); });
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
        cm.on('change', function() {
            handle_change_tab_icon(doc);
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

    this.doc = function(filename) {
        return mOpenDocuments[filename];
    };

    // Why does doing anything vertically suck so much?
    this.setHeight = function(height) {
        mExpectedHeight = height;
        mContainer.height(height);
        var offset = mCurrentDocument.el.position().top;
        _.each(mOpenDocuments, function(doc) {
            doc.cm.getWrapperElement().style.height = (height - offset) + 'px';
            doc.cm.refresh();
        });
    };

    var create_new_document = function() {
        self.openTab(null, '', true);
    };

    var save_current_document = function() {
        if(!mCurrentDocument) return;
        do_save();
    };

    var initialise = function() {
        // Build up our editor UI.
        mToolbarHolder = $('<div class="btn-toolbar">');
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

        // Do some one-time setup.
        if(!Editor.IsSetUp) {
            CodeMirror.commands.save = do_save;
            CodeMirror.keyMap.macDefault['Cmd-/'] = 'toggleComment';
            CodeMirror.keyMap.pcDefault['Ctrl-/'] = 'toggleComment';
            Editor.IsSetUp = true;
        }
    };

    var do_save = function() {
        alert("This would save if there was anywhere useful to save to.");
    };

    initialise();
};
Editor.IsSetUp = false;

var ToolbarButton = function(icon, callback, tooltip) {
    var self = this;
    var mTooltip = tooltip;
    var mIcon = icon;
    var mCallback = callback;
    var mElement = null;

    self.render = function(container) {
        if(mElement) {
            mElement.remove();
            mElement = null;
        }
        // Special case: if 'icon' is a string starting with 'icon-', assume they wanted a Bootstrap icon.
        // Otherwise it's whatever jQuery makes of it.
        if(/^icon-/.test(mIcon)) {
            mIcon = $('<i>').addClass(mIcon);
        }
        mElement = $('<button class="btn">').append(mIcon);
        if(mTooltip) {
            mElement.tooltip({title: mTooltip, placement: 'top', delay: 100, container: 'body'});
        }
        if(mCallback) {
            mElement.click(mCallback);
        }
        container.append(mElement);
    };
};
