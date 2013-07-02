BSim.Controls = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mGroup = $('<div class="btn-group">');
    var mResetButton = $('<button class="btn btn-reset"><i class="icon-fast-backward"></i></button>');
    var mRunButton = $('<button class="btn btn-run"><i class="icon-play"></i></button>');
    var mStepButton = $('<button class="btn btn-step"><i class="icon-step-forward"></i></button>');
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
        mRunButton.find('i').removeClass('icon-play').addClass('icon-pause');
        mStepButton.attr("disabled", "disabled");
        mQuantumSize.attr("disabled", "disabled");
    };

    var beta_run_stop = function() {
        mRunButton.find('i').addClass('icon-play').removeClass('icon-pause');
        mStepButton.removeAttr("disabled");
        mQuantumSize.removeAttr("disabled");
    };

    var initialise = function() {
        mRunButton.click(toggle_run);
        mStepButton.click(handle_step);
        mResetButton.click(handle_reset);
        mGroup.append(mResetButton, mRunButton, mStepButton);
        mContainer.addClass('btn-toolbar').append(mGroup, mQuantumSize);

        mBeta.on('run:start', beta_run_start);
        mBeta.on('run:stop', beta_run_stop);
    };

    initialise();
};
