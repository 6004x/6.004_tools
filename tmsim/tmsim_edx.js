var tmsim;
$(document).ready(function(){
    var mode = 'tsim';
    var editor = new Editor('#editor',mode,true);
    editor.openTab('Untitled', 'Now is the time...', true);
    $('.editor-file-control').hide();     // hide file buttons
    $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)

    var timer;
    $(window).resize(function() {
        clearTimeout(timer);
        if(tmsim)
            timer = setTimeout(tmsim.listToTape, 100);
    });
    function window_height() {
        return $(window).innerHeight();
    };
    var set_height = function() {
        editor.setHeight(window_height() - $('.btn-toolbar').height() - $('.nav-tabs').height() - 190);
    };
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.

    var configuration = {};  // all state saved by edX server
    function tests_complete(filename,contents,checksum,nstates) {
        if (configuration.tests === undefined)
            configuration.tests = {};
        configuration.tests[checksum] = {filename: filename,contents:contents,nstates:nstates};
    }

    tmsim = new TMSIM(editor,'#tmsim_div',tests_complete);
    var tsmparse = new TSMparser();
    function tmsimAssemble(){
        var file = new Object();
        file.name=editor.currentTab();
        file.data=editor.content('assemble');
        
        var valid = true;
        var tmsimObj;

        try{
            var parsedDict = tsmparse.parse(file.data);
            editor.clearErrors();
            // editor.openTab(file.name+'parsed', JSON.stringify(parsedDict), true);
            tmsimObj = tsmparse.flattenMachine(parsedDict);
            // editor.openTab(file.name+'done', tsmparse.getResults(), true);
        } catch(e){
            console.log(e.stack );
            for (var i = 0; i < e.length; i++)
                editor.markErrorLine(file.name, e[i].message, e[i].lineNumber - 1);
            valid = false;
        }
        if(valid){
            tmsim.restartTSM(file, '#tmsim_div', tmsimObj.tsm, tmsimObj.lists, tmsimObj.checkoff );
        }
    }
    editor.addButtonGroup([new ToolbarButton('TMSim assemble', tmsimAssemble, '')]);

    function start_over() {
        var dialog = new ModalDialog();
        dialog.setTitle("Revert Assignment");
        dialog.setContent("Click OK to discard all work on this problem and start over again.");
        dialog.addButton("OK", function(){
            dialog.dismiss();
            delete configuration.state;
            delete configuration.tests;
            tmsim.setState(JSON.stringify(configuration));
        }, 'btn-primary');
        dialog.addButton("Cancel", "dismiss");
        dialog.show();
    }
    editor.addButtonGroup([new ToolbarButton('Restart Assignment', start_over, 'Delete all edits, restart assignment')]);

    //////////////////////////////////////////////////    
    //  edX interface
    //////////////////////////////////////////////////    

    // return JSON representation to be used by server-side grader
    tmsim.getGrade = function () {
        var grade = {'tests': configuration.tests || {}};
        return JSON.stringify(grade);
    };

    // return JSON representation of persistent state
    tmsim.getState = function () {
        // start with all the ancillary information
        var state = $.extend({},configuration);

        // gather up contents of editor buffers
        state.state = editor.get_all_documents();

        return JSON.stringify(state);
    };

    // process incoming state from jsinput framework
    // This function will be called with 1 argument when JSChannel is not used,
    // 2 otherwise. In the latter case, the first argument is a transaction 
    // object that will not be used here (see http://mozilla.github.io/jschannel/docs/)
    tmsim.setState = function () {
        var stateStr = arguments.length === 1 ? arguments[0] : arguments[1];

        // jsinput gets anxious if we don't respond quickly, so come back to
        // initialization after we've returned and made jsinput happy.
        setTimeout(function () {
            configuration = JSON.parse(stateStr);

            // open editor tabs for each of the available designs
            editor.closeAllTabs();
            var first = true;
            $.each(configuration.state || configuration.initial_state || {},
                   function (name,contents) {
                       editor.openTab(name,contents,first);
                       first = false;
                   });

            $('.editor-file-control').hide();     // hide file buttons
            $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)
        },1);
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

        channel.bind("getGrade", tmsim.getGrade);
        channel.bind("getState", tmsim.getState);
        channel.bind("setState", tmsim.setState);

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
