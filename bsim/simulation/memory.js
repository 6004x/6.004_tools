BSim.Beta.Memory = function(size) {
    var self = this;
    var mMemory = new Uint32Array(0);

    this.loadBytes = function(bytes) {
        mMemory = new Uint32Array(bytes.length / 4);
        for(var i = 0; i < bytes.length; i += 4) {
            mMemory[i/4] = (bytes[i+3] << 24) |
                           (bytes[i+2] << 16) |
                           (bytes[i+1] << 8)  |
                            bytes[i+0];
        }
    };

    this.readWord = function(address) {
        return mMemory[address >> 2];
    };

    this.writeWord = function(address, value) {
        value |= 0; // force to int.
        mMemory[address >> 2] = value;
    };

    this.size = function() {
        return mMemory.length * 4;
    };
};
