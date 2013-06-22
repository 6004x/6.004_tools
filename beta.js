BSim.Beta = function(mem_size) {
    this.mMemory = new Uint8Array(mem_size);
    this.mRegisters = new Int32Array(32);
    this.mPC = 0x80000000;
    XP = 30;
    SP = 29;
    LP = 28;
    BP = 27;
    SUPERVISOR_BIT = 0x80000000;

    this.loadBytes = function(bytes) {
        for(var i = 0; i < bytes.length; ++i) {
            this.writeByte(i, bytes[i]);
        }
    };

    this.readByte = function(address) {
        address &= ~SUPERVISOR_BIT; // Drop supervisor bit
        return this.mMemory[address];
    };

    this.readWord = function(address) {
        address &= ~SUPERVISOR_BIT;
        return (
            (this.readByte(address+3) << 24) |
            (this.readByte(address+2) << 16) |
            (this.readByte(address+1) << 8)  |
            this.readByte(address+0)
        );
    };

    this.writeByte = function(address, value) {
        address &= ~SUPERVISOR_BIT;
        this.mMemory[address] = value;
    };

    this.writeWord = function(address, value) {
        address &= ~SUPERVISOR_BIT;
        this.writeByte(address + 3, (value >>> 24) & 0xFF);
        this.writeByte(address + 2, (value >>> 16) & 0xFF);
        this.writeByte(address + 1, (value >>> 8) & 0xFF);
        this.writeByte(address + 0, (value & 0xFF));
    };

    this.readRegister = function(register) {
        if(register == 31) return 0;
        return this.mRegisters[register];
    };

    this.writeRegister = function(register, value) {
        if(register == 31) return;
        this.mRegisters[register] = value;
    };

    this.setPC = function(address, allow_supervisor) {
        if(!(this.mPC & SUPERVISOR_BIT) && !allow_supervisor) address &= ~SUPERVISOR_BIT;
        this.mPC = address & 0xFFFFFFFC;
    };

    this.getPC = function() {
        return this.mPC;
    };

    this.signExtend16 = function(value) {
        value &= 0xFFFF;
        if(value & 0x8000) {
            value = value - 0x10000;
        }
        return value;
    };

    this.decodeInstruction = function(instruction) {
        var has_literal = !!((instruction >> 30) & 1);
        var opcode = (instruction >> 26) & 0x3F;
        var rc = (instruction >> 21) & 0x1F;
        var ra = (instruction >> 16) & 0x1F;
        var rb = (instruction >> 11) & 0x1F;
        var literal = this.signExtend16(instruction & 0xFFFF);
        if(has_literal) {
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
    };

    this.runCycle = function() {
        var instruction = this.readWord(this.mPC);
        if(instruction === 0) {
            throw "done";
        }
        var decoded = this.decodeInstruction(instruction);
        //console.log(decoded);
        var op = BSim.Beta.Opcodes[decoded.opcode];
        if(!op) {
            // Illegal opcode.
            this.handleIllegalInstruction(decoded);
        }
        this.mPC += 4;
        //console.log("New PC: " + this.mPC);
        if(decoded.has_literal) {
            console.log(op.name + "(R" + decoded.ra + ", " + decoded.literal + ", R" + decoded.rc + ")");
            op.exec.call(this, decoded.ra, decoded.literal, decoded.rc);
        } else {
            console.log(op.name + "(R" + decoded.ra + ", R" + decoded.rb + ", R" + decoded.rc + ")");
            op.exec.call(this, decoded.ra, decoded.rb, decoded.rc);
        }
    };

    return this;
};
