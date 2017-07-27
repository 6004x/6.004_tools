BSim.RegfileView = function(container, beta) {
    // Build a table. Yes; I'm a terrible person.
    var mContainer = $(container);
    var mTable = $('<table class="regfile">');
    var mRegisterValueCells = new Array(32);
    var mBeta = beta;

    var update_register = function(register, value) {
        var txt = BSim.Common.FormatWord(value);

        if (register == 'base') $('.base').text(txt);
        else if (register == 'bounds') $('.bounds').text(txt);
        else mRegisterValueCells[register].text(txt);
    };

    var bulk_update_registers = function(registers) {
        for(var register in registers) {
            update_register(register, registers[register]);
        }
    };

    var read_register = function(registers) {
        mTable.find('td').removeClass('last-read');
        _.each(registers, function(register) {
            mRegisterValueCells[register].addClass('last-read').prev('td').addClass('last-read');
        });
    };

    var write_register = function(registers) {
        mTable.find('td').removeClass('last-write');
        _.each(registers, function(register) {
            mRegisterValueCells[register].addClass('last-write').prev('td').addClass('last-write');
        });
    };

    var initialise = function() {
        // Build up our table of registers.
        for(var i = 0; i < 8; ++i) {
            var tr = $('<tr>');
            for(var j = 0; j < 4; ++j) {
                tr.append($('<td class="register">').text(BSim.Common.RegisterName((i + j*8))));
                var cell = $('<td class="value">').text(BSim.Common.FormatWord(0));
                mRegisterValueCells[i+j*8] = cell;
                tr.append(cell);
            }
            mTable.append(tr);
        }
        mContainer.append(mTable);

        // Set up callbacks to update appropriate parts of the UI (or all of it)
        mBeta.on('change:register', update_register);
        mBeta.on('change:bulk:register', bulk_update_registers);
        mBeta.on('read:register', read_register);
        mBeta.on('write:register', write_register);
    };

    initialise();
};
