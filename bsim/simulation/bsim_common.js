BSim.Common = {
    RegisterName: function(reg) {
        var special = {
            27: 'BP',
            28: 'LP',
            29: 'SP',
            30: 'XP'
        };
        if(special[reg]) return special[reg];
        else return 'R' + reg;
    },
    FormatWord: function(value, length) {
        // Fix up negative numbers
        value = BSim.Common.FixUint(value|0);
        // Default to a full representation of the 32-bit value
        if(!length) length = 8;
        var s = value.toString(16);
        console.log(s);
        console.log(s.length - length);
        // Truncate, if necessary
        s = s.substr(Math.max(0, s.length - length), length);
        // Zero pad, if necessary
        while(s.length < length) s = "0" + s;
        return s;
    },
    FixUint: function(value) {
        if (value < 0) value = 0xFFFFFFFF + value + 1;
        return value;
    }
};
