BSim.DisassembledView = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mTable = new BigTable(mContainer, mContainer.data('width') || 450, mContainer.data('height') || 200, 22, 4);
    var mCurrentPC = 0;
    var mRowHeight = 0;
    var mScrollOffset = 0;
    var mInSupervisorMode = false;

    var disassemble_value = function(address, value) {
        var decoded = mBeta.decodeInstruction(value);
        var op = BSim.Beta.Opcodes[decoded.opcode];
        var deasm = "illop";
        if(op) deasm = op.disassemble.call(mBeta, decoded, parseInt(address));
        return deasm;
    };

    var beta_change_word = function(address, value) {
        mTable.updateCell(address / 4, 1, BSim.Common.FormatWord(value));
        mTable.updateCell(address / 4, 3, disassemble_value(address, value));
    };

    var beta_bulk_change_word = function(words) {
        for(var word in words) {
            beta_change_word(word, words[word]);
        }
    };

    var beta_bulk_change_labels = function(labels) {
        var length = mTable.rowCount();
        for(var i = 0; i < length; ++i) {
            var address = i*4;
            if(labels[address]) {
                mTable.updateCell(i, 2, labels[address] + ":");
            }
            mTable.updateCell(i, 3, disassemble_value(address, mBeta.readWord(address)));
        }
    };

    var beta_change_pc = function(new_pc) {
        var word = (new_pc & ~0x80000000) / 4;
        mTable.removeRowClass(mCurrentPC/4, 'current-instruction');
        mTable.addRowClass(word, 'current-instruction');
        if(new_pc & 0x80000000) {
            if(!mInSupervisorMode) {
                mContainer.addClass('supervisor-mode');
                mInSupervisorMode = true;
            }
        } else {
            if(mInSupervisorMode) {
                mContainer.removeClass('supervisor-mode');
                mInSupervisorMode = false;
            }
        }
        mTable.scrollTo(word);
        mCurrentPC = new_pc & ~0x80000000;
    };

    var beta_resize_memory = function(new_length) {
        build_rows(new_length);
    };

    var beta_set_breakpoints = function(breakpoints) {
        _.each(breakpoints, beta_set_breakpoint);
    };

    var beta_delete_breakpoints = function(breakpoints) {
        _.each(breakpoints, beta_delete_breakpoint);
    };

    var beta_set_breakpoint = function(breakpoint) {
        var row = breakpoint/4;
        mTable.addRowClass(row, 'breakpoint');
    };

    var beta_delete_breakpoint = function(breakpoint) {
        var row = breakpoint/4;
        mTable.removeRowClass(row, 'breakpoint');
    };

    var build_rows = function(length) {
        var zero_word = BSim.Common.FormatWord(0);
        var zero_instruction = disassemble_value(0, 0);
        var word_length = Math.ceil(length / 4);

        mTable.empty();
        for(var i = 0; i < length; i += 4) {
            mTable.insertRow([BSim.Common.FormatWord(i, 4), zero_word, '', zero_instruction]);
        }
    };

    var initialise = function() {
        mContainer.append(mTable);

        mBeta.on('change:word', beta_change_word);
        mBeta.on('change:pc', beta_change_pc);
        mBeta.on('change:bulk:word', beta_bulk_change_word);
        mBeta.on('resize:memory', beta_resize_memory);
        mBeta.on('add:bulk:breakpoint', beta_set_breakpoints);
        mBeta.on('delete:bulk:breakpoint', beta_delete_breakpoints);
        mBeta.on('add:breakpoint', beta_set_breakpoint);
        mBeta.on('delete:breakpoint', beta_delete_breakpoint);
        mBeta.on('change:bulk:labels', beta_bulk_change_labels);
    };

    initialise();
};
