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
    var editor = new Editor('#editor', 'uasm');

    var do_assemble = function() {
        var filename = editor.currentTab();
        var content = editor.content();
        var assembler = new BetaAssembler();
        editor.clearErrors();
        assembler.assemble(filename, content, function(success, errors) {
            if(!success) {
                _.each(errors, function(error) {
                    editor.markErrorLine(error.file, error.message, error.line - 1, error.column);
                });
            } else {
                alert("Assembled successfully!");
            }
        });
    }

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('Assemble', do_assemble, 'Runs your program!'), new ToolbarButton('Export')]);
    editor.addButtonGroup([new ToolbarButton('Clear Errors', function() {
        editor.clearErrors();
    })]);
    // And a couple of tabs.
    editor.openTab('foo.uasm', '// Stuff goes here');
    var set_height = function() {
        editor.setHeight(document.documentElement.clientHeight - 80); // Set height to window height minus title.
    }
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.
});
