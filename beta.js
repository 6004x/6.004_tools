BSim.Beta = function(mem_size) {
    this.mMemory = new Uint8Array(mem_size);
    this.mRegisters = new Int32Array(32);
    this.mPC = 0;
    XP = 30;
    SP = 29;
    LP = 28;
    BP = 27;
    SUPERVISOR_BIT = 0x80000000;

    public = {};

    this.loadBytes = function(bytes) {
        for(var i = 0; i < bytes.length; ++i) {
            this.writeByte(i, bytes[i]);
        }
    }
    public.loadBytes = this.loadBytes;

    this.readByte = function(address) {
        address &= ~SUPERVISOR_BIT; // Drop supervisor bit
        return this.mMemory[address];
    }
    public.readByte = this.readByte;

    this.readWord = function(address) {
        return (
            (this.readByte(address+3) << 24) |
            (this.readByte(address+2) << 16) |
            (this.readByte(address+1) << 8)  |
            this.readByte(address+0)
        )
    }
    public.readWord = this.readWord;

    this.writeByte = function(address, value) {
        address &= ~SUPERVISOR_BIT;
        this.mMemory[address] = value;
    }
    public.writeByte = this.writeByte;

    this.writeWord = function(address, value) {
        this.writeByte(address + 3, (value >>> 24) & 0xFF);
        this.writeByte(address + 2, (value >>> 16) & 0xFF);
        this.writeByte(address + 1, (value >>> 8) & 0xFF);
        this.writeByte(address + 0, (value & 0xFF));
    }
    public.writeWord = this.writeWord;

    this.readRegister = function(register) {
        if(register == 31) return 0;
        return this.mRegisters[register];
    }
    public.readRegister = this.readRegister;

    this.writeRegister = function(register, value) {
        if(register == 31) return;
        this.mRegisters[register] = value;
    }
    public.writeRegister = this.writeRegister;

    this.setPC = function(address, allow_supervisor) {
        if(!(this.mPC & SUPERVISOR_BIT) && !allow_supervisor) address &= ~SUPERVISOR_BIT;
        this.mPC = address & 0xFFFFFFFC;
    }

    this.getPC = function() {
        return this.mPC;
    }

    this.signExtend16 = function(value) {
        value &= 0xFFFF;
        if(value & 0x8000) {
            value = value - 0x10000;
        }
        return value;
    }

    this.decodeInstruction = function(instruction) {
        var has_literal = !!((instruction >> 30) & 1);
        var opcode = (instruction >> 26) & 0x3F;
        var rc = (instruction >> 21) & 0x1F;
        var rb = (instruction >> 16) & 0x1F;
        var ra = (instruction >> 11) & 0x1F;
        var literal = this.signExtend16(instruction & 0xFFFF);
        if(has_literal) {
            ra = rb;
            rb = null;
        } else {
            literal = null;
        }

        return {
            has_literal: has_literal,
            opcode: opcode,
            ra: ra,
            rb: rb,
            rc: rc,
            literal: literal
        };
    }

    this.runCycle = function() {
        var instruction = this.readWord(this.mPC);
        var decoded = this.decodeInstruction(instruction);
        console.log(decoded);
        var fn = BSim.Beta.Instructions[decoded.opcode];
        if(!fn) {
            // Illegal opcode.
            this.handleIllegalInstruction(decoded);
        }
        this.mPC += 4;
        console.log("New PC: " + this.mPC);
        if(decoded.has_literal) {
            console.log("Calling opcodec " + decoded.opcode);
            fn.call(this, decoded.ra, decoded.rc, decoded.literal);
        } else {
            console.log("Calling opcode " + decoded.opcode);
            fn.call(this, decoded.ra, decoded.rb, decoded.rc);
        }
    }
    public.runCycle = this.runCycle;

    return this;
};
