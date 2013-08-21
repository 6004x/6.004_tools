module("Emulation");

test("Loading programs", function() {
    expect(5);

    var beta = new BSim.Beta();
    beta.on('resize:memory', function(size) {
        equal(size, 8, "resize:memory triggered");
    });
    beta.on('change:bulk:register', function(registers) {
        deepEqual(_.keys(registers), _.map(_.range(32), String), "change:bulk:register called for all registers");
    });
    var word_calls = 0;
    beta.on('change:bulk:word', function(words) {
        deepEqual(words, {
            0: 50462976,
            4: 117835012
        }, "change:bulk:word called with expected memory contents");
    });
    beta.on('delete:bulk:breakpoint', function() {
        ok(true, "All breakpoints cleared.");
    });
    beta.on('change:bulk:labels', function(labels) {
        deepEqual(labels, {}, "All labels cleared");
    });

    beta.loadBytes([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("Breakpoint management", function() {
    expect(8);
    var beta = new BSim.Beta();

    beta.on('add:bulk:breakpoint', function(breakpoints) {
        deepEqual(_.sortBy(breakpoints, _.identity), [4, 8, 32], "add:bulk:breakpoint called");
    });

    beta.on('delete:bulk:breakpoint', function(breakpoints) {
        deepEqual(_.sortBy(breakpoints, _.identity), [0, 4, 32], "delete:bulk:breakpoint called");
    });

    beta.on('add:breakpoint', function(breakpoint) {
        equal(breakpoint, 0, "add:breakpoint called");
    });

    beta.on('delete:breakpoint', function(breakpoint) {
        equal(breakpoint, 8, "delete:breakpoint called");
    });

    beta.setBreakpoints([4, 8, 32]);
    deepEqual(_.sortBy(beta.getBreakpoints(), _.identity), [4, 8, 32], "Breakpoints bulk added.");

    beta.addBreakpoint(0);
    deepEqual(_.sortBy(beta.getBreakpoints(), _.identity), [0, 4, 8, 32], "Breakpoint added.");

    beta.removeBreakpoint(8);
    deepEqual(_.sortBy(beta.getBreakpoints(), _.identity), [0, 4, 32], "Breakpoint removed.");

    beta.clearBreakpoints();
    deepEqual(beta.getBreakpoints(), [], "Breakpoints cleared.");
});

test("Label management", function() {
    var beta = new BSim.Beta();

    beta.on('change:bulk:labels', function(labels) {
        deepEqual(labels, {20: 'foo', 40: 'bar'}, "change:bulk:labels called");
    });

    beta.setLabels({foo: 20, bar: 40});
    equal(beta.getLabel(20), 'foo', "Got label for address");
    equal(beta.getLabel(24), null, "Got no label for address without one.");
});

test("Verifier management", function() {
    var beta = new BSim.Beta();
    var verifier = {foo: 42};

    beta.setVerifier(verifier);
    deepEqual(beta.verifier(), verifier, "Retrived set verifier");
});

test("Memory access", function() {
    expect(6);
    var beta = new BSim.Beta();
    beta.loadBytes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

    beta.on('read:word', function(address) {
        equal(address, 0, "read:word called");
    });

    beta.on('write:word', function(address) {
        equal(address, 4, "write:word called");
    });

    var changed_already = false;
    beta.on('change:word', function(address) {
        equal(address, changed_already ? 4 : 8, "change:word called");
        changed_already = true;
    });

    equal(beta.readWord(0), 50462976, "readWord works");
    equal(beta.readWord(0, true), 50462976, "readWord still works");
    beta.writeWord(8, 42);
    beta.writeWord(4, 42, true);
});

test("Register access", function() {
    expect(12);
    var beta = new BSim.Beta();

    var expected_writes = [0, 30];
    beta.on('change:register', function(register, value) {
        equal(register, expected_writes.shift(), "change:register for r" + register);
    });

    equal(beta.readRegister(0), 0, "r0 is zero by default.");
    equal(beta.readRegister(30), 0, "r30 is zero by default.");
    equal(beta.readRegister(31), 0, "r31 is zero by default.");

    beta.writeRegister(0, 42);
    beta.writeRegister(30, 24);
    beta.writeRegister(31, 20);

    equal(beta.readRegister(0), 42, "r0 is now 42.");
    equal(beta.readRegister(30), 24, "r30 is now 24.");
    equal(beta.readRegister(31), 0, "r31 is still 0.");

    throws(function() {
        beta.readRegister(32);
    }, "Reading a register greater than 31 is illegal.");

    throws(function() {
        beta.readRegister(-1);
    }, "Reading a negative register is illegal.");

    throws(function() {
        beta.writeRegister(32);
    }, "Writing a register greater than 31 is illegal.");

    throws(function() {
        beta.writeRegister(-1);
    }, "Writing a negative register is illegal.");
});

test("PC manipulation", function() {
    expect(13);
    var beta = new BSim.Beta();

    var values = [0x80000020, 0x24, 0x30, 0x80000034, 0x80000040 - 0x100000000];
    beta.on('change:pc', function(value) {
        equal(value, values.shift(), "change:pc to " + value);
    });

    equal(beta.getPC(), 0x80000000, "PC starts at 0 in supervisor mode.");
    equal(beta.inSupervisorMode(), true, "inSupervisorMode reports machine in supervisor mode.");
    beta.setPC(0x80000020);
    equal(0x100000000 + beta.getPC(), 0x80000020, "Supervisor bit can be persisted from supervisor mode in all cases.");
    beta.setPC(0x24);
    equal(beta.getPC(), 0x24, "Dropping supervisor bit works.");
    equal(beta.inSupervisorMode(), false, "inSupervisorMode reports machine not in supervisor mode.");
    beta.setPC(0x80000030);
    equal(beta.getPC(), 0x30, "Setting supervisor bit is ignored.");
    beta.setPC(0x80000034, true);
    equal(0x100000000 + beta.getPC(), 0x80000034, "Setting supervisor bit is acceptable when specified.");

    beta.setOption('kalways', true);
    beta.setPC(0x40);
    equal(0x100000000 + beta.getPC(), 0x80000040, "Can't drop supervisor bit in kalways mode.");
});

test("Sign extension (16-bit)", function() {
    expect(7);
    var beta = new BSim.Beta();

    equal(beta.signExtend16(0), 0, "0 = 0");
    equal(beta.signExtend16(1), 1, "1 = 1");
    equal(beta.signExtend16(0x7FFF), 0x7FFF, "0x7FFF = 0x7FFF");
    equal(beta.signExtend16(0x8000), -32768, "0x8000 = -32768");
    equal(beta.signExtend16(0x8001), -32767, "0x8001 = -32767");
    equal(beta.signExtend16(0xFFFF), -1, "0xFFFF = -1");
    equal(beta.signExtend16(0x10000), 0, "0x10000 = 0");
});

test("Instruction decoding", function() {
    expect(10);
    var beta = new BSim.Beta();

    var decoded = beta.decodeInstruction(0x8022f800);
    equal(decoded.opcode, 32, "opcode(0x8022f800) = 32");
    equal(decoded.rc, 1, "rc(0x8022f800) = 1");
    equal(decoded.ra, 2, "ra(0x8022f800) = 2");
    equal(decoded.rb, 31, "rb(0x8022f800) = 31");

    decoded = beta.decodeInstruction(0xc49f7fff);
    equal(decoded.opcode, 49, "opcode(0xc49f7fff) = 49");
    equal(decoded.rc, 4, "rc(0xc49f7fff) = 4");
    equal(decoded.ra, 31, "ra(0xc49f7fff) = 31");
    equal(decoded.literal, 0x7fff, "literal(0xc49f7fff) = 0x7fff");

    decoded = beta.decodeInstruction(0xc49f8000);
    equal(decoded.ra, 31, "ra(0xc49f8000) = 31");
    equal(decoded.literal, -32768, "literal(0xc49f8000) = -1");
});

test("TTY", function() {
    expect(6);
    var beta = new BSim.Beta();

    var expected_out = ['hello', ' world!'];
    beta.on('text:out', function(text) {
        equal(text, expected_out.shift(), "text:out called correctly.");
    });
    beta.on('text:clear', function() {
        ok(expected_out.length === 0, "text:clear called.");
    });

    beta.ttyOut("hello");
    equal(beta.ttyContent(), "hello", "TTY output works");
    beta.ttyOut(" world!");
    equal(beta.ttyContent(), "hello world!", "TTY appending works.");

    beta.reset();
    equal(beta.ttyContent(), "", "TTY output is cleared after reset.");
});

test("Illegal instruction handling", function() {
     var beta = new BSim.Beta();

     beta.setPC(0x00001234);
     beta.handleIllegalInstruction({opcode: 32, rc: 1, ra: 2, rb: 31});
     equal(beta.readRegister(30), 0x00001234, "XP is set to PC");
     equal(0x100000000 + beta.getPC(), 0x80000004, "PC is set to VEC_II in supervisor mode.");
});

test("Clock interrupts", function() {
    var beta = new BSim.Beta();
    beta.loadBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    
    beta.setOption('clock', true);
    ok(beta.isOptionSet('clock'), "Clock interrupts can be enabled.");

    beta.clockInterrupt();
    // This shouldn't do anything.
    beta.executeCycle();
    notEqual(0x100000000 + beta.getPC(), 0x80000008, "Beta does not jump to VEC_CLK from supervisor mode.");
    // This should.
    beta.setPC(4);
    beta.executeCycle();
    equal(0x100000000 + beta.getPC(), 0x80000008, "Beta jumps to VEC_CLK from user mode");
    equal(beta.readRegister(30), 8, "PC+4 placed in XP register.");

    beta.reset();
    for(var i = 0; i < 9999; ++i) {
        beta.setPC(0);
        beta.executeCycle();
    }

    notEqual(0x100000000 + beta.getPC(), 0x80000008, "Beta has not jumped to VEC_CLK after 9,999 cycles.");
    beta.setPC(0);
    beta.executeCycle();
    equal(0x100000000 + beta.getPC(), 0x80000008, "Beta has jumped to VEC_CLK after 10,000 cycles.");

    beta.setOption('clock', false);
    beta.setPC(0);
    beta.clockInterrupt();
    beta.executeCycle();
    notEqual(0x100000000 + beta.getPC(), 0x80000008, "Beta does not jump to VEC_CLK when clock interrupts are disabled.");
});

test("Keyboard interrupts", function() {
    var beta = BSim.Beta();
    beta.loadBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    beta.setOption('tty', true);

    beta.keyboardInterrupt(97);
    // This shouldn't do anything.
    beta.executeCycle();
    notEqual(0x100000000 + beta.getPC(), 0x8000000C, "Beta does not jump to VEC_KBD from supervisor mode.");

    // This should.
    beta.setPC(4);
    beta.executeCycle();
    equal(0x100000000 + beta.getPC(), 0x8000000C, "Beta jumps to VEC_KBD from user mode");
    equal(beta.readRegister(30), 8, "PC+4 placed in XP register.");
    equal(beta.mKeyboardInput, 97, "Character buffer set to provided character.");
});

test("Mouse interrupts", function() {
    var beta = BSim.Beta();
    beta.loadBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    beta.setOption('tty', true);

    beta.mouseInterrupt(100, 200);
    // This shouldn't do anything.
    beta.executeCycle();
    notEqual(0x100000000 + beta.getPC(), 0x80000010, "Beta does not jump to VEC_MOUSE from supervisor mode.");

    // This should.
    beta.setPC(4);
    beta.executeCycle();
    equal(0x100000000 + beta.getPC(), 0x80000010, "Beta jumps to VEC_MOUSE from user mode");
    equal(beta.readRegister(30), 8, "PC+4 placed in XP register.");
    equal(beta.mMouseCoords, 0xc80064, "Mouse coordinates stored in mouse coord buffer");

    // So should this.
    beta.setPC(0);
    beta.mouseInterrupt(0, 0);
    beta.executeCycle();
    equal(0x100000000 + beta.getPC(), 0x80000010, "Beta jumps to VEC_MOUSE from user mode when clicked at (0, 0)");
    equal(beta.mMouseCoords, 0, "(0, 0) is stored as 0.");
});

test("Stepping around", function() {
    var beta = BSim.Beta();
    beta.loadBytes([1, 0, 0, 192, 12, 0, 31, 100, 253, 255, 255, 115, 0, 0, 0, 0]); // ADDC(r0, 1, r0) ST(r0, 12) BR(0) LONG(0)
    beta.setPC(0); // Drop out of supervisor mode for brevity.

    // Step forward
    notEqual(beta.executeCycle(), false, "Stepped forward without halting.");
    equal(beta.getCycleCount(), 1, "Cycle count incremented.");
    equal(beta.readRegister(0), 1, "r0 = 1");
    notEqual(beta.executeCycle(), false, "Stepped forward without halting.");
    equal(beta.readWord(12), 1, "0xC = 1");
    notEqual(beta.executeCycle(), false, "Stepped forward without halting.");
    notEqual(beta.executeCycle(), false, "Stepped forward without halting.");
    equal(beta.readRegister(0), 2, "r0 = 2");
    equal(beta.undoLength(), 4, "Four entries in undo history.");
    equal(beta.getPC(), 4, "PC = 4");
    // Step backwards
    ok(beta.undoCycle(), "Undid cycle");
    equal(beta.readRegister(0), 1, "r0 = 1 again.");
    equal(beta.readWord(12), 1, "0xC = 1 (still)");
    equal(beta.getPC(), 0, "PC = 0");
    // again
    ok(beta.undoCycle(), "Undid cycle");
    equal(beta.getPC(), 8, "PC = 8");
    // again
    ok(beta.undoCycle(), "Undid cycle");
    equal(beta.getPC(), 4, "PC = 4");
    equal(beta.readWord(12), 0, "0xC = 0");
});

asyncTest("Running (async)", function() {
    expect(6);
    var beta = BSim.Beta();
    beta.loadBytes([1, 0, 0, 192, 12, 0, 31, 100, 253, 255, 255, 115, 0, 0, 0, 0]); // ADDC(r0, 1, r0) ST(r0, 12) BR(0) LONG(0)
    beta.setPC(0);

    var expected_mem = 0;
    var expected_reg = 0;
    beta.on('change:bulk:word', function(changed_words) {
        equal(changed_words[0xC], ++expected_mem, "Bulk memory update correct.");
    });
    beta.on('change:bulk:register', function(changed_registers) {
        equal(changed_registers[0], ++expected_reg, "Bulk register update correct.");
        if(expected_reg == 2) {
            beta.stop();
            start();
        }
    });
    beta.on('change:pc', function(pc) {
        equal(pc, 0, "Bulk PC update correct.");
    });

    beta.run(3);
});
