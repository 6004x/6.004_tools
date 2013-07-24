JSim = {};

$(function() {
    FileSystem.setup('seterman', 'https://localhost:6004');
    
    var split = new SplitUI('#split-container', '#editor-pane', '#simulation-pane');
    split.maximiseLeft();

    var activeButton = function(callback) {
        return function() {
            $(this).siblings().removeClass('active');
            $(this).addClass('active');
            callback();
        };
    }

    // Set up the split buttons.
    $('#maximise_editor').click(activeButton(split.maximiseLeft));
    $('#split_pane').click(activeButton(split.split));
    $('#maximise_simulation').click(activeButton(split.maximiseRight));

    $('#simulation-pane').append($('<div class="btn-toolbar" id="graph-toolbar"></div>'),
                                 $('<div id="results"></div>'),
                                 $('<div id="graphScrollOuter">\
<div id="graphScrollInner"></div></div>')
                                );

    // Make an editor
    var mode = 'jsim';
    var editor = new Editor('#editor', mode);
    
    Folders.setup('.span3', editor, mode);

    Folders.refresh();
    
    function dls(){
        $('#split_pane').click();
        editor.clearErrors();
        var content = editor.content()
        var filename = editor.currentTab();
        div = $('#results');
        try{
            Simulator.simulate(content,filename,div);
        } catch (err) {
            if (err instanceof Parser.CustomError){
                editor.markErrorLine(filename, err.message, err.line-1, err.column);
            } else {
                throw err;
            }
        }
    }

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('<img src="simulate.png"> Simulate', dls, 'Device-level simulation')]);
    editor.addButtonGroup([new ToolbarButton('Clear Errors', function() {
        editor.clearErrors();
    })]);
    
    Simulator.setup();
    var set_height = function() {
        editor.setHeight(document.documentElement.clientHeight - 80); // Set height to window height minus title.
    }
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

});
