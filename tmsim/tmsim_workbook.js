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

    var configuration = {};  // all state saved by server
    function tests_complete(filename,contents,checksum,nstates) {
        configuration.tests = {};
        if (checksum) {
            configuration.tests[checksum] = {filename: filename,contents:contents,nstates:nstates};
        }
        editor.save_to_server();
    }

    tmsim = new TMSIM(editor,'#tmsim_div',tests_complete);
    var tsmparse = new TSMparser();
    tmsim.assemble = function () {
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
            for (var i = 0; i < e.length; i++)
                editor.markErrorLine(file.name, e[i].message, e[i].lineNumber - 1);
            valid = false;
        }
        if(valid){
            tmsim.restartTSM(file, '#tmsim_div', tmsimObj.tsm, tmsimObj.lists, tmsimObj.checkoff );
        }
    };
    editor.addButtonGroup([new ToolbarButton('TMSim assemble', tmsim.assemble, '')]);

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
    //  workbook interface
    //////////////////////////////////////////////////    

    editor.save_to_server = function () {
    };

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
            editor.save_to_server = function (callback) {
                // update answer object
                var state = {
                    tests: configuration.tests,
                    required_tests: configuration.required_tests,
                    state: editor.get_all_documents(true),
                    last_saved: Date.now()
                };

                answer.value = JSON.stringify(state);

                answer.message = undefined;
                answer.check = undefined;
                
                // if there are tests, see if they've been run
                var completed_tests = state['tests'];
                if (completed_tests) {
                    // make sure all required tests passed
                    answer.check = 'right';
                    $.each(state.required_tests || [],function (index,test) {
                        // test results: {filename: , contents: , nstates: }
                        var result = (completed_tests[test] || 'Test has not been run: '+test);
                        if (result === undefined) {
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
            // configuration includes state, initial_state, required_tests, tests
            // state and initial_state are objects mapping buffer_name -> contents
            configuration = JSON.parse(answer.value);

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
