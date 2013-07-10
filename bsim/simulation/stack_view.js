BSim.StackView = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mTable = null;
    var mLastSP = null;
    var mCurrentAnnotations = [];

    // Handy constants
    var SP = 29;
    var BP = 27;

    var beta_resize_memory = function(length) {
        var zero_word = BSim.Common.FormatWord(0);
        var word_length = Math.ceil(length / 4);

        mTable.empty();
        for(var i = 0; i < length; i += 4) {
            mTable.insertRow(['', BSim.Common.FormatWord(i, 4), zero_word]);
        }
    };

    var beta_change_word = function(address, value) {
        mTable.updateCell(address / 4, 2, BSim.Common.FormatWord(value));
    };

    var beta_bulk_change_word = function(words) {
        for(var word in words) {
            beta_change_word(word, words[word]);
        }
    };

    var beta_change_register = function(register, value) {
        if(register == SP) {
            mTable.startBatch();
            var row = value / 4;
            if(mLastSP !== null) {
                mTable.removeRowClass(mLastSP, 'current-sp');
                mTable.updateCell(mLastSP, 0, '');
            }
            mLastSP = row;
            mTable.addRowClass(row, 'current-sp');
            mTable.updateCell(row, 0, 'SP');
            mTable.scrollTo(row, 'bottom');
            mTable.endBatch();
        }
        if(register == BP || register == SP) {
            mTable.startBatch();
            clear_annotations();
            annotate_stack(mBeta.readRegister(BP), true);
            mTable.endBatch();
        }
    };

    var clear_annotations = function() {
        _.each(mCurrentAnnotations, function(value) {
            mTable.updateCell(value, 0, value == mLastSP ? 'SP' : '');
        });
    };

    var annotate_stack = function(bp, top_frame) {
        console.log("annotate_stack(" + bp + ", " + top_frame + ")");
        if(!bp || bp > mBeta.readRegister(SP)) return;
        var row = bp / 4;
        if(top_frame) {
            annotate(row, 'BP');
        }
        annotate(--row, 'oldBP');
        annotate(--row, 'oldSP');

        var return_instruction = mBeta.readWord(mBeta.readWord(bp - 8));
        // If this instruction looks like ALLOCATE, assume we have a number of arguments
        // equal to however many words we allocated.
        if(BSim.Common.FixUint(return_instruction & 0xFFFF0000) == 0xC7BD0000) {
            var arg_count = (return_instruction & 0xFFFF) >> 2;
            for(var arg = 1; arg <= arg_count; ++arg) {
                annotate(--row, 'arg' + arg);
            }

            // Continue recursively.
            annotate_stack(mBeta.readWord(bp - 4), false);
        }
    };

    var annotate = function(row, value) {
        mTable.updateCell(row, 0, value);
        mCurrentAnnotations.push(row);
    };

    var beta_bulk_change_register = function(registers) {
        for(var register in registers) {
            beta_change_register(register, registers[register]);
        }
    }

    var initialise = function() {
        mTable = new BigTable(container, 150, 350, 22, 3);

        mBeta.on('change:word', beta_change_word);
        mBeta.on('change:bulk:word', beta_bulk_change_word);
        mBeta.on('resize:memory', beta_resize_memory);
        mBeta.on('change:register', beta_change_register);
        mBeta.on('change:bulk:register', beta_bulk_change_register);
    };
    initialise();
};
