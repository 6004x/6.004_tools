JSim = {};

$(function() {
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


    // Make an editor
    var editor = new Editor('#editor', 'jsim');
    
    function dls(){
        split.split();
        editor.clearErrors();
        var content = editor.content()
        var filename = editor.currentTab();
        div = $('#simulation-pane');
        try{
            Simulator.simulate(content,filename,div);
        } catch (err) {
            editor.markErrorLine(filename, err.message, err.line-1, err.column);
        }
    }

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('Simulate (device)', dls, 'Device-level simulation'), new ToolbarButton('Export')]);
    editor.addButtonGroup([new ToolbarButton('Clear Errors', function() {
        editor.clearErrors();
    })]);
    // And a couple of tabs.
    editor.openTab('foo.jsim', '// Transient analysis test\n'+
'V1 n1 gnd step(1,0,1u)\n'+
'R1 n1 n2 1k\n'+
'C1 n2 gnd 1n\n'+
'.tran 5u\n'+
'.plot n1 n2\n');
    var set_height = function() {
        editor.setHeight(document.documentElement.clientHeight - 80); // Set height to window height minus title.
    }
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

});
