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
    expect(11);
    var beta = new BSim.Beta();

    var values = [0x80000020, 0x24, 0x30, 0x80000034, 0x80000040 - 0x100000000];
    beta.on('change:pc', function(value) {
        equal(value, values.shift(), "change:pc to " + value);
    });

    equal(beta.getPC(), 0x80000000, "PC starts at 0 in supervisor mode.");
    beta.setPC(0x80000020);
    equal(0x100000000 + beta.getPC(), 0x80000020, "Supervisor bit can be persisted from supervisor mode in all cases.");
    beta.setPC(0x24);
    equal(beta.getPC(), 0x24, "Dropping supervisor bit works.");
    beta.setPC(0x80000030);
    equal(beta.getPC(), 0x30, "Setting supervisor bit is ignored.");
    beta.setPC(0x80000034, true);
    equal(0x100000000 + beta.getPC(), 0x80000034, "Setting supervisor bit is acceptable when specified.");

    beta.setOption('kalways', true);
    beta.setPC(0x40);
    equal(0x100000000 + beta.getPC(), 0x80000040, "Can't drop supervisor bit in kalways mode.");
});
