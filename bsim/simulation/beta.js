BSim.Beta = function(mem_size) {
    "use strict";
    var self = this;
    var mMemory = new BSim.Beta.Memory(mem_size); // TODO: it might make sense to use an Int32Array here.
    var mRegisters = new Int32Array(32);
    var mRunning = false; // Only true when calling run(); not executeCycle().
    var mPC = 0x80000000;
    var mPendingInterrupts = 0; // Used to store any pending interrupt.
    var mCycleCount = 0;
    var mClockCounter = 0;
    var CYCLES_PER_TICK = 10000;
    // These need to be public for the instructions to look at.
    this.mMouseCoords = -1;
    this.mKeyboardInput = null;

    // We use these in the 'running' state so we can batch DOM updates,
    // on the theory that changing object properties is cheap but changing DOM
    // nodes is expensive. Changes are thus cached in here until the end of the
    // quantum, then shipped off to anything that cares and cleared.
    // When not in run mode (i.e. mRunning is false and stepping through),
    // changes are signalled immediately and these are not used.
    var mChangedRegisters = {};
    var mChangedWords = {};
    var mLastReads = new Dequeue();
    var mLastWrites = new Dequeue();

    // Used for 'step back'
    var mHistory = new Dequeue();
    var mCurrentStep = {};
    // The below two are an optimisation for Safari. While V8 and whatever Firefox uses can
    // optimise for the 'class' pattern formed by UndoStep, Safari cannot. This means that
    // accessing mCurrentStep.registers is extremely slow, even when mCurrentStep is an
    // instance of a recognisable class (UndoStep). To work around this, we instead use
    // variables to hold the frequently accessed members of mCurrentStep, then stuff them
    // in at the end of each cycle.
    var mCurrentStepRegisters = {};
    var mCurrentStepWords = {};

    // Information not strictly related to running the Beta, but needed in BSim
    var mBreakpoints = {};
    var mLabels = {};
    var mOptions = {
        clock: false,
        div: true,
        mul: true,
        kalways: false,
        tty: false,
        annotate: false
    };
    var mVerifier = null;
    var mTTYContent = '';

    // Mostly exception stuff.
    var SUPERVISOR_BIT = 0x80000000;
    var XP = 30;
    var VEC_RESET = 0;
    var VEC_II = 4;
    var VEC_CLK = 8;
    var VEC_KBD = 12;
    var VEC_MOUSE = 16;

    var INTERRUPT_CLOCK = 0x02;
    var INTERRUPT_KEYBOARD = 0x04;
    var INTERRUPT_MOUSE = 0x08;

    var UndoStep = function(pc) {
        this.registers = {};
        this.words = {};
        this.pc = pc;
        this.tty = null;
    };

    _.extend(this, Backbone.Events);

    this.loadBytes = function(bytes) {
        this.stop();
        this.reset();

        mMemory.loadBytes(bytes);

        // Update the UI with our new program.
        this.trigger('resize:memory', bytes.length);
        this.trigger('change:bulk:register', _.object(_.range(32), mRegisters));
        var r = _.range(0, mMemory.size(), 4);
        this.trigger('change:bulk:word', _.object(r, _.map(r, self.readWord)));

        this.clearBreakpoints();
        this.setLabels({});
    };

    this.setOption = function(option, enabled) {
        mOptions[option] = enabled;
    };

    this.isOptionSet = function(option) {
        return !!mOptions[option];
    };

    // Takes a list of breakpoint addresses and replaces all current breakpoints with them.
    this.setBreakpoints = function(breakpoints) {
        mBreakpoints = _.object(_.map(breakpoints, function(b) { return [b, true]; }));
        console.log(mBreakpoints);
        this.trigger('add:bulk:breakpoint', breakpoints);
    };

    this.clearBreakpoints = function() {
        this.trigger('delete:bulk:breakpoint', _.keys(mBreakpoints));
        mBreakpoints = {};
    };

    this.addBreakpoint = function(breakpoint) {
        mBreakpoints[breakpoint] = true;
        this.trigger('add:breakpoint', breakpoint);
    };

    this.removeBreakpoint = function(breakpoint) {
        delete mBreakpoints[breakpoint];
        this.trigger('delete:breakpoint', breakpoint);
    };

    this.setLabels = function(labels) {
        mLabels = _.invert(labels);
        this.trigger('change:bulk:labels', mLabels);
    };

    this.getLabel = function(address) {
        return mLabels[address & ~SUPERVISOR_BIT] || null;
    };

    this.setVerifier = function(verifier) {
        this.mVerifier = verifier;
    };

    this.verifier = function() {
        return this.mVerifier;
    };

    this.readWord = function(address, notify) {
        address &= (~SUPERVISOR_BIT) & 0xFFFFFFFC;
        if(notify) {
            if(!mRunning) {
                self.trigger('read:word', address);
            } else {
                mLastReads.push(address);
                if(mLastReads.length > 5) mLastReads.shift();
            }
        }

        return mMemory.readWord(address);
    };

    this.writeWord = function(address, value, notify) {
        value |= 0; // force to int.
        address &= ~SUPERVISOR_BIT;
        address &= 0xFFFFFFFC; // Force multiples of four.

        // Implement undo
        if(!_.has(mCurrentStepWords, address))
            mCurrentStepWords[address] = this.readWord(address);

        mMemory.writeWord(address, value);

        if(!mRunning) this.trigger('change:word', address, value);
        if(notify) {
            if(!mRunning) {
                this.trigger('write:word', address);
            } else {
                mLastWrites.push(address);
                if(mLastWrites.length > 5) mLastWrites.shift();
            }
        }
        mChangedWords[address] = value;
    };

    this.readRegister = function(register) {
        if(register == 31) return 0;
        return mRegisters[register];
    };

    this.writeRegister = function(register, value) {
        value |= 0; // force to int.
        if(register == 31) return;

        // Implement undo
        if(!_.has(mCurrentStepRegisters, register))
            mCurrentStepRegisters[register] = this.readRegister(register);

        mRegisters[register] = value;

        if(!mRunning) this.trigger('change:register', register, value);
        else mChangedRegisters[register] = value;
    };

    this.setPC = function(address, allow_supervisor) {
        if(!(mPC & SUPERVISOR_BIT) && !allow_supervisor) address &= ~SUPERVISOR_BIT;
        if(this.isOptionSet('kalways')) address |= SUPERVISOR_BIT;
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

    this.reset = function() {
        this.setPC(SUPERVISOR_BIT | VEC_RESET, true);
        mRegisters = new Int32Array(32);
        mPendingInterrupts = 0;
        mCycleCount = 0;
        mClockCounter = 0;
        mMemory.reset();
        this.mMouseCoords = -1;
        this.mKeyboardInput = null;
        mTTYContent = '';

        // Tell the world.
        this.trigger('text:clear');
        this.trigger('change:bulk:register', _.object(_.range(32), mRegisters));
        var r = _.range(0, mMemory.size(), 4);
        this.trigger('change:bulk:word', _.object(r, _.map(r, self.readWord)));
    };

    this.ttyOut = function(text) {
        mCurrentStep.tty = mTTYContent;
        mTTYContent += text;
        this.trigger('text:out', text);
    };

    this.ttyContent = function() {
        return mTTYContent;
    };

    this.inSupervisorMode = function() {
        return !!(mPC & SUPERVISOR_BIT);
    };

    // Called when any illegal instruction is executed.
    this.handleIllegalInstruction = function(decoded) {
        /*if(this.inSupervisorMode()) {
            // This is "implementation defined"; we whine on any tty and then halt.
            this.trigger("out:text", "\nIllegal operation while in supervisor mode! Halting.\n");
            return false;
        }*/
        this.writeRegister(XP, mPC);
        this.setPC(SUPERVISOR_BIT | VEC_II, true);
    };

    // Various interrupts.
    // These are split into two parts: one at the time that the interrupt actually occurs,
    // and another when the beta is able to service it (the next time it leaves supervisor mode).

    // Triggers a clock interrupt
    this.clockInterrupt = function() {
        if(this.isOptionSet('clock')) {
            mPendingInterrupts |= INTERRUPT_CLOCK;
        }
    };

    var doClockInterrupt = function() {
        self.writeRegister(XP, mPC+4);
        self.setPC(SUPERVISOR_BIT | VEC_CLK, true);
        mPendingInterrupts &= ~INTERRUPT_CLOCK;
    };

    // Keyboard interrupt
    this.keyboardInterrupt = function(character) {
        if(this.isOptionSet('tty')) {
            this.mKeyboardInput = character; // TODO: buffering?
            mPendingInterrupts |= INTERRUPT_KEYBOARD;
            console.log(character);
        }
    };

    var doKeyboardInterrupt = function() {
        self.writeRegister(XP, mPC+4);
        self.setPC(SUPERVISOR_BIT | VEC_KBD, true);
        mPendingInterrupts &= ~INTERRUPT_KEYBOARD;
    };

    // Mouse interrupt
    this.mouseInterrupt = function(x, y) {
        if(this.isOptionSet('tty')) {
            this.mMouseCoords = ((y & 0xFFFF) << 16) | (x & 0xFFFF);
            mPendingInterrupts |= INTERRUPT_MOUSE;
        }
    };

    var doMouseInterrupt = function() {
        self.writeRegister(XP, mPC+4);
        self.setPC(SUPERVISOR_BIT | VEC_MOUSE, true);
        mPendingInterrupts &= ~INTERRUPT_MOUSE;
    };

    this.getCycleCount = function() {
        return mCycleCount;
    };

    // Executes a single instruction (this is not a fancy beta).
    // Returns false if execution should halt; otherwise the return
    // value is undefined (but may well be 'undefined').
    // Use ===.
    this.executeCycle = function() {
        if(mBreakpoints[mPC & ~SUPERVISOR_BIT] === false) {
            mBreakpoints[mPC & ~SUPERVISOR_BIT] = true;
        }
        // Check if we should fire a clock exception first.
        if(++mClockCounter % CYCLES_PER_TICK === 0) {
            mClockCounter = 0;
            this.clockInterrupt();
        }
        // Execute interrupts.
        // TODO: Cleanup
        if(!this.inSupervisorMode()) {
            if(mPendingInterrupts & INTERRUPT_CLOCK) {
                doClockInterrupt();
                return;
            }
            if(mPendingInterrupts & INTERRUPT_KEYBOARD) {
                doKeyboardInterrupt();
                return;
            }
            if(mPendingInterrupts & INTERRUPT_MOUSE) {
                doMouseInterrupt();
                return;
            }
        }
        // Prepare undo
        mCurrentStep = new UndoStep(mPC);

        mCycleCount = (mCycleCount + 1) % 0x7FFFFFFF;
        // Continue on with instructions as planned.
        var instruction = this.readWord(mPC);
        var old_pc = mPC;
        mPC += 4; // Increment this early so that we have the right reference for exceptions.
        if(instruction === 0) {
            mPC -= 4;
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
            return this.handleIllegalInstruction(decoded);
        }
        if(!mRunning) this.trigger('change:pc', mPC);
        try {
            var ret = null;
            if(op.has_literal) {
                ret = op.exec.call(this, decoded.ra, decoded.literal, decoded.rc);
            } else {
                ret = op.exec.call(this, decoded.ra, decoded.rb, decoded.rc);
            }
            if(ret === false) {
                console.log("call failed");
                this.setPC(old_pc, true);
            }
            mCurrentStep.registers = mCurrentStepRegisters;
            mCurrentStep.words = mCurrentStepWords;
            mHistory.push(mCurrentStep);
            if(mHistory.length() > 50) mHistory.shift();
            return ret;
        } catch(e) {
            if(e instanceof BSim.Beta.RuntimeError) {
                this.trigger('error', e);
                this.setPC(old_pc, true);
                return false;
            } else {
                throw e;
            }
        }

        return false;
    };

    this.undoCycle = function() {
        if(!mHistory.length) return false;
        var step = mHistory.pop();
        _.each(step.registers, function(value, register) {
            self.writeRegister(register, value);
        });
        _.each(step.words, function(value, address) {
            self.writeWord(address, value);
        });
        self.setPC(step.pc, true);
        if(step.tty) {
            mTTYContent = step.tty;
            self.trigger('text:replace', mTTYContent);
        }
        return true;
    };

    this.undoLength = function() {
        return mHistory.length();
    }

    // Runs the program to completion (if it terminates) or until stopped using
    // stop(). Yields to the UI every `quantum` emulated cycles.
    // When run using this function, the emulator does not issue standard change events,
    // instead issuing a change:all event after each quantum and when stopping
    // (even if nothing actually changed).
    // This function is non-blocking.
    this.run = function(quantum) {
        this.trigger('run:start');
        mRunning = true;
        _.defer(function run_inner() {
            var exception = null;
            // Bail out if we're not supposed to run any more.
            if(!mRunning) {
                self.trigger('run:stop');
                return;
            }
            var i = quantum;
            // Execute quantum cycles, then yield for the UI.
            while(i--) {
                // Check for a breakpoint
                var real_pc = mPC & ~SUPERVISOR_BIT;
                if(mBreakpoints[real_pc] === true) {
                    mBreakpoints[real_pc] = false;
                    mRunning = false;
                    break;
                }
                // This means we should terminate.
                if(self.executeCycle() === false) {
                    mRunning = false;
                    break;
                }
            }
            // Now relay all the changes that occurred during our quantum.
            self.trigger('change:bulk:word', mChangedWords);
            self.trigger('change:bulk:register', mChangedRegisters);
            self.trigger('read:bulk:word', mLastReads);
            self.trigger('write:bulk:word', mLastWrites);
            self.trigger('change:pc', mPC);
            mChangedRegisters = {};
            mChangedWords = {};
            mLastReads = new Dequeue();
            mLastWrites = new Dequeue();

            // Run again.
            _.defer(run_inner);
        });
    };

    this.stop = function() {
        mRunning = false;
    };

    this.isRunning = function() {
        return mRunning;
    };

    // Returns memory size in bytes.
    this.memorySize = function() {
        return mMemory.size();
    };

    this.getMemory = function() {
        return mMemory;
    };

    return this;
};

BSim.Beta.RuntimeError = function(message) {
    this.message = message;
};
