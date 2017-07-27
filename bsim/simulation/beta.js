BSim.Beta = function() {
    "use strict";
    var self = this;
    _.extend(this, Backbone.Events);

    var mMemory = new BSim.Beta.Memory(this); // TODO: it might make sense to use an Int32Array here.
    this.memory = mMemory;
    var mSourceMap = [];  // file & line number for source of each assembled byte
    var mRegisters = new Int32Array(32);
    var mRunning = false; // Only true when calling run(); not executeCycle().
    var mPC = 0x80000000;
    var mBase = 0x00000000;     // segmentation base register
    var mBounds = 0xFFFFFFFF;     // segmentation bounds register
    var mPendingInterrupts = 0; // Used to store any pending interrupt.
    var mCycleCount = 0;
    var mClockCounter = 0;
    var CYCLES_PER_TICK = 10000;
    // These need to be public for the instructions to look at.
    this.mMouseCoords = -1;
    this.mKeyboardInput = null;
    this.mServerInfo = [];

    // We use these in the 'running' state so we can batch DOM updates,
    // on the theory that changing object properties is cheap but changing DOM
    // nodes is expensive. Changes are thus cached in here until the end of the
    // quantum, then shipped off to anything that cares and cleared.
    // When not in run mode (i.e. mRunning is false and stepping through),
    // changes are signalled immediately and these are not used.
    var mChangedRegisters = {};
    var mChangedWords = {};

    // These track last reads/writes to registers and memory, used for highlighting them in the
    // UI.
    // Memory tracks the last five accesses; registers track whatever happened in the current cycle.
    var mLastReads = [];
    var mLastWrites = [];
    var mCurrentRegisterReads = [];
    var mCurrentRegisterWrites = [];

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
    var mCurrentStepWords = [];

    // Information not strictly related to running the Beta, but needed in BSim
    var mBreakpoints = {};
    var mLabels = {};
    var mOptions = {};
    var mVerifier = null;
    var mTTYContent = '';
    this.mSources = [];  // list of {file: name, contents: ...}

    // Mostly exception stuff.
    var SUPERVISOR_BIT = 0x80000000;
    var XP = 30;
    var VEC_RESET = 0;
    var VEC_II = 4;
    var VEC_SEGFAULT = 8;
    var VEC_CLK = 12;
    var VEC_KBD = 16;
    var VEC_MOUSE = 20;

    var INTERRUPT_CLOCK = 0x02;
    var INTERRUPT_KEYBOARD = 0x04;
    var INTERRUPT_MOUSE = 0x08;

    var UndoStep = function(pc) {
        this.registers = {};
        this.words = {};
        this.pc = pc;
        this.tty = null;
    };

    var set_defaults = function() {
        mOptions = {
            clock: false,
            div: true,
            mul: true,
            kalways: false,
            tty: false,
            annotate: false,
            segmentation: false
        };
    };
    set_defaults();

    this.setSources = function(sources) {
        this.mSources = sources;
    };

    this.loadBytes = function(bytes,source_map) {
        this.stop();
        this.reset();

        mMemory.loadBytes(bytes);
        mSourceMap = source_map;
        set_defaults();

        // Update the UI with our new program.
        this.trigger('resize:memory', bytes.length);
        // This trigger is redundant to the reset performed by this.reset()
        // this.trigger('change:bulk:register', _.object(_.range(32), mRegisters));
        var r = _.range(0, mMemory.size(), 4);
        this.trigger('change:bulk:word', _.object(r, _.map(r, function(i) { return mMemory.readWord(i); } )));

        this.clearBreakpoints();
        this.setLabels({});
        this.setPC(SUPERVISOR_BIT);
    };

    this.setOption = function(option, enabled) {
        mOptions[option] = enabled;

        if (option == 'segmentation') $('.segmentation').toggle(enabled);
    };

    this.isOptionSet = function(option) {
        return !!mOptions[option];
    };

    // Takes a list of breakpoint addresses and replaces all current breakpoints with them.
    this.setBreakpoints = function(breakpoints) {
        mBreakpoints = _.object(_.map(breakpoints, function(b) { return [b, true]; }));
        this.trigger('add:bulk:breakpoint', breakpoints);
    };

    this.clearBreakpoints = function() {
        this.trigger('delete:bulk:breakpoint', _.map(_.keys(mBreakpoints), function(v) { return parseInt(v, 10); }));
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

    this.getBreakpoints = function() {
        return _.map(_.keys(mBreakpoints), function(v) { return parseInt(v, 10); });
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

    this.physicalAddr = function(address) {
        var addr = address & (~SUPERVISOR_BIT) & 0xFFFFFFFC;

        // implement segmentation is user mode
        if (self.isOptionSet('segmentation') && !self.inSupervisorMode()) {
            if (addr > mBounds)
                throw new BSim.Beta.SegmentationFault('Address exceeds segment bounds: '+BSim.Common.FormatWord(addr));

            addr = (addr + mBase) & (~SUPERVISOR_BIT) & 0xFFFFFFFC;
        }
        
        return addr;
    };

    this.readWord = function(address, notify, fetch) {
        var addr = self.physicalAddr(address);

        if (self.isOptionSet('segmentation') && self.inSupervisorMode()) {
            // check for reads of base and bounds values
            if (address == -4) return mBase;
            if (address == -8) return mBounds;
        }

        if(notify) {
            if(!mRunning) {
                self.trigger('read:word', addr);
            } else {
                mLastReads.push(addr);
                if(mLastReads.length > 5) mLastReads.shift();
            }
        }

        return mMemory.readWordCached(addr, fetch);
    };

    this.writeWord = function(address, value, notify) {
        value |= 0; // force to int.
        var addr = self.physicalAddr(address);

        if (self.isOptionSet('segmentation') && self.inSupervisorMode()) {
            // but check for writes of base and bounds values
            if (address == -4) {
                self.trackRegisterChanges('base', mBase, value);
                mBase = value;
                return;
            }
            if (address == -8) {
                self.trackRegisterChanges('bounds', mBounds, value);
                mBounds = value;
                return;
            }
        }

        // Implement undo
        mCurrentStepWords.push([address, mMemory.readWord(addr)]);

        mMemory.writeWordCached(addr, value);

        if(!mRunning) self.trigger('change:word', addr, value);
        if(notify) {
            if(!mRunning) {
                self.trigger('write:word', addr);
            } else {
                mLastWrites.push(addr);
                if(mLastWrites.length > 5) mLastWrites.shift();
            }
        }
        mChangedWords[addr] = value;
    };

    this.readRegister = function(register) {
        if(register < 0 || register > 31) {
            throw new BSim.Beta.RuntimeError("Attempted to read invalid register r" + register);
        }
        if(register == 31) return 0;
        return mRegisters[register];
    };

    this.trackRegisterChanges = function(register, oldv, value) {
        // Implement undo
        if(!_.has(mCurrentStepRegisters, register))
            mCurrentStepRegisters[register] = oldv;

        if(!mRunning) self.trigger('change:register', register, value);
        else mChangedRegisters[register] = value;
    };

    this.writeRegister = function(register, value) {
        value |= 0; // force to int.
        if(register == 31) return;

        if(register < 0 || register > 31) {
            throw new BSim.Beta.RuntimeError("Attempted to write invalid register r" + register);
        }
        var oldv = mRegisters[register];
        mRegisters[register] = value;

        this.trackRegisterChanges(register, oldv, value);
    };

    // This differs from readRegister in that it also logs the access.
    // It should be used when the machine would actually read from the
    // register.
    this.realReadRegister = function(register) {
        mCurrentRegisterReads.push(register);
        return self.readRegister(register);
    };

    this.realWriteRegister = function(register, value) {
        mCurrentRegisterWrites.push(register);
        return self.writeRegister(register, value);
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

    this.reset = function(no_update_memory) {
        this.setPC(SUPERVISOR_BIT | VEC_RESET, true);
        mRegisters = new Int32Array(32);
        mBase = 0x00000000;
        mBounds = 0xFFFFFFFF;
        mPendingInterrupts = 0;
        mCycleCount = 0;
        this.trigger('change:cycle_count',0);
        mClockCounter = 0;
        this.mServerInfo = [];
        if(!no_update_memory) mMemory.reset();
        this.mMouseCoords = -1;
        this.mKeyboardInput = null;
        mTTYContent = '';

        // Tell the world.
        this.trigger('text:clear');
        this.trigger('change:bulk:register', _.object(_.range(32), mRegisters));
        this.trigger('change:register', 'base', mBase);
        this.trigger('change:register', 'bounds', mBounds);
        if(!no_update_memory) {
            var r = _.range(0, mMemory.size(), 4);
            this.trigger('change:bulk:word', _.object(r, _.map(r, function(v) { return mMemory.readWord(v); })));
        }
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
            this.mMouseCoords = ((x & 0xFFFF) << 16) | (y & 0xFFFF);
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

        // Clean up records of read/written registers.
        mCurrentRegisterReads = [];
        mCurrentRegisterWrites = [];

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
        mCurrentStepWords = [];
        mCurrentStepRegisters = {};

        //cjt: move try up here so that instruction fetch errors are caught
        try {
            mCycleCount = (mCycleCount + 1) % 0x7FFFFFFF;
            if(!mRunning) this.trigger('change:cycle_count',mCycleCount);

            // Continue on with instructions as planned.
            var instruction = this.readWord(mPC, false, true);
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
                return this.handleIllegalInstruction(decoded);
            }
            if(!mRunning) this.trigger('change:pc', mPC);
            //cjt: previous location of try
            var ret = null;
            if(op.has_literal) {
                ret = op.exec.call(this, decoded.ra, decoded.literal, decoded.rc);
            } else {
                ret = op.exec.call(this, decoded.ra, decoded.rb, decoded.rc);
            }
            if(ret === false) {
                this.setPC(old_pc, true);
            }
            if(!mRunning) {
                this.trigger('read:register', mCurrentRegisterReads);
                this.trigger('write:register', mCurrentRegisterWrites);
            }
            mCurrentStep.registers = mCurrentStepRegisters;
            mCurrentStep.words = mCurrentStepWords;
            mHistory.push(mCurrentStep);
            if(mHistory.length() > 50) mHistory.shift();
            return ret;
        } catch(e) {
            if (e instanceof BSim.Beta.SegmentationFault) {
                this.writeRegister(XP, mPC);
                this.setPC(SUPERVISOR_BIT | VEC_SEGFAULT, true);
                return false;
            } else if (e instanceof BSim.Beta.RuntimeError) {
                e.message += ' [PC = 0x'+BSim.Common.FormatWord(mPC)+']';
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
        var done = {};
        _.each(step.words, function(tuple) {
            var address = tuple[0], value = tuple[1];
            if(done[address]) return;
            done[address] = true;
            mMemory.writeWord(address, value);
            this.trigger('change:word', address, value);
        });
        self.setPC(step.pc, true);
        if(step.tty) {
            mTTYContent = step.tty;
            self.trigger('text:replace', mTTYContent);
        }
        mCycleCount = (mCycleCount - 1) % 0x7FFFFFFF;
        if(!mRunning) this.trigger('change:cycle_count',mCycleCount);
        return true;
    };

    this.undoLength = function() {
        return mHistory.length();
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
            self.trigger('read:register', mCurrentRegisterReads);
            self.trigger('write:register', mCurrentRegisterWrites);
            self.trigger('change:pc', mPC);
            self.trigger('change:cycle_count', mCycleCount);
            mChangedRegisters = {};
            mChangedWords = {};
            mLastReads = [];
            mLastWrites = [];

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

    var oldHighlightObject;
    this.highlightSource = function(pc) {
        if ($('#editor').width() == 0 || pc >= mSourceMap.length) return;
        var source = mSourceMap[pc];
        if (source !== undefined) {
            if(oldHighlightObject) oldHighlightObject.clear();
            oldHighlightObject = editor.addLineClass(source.file, source.line-1, 'highlight-line');
            editor.showLine(source.file, source.line-1);  // make sure we can see it!
        }
    }

    return this;
};

BSim.Beta.RuntimeError = function(message) {
    this.message = message;
};
BSim.Beta.RuntimeError.prototype.toString = function() {
    return this.message;
};

BSim.Beta.SegmentationFault = function(message) {
    this.message = message;
};
