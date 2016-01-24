BSim.Controls = function(container, beta, editor, schematic) {
    var mContainer = $(container);
    var mBeta = beta;
    var mEditor = editor;
    var mSchematic = schematic;
    var mGroup = $('<div class="btn-group">');
    var mResetButton = null;
    var mUndoButton = null;
    var mRunButton = null;
    var mFastRunButton = null;
    var mStepButton = null;
    //var mVerifyButton = null;
    var mViewChange = null;
    //var mSaveMemory = null;
    var mCacheButton = null;

    var mToolbar = null;

    var toggle_run = function() {
        if(mBeta.isRunning()) {
            mBeta.stop();
        } else {
            mBeta.run(1);
        }
    };

    var handle_fast_run = function() {
        mBeta.run(25000); // Subject to tweaking. Very large values may cause UI sluggishness on slow browsers.
    };

    var handle_step = function() {
        mEditor.metadata_count('step');
        mBeta.executeCycle();
        mUndoButton.enable();
        if(mBeta.verifier()) {
            //mVerifyButton.enable();
        }
    };

    var handle_reset = function() {
        mBeta.reset();
    };

    var complete_checkoff = function(old) {
        var collaborators = old.inputContent(0);
        old.dismiss();
        BSim.SubmitVerification(mBeta, mEditor, collaborators, function(success, text) {
            var dialog = new ModalDialog();
            if(success) {
                dialog.setTitle("Checkoff complete");
                dialog.setContent(text);
            } else {
                dialog.setTitle("Checkoff failed");
                dialog.setContent("There was an error communicating with the server.");
            }
            dialog.addButton('Dismiss', 'dismiss');
            dialog.show();
        });
    };

    var present_user_form = function(old) {
        old.dismiss();
        var dialog = new ModalDialog();
        dialog.setTitle("Submit Lab");
        //dialog.inputBox({label: "Username", callback: complete_checkoff});
        //dialog.inputBox({label: "Password", type: 'password', callback: complete_checkoff});
        dialog.inputBox({label: "Collaborators", callback: complete_checkoff});
        dialog.addButton("Dismiss", "dismiss");
        dialog.addButton("Submit", complete_checkoff, 'btn-primary');
        dialog.show();
    };

    var handle_checkoff = function() {
        mEditor.metadata_count('checkoff');
        var verifier = mBeta.verifier();
        var dialog = new ModalDialog();
        dialog.setTitle("Checkoff Result").addButton("Dismiss", "dismiss");
        if(!verifier) {
            dialog.setText("No verification statements found.");
            return;
        }
        if(!verifier.verify()) {
            dialog.setContent(verifier.getMessage());
            $('#checkoff-failure').html(verifier.getMessage());
        } else {
            $('#checkoff-failure').empty();
            dialog.setText("Checkoff complete!");
            dialog.addButton("Submit", present_user_form, 'btn-primary'); // dummy button for now.
        }
        dialog.show();
    };

    this.get_checkoff = function() {
        var verifier = mBeta.verifier();
        if(!verifier) return undefined;
        var result = {};
        result[verifier.getChecksum().toString()] = verifier.verify() ? "passed" : verifier.getMessage() || '';
        return result;
    };
    
    var beta_run_start = function() {
        mEditor.metadata_count('run');
        mRunButton.setLabel('icon-pause');
        mStepButton.disable();
        mFastRunButton.disable();
        mUndoButton.disable();
        if(mBeta.verifier()) {
            //mVerifyButton.enable();
        }
    };

    var beta_run_stop = function() {
        mRunButton.setLabel('icon-play');
        mStepButton.enable();
        mFastRunButton.enable();
        mUndoButton.enable();

        if (mEditor && mEditor.save_to_server) mEditor.save_to_server();
    };

    var beta_resize_memory = function(size) {
        if(size === 0) {
            mRunButton.disable();
            mFastRunButton.disable();
            mStepButton.disable();
            //mVerifyButton.disable();
            mUndoButton.disable();
            mResetButton.disable();
        } else {
            mRunButton.enable();
            mFastRunButton.enable();
            mStepButton.enable();
            mResetButton.enable();
        }
    };

    var handle_undo = function() {
        mBeta.undoCycle();
        if(mBeta.undoLength() === 0) {
            mUndoButton.disable();
        }
    };

    var change_view = function() {
        $('#programmer-view, #schematic-view').toggle();
        if($('#schematic-view').filter(':hidden').length) {
            mSchematic.stopUpdating();
        } else {
            mSchematic.startUpdating();
        }
        BSim.SchematicView.Scale();
    };

    var handle_save_memory = function() {
        var mem = mBeta.getMemory().contents();

        // convert memory contents to ascii hex numbers
        var i,hex = [];
        for (i = 0; i < mem.length; i += 1) {
            hex.push("0x" + ("0000000" + mem[i].toString(16)).substr(-8));
        }

        // format with 8 locations per line
        var text = [];
        for (i = 0; i < hex.length; i += 8) {
            text.push("+ "+hex.slice(i,Math.min(i+8,hex.length)).join(' '));
        }
        text = text.join('\n');

        // Save to the file "memory.contents"
        FileSystem.saveFile('memory.contents',text,function () {});
    };

    var handle_cache = function () {
        $('.cache-information').toggle();
    };

    var initialise = function() {
        mResetButton = new ToolbarButton('icon-fast-backward', handle_reset, 'Reset Simulation');
        mUndoButton = new ToolbarButton('icon-step-backward', handle_undo, 'Step Back');
        mRunButton = new ToolbarButton('icon-play', toggle_run);
        mFastRunButton = new ToolbarButton('icon-forward', handle_fast_run, 'Run Fast');
        mStepButton = new ToolbarButton('icon-step-forward', handle_step, 'Step Forward');
        //mVerifyButton = new ToolbarButton('Checkoff', handle_checkoff);
        mViewChange = new ToolbarButton(mContainer.parents('#schematic-view').length ? "Programmer's View" : 'Schematic View', change_view);
        //mSaveMemory = new ToolbarButton('icon-file', handle_save_memory, "Save memory contents");
        mCacheButton = new ToolbarButton('Cache', handle_cache);


        mToolbar = new Toolbar(mContainer);

        mToolbar.addButtonGroup([mResetButton, mUndoButton, mStepButton, mRunButton, mFastRunButton]);
        //mToolbar.addButtonGroup([mVerifyButton]);
        mToolbar.addButtonGroup([mViewChange]);
        //mToolbar.addButtonGroup([mSaveMemory]);
        mToolbar.addButtonGroup([mCacheButton]);

        mBeta.on('run:start', beta_run_start);
        mBeta.on('run:stop', beta_run_stop);
        mBeta.on('resize:memory', beta_resize_memory);
        beta_resize_memory(0); // There is no content on initial load.
    };

    initialise();
};
