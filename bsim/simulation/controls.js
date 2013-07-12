BSim.Controls = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mGroup = $('<div class="btn-group">');
    var mResetButton = $('<button class="btn btn-reset"><i class="icon-fast-backward"></i></button>');
    var mUndoButton = $('<button class="btn btn-undo"><i class="icon-step-backward"></i></button>');
    var mRunButton = $('<button class="btn btn-run"><i class="icon-play"></i></button>');
    var mFastRunButton = $('<button class="btn btn-fast-run"><i class="icon-forward"></i></button>');
    var mStepButton = $('<button class="btn btn-step"><i class="icon-step-forward"></i></button>');
    var mVerifyButton = $('<button class="btn btn-verify">Checkoff</button>');

    var toggle_run = function() {
        if(mBeta.isRunning()) {
            mBeta.stop();
        } else {
            mBeta.run(1);
        }
    };

    var handle_fast_run = function() {
        mBeta.run(12500); // Subject to tweaking. Very large values may cause UI sluggishness on slow browsers.
    };

    var handle_step = function() {
        mBeta.executeCycle();
        mUndoButton.removeAttr('disabled');
    };

    var handle_reset = function() {
        mBeta.reset();
    };

    var handle_checkoff = function() {
        var verifier = mBeta.verifier();
        if(!verifier) {
            alert("No verification statements found.");
        }
        if(!verifier.verify()) {
            alert(verifier.getMessage());
        } else {
            alert("Checkoff complete!");
        }
    };

    var beta_run_start = function() {
        mRunButton.find('i').removeClass('icon-play').addClass('icon-pause');
        mStepButton.attr("disabled", "disabled");
        mFastRunButton.attr("disabled", "disabled");
        mUndoButton.attr('disabled', 'disabled');
    };

    var beta_run_stop = function() {
        mRunButton.find('i').addClass('icon-play').removeClass('icon-pause');
        mStepButton.removeAttr("disabled");
        mFastRunButton.removeAttr("disabled");
        mUndoButton.removeAttr('disabled');
    };

    var handle_undo = function() {
        mBeta.undoCycle();
        if(mBeta.undoLength() === 0) {
            mUndoButton.attr('disabled', 'disabled');
        }
    };

    var initialise = function() {
        mRunButton.click(toggle_run);
        mStepButton.click(handle_step);
        mResetButton.click(handle_reset);
        mFastRunButton.click(handle_fast_run);
        mUndoButton.click(handle_undo);
        mVerifyButton.click(handle_checkoff);
        mGroup.append(mResetButton, mUndoButton, mStepButton, mRunButton, mFastRunButton);
        mContainer.addClass('btn-toolbar').append(mGroup);
        mContainer.append(mVerifyButton);

        mBeta.on('run:start', beta_run_start);
        mBeta.on('run:stop', beta_run_stop);
    };

    initialise();
};
