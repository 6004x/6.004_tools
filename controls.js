BSim.Controls = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mResetButton = $('<button class="btn btn-reset">Reset</button>');
    var mRunButton = $('<button class="btn btn-run">Run</button>');
    var mStepButton = $('<button class="btn btn-step">Step</button>');
    var mQuantumSize = $('<input type="range" min="1" max="50000" step="100" value="1">');

    var toggle_run = function() {
        if(mBeta.isRunning()) {
            mBeta.stop();
        } else {
            mBeta.run(mQuantumSize.val());
        }
    };

    var handle_step = function() {
        mBeta.executeCycle();
    };

    var handle_reset = function() {
        mBeta.reset();
    };

    var beta_run_start = function() {
        mRunButton.text("Stop");
        mStepButton.attr("disabled", "disabled");
        mQuantumSize.attr("disabled", "disabled");
    };

    var beta_run_stop = function() {
        mRunButton.text("Run");
        mStepButton.removeAttr("disabled");
        mQuantumSize.removeAttr("disabled");
    };

    var initialise = function() {
        mRunButton.click(toggle_run);
        mStepButton.click(handle_step);
        mResetButton.click(handle_reset);
        mContainer.append(mResetButton, mStepButton, mRunButton, mQuantumSize);

        mBeta.on('run:start', beta_run_start);
        mBeta.on('run:stop', beta_run_stop);
    };

    initialise();
};
