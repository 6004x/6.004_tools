module("Memory");

test("Empty memory", function() {
    var memory = new BSim.Beta.Memory();
    equal(memory.size(), 0, "Newly created memory has zero size.");
    throws(
        function() {
            memory.readWord(0);
        },
        "Reading address zero of empty memory is a runtime error"
    );
    throws(
        function() {
            memory.writeWord(0, 0);
        },
        "Writing address zero of empty memory is a runtime error"
    );
});

test("Loading words of bytes", function() {
    var memory = new BSim.Beta.Memory();
    memory.loadBytes([1, 2, 3, 4]);
    equal(memory.size(), 4, "Loaded bytes have expected size.");
    equal(memory.readWord(0), 67305985, "Words have the expected value when read");

    throws(
        function() {
            memory.readWord(4);
        },
        "Reading out of bounds is illegal."
    );
});

test("Writing to memory", function() {
    var memory = new BSim.Beta.Memory();
    memory.loadBytes([1, 2, 3, 4]);
    memory.writeWord(0, 257);
    equal(memory.readWord(0), 257, "Words are written and read back correctly.");
    memory.reset();
    equal(memory.readWord(0), 67305985, "Reset correctly resets memory to its original value.");

    throws(
        function() {
            memory.writeWord(4, 0xDEADBEEF);
        },
        "Writing out of bounds is illegal."
    );
});

test("Protect all memory", function() {
    var memory = new BSim.Beta.Memory();
    memory.loadBytes(_.range(0, 255));

    memory.setProtectedRegions([{start: 0, end: Infinity}]);
    equal(memory.isProtected(0), true, "Protecting all memory protects address 0");
});

test("Protect subsets of memory", function() {
    var memory = new BSim.Beta.Memory();
    memory.loadBytes(_.range(0, 255));

    memory.setProtectedRegions([{start: 4, end: 12}, {start: 0x30, end: 0x40}]);
    equal(memory.isProtected(0), false, "Start of memory is not protected.");
    equal(memory.isProtected(4), true, "Start of range is protected.");
    equal(memory.isProtected(8), true, "Middle of range is protected.");
    equal(memory.isProtected(12), false, "Memory protection ends correctly.");
    equal(memory.isProtected(0x2F), false, "Byte immediately before protected region is not protected.");
    equal(memory.isProtected(0x30), true, "Beginning of second protected region is protected.");
    equal(memory.isProtected(0x34), true, "Middle of second protected region is protected.");
    equal(memory.isProtected(0x39), true, "Last byte of second protected region is protected.");
    equal(memory.isProtected(0x40), false, "End of second protected region is not protected.");

    throws(
        function() {
            memory.writeWord(0x30, 42);
        },
        "Writing to protected memory throws an exception."
    );
    ok(memory.readWord(0x30), "Reading from protected memory is legal.");
});

