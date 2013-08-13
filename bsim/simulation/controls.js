BSim.Controls = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mGroup = $('<div class="btn-group">');
    var mResetButton = null;
    var mUndoButton = null;
    var mRunButton = null;
    var mFastRunButton = null;
    var mStepButton = null;
    var mVerifyButton = null;
    var mViewChange = null;

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
        mBeta.executeCycle();
        mUndoButton.enable();
    };

    var handle_reset = function() {
        mBeta.reset();
    };

    var handle_checkoff = function() {
        var verifier = mBeta.verifier();
        var dialog = new ModalDialog();
        dialog.setTitle("Checkoff Result").addButton("Dismiss", "dismiss");
        if(!verifier) {
            dialog.setText("No verification statements found.");
            return;
        }
        if(!verifier.verify()) {
            dialog.setContent(verifier.getMessage());
        } else {
            dialog.setText("Checkoff complete!");
            dialog.addButton("Submit", _.identity, 'btn-primary'); // dummy button for now.
        }
        dialog.show();
    };

    var beta_run_start = function() {
        mRunButton.setLabel('icon-pause');
        mStepButton.disable();
        mFastRunButton.disable();
        mUndoButton.disable();
    };

    var beta_run_stop = function() {
        mRunButton.setLabel('icon-play');
        mStepButton.enable();
        mFastRunButton.enable();
        mUndoButton.enable();
    };

    var beta_resize_memory = function(size) {
        if(size === 0) {
            mRunButton.disable();
            mFastRunButton.disable();
            mStepButton.disable();
            mVerifyButton.disable();
            mUndoButton.disable();
            mResetButton.disable();
        } else {
            mRunButton.enable();
            mFastRunButton.enable();
            mStepButton.enable();
            mVerifyButton.enable();
            mResetButton.enable();
        }
    }

    var handle_undo = function() {
        mBeta.undoCycle();
        if(mBeta.undoLength() === 0) {
            mUndoButton.disable();
        }
    };

    var change_view = function() {
        $('#programmer-view, #schematic-view').toggle();
        BSim.SchematicView.Scale();
    }

    var initialise = function() {
        mResetButton = new ToolbarButton('icon-fast-backward', handle_reset, 'Reset Simulation');
        mUndoButton = new ToolbarButton('icon-step-backward', handle_undo, 'Step Back');
        mRunButton = new ToolbarButton('icon-play', toggle_run);
        mFastRunButton = new ToolbarButton('icon-forward', handle_fast_run, 'Run Fast');
        mStepButton = new ToolbarButton('icon-step-forward', handle_step, 'Step Forward');
        mVerifyButton = new ToolbarButton('Checkoff', handle_checkoff);
        mViewChange = new ToolbarButton(mContainer.parents('#schematic-view').length ? "Programmer's View" : 'Schematic View', change_view);

        mToolbar = new Toolbar(mContainer);

        mToolbar.addButtonGroup([mResetButton, mUndoButton, mStepButton, mRunButton, mFastRunButton]);
        mToolbar.addButtonGroup([mVerifyButton]);
        mToolbar.addButtonGroup([mViewChange]);

        mBeta.on('run:start', beta_run_start);
        mBeta.on('run:stop', beta_run_stop);
        mBeta.on('resize:memory', beta_resize_memory);
        beta_resize_memory(0); // There is no content on initial load.
    };

    initialise();
};
