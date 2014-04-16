JSim = {};

$(function() {
    var split = new SplitPane('#split-container', ['#filetree', '#editor-pane', '#simulation-pane']);

    // initial configuration
    split.setPaneWidth(0, 200);
    split.setPaneWidth(1, split.window_width() - 200);
    split.setPaneWidth(2, 0);

    // Set up the split buttons.
    $('#maximise_editor').click(function() {
        split.setPaneWidth(0, 200);
        split.setPaneWidth(1, split.window_width() - 200);
        split.setPaneWidth(2, 0);
    });
    $('#split_pane').click(function() {
        var width = split.window_width();
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, width/2);
        split.setPaneWidth(2, width/2);
    });
    $('#maximise_simulation').click(function() {
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, 0);
        split.setPaneWidth(2, split.window_width());
    });

    split.on('resize', function(widths) {
        if(widths[2] === 0) {
            $('#maximise_editor').addClass('active').siblings().removeClass('active');
        } else if(widths[0] === 0 && widths[1] === 0) {
            $('#maximise_simulation').addClass('active').siblings().removeClass('active');
        } else {
            $('#split_pane').addClass('active').siblings().removeClass('active');
        }
        if(widths[1] === 0) {
            editor.blur();
        }
        Simulator.resize();
    });
    
    // set up the results pane
    //$('#simulation-pane').append('<div id="results"></div>');
    //$('#results').data("current",null);

    // Make an editor
    var mode = 'jsim';
    var editor = new Editor('#editor', mode);
    Folders.setup('#filetree', editor, mode);
    
    
    function dls(){
        $('#split_pane').click();
        editor.clearErrors();
        Checkoff.reset();
        var content = editor.content('simulate');
        if (!content) return;
        var filename = editor.currentTab();
        Simulator.simulate(editor,content,filename,$('#simulation-pane'),error_catcher,"device");
    }
    
    function gls(){
        $('#split_pane').click();
        editor.clearErrors();
        Checkoff.reset();
        var content = editor.content('simulate');
        if (!content) return;
        var filename = editor.currentTab();
        Simulator.simulate(editor,content,filename,$('#simulation-pane'),error_catcher,"gate");
    }

    function ta(){
        $('#split_pane').click();
        editor.clearErrors();
        var content = editor.content('analyze');
        if (!content) return;
        var filename = editor.currentTab();
        Simulator.timing_analysis(editor,content,filename,$('#simulation-pane'),error_catcher);
    }
    
    function error_catcher(err){
        if (err instanceof Parser.CustomError){
            if (editor.filenames().indexOf(err.filename) == -1){
                editor.openFile(err.filename, true, function(editor_filename){
                    editor.markErrorLine(editor_filename, err.message, err.line-1, err.column);
                });
            } else {
                editor.markErrorLine(err.filename, err.message, err.line-1, err.column);
            }
        } else {
            throw err;
        }
    }

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('<img src="simulate.png" style="position:relative;bottom:1px">',
                                             dls, 'Device-level Simulation'),
                           new ToolbarButton('<img src="gatesim.png" style="position:relative;bottom:2px">',
                                             gls, 'Gate-level Simulation'),
                           new ToolbarButton('<img src="timing_analysis.png" style="position:relative;bottom:2px">',
                                             ta, 'Timing Analysis')
                          ]);
    
    editor.addButtonGroup([new ToolbarButton('Checkoff',function(){
        try{
            Checkoff.testResults();
            editor.metadata_count('checkoff');
        } catch (err) {
            error_catcher(err);
        }
    },"Checkoff")]);
    
    // setup things
    //Plot.setup();
    Checkoff.setEditor(editor);
    
    function window_height() {
        return $('.xblock-6004').innerHeight();
    };

    var set_height = function() {
        editor.setHeight(window_height() - $('.btn-toolbar').height() - $('.nav-tabs').height()); // Set height to window height minus title.
    };
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

    /*
    // support for online help

    // enroll in help queue
    $('#helpq').click(function() {
            window.open('https://hangoutsapi.talkgadget.google.com/hangouts?authuser=0&gid=849892182986','JSim_Hangout');
        });

    function share_buffers() {
        parent.postMessage(JSON.stringify({user: FileSystem.getUserName(), buffers: JSON.stringify(editor.get_all_documents())}),'*');
    }

    var helpq = false;
    $(window).on('message',function (event) {
            if (!helpq) {
                helpq = true;
                // no help button since we're already in a hangout
                $('#helpq').hide(); 
                // let server know we're waiting for help
                parent.postMessage(JSON.stringify({user: FileSystem.getUserName(), username: FileSystem.getUserFullName()}),'*');
                // add button to let user share buffers
                editor.addButtonGroup([new ToolbarButton('Share',share_buffers, 'Share buffers in Hangout')]);
            }

            var message = JSON.parse(event.originalEvent.data);
            console.log(message);
            if (message.buffers) {
                editor.closeAllTabs(true);
                var buffers = JSON.parse(message.buffers)
                for (filename in buffers) {
                    editor.openTab(filename,buffers[filename],true,undefined,true);
                };
            }
        });
    */
});
