JSim = {};

$(function() {
    
    var split = new SplitPane('#split-container', ['#filetree', '#editor-pane', '#simulation-pane']);
    split.setPaneWidth(0, 200);
    split.setPaneWidth(1, $(window).width() - 220);
    split.setPaneWidth(2, 0);

    // Set up the split buttons.
    $('#maximise_editor').click(function() {
        split.setPaneWidth(0, 200);
        split.setPaneWidth(1, $(window).width() - 220);
        split.setPaneWidth(2, 0);
    });
    $('#split_pane').click(function() {
        var width = $(window).width() - 20;
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, width/2);
        split.setPaneWidth(2, width/2);
    });
    $('#maximise_simulation').click(function() {
        var width = $(window).width() - 20;
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, 0);
        split.setPaneWidth(2, width);
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
    });
    
    // set up the results pane
    $('#simulation-pane').append($('<div class="btn-toolbar" id="graph-toolbar"></div>'),
                                 $('<div id="results"></div>'),
                                 $('<div id="graphScrollOuter">\
<div id="graphScrollInner"></div></div>')
                                );
    
    $('#results').data("current",null);
    
    FileSystem.setup('https://6004.mattpf.net:6004/');
//    FileSystem.setup('https://localhost:6004');

    // Make an editor
    var mode = 'jsim';
    var editor = new Editor('#editor', mode);
    Folders.setup('#filetree', editor, mode);
    
    
    function dls(){
        $('#split_pane').click();
        editor.clearErrors();
        Checkoff.reset();
        var content = editor.content();
        var div = $('#results');
        if (!content){
            return;
        }
        var filename = editor.currentTab();
        Simulator.simulate(content,filename,div,error_catcher,"device");
    }
    
    function gls(){
        var content = editor.content();
        editor.clearErrors();
        var div = $('#results');
        if (!content){
            return;
        }
        var filename = editor.currentTab();
        Simulator.simulate(content,filename,div,error_catcher,"gate");
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
                                             gls, 'Gate-level Simulation')]);
    
    editor.addButtonGroup([new ToolbarButton('Checkoff',function(){
        try{
            Checkoff.testResults();
        } catch (err) {
            error_catcher(err);
        }
    },"Checkoff")]);
    
    Plot.setup();
    var set_height = function() {
        editor.setHeight(document.documentElement.clientHeight - 80); // Set height to window height minus title.
    };
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

});
