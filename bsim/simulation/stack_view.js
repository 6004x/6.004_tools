BSim.StackView = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mTable = null;
    var mLastSP = null;
    var mCurrentAnnotations = [];
    var mWriteHighlight = [];
    var mReadHighlight = [];
    var mCurrentLabelRows = [];

    // Handy constants
    var SP = 29;
    var BP = 27;

    var beta_resize_memory = function(length) {
        mTable.startBatch();
        var zero_word = BSim.Common.FormatWord(0);
        var word_length = Math.ceil(length / 4);

        mTable.empty();
        for(var i = 0; i < length; i += 4) {
            mTable.insertRow(['', BSim.Common.FormatWord(i, 4), zero_word]);
        }
        mTable.endBatch();
    };

    var beta_change_word = function(address, value) {
        mTable.updateCell(address / 4, 2, BSim.Common.FormatWord(value));
    };

    var beta_bulk_change_word = function(words) {
        mTable.startBatch();
        for(var word in words) {
            beta_change_word(word, words[word]);
        }
        mTable.endBatch();
    };

    var beta_change_register = function(register, value) {
        if(register == SP) {
            var row = value / 4;
            if(row >= mTable.rowCount()) return;
            mTable.startBatch();
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
            if(mBeta.isOptionSet('annotate')) {
                mTable.startBatch();
                clear_annotations();
                annotate_stack(mBeta.readRegister(BP), true);
                mTable.endBatch();
            }
        }
    };

    var clear_annotations = function() {
        mTable.startBatch();
        _.each(mCurrentAnnotations, function(value) {
            mTable.updateCell(value, 0, value == mLastSP ? 'SP' : '');
        });
        mTable.endBatch();
    };

    var annotate_stack = function(bp, top_frame) {
        if(!bp || bp > mBeta.readRegister(SP)) return;
        var row = bp / 4;
        if(top_frame) {
            annotate(row, 'BP');
        }
        annotate(--row, 'oldBP');
        annotate(--row, 'oldLP');

        try {
            var return_instruction = mBeta.memory.readWord(mBeta.memory.readWord(bp - 8));
            // If this instruction looks like DEALLOCATE (ie, SUBC), assume we have a
            // number of arguments equal to however many words we allocated.
            if(BSim.Common.FixUint(return_instruction & 0xFFFF0000) == 0xC7BD0000) {
                var arg_count = (return_instruction & 0xFFFF) >> 2;
                for(var arg = 1; arg <= arg_count; ++arg) {
                    annotate(--row, 'arg' + arg);
                }

                // Continue recursively.
                annotate_stack(mBeta.memory.readWord(bp - 4), false);
                }
        } catch (e) {
            // if readWord fails, we're done with annotations
        }
    };

    var annotate = function(row, value) {
        mTable.updateCell(row, 0, value);
        mCurrentAnnotations.push(row);
    };

    var beta_bulk_change_register = function(registers) {
        mTable.startBatch();
        for(var register in registers) {
            beta_change_register(register, registers[register]);
        }
        mTable.endBatch();
    };

    var beta_write_word = function(address) {
        handle_beta_thing(address, 'last-write', 'a', mWriteHighlight);
    };

    var beta_read_word = function(address) {
        handle_beta_thing(address, 'last-read', 'b', mReadHighlight);
    };

    var handle_beta_thing = function(address, cls, cls_prefix, list) {
        mTable.startBatch();
        var row = address / 4;
        for (var i = list.length - 1; i >= 0; i--) {
            mTable.removeRowClass(list[i], cls_prefix + (i));
            if(i <= 3) mTable.addRowClass(list[i], cls_prefix + (i+1));
            else mTable.removeRowClass(list[i], cls);
        }
        if(list.length > 5) list.pop();

        list.unshift(row);
        mTable.addRowClass(row, cls);
        mTable.addRowClass(row, cls_prefix + '0');
        mTable.endBatch();
    };

    var beta_bulk_read_word = function(addresses) {
        mTable.startBatch();
        _.each(addresses, beta_read_word);
        mTable.endBatch();
    };

    var beta_bulk_write_word = function(addresses) {
        mTable.startBatch();
        _.each(addresses, beta_write_word);
        mTable.endBatch();
    };

    var beta_bulk_change_labels = function(labels) {
        mTable.startBatch();
        for (var i = mCurrentLabelRows.length - 1; i >= 0; i--) {
            mCurrentLabelRows[i].updateCell(mCurrentLabelRows[i], 1, BSim.Common.FormatWord(mCurrentLabelRows[i]*4, 4));
        }
        for(var address in labels) {
            address = parseInt(address, 10);
            mTable.updateCell(address / 4, 1, labels[address]);
        }
        mTable.endBatch();
    };

    this.resize = function(height) {
        mTable.resize(height);
    };

    var initialise = function() {
        var height = mContainer.data('height') || 350;
        mTable = new BigTable(container, 170, height, 22, 3);

        mBeta.on('change:word', beta_change_word);
        mBeta.on('change:bulk:word', beta_bulk_change_word);
        mBeta.on('resize:memory', beta_resize_memory);
        mBeta.on('change:register', beta_change_register);
        mBeta.on('change:bulk:register', beta_bulk_change_register);
        mBeta.on('write:word', beta_write_word);
        mBeta.on('read:word', beta_read_word);
        mBeta.on('read:bulk:word', beta_bulk_read_word);
        mBeta.on('write:bulk:word', beta_bulk_write_word);
        mBeta.on('change:bulk:labels', beta_bulk_change_labels);
    };
    initialise();
};
