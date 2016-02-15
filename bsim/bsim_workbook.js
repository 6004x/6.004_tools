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

        if (editor.save_to_server) editor.save_to_server();

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
            var cinfo = $('.cache-information');
            $(window).on('resize cache-resize',function() {
                var height = window_height() - difference;
                if (cinfo.is(':visible')) height -= cinfo.outerHeight();
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
    //  workbook interface
    //////////////////////////////////////////////////    

    var configuration = {};  // all state saved by server
    var controls;

    function update_tests() {
        try {
            var checkoff = controls.get_checkoff();
            if (checkoff !== undefined) {
                // key is checksum
                $.each(checkoff,function(cksum,result) {
                    configuration.tests = {'test': result=='passed' ? cksum : result};
                });
            }
        } catch(e) {
            // do nothing...
        }
    }

    // accept initialization message from host, remember where
    // to send update messages when local state changes
    $(window).on('message',function (event) {
        event = event.originalEvent;
        if (event.origin != window.location.origin) return;

        var host = event.source;
        // {value: {buffer_name: "contents",...}, check: , message: , id: }
        var answer = JSON.parse(event.data);

        // change save_to_server to communicate with host
        if (answer.id) {
            //editor.AUTOSAVE_TRIGGER_EVENTS = 1; // Number of events to trigger an autosave.
            editor.save_to_server = function (callback) {
                // update answer object
                var state = {
                    tests: configuration.tests,
                    required_tests: configuration.required_tests,
                    state: editor.get_all_documents(true)
                };

                answer.value = JSON.stringify(state);
                answer.message = undefined;
                answer.check = undefined;
                
                // if there are tests, see if they've been run
                update_tests();
                var completed_tests = state['tests'];
                if (completed_tests) {
                    // make sure all required tests passed
                    answer.check = 'right';
                    var cksum = configuration.tests.test;  // simulation cksum
                    $.each(state.required_tests || [],function (index,test) {
                        if (test != cksum) {
                            answer.message = 'Test failed';
                            answer.check = 'wrong';
                        }
                    });
                }

                // send it to our host
                host.postMessage(JSON.stringify(answer),window.location.origin);
                
                // done...
                if (callback) callback();
            };
        }

        if (answer.value) {
            // configuration includes state, initial_state, required-tests, tests
            // state and initial_state are objects mapping buffer_name -> contents
            configuration = JSON.parse(answer.value);

            // open editor tabs for each saved buffer
            editor.closeAllTabs();
            var first = true;

            function setup_tab(name,contents,select,read_only) {
                // if initial contents looks like a URL, load it!
                var load = contents.lastIndexOf('url:',0) === 0;
                var doc = editor.openTab(name,load ? 'Loading '+contents : contents,select,null,read_only);
                if (load) {
                    $.ajax(contents.substr(4),{
                        dataType: 'text',
                        error: function(jqXHR,textStatus,errorThrown) {
                            editor.load_initial_contents(doc,'Oops, error loading '+contents);
                        },
                        success: function(data,jqXHR,textStatus,errorThrown) {
                            editor.load_initial_contents(doc,data);
                        }
                    });
                }
            }

            $.each(configuration.initial_state || {},function (name,contents) {
                setup_tab(name,contents,false,true);
            });
            $.each(configuration.state || {},function (name,contents) {
                setup_tab(name,contents,first,false);
                first = false;
            });

            $('.editor-file-control').hide();     // hide file buttons
            $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)
        }
    });

    if (window.parent !== window) {
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
