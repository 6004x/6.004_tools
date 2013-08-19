BSim.SchematicView = function(schematic, beta) {
    var mBeta = beta;
    var mSchematic = $(schematic);
    var mStylesheet = null;
    var mRules = {};
    var mUpdating = false;
    var mCurrentPC = 0;

    this.startUpdating = function() {
        mUpdating = true;
        beta_change_pc(mCurrentPC);
    };

    this.stopUpdating = function() {
        mUpdating = false;
    };

    var setValue = function(signal, value) {
        if(value === null) {
            value = '_';
        } else if(signal == 'alufn') { // ugly hack for non-numeric al
        } else {
            value |= 0;
        }

        if(signal != 'alufn') {
            var cls = signal + String(value);
            var index = mStylesheet.cssRules.length;
            mStylesheet.insertRule('.' + cls + ' polyline, .' + cls + ' rect, .' + cls + ' polygon { stroke: black; }', index);
            mStylesheet.insertRule('.' + cls + ' text { fill: black; }', index+1);
            mStylesheet.insertRule('.' + cls + ' text.path-value { fill: blue; visibility: visible; }', index+2);
            mRules[signal] = [index, index+1, index+2];
        }

        $('#'+signal+'-value').text(value);
    };

    var clearStylesheet = function() {
        while(mStylesheet.cssRules.length) {
            mStylesheet.deleteRule(0);
        }
        mRules = {};
    }

    var beta_change_pc = function(pc) {
        mCurrentPC = pc;
        if(!mUpdating) return;
        try {
            var word = mBeta.readWord(pc);
        } catch(e) {
            return;
        }
        var decoded = mBeta.decodeInstruction(word);
        var op = BSim.Beta.Opcodes[decoded.opcode];
        var paths;
        if(op === undefined) {
            paths = {
                alufn: null,
                werf: 1,
                wdsel: 0,
                wr: 0,
                ra2sel: 0,
                pcsel: 3,
                asel: null,
                wasel: 1
            };
        } else {
            paths = op.paths;
        }
        if(paths.pcsel == 'z') {
            paths.pcsel = (!mBeta.readRegister(decoded.ra))|0;
        } else if(paths.pcsel == '~z') {
            paths.pcsel = (!!mBeta.readRegister(decoded.ra))|0;
        }
        clearStylesheet();
        _.each(paths, function(value, key) {
            setValue(key, value);
        });

        // Update all the path value displays, as appropriate.
        var address_sum = decoded.literal*4 + pc + 4;
        var reg_out_a = mBeta.readRegister(decoded.ra);
        var reg_in_b = paths.ra2sel ? decoded.rc : decoded.rb;
        var reg_out_b = mBeta.readRegister(reg_in_b);
        var alu_a = paths.asel ? address_sum : reg_out_a;
        var alu_b = paths.bsel ? decoded.literal : mBeta.readRegister(paths.ra2sel ? decoded.rc : decoded.rb);
        var alu_out = do_alu(paths.alufn, alu_a, alu_b);
        var reg_write_value;
        switch(paths.wdsel) {
            case 0:
                reg_write_value = pc + 4;
                break;
            case 1:
                reg_write_value = alu_out;
                break;
            case 2:
                reg_write_value = mBeta.readWord(alu_out);
                break;
        }
        var pcsel_out;
        switch(paths.pcsel) {
            case 4:
                pcsel_out = 8;
                break;
            case 3:
                pcsel_out = 4;
                break;
            case 2:
                pcsel_out = reg_out_a;
                break;
            case 1:
                pcsel_out = address_sum;
                break;
            case 0:
                pcsel_out = pc + 4;
                break;
        }
        $('.pc-plus4-value').text(BSim.Common.FormatWord(pc + 4));
        $('.instruction-value').text(BSim.Common.FormatWord(word));
        $('.raa-value').text(BSim.Common.FormatWord(decoded.ra, 2));
        $('.rab-value').text(BSim.Common.FormatWord(reg_in_b, 2));
        $('.raw-value').text(BSim.Common.FormatWord(paths.wasel ? 30 : decoded.rc, 2));
        $('.address-adder-value').text(BSim.Common.FormatWord(address_sum));
        $('.rda-value').text(BSim.Common.FormatWord(reg_out_a));
        $('.rdb-value').text(BSim.Common.FormatWord(reg_out_b));
        $('.bsel1-value').text(BSim.Common.FormatWord(decoded.literal));
        $('.alua-value').text(BSim.Common.FormatWord(alu_a));
        $('.alub-value').text(BSim.Common.FormatWord(alu_b));
        $('.alu-out-value').text(BSim.Common.FormatWord(alu_out));
        $('.rdw-value').text(BSim.Common.FormatWord(reg_write_value));
        $('.pcsel-out-value').text(BSim.Common.FormatWord(pcsel_out));
        $('.pc-value').text(BSim.Common.FormatWord(pc));
    }

    var do_alu = function(operation, a, b) {
        switch(operation) {
            case '+':
                return a + b;
            case '&':
                return a & b;
            case '=':
                return (a == b)|0;
            case '<=':
                return (a <= b)|0;
            case '<':
                return (a < b)|0;
            case '/':
                return (a / b)|0;
            case 'A':
                return a;
            case '*':
                return (a * b);
            case '|':
                return (a | b);
            case '<<':
                return a << b;
            case '>>>':
                return a >>> b;
            case '>>':
                return a >> b;
            case '-':
                return a - b;
            case '^':
                return a ^ b;
            case '~^':
                return ~(a ^ b);
            case null:
                return 0;
            default:
                console.warn("Unknown ALU operation: " + operation);
                return 0;
        };
    };

    var initialise = function() {
        mStylesheet = $('<style>').appendTo('head')[0].sheet;
        mBeta.on('change:pc', beta_change_pc);
    };


    initialise();
};    
// HACK: This really should use fewer random IDs.
BSim.SchematicView.Scale = function() {
    var scaleX = $('#schematic-view').width() / 940;
    var scaleY = ($(window).height() - $('#schematic-holder').offset().top - 20) / 600;
    var scale = Math.min(scaleX, scaleY);
    var scale_prop = 'scale(' + scale + ')';
    $('#schematic-holder').css({
        '-webkit-transform': scale_prop,
        '-moz-transform': scale_prop,
        '-ms-transform': scale_prop,
        'transform': scale_prop
    });
}
