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
        if(widths[2] == 0) {
            $('#maximise_editor').addClass('active').siblings().removeClass('active');
        } else if(widths[0] == 0 && widths[1] == 0) {
            $('#maximise_simulation').addClass('active').siblings().removeClass('active');
        } else {
            $('#split_pane').addClass('active').siblings().removeClass('active');
        }
    });
    
    // set up the results pane
    $('#simulation-pane').append($('<div class="btn-toolbar" id="graph-toolbar"></div>'),
                                 $('<div id="results"></div>'),
                                 $('<div id="graphScrollOuter">\
<div id="graphScrollInner"></div></div>')
                                );
    
    $('#results').data("current",null);

    // Make an editor
    var mode = 'jsim';
    var editor = new Editor('#editor', mode);
    
    FileSystem.setup('https://6004.mattpf.net:6004/');
    Folders.setup('#filetree', editor, mode);
    
    
    function dls(){
        $('#split_pane').click();
        editor.clearErrors();
        Checkoff.reset();
        var content = editor.content();
        div = $('#results');
        if (!content){
            return;
        }
        var filename = editor.currentTab();
        Simulator.simulate(content,filename,div,error_catcher);
    }
    
    function gls(){
        var content = editor.content();
        editor.clearErrors();
        div = $('#results');
        if (!content){
            return;
        }
        var filename = editor.currentTab();
        GateSimulator.simulate(content,filename,div,error_catcher);
    }
    
    function error_catcher(err){
        if (err instanceof Parser.CustomError){
            if (editor.filenames().indexOf(err.filename) == -1){
                FileSystem.getFile(err.filename,function(obj){
                    editor.openTab(err.filename,obj.data,true);
                    editor.markErrorLine(err.filename, err.message, err.line-1, err.column);
                })
            } else {
                editor.markErrorLine(err.filename, err.message, err.line-1, err.column);
            }
        } else {
            throw err;
        }
    }

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('<img src="simulate.png"> Simulate',
                                             dls, 'Device-level Simulation'),
                           new ToolbarButton('<img src="gatesim.png"> Simulate',
                                             gls, 'Gate-level Simulation')]);
    
    editor.addButtonGroup([new ToolbarButton('Checkoff',function(){
        try{
            Checkoff.testResults();
        } catch (err) {
            error_catcher(err);
        }
    },"Checkoff")])
    
    Simulator.setup();
    var set_height = function() {
        editor.setHeight(document.documentElement.clientHeight - 80); // Set height to window height minus title.
    }
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

});
