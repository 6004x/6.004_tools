BSim = {};

$(function() {
    var split = new SplitPane('#split-container', ['#editor-pane', '#simulation-pane']);

    $('.global-controls').append('<span style="margin-right:10px;">'+$('title').text()+'</span>');

    // initial configuration
    split.setPaneWidth(0, split.window_width());
    split.setPaneWidth(1, 0);

    // Set up the split buttons.
    $('#maximise_editor').click(function() {
        split.setPaneWidth(0, split.window_width());
        split.setPaneWidth(1, 0);
    });
    $('#split_pane').click(function() {
        var width = split.window_width();
        split.setPaneWidth(0, width/2);
        split.setPaneWidth(1, width/2);
    });
    $('#maximise_simulation').click(function() {
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, split.window_width());
    });

    split.on('resize', function(widths) {
        if(widths[1] === 0) {
            $('#maximise_editor').addClass('active').siblings().removeClass('active');
        } else if(widths[0] === 0) {
            $('#maximise_simulation').addClass('active').siblings().removeClass('active');
        } else {
            $('#split_pane').addClass('active').siblings().removeClass('active');
        }
        if(widths[0] === 0) {
            editor.blur();
        }
    });

    // Make an editor
    var editor = new Editor('#editor', 'uasm', true);
    editor.openTab('Untitled', 'Now is the time...', true);
    $('.editor-file-control').hide();     // hide file buttons
    $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)

    var do_assemble = function() {
        var filename = editor.currentTab();
        var content = editor.content('assemble');
        var metadata = editor.metadata();
        var assembler = new BetaAssembler(editor);
        editor.clearErrors();
        assembler.assemble(filename, content, metadata, function(success, result) {
            if(!success) {
                PassiveAlert("Assembly failed.", "error");
                _.each(result, function(error) {
                    if(!_.contains(editor.filenames(), error.file)) {
                        editor.openFile(error.file, true, function(editor_filename, content) {
                            editor.markErrorLine(editor_filename, error.message, error.line - 1, error.column);
                        });
                    } else {
                        editor.markErrorLine(error.file, error.message, error.line - 1, error.column);
                    }
                });
            } else {
                PassiveAlert("Assembled successfully", "success");
                beta.setSources(result.sources);
                beta.loadBytes(result.image,result.source_map);
                beta.setBreakpoints(result.breakpoints);
                beta.setLabels(result.labels);
                _.each(result.options, function(value, key) {
                    beta.setOption(key, value);
                });
                beta.getMemory().setProtectedRegions(result.protection);
                if(result.checkoff) {
                    if(result.checkoff.kind == 'tty') {
                        beta.setVerifier(new BSim.TextVerifier(beta, result.checkoff));
                    } else if(result.checkoff.kind == 'memory') {
                        beta.setVerifier(new BSim.MemoryVerifier(beta, result.checkoff));
                    }
                } else {
                    beta.setVerifier(null);
                }
                if(split.currentState()[1] === 0) {
                    $('#maximise_simulation').click();
                }
            }
        });
    };

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('Assemble', do_assemble, 'Runs your program!')]);

    function window_height() {
        return $('.xblock-6004').innerHeight();
    };

    var set_height = function() {
        editor.setHeight(window_height() - $('.btn-toolbar').height() - $('.nav-tabs').height()); // Set height to window height minus title.
    };
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.
    split.on('resize', _.throttle(editor.redraw, 50));

    // Stuff for the simulator
    var do_resize = function(holder, view, difference) {
        if(holder.parents('#programmer-view').length) {
            $(window).resize(function() {
                var height = window_height() - difference;
                view.resize(height);
                holder.css({height: height});
            });
        }
    };

    var beta = new BSim.Beta(80); // This starting number is basically irrelevant

    $('.regfile').each(function() {
        new BSim.RegfileView(this, beta);
    });

    $('.tty').each(function() {
        new BSim.TTY(this, beta);
    });

    $('.disassembly').each(function() {
        var view = new BSim.DisassembledView(this, beta);
        do_resize($(this), view, 470);
    });

    $('.memory').each(function() {
        var view = new BSim.MemoryView(this, beta);
        do_resize($(this), view, 272);
    });

    $('.stack').each(function() {
        var view = new BSim.StackView(this, beta);
        do_resize($(this), view, 272);
    });

    new BSim.Beta.ErrorHandler(beta);
    var schematic = new BSim.SchematicView($('svg.schematic'), beta);
    split.on('resize', BSim.SchematicView.Scale);
    $(window).resize(BSim.SchematicView.Scale);

    $('.program-controls').each(function() {
        controls = new BSim.Controls(this, beta, editor, schematic);
    });

    // Work around weird sizing bug.
    _.delay(function() {
        $(window).resize();
    }, 10);

    // // Convenient way of loading a file for testing and such.
    // var neuter = function(e) {
    //     e.stopPropagation();
    //     e.preventDefault();
    // };
    // $('body').on('dragenter', neuter);
    // $('body').on('dragover', neuter);
    // $('body').on('drop', function(e) {
    //     neuter(e);
    //     console.log(e);
    //     var dt = e.originalEvent.dataTransfer;
    //     var files = dt.files;

    //     if(files.length === 0) return;
    //     var file = files[0];
    //     beta.stop(); // Just in case.
    //     var reader = new FileReader();
    //     reader.onload = function(e) {
    //         console.log(e);
    //         //beta = new BSim.Beta(e.target.result.length);
    //         var result = new Uint8Array(e.target.result);
    //         beta.loadBytes(result);
    //         console.log("Loaded", result.length, "bytes");
    //     };
    //     reader.readAsArrayBuffer(file);
    // });

    // For debugging
    window.beta = beta;
    window.editor = editor;

    //////////////////////////////////////////////////    
    //  edX interface
    //////////////////////////////////////////////////    

    var configuration = {};  // all state saved by edX server
    var controls;

    function update_tests() {
        try {
            configuration.tests = {};
            var checkoff = controls.get_checkoff();
            if (checkoff !== undefined) {
                // key is checksum
                configuration.tests[checkoff] = 'passed';
            }
        } catch(e) {
            // do nothing...
        }
    }

    // return JSON representation to be used by server-side grader
    BSim.getGrade = function () {
        update_tests();
        var grade = {'tests': configuration.tests || {}};
        return JSON.stringify(grade);
    };

    // return JSON representation of persistent state
    BSim.getState = function () {
        update_tests();

        // start with all the ancillary information
        var state = $.extend({},configuration);
        delete state.initial_state;

        // gather up contents of editor buffers
        state.state = editor.get_all_documents(true);

        return JSON.stringify(state);
    };

    // process incoming state from jsinput framework
    // This function will be called with 1 argument when JSChannel is not used,
    // 2 otherwise. In the latter case, the first argument is a transaction 
    // object that will not be used here (see http://mozilla.github.io/jschannel/docs/)
    BSim.setState = function () {
        var stateStr = arguments.length === 1 ? arguments[0] : arguments[1];
        setTimeout(function () { BSim.setStateSync(stateStr); },1);
    };

    // 6.004 uses synchronous version...
    BSim.setStateSync = function (stateStr) {
        configuration = JSON.parse(stateStr);

        // open editor tabs for each saved buffer
        editor.closeAllTabs();
        var first = true;
        $.each(configuration.initial_state || {},
               function (name,contents) {
                   editor.openTab(name,contents,false,null,true);
               });
        $.each(configuration.state || {},
               function (name,contents) {
                   editor.openTab(name,contents,first);
                   first = false;
               });

        $('.editor-file-control').hide();     // hide file buttons
        $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)
    };
    
    // Establish a channel only if this application is embedded in an iframe.
    // This will let the parent window communicate with this application using
    // RPC and bypass SOP restrictions.
    var channel;
    if (window.parent !== window && channel === undefined) {
        channel = Channel.build({
            window: window.parent,
            origin: "*",
            scope: "JSInput"
        });

        channel.bind("getGrade", BSim.getGrade);
        channel.bind("getState", BSim.getState);
        channel.bind("setState", BSim.setState);

        // make iframe resizable if we can.  This may fail if we don't have
        // access to our parent...
        try {
            // look through all our parent's iframes
            $('iframe',window.parent.document).each(function () {
                // is this iframe us?
                if (this.contentWindow == window) {
                    // yes! so add css to enable resizing
                    $(this).css({resize:'both', overflow:'auto'});
                }
            });
        } catch (e) {
        }
    }

});
