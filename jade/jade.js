Jade = {};

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
        set_height();
    });
    $('#split_pane').click(function() {
        var width = split.window_width();
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, width/2);
        split.setPaneWidth(2, width/2);
        set_height();
    });
    $('#maximise_simulation').click(function() {
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, 0);
        split.setPaneWidth(2, split.window_width());
        set_height();
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
        set_height();
    });

    // Make an editor
    var mode = 'jade';
    var editor = new Editor('#editor', mode);
    Folders.setup('#filetree', editor, mode);
    
    
    function window_height() {
        return $('.xblock-6004').innerHeight();
    };

    var set_height = function() {
        var eparent = $('#editor-pane').parent();
        editor.resize(eparent.width(),eparent.height());

        // limit the simulation pane's height to that of the editor pane
        var sim_pane = $('#simulation-pane');
        sim_pane.height($('#editor-pane').height());

        //$('.timing-analysis').height(sim_pane.height());

        var plots = $('.plot-container');
        if (plots.length > 0) {
            var h = $('.alert',sim_pane).outerHeight(true);
            plots[0].resize(plots[0],sim_pane.width(),sim_pane.height() - h);
        }
    };

    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

    /* fooling around with embedding in Hangout
    function share_buffers() {
        parent.postMessage(JSON.stringify({user: FileSystem.getUserName(), buffers: JSON.stringify(editor.get_all_documents())}),'*');
    }

    var helpq_button = false;
    $(window).on('message',function (event) {
            if (!helpq_button) {
                // add button to let user request help
                helpq_button = true;
                $('.global-controls').append('<li id="helpq"><a>Online help <span id="qstatus"></span></a></li>');
                $('#helpq').click(function() {
                        // add ourselves to the queue
                        parent.postMessage(JSON.stringify({user: FileSystem.getUserName()}),'*');
                    });

                // add button to let user share buffers
                editor.addButtonGroup([new ToolbarButton('Share',share_buffers, 'Share buffers in Hangout')]);
            }
            var state = JSON.parse(event.originalEvent.data);
            console.log('jsim:');
            console.log(state);
        });
    */
});
