BSim.DisassebledView = function(container, beta) {
    var mContainer = $(container);
    var mBeta = beta;
    var mTable = $('<table class="disassembly">');
    var mTableRows = new Array(mBeta.memorySize() / 4);
    var mOperationCells = new Array(mBeta.memorySize() / 4);
    var mValueCells = new Array(mBeta.memorySize() / 4);
    var mCurrentPC = 0;
    var mRowHeight = 0;
    var mScrollOffset = 0;

    var disassemble_value = function(value) {
        var decoded = beta.decodeInstruction(value);
        var op = BSim.Beta.Opcodes[decoded.opcode];
        var deasm = "illop";
        if(op) deasm = op.disassemble(decoded);
        return deasm;
    };

    var beta_change_word = function(address, value) {
        mOperationCells[address/4].textContent = disassemble_value(value);
        mValueCells[address/4].textContent = BSim.Common.FormatWord(value);
    };

    var beta_bulk_change_word = function(words) {
        for(var word in words) {
            beta_change_word(word, words[word]);
        }
    };

    var beta_change_pc = function(new_pc) {
        var className = 'current-instruction';
        if(new_pc & 0x80000000) className += ' supervisor-mode';
        new_pc &= ~0x80000000;
        mTableRows[mCurrentPC/4].className = '';
        mTableRows[new_pc/4].className = className;
        mCurrentPC = new_pc;
        mContainer[0].scrollTop = (mRowHeight * (new_pc / 4)) - mScrollOffset;
    };

    var initialise = function() {
        var length = beta.memorySize();
        for(var i = 0; i < length; i += 4) {
            var word = beta.readWord(i);
            // Here we don't use jQuery because it's slow. Our use of textContent will fail in
            // IE ≤ 8, however.

            // var tr = $('<tr>');
            // var addr = $('<td class="address">').text(BSim.Common.FormatWord(i, 4) + ':');
            // var value = $('<td class="value">').text(BSim.Common.FormatWord(word));
            // var label = $('<td class="label" style="width: 7em;"></td>');
            // var operation = $('<td class="operation">');

            var tr = document.createElement('tr');

            var addr = document.createElement('td');
            addr.textContent = BSim.Common.FormatWord(i, 4) + ':';
            addr.className = 'address';

            var value = document.createElement('td');
            value.textContent = BSim.Common.FormatWord(word);
            value.className = 'value';

            var label = document.createElement('td');
            label.className = 'label';

            var operation = document.createElement('td');
            operation.className = 'operation';
            operation.textContent = disassemble_value(word);

            tr.appendChild(addr);
            tr.appendChild(value);
            tr.appendChild(label);
            tr.appendChild(operation);

            mTable.append(tr);
            mOperationCells[i/4] = operation;
            mValueCells[i/4] = value;
            mTableRows[i/4] = tr;
        }

        mContainer.append(mTable);
        mRowHeight = $(mTableRows[0]).height();
        mScrollOffset = $(mContainer).height() / 2 - mRowHeight / 2;

        mBeta.on('change:word', beta_change_word);
        mBeta.on('change:pc', beta_change_pc);
        mBeta.on('change:bulk:word', beta_bulk_change_word);
    };

    initialise();
};
