BSim.SchematicView = function(schematic, beta) {
    var mBeta = beta;
    var mSchematic = $(schematic);
    var mStylesheet = null;
    var mRules = {};

    var setValue = function(signal, value) {
        if(value === null) {
            value = '_';
        } else {
            value |= 0;
        }

        var cls = signal + String(value);
        var index = mStylesheet.cssRules.length;
        mStylesheet.insertRule('.' + cls + ' polyline, .' + cls + ' rect, .' + cls + ' polygon { stroke: black; }', index);
        mStylesheet.insertRule('.' + cls + ' text { fill: black; }', index+1);
        mStylesheet.insertRule('.' + cls + ' text.path-value { fill: blue; visibility: visible; }', index+2);
        mRules[signal] = [index, index+1, index+2];

        $('#'+signal+'-value').text(value);
    };

    var clearStylesheet = function() {
        while(mStylesheet.cssRules.length) {
            mStylesheet.deleteRule(0);
        }
        mRules = {};
    }

    var beta_change_pc = function(pc) {
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
        })
    }

    var initialise = function() {
        mStylesheet = $('<style>').appendTo('head')[0].sheet;
        mBeta.on('change:pc', beta_change_pc);
    };
    initialise();
};
