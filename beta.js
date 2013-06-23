BSim.Beta = function(mem_size) {
    "use strict";
    var self = this;
    var mMemory = new Uint8Array(mem_size);
    var mRegisters = new Int32Array(32);
    var mRunning = false; // Only true when calling run(); not executeCycle().

    // We use these in the 'running' state so we can batch DOM updates,
    // on the theory that changing object properties is cheap but changing DOM
    // nodes is expensive. Changes are thus cached in here until the end of the
    // quantum, then shipped off to anything that cares and cleared.
    // When not in run mode (i.e. mRunning is false and stepping through),
    // changes are signalled immediately and these are not used.
    var mChangedRegisters = {};
    var mChangedWords = {};

    var mPC = 0x80000000;
    var SUPERVISOR_BIT = 0x80000000;

    _.extend(this, Backbone.Events);

    this.loadBytes = function(bytes) {
        for(var i = 0; i < bytes.length; ++i) {
            this.writeByte(i, bytes[i]);
        }
    };

    this.readByte = function(address) {
        address &= ~SUPERVISOR_BIT; // Drop supervisor bit
        return mMemory[address];
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
        mMemory[address] = value;
    };

    this.writeWord = function(address, value) {
        value |= 0; // force to int.
        address &= ~SUPERVISOR_BIT;
        this.writeByte(address + 3, (value >>> 24) & 0xFF);
        this.writeByte(address + 2, (value >>> 16) & 0xFF);
        this.writeByte(address + 1, (value >>> 8) & 0xFF);

        this.writeByte(address + 0, (value & 0xFF));

        if(!mRunning) this.trigger('change:word', address, value);
        else mChangedWords[address] = value;
    };

    this.readRegister = function(register) {
        if(register == 31) return 0;
        return mRegisters[register];
    };

    this.writeRegister = function(register, value) {
        value |= 0; // force to int.
        if(register == 31) return;
        mRegisters[register] = value;

        if(!mRunning) this.trigger('change:register', register, value);
        else mChangedRegisters[register] = value;
    };

    this.setPC = function(address, allow_supervisor) {
        if(!(mPC & SUPERVISOR_BIT) && !allow_supervisor) address &= ~SUPERVISOR_BIT;
        mPC = address & 0xFFFFFFFC; // Only multiples of four are valid.

        if(!mRunning) this.trigger('change:pc', address);
    };

    this.getPC = function() {
        return mPC;
    };

    this.signExtend16 = function(value) {
        value &= 0xFFFF;
        if(value & 0x8000) {
            value = value - 0x10000;
        }
        return value;
    };

    this.decodeInstruction = function(instruction) {
        var opcode = (instruction >> 26) & 0x3F;
        var rc = (instruction >> 21) & 0x1F;
        var ra = (instruction >> 16) & 0x1F;
        var rb = (instruction >> 11) & 0x1F;
        var literal = this.signExtend16(instruction & 0xFFFF);

        return {
            opcode: opcode,
            ra: ra,
            rb: rb,
            rc: rc,
            literal: literal
        };
    };

    // This is similar to pulsing the RESET line; it resets the program counter,
    // but doesn't do an awful lot else.
    this.reset = function() {
        this.setPC(SUPERVISOR_BIT, true);
    };

    // Executes a single instruction (this is not a fancy beta).
    // Returns false if execution should halt; otherwise the return
    // value is undefined (but may well be 'undefined').
    // Use ===.
    this.executeCycle = function() {
        var instruction = this.readWord(mPC);
        if(instruction === 0) {
            return false;
        }
        var decoded = this.decodeInstruction(instruction);
        var op = BSim.Beta.Opcodes[decoded.opcode];
        if(!op) {
            // Illegal opcode.
            return this.handleIllegalInstruction(decoded);
        }
        if(op.privileged && !(mPC & SUPERVISOR_BIT)) {
            console.log("Called privileged instruction " + op.name + " while not in supervisor mode.");
            this.handleIllegalInstruction(decoded);
        }
        mPC += 4;
        if(!mRunning) this.trigger('change:pc', mPC);
        // console.log(op.disassemble(decoded));
        if(op.has_literal) {
            return op.exec.call(this, decoded.ra, decoded.literal, decoded.rc);
        } else {
            return op.exec.call(this, decoded.ra, decoded.rb, decoded.rc);
        }
    };

    // Runs the program to completion (if it terminates) or until stopped using
    // stop(). Yields to the UI every `quantum` emulated cycles.
    // When run using this function, the emulator does not issue standard change events,
    // instead issuing a change:all event after each quantum and when stopping
    // (even if nothing actually changed).
    // This function is non-blocking.
    this.run = function(quantum) {
        this.trigger('run:start');
        mRunning = true;
        setTimeout(function run_inner() {
            // Bail out if we're not supposed to run any more.
            if(!mRunning) {
                self.trigger('run:stop');
                return;
            }
            var i = quantum;
            // Execute quantum cycles, then yield for the UI.
            while(i--) {
                // This means we should terminate.
                if(self.executeCycle() === false) {
                    mRunning = false;
                    break;
                }
            }
            // Now relay all the changes that occurred during our quantum.
            self.trigger('change:bulk:word', mChangedWords);
            self.trigger('change:bulk:register', mChangedRegisters);
            self.trigger('change:pc', mPC);
            mChangedRegisters = {};
            mChangedWords = {};

            // Run again.
            _.defer(run_inner);
        }, 1);
    };

    this.stop = function() {
        mRunning = false;
    };

    this.isRunning = function() {
        return mRunning;
    };

    // Returns memory size in bytes.
    this.memorySize = function() {
        return mMemory.length;
    };

    return this;
};
