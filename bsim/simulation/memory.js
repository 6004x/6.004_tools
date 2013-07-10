BSim.Beta.Memory = function(size) {
    var self = this;
    var mMemory = new Uint8Array(0);

    this.loadBytes = function(bytes) {
        mMemory = new Uint8Array(bytes.length);
        for(var i = 0; i < bytes.length; ++i) {
            mMemory[i] = bytes[i];
        }
    };

    this.readByte = function(address) {
        return mMemory[address];
    };

    this.readWord = function(address) {
        address &= 0xFFFFFFFC; // Force multiples of four.
        return (
            (self.readByte(address+3) << 24) |
            (self.readByte(address+2) << 16) |
            (self.readByte(address+1) << 8)  |
            self.readByte(address+0)
        );
    };

    this.writeByte = function(address, value) {
        mMemory[address] = value;
    };

    this.writeWord = function(address, value, notify) {
        value |= 0; // force to int.
        address &= 0xFFFFFFFC; // Force multiples of four.
        this.writeByte(address + 3, (value >>> 24) & 0xFF);
        this.writeByte(address + 2, (value >>> 16) & 0xFF);
        this.writeByte(address + 1, (value >>> 8) & 0xFF);

        this.writeByte(address + 0, (value & 0xFF));
    };

    this.size = function() {
        return mMemory.length;
    };
};
