BSim.Beta.Memory = function() {
    var self = this;
    var mMemory = new Uint32Array(0);
    var mMemoryFlags = new Uint8Array(0);
    var mOriginalMemory = new Uint32Array(0);

    this.loadBytes = function(bytes) {
        var words = Math.ceil(bytes.length / 4);
        mMemory = new Uint32Array(words);
        mOriginalMemory = new Uint32Array(words);
        mMemoryFlags = new Uint8Array(words);
        for(var i = 0; i < bytes.length; i += 4) {
            mMemory[i/4] = (bytes[i+3] << 24) |
                           (bytes[i+2] << 16) |
                           (bytes[i+1] << 8)  |
                            bytes[i+0];
        }
        mOriginalMemory = new Uint32Array(mMemory);
    };

    this.reset = function() {
        mMemory = new Uint32Array(mOriginalMemory);
    };

    this.contents = function() {
        return mMemory;
    };

    this.readWord = function(address) {
        address >>= 2;
        if(address < 0 || address >= mMemory.length) {
            throw new BSim.Beta.RuntimeError("Attempted to read out of bounds address 0x" + BSim.Common.FormatWord(address << 2));
        }
        return mMemory[address];
    };

    this.writeWord = function(address, value) {
        value |= 0; // force to int.
        address >>= 2;
        if(address < 0 || address >= mMemory.length) {
            throw new BSim.Beta.RuntimeError("Attempted to write out of bounds address 0x" + BSim.Common.FormatWord(address << 2));
        }
        if(mMemoryFlags[address]) {
            throw new BSim.Beta.RuntimeError("Attempted write to protected memory at 0x" + BSim.Common.FormatWord(address << 2));
        }
        mMemory[address] = value;
    };

    this.size = function() {
        return mMemory.length * 4;
    };

    this.setProtectedRegions = function(regions) {
        _.each(regions, function(region) {
            var start_word = region.start / 4;
            var end_word = region.end / 4;
            for(var i = start_word; i < end_word && i < mMemoryFlags.length; ++i) {
                mMemoryFlags[i] = true;
            }
        });
    };

    this.isProtected = function(address) {
        return !!mMemoryFlags[address >> 2];
    };
};
