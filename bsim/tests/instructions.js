module("Instructions");

// Simple beta for testing purposes.
var FakeBeta = function() {
    var mRegisters = new Int32Array(32);
    var mMemory = new Uint32Array(32);
    var mPC = 0;
    var mOptions = {};

    this.writeRegister = function(register, value) {
        mRegisters[register] = value;
    };

    this.readRegister = function(register) {
        return mRegisters[register];
    };

    this.readWord = function(address) {
        return mMemory[address >> 2];
    };

    this.writeWord = function(address, value) {
        mMemory[address >> 2] = value;
    };

    this.getPC = function() {
        return mPC;
    };

    this.setPC = function(pc) {
        mPC = pc;
    };

    this.isOptionSet = function(option) {
        return !mOptions[option]; // all set by default
    };

    this.setOption = function(option, value) {
        mOptions[option] = !!value;
    };

    this.handleIllegalInstruction = function(option) {
        return false;
    };
};

var testr = function(a, b, opcode) {
    var beta = new FakeBeta();
    beta.writeRegister(2, a);
    beta.writeRegister(6, b);
    BSim.Beta.Opcodes[opcode].exec.call(beta, 2, 6, 9);
    return beta.readRegister(9);
};

var testc = function(a, literal, opcode) {
    var beta = new FakeBeta();
    beta.writeRegister(2, a);
    BSim.Beta.Opcodes[opcode].exec.call(beta, 2, literal, 9);
    return beta.readRegister(9);
}

var ops = BSim.Beta.Opcodes;

test("ADD exec", function() {
    equal(testr(2, 2, 0x20), 4, "2 + 2 = 4");
    equal(testr(-7, 20, 0x20), 13, "-7 + 20 = 13");
    equal(testr(5, -5, 0x20), 0, "5 + -5 = 0");
    equal(testr(0x7FFFFFFF, 1, 0x20), -0x80000000, "INT_MAX + 1 = INT_MIN");
});

test("ADDC exec", function() {
    equal(testc(2, 2, 0x30), 4, "2 + 2 = 4");
    equal(testc(-7, 20, 0x30), 13, "-7 + 20 = 13");
    equal(testc(5, -5, 0x30), 0, "5 + -5 = 0");
    equal(testc(0x7FFFFFFF, 1, 0x30), -0x80000000, "INT_MAX + 1 = INT_MIN");
});

test("AND exec", function() {
    equal(testr(2, 2, 0x28), 2, "2 & 2 = 2");
    equal(testr(2, 1, 0x28), 0, "2 & 1 = 0");
    equal(testr(0xFFFFF000, 0x0000FFFF, 0x28), 0x0000F000, "0xFFFFF000 & 0x0000FFFF = 0x0000F000");
});

test("ANDC exec", function() {
    equal(testc(2, 2, 0x38), 2, "2 & 2 = 2");
    equal(testc(2, 1, 0x38), 0, "2 & 1 = 0");
    equal(testc(0xFFFFF000, 0x0000FFFF, 0x38), 0x0000F000, "0xFFFFF000 & 0x0000FFFF = 0x0000F000");
});

test("BEQ exec", function() {
    var beta = new FakeBeta();

    beta.writeRegister(2, 0);
    beta.setPC(0x100);
    ops[0x1C].exec.call(beta, 2, 0x100, 10);
    equal(beta.getPC(), 0x500, "Jumped to correct location when a = 0");
    equal(beta.readRegister(10), 0x100, "Old PC is stored correctly.");

    beta.writeRegister(3, 1);
    beta.setPC(0x200);
    ops[0x1C].exec.call(beta, 3, 0x100, 11);
    equal(beta.getPC(), 0x200, "Beta did not jump when a = 1");
    equal(beta.readRegister(11), 0x200, "Old PC is stored correctly.");

    beta.writeRegister(4, 42);
    beta.setPC(0x300);
    ops[0x1C].exec.call(beta, 4, 0x100, 12);
    equal(beta.getPC(), 0x300, "Beta did not jump when a = 42");
    equal(beta.readRegister(12), 0x300, "Old PC is stored correctly.");
});

test("BNE exec", function() {
    var beta = new FakeBeta();

    beta.writeRegister(2, 1);
    beta.setPC(0x100);
    ops[0x1D].exec.call(beta, 2, 0x100, 10);
    equal(beta.getPC(), 0x500, "Jumped to correct location when a = 1");
    equal(beta.readRegister(10), 0x100, "Old PC is stored correctly.");

    beta.writeRegister(3, 0);
    beta.setPC(0x200);
    ops[0x1D].exec.call(beta, 3, 0x100, 11);
    equal(beta.getPC(), 0x200, "Beta did not jump when a = 0");
    equal(beta.readRegister(11), 0x200, "Old PC is stored correctly.");

    beta.writeRegister(4, 42);
    beta.setPC(0x300);
    ops[0x1D].exec.call(beta, 4, 0x100, 12);
    equal(beta.getPC(), 0x700, "Jumped to correct location when a = 42");
    equal(beta.readRegister(12), 0x300, "Old PC is stored correctly.");
});

test("CMPEQ exec", function() {
    equal(testr(0, 0, 0x24), 1, "0 == 0");
    equal(testr(0, 1, 0x24), 0, "0 != 1");
    equal(testr(1, 0, 0x24), 0, "1 != 0");
    equal(testr(1, 1, 0x24), 1, "1 == 1");
    equal(testr(-10, -1, 0x24), 0, "-10 != -1");
    equal(testr(-10, -10, 0x24), 1, "-10 == -10");
});

test("CMPEQC exec", function() {
    equal(testc(0, 0, 0x34), 1, "0 == 0");
    equal(testc(0, 1, 0x34), 0, "0 != 1");
    equal(testc(1, 0, 0x34), 0, "1 != 0");
    equal(testc(1, 1, 0x34), 1, "1 == 1");
    equal(testc(-10, -1, 0x34), 0, "-10 != -1");
    equal(testc(-10, -10, 0x34), 1, "-10 == -10");
});

test("CMPLE exec", function() {
    equal(testr(0, 0, 0x26), 1, "0 <= 0 is true");
    equal(testr(1, 0, 0x26), 0, "1 <= 0 is false");
    equal(testr(0, 1, 0x26), 1, "0 <= 1 is true");
    equal(testr(10, -10, 0x26), 0, "10 <= -10 is false");
    equal(testr(-10, 10, 0x26), 1, "-10 <= 10 is true");
    equal(testr(-10, -20, 0x26), 0, "-10 <= -20 is false");
    equal(testr(-20, -10, 0x26), 1, "-20 <= -10 is true");
    equal(testr(-0x80000000, 0x7FFFFFFF, 0x26), 1, "INT_MIN <= INT_MAX is true");
    equal(testr(0x7FFFFFFF, -0x80000000, 0x26), 0, "INT_MAX <= INT_MIN is false");
});

test("CMPLEC exec", function() {
    equal(testc(0, 0, 0x36), 1, "0 <= 0 is true");
    equal(testc(1, 0, 0x36), 0, "1 <= 0 is false");
    equal(testc(0, 1, 0x36), 1, "0 <= 1 is true");
    equal(testc(10, -10, 0x36), 0, "10 <= -10 is false");
    equal(testc(-10, 10, 0x36), 1, "-10 <= 10 is true");
    equal(testc(-10, -20, 0x36), 0, "-10 <= -20 is false");
    equal(testc(-20, -10, 0x36), 1, "-20 <= -10 is true");
    equal(testc(-0x80000000, 0x7FFFFFFF, 0x36), 1, "INT_MIN <= INT_MAX is true");
    equal(testc(0x7FFFFFFF, -0x80000000, 0x36), 0, "INT_MAX <= INT_MIN is false");
});

test("CMPLT exec", function() {
    equal(testr(0, 0, 0x25), 0, "0 < 0 is false");
    equal(testr(42, 42, 0x25), 0, "42 < 42 is false");
    equal(testr(-42, -42, 0x25), 0, "-42 < -42 is false");
    equal(testr(1, 0, 0x25), 0, "1 < 0 is false");
    equal(testr(0, 1, 0x25), 1, "0 < 1 is true");
    equal(testr(10, -10, 0x25), 0, "10 < -10 is false");
    equal(testr(-10, 10, 0x25), 1, "-10 < 10 is true");
    equal(testr(-10, -20, 0x25), 0, "-10 < -20 is false");
    equal(testr(-20, -10, 0x25), 1, "-20 < -10 is true");
    equal(testr(-0x80000000, 0x7FFFFFFF, 0x25), 1, "INT_MIN < INT_MAX is true");
    equal(testr(0x7FFFFFFF, -0x80000000, 0x25), 0, "INT_MAX < INT_MIN is false");
});

test("CMPLTC exec", function() {
    equal(testc(0, 0, 0x35), 0, "0 < 0 is false");
    equal(testc(42, 42, 0x35), 0, "42 < 42 is false");
    equal(testc(-42, -42, 0x35), 0, "-42 < -42 is false");
    equal(testc(1, 0, 0x35), 0, "1 < 0 is false");
    equal(testc(0, 1, 0x35), 1, "0 < 1 is true");
    equal(testc(10, -10, 0x35), 0, "10 < -10 is false");
    equal(testc(-10, 10, 0x35), 1, "-10 < 10 is true");
    equal(testc(-10, -20, 0x35), 0, "-10 < -20 is false");
    equal(testc(-20, -10, 0x35), 1, "-20 < -10 is true");
    equal(testc(-0x80000000, 0x7FFFFFFF, 0x35), 1, "INT_MIN < INT_MAX is true");
    equal(testc(0x7FFFFFFF, -0x80000000, 0x35), 0, "INT_MAX < INT_MIN is false");
});

test("DIV exec", function() {
    equal(testr(10, 2, 0x23), 5, "10 / 2 = 5");
    equal(testr(10, -2, 0x23), -5, "10 / -2 = -5");
    equal(testr(-10, 2, 0x23), -5, "-10 / 2 = -5");
    equal(testr(-10, -2, 0x23), 5, "-10 / -2 = 5");
    equal(testr(3, 3, 0x23), 1, "3 / 3 = 1");
    equal(testr(2, 3, 0x23), 0, "2 / 3 = 0");
    equal(testr(1, 3, 0x23), 0, "1 / 3 = 0");
    equal(testr(0, 3, 0x23), 0, "0 / 3 = 0");
    equal(testr(2, 4, 0x23), 0, "2 / 4 = 0");
    throws(
        function() {
            testr(4, 0, 0x23);
        },
        "4 / 0 = runtime error"
    );
});

test("DIVC exec", function() {
    equal(testc(10, 2, 0x33), 5, "10 / 2 = 5");
    equal(testc(10, -2, 0x33), -5, "10 / -2 = -5");
    equal(testc(-10, 2, 0x33), -5, "-10 / 2 = -5");
    equal(testc(-10, -2, 0x33), 5, "-10 / -2 = 5");
    equal(testc(3, 3, 0x33), 1, "3 / 3 = 1");
    equal(testc(2, 3, 0x33), 0, "2 / 3 = 0");
    equal(testc(1, 3, 0x33), 0, "1 / 3 = 0");
    equal(testc(0, 3, 0x33), 0, "0 / 3 = 0");
    equal(testc(2, 4, 0x33), 0, "2 / 4 = 0");
    throws(
        function() {
            testc(4, 0, 0x33);
        },
        "4 / 0 = runtime error"
    );
});

test("JMP exec", function() {
    var beta = new FakeBeta();
    beta.setPC(0x100);
    beta.writeRegister(5, 0x1234);
    ops[0x1B].exec.call(beta, 5, 0, 2);

    equal(beta.getPC(), 0x1234, "PC updated correctly.");
    equal(beta.readRegister(2), 0x100, "Old PC written correctly.");
});

test("LD exec", function() {
    var beta = new FakeBeta();
    beta.writeWord(12, 0xDEADBEEF);
    beta.writeWord(16, 0xFACADE);
    beta.writeWord(20, 0xBADF00D);
    beta.writeRegister(1, 8);
    beta.writeRegister(2, 16);
    beta.writeRegister(3, 32);

    var ld = ops[0x18].exec;
    ld.call(beta, 31, 16, 10);
    equal(beta.readRegister(10), 0xFACADE, "LD(0+16) works");
    ld.call(beta, 1, 8, 11);
    equal(beta.readRegister(11), 0xFACADE, "LD(8+8) works");
    ld.call(beta, 2, 0, 12);
    equal(beta.readRegister(12), 0xFACADE, "LD(16+0) works");
    ld.call(beta, 3, -16, 13);
    equal(beta.readRegister(13), 0xFACADE, "LD(32-16) works");
});

test("LDR exec", function() {
    var beta = new FakeBeta();
    beta.writeWord(12, 0xDEADBEEF);
    beta.writeWord(16, 0xFACADE);
    beta.writeWord(20, 0xBADF00D);

    var ldr = ops[0x1F].exec;
    beta.setPC(0);
    ldr.call(beta, 0, 4, 10);
    equal(beta.readRegister(10), 0xFACADE, "LDR(0+16) works");

    beta.setPC(8);
    ldr.call(beta, 0, 2, 11);
    equal(beta.readRegister(11), 0xFACADE, "LDR(8+8) works");

    beta.setPC(16);
    ldr.call(beta, 0, 0, 12);
    equal(beta.readRegister(12), 0xFACADE, "LDR(16+0) works");

    beta.setPC(32);
    ldr.call(beta, 0, -4, 13);
    equal(beta.readRegister(13), 0xFACADE, "LDR(32-16) works");
});

test("MUL exec", function() {
    equal(testr(2, 2, 0x22), 4, "2 * 2 = 4");
    equal(testr(10, 0, 0x22), 0, "10 * 0 = 0");
    equal(testr(0, 10, 0x22), 0, "0 * 10 = 0");
    equal(testr(-5, 2, 0x22), -10, "-5 * 2 = -10");
    equal(testr(5, -2, 0x22), -10, "5 * -2 = -10");
    equal(testr(-5, -2, 0x22), 10, "-5 * -2 = 10");
    equal(testr(0, 0, 0x22), 0, "0 * 0 = 0");
    equal(testr(0xFFFF, 0xFFFF, 0x22), -131071, "0xFFFF * 0xFFFF = -131071");
    equal(testr(0x10000, 0x10000, 0x22), 0, "0x10000 * 0x10000 = 0");
});

test("MULC exec", function() {
    equal(testc(2, 2, 0x32), 4, "2 * 2 = 4");
    equal(testc(10, 0, 0x32), 0, "10 * 0 = 0");
    equal(testc(0, 10, 0x32), 0, "0 * 10 = 0");
    equal(testc(-5, 2, 0x32), -10, "-5 * 2 = -10");
    equal(testc(5, -2, 0x32), -10, "5 * -2 = -10");
    equal(testc(-5, -2, 0x32), 10, "-5 * -2 = 10");
    equal(testc(0, 0, 0x32), 0, "0 * 0 = 0");
    equal(testc(0xFFFF, 0xFFFF, 0x32), -131071, "0xFFFF * 0xFFFF = -131071");
    equal(testc(0x10000, 0x10000, 0x32), 0, "0x10000 * 0x10000 = 0");
});

test("OR exec", function() {
    equal(testr(1, 2, 0x29), 3, "1 | 2 = 3");
    equal(testr(2, 1, 0x29), 3, "2 | 1 = 3");
    equal(testr(2, 2, 0x29), 2, "2 | 2 = 2");
    equal(testr(0x7FFFF000, 0x000FFFFF, 0x29), 0x7FFFFFFF, "0x7FFFF000 | 0x000FFFFF = 0x7FFFFFFF");
});

test("ORC exec", function() {
    equal(testc(1, 2, 0x39), 3, "1 | 2 = 3");
    equal(testc(2, 1, 0x39), 3, "2 | 1 = 3");
    equal(testc(2, 2, 0x39), 2, "2 | 2 = 2");
    equal(testc(0x7FFFF000, 0x000FFFFF, 0x39), 0x7FFFFFFF, "0x7FFFF000 | 0x000FFFFF = 0x7FFFFFFF");
});

test("SHL exec", function() {
    equal(testr(1, 3, 0x2C), 8, "1 << 3 = 8");
    equal(testr(3, 3, 0x2C), 24, "3 << 3 = 8");
    equal(testr(4, 7, 0x2C), 512, "4 << 7 = 512");
    equal(testr(0xFFFFF, 4, 0x2C), 0xFFFFF0, "0xFFFFF << 4 = 0xFFFFF0");
    equal(testr(0x7FFFFFFF, 1, 0x2C), -2, "INT_MAX << 1 = -2");
    equal(testr(0x80000000, 1, 0x2C), 0, "0x80000000 << 1 = 0");
    equal(testr(1, 32, 0x2C), 1, "0x01 << 32 = 0x01");
    equal(testr(1, 36, 0x2C), 0x10, "0x01 << 36 = 0x10");
});

test("SHLC exec", function() {
    equal(testc(1, 3, 0x3C), 8, "1 << 3 = 8");
    equal(testc(3, 3, 0x3C), 24, "3 << 3 = 8");
    equal(testc(4, 7, 0x3C), 512, "4 << 7 = 512");
    equal(testc(0xFFFFF, 4, 0x3C), 0xFFFFF0, "0xFFFFF << 4 = 0xFFFFF0");
    equal(testc(0x7FFFFFFF, 1, 0x3C), -2, "INT_MAX << 1 = -2");
    equal(testc(0x80000000, 1, 0x3C), 0, "0x80000000 << 1 = 0");
    equal(testc(1, 32, 0x3C), 1, "0x01 << 32 = 0x01");
    equal(testc(1, 36, 0x3C), 0x10, "0x01 << 36 = 0x10");
});

test("SHR exec", function() {
    equal(testr(1, 1, 0x2D), 0, "1 >> 1 = 0");
    equal(testr(3, 1, 0x2D), 1, "3 >> 1 = 1");
    equal(testr(0xFFFFFFFF, 4, 0x2D), 0x0FFFFFFF, "0xFFFFFFFF >> 4 = 0x0FFFFFFF");
    equal(testr(0x7FFFFFFF, 4, 0x2D), 0x07FFFFFF, "0xFFFFFFFF >> 4 = 0x0FFFFFFF");
    equal(testr(0x80000000, 4, 0x2D), 0x08000000, "0x80000000 >> 4 = 0x08000000");
    equal(testr(0x80000000, 28, 0x2D), 0x00000008, "0x80000000 >> 28 = 0x00000008");
    equal(testr(0x70000000, 32, 0x2D), 0x70000000, "0x70000000 >> 32 = 0x70000000");
    equal(testr(0x70000000, 36, 0x2D), 0x07000000, "0x70000000 >> 36 = 0x07000000");
});

test("SHRC exec", function() {
    equal(testc(1, 1, 0x3D), 0, "1 >> 1 = 0");
    equal(testc(3, 1, 0x3D), 1, "3 >> 1 = 1");
    equal(testc(0xFFFFFFFF, 4, 0x3D), 0x0FFFFFFF, "0xFFFFFFFF >> 4 = 0x0FFFFFFF");
    equal(testc(0x7FFFFFFF, 4, 0x3D), 0x07FFFFFF, "0xFFFFFFFF >> 4 = 0x0FFFFFFF");
    equal(testc(0x80000000, 4, 0x3D), 0x08000000, "0x80000000 >> 4 = 0x08000000");
    equal(testc(0x80000000, 28, 0x3D), 0x00000008, "0x80000000 >> 28 = 0x00000008");
    equal(testc(0x70000000, 32, 0x3D), 0x70000000, "0x70000000 >> 32 = 0x70000000");
    equal(testc(0x70000000, 36, 0x3D), 0x07000000, "0x70000000 >> 36 = 0x07000000");
});

test("SRA exec", function() {
    equal(testr(1, 1, 0x2E), 0, "1 >> 1 = 0");
    equal(testr(3, 1, 0x2E), 1, "3 >> 1 = 1");
    equal(testr(0xFFFFFFFF, 4, 0x2E), -1, "0xFFFFFFFF >> 4 = 0xFFFFFFFF");
    equal(testr(0x7FFFFFFF, 4, 0x2E), 0x07FFFFFF, "0xFFFFFFFF >> 4 = 0x0FFFFFFF");
    equal(testr(0x80000000, 4, 0x2E), -134217728, "0x80000000 >> 4 = 0xF8000000");
    equal(testr(0x80000000, 28, 0x2E), -8, "0x80000000 >> 28 = 0xFFFFFFF8");
    equal(testr(0x70000000, 32, 0x2E), 0x70000000, "0x70000000 >> 32 = 0x70000000");
    equal(testr(0x70000000, 36, 0x2E), 0x07000000, "0x70000000 >> 36 = 0x07000000");
});

test("SRAC exec", function() {
    equal(testc(1, 1, 0x3E), 0, "1 >> 1 = 0");
    equal(testc(3, 1, 0x3E), 1, "3 >> 1 = 1");
    equal(testc(0xFFFFFFFF, 4, 0x3E), -1, "0xFFFFFFFF >> 4 = 0xFFFFFFFF");
    equal(testc(0x7FFFFFFF, 4, 0x3E), 0x07FFFFFF, "0xFFFFFFFF >> 4 = 0x0FFFFFFF");
    equal(testc(0x80000000, 4, 0x3E), -134217728, "0x80000000 >> 4 = 0xF8000000");
    equal(testc(0x80000000, 28, 0x3E), -8, "0x80000000 >> 28 = 0xFFFFFFF8");
    equal(testc(0x70000000, 32, 0x3E), 0x70000000, "0x70000000 >> 32 = 0x70000000");
    equal(testc(0x70000000, 36, 0x3E), 0x07000000, "0x70000000 >> 36 = 0x07000000");
});

test("SUB exec", function() {
    equal(testr(10, 2, 0x21), 8, "10 - 2 = 8");
    equal(testr(10, 10, 0x21), 0, "10 - 10 = 0");
    equal(testr(2, 10, 0x21), -8, "2 - 10 = -8");
    equal(testr(-2, 10, 0x21), -12, "-2 - 10 = -12");
    equal(testr(2, -10, 0x21), 12, "2 - -10 = 12");
    equal(testr(-2, -10, 0x21), 8, "-2 - -10 = 8");
});

test("SUBC exec", function() {
    equal(testc(10, 2, 0x31), 8, "10 - 2 = 8");
    equal(testc(10, 10, 0x31), 0, "10 - 10 = 0");
    equal(testc(2, 10, 0x31), -8, "2 - 10 = -8");
    equal(testc(-2, 10, 0x31), -12, "-2 - 10 = -12");
    equal(testc(2, -10, 0x31), 12, "2 - -10 = 12");
    equal(testc(-2, -10, 0x31), 8, "-2 - -10 = 8");
});

test("ST exec", function() {
    var beta = new FakeBeta();

    var st = ops[0x19].exec;
    beta.writeRegister(2, 0xDEADBEEF);
    st.call(beta, 31, 0x8, 2);
    equal(beta.readWord(0x8), 0xDEADBEEF, "Setting by absolute address works");

    beta.writeRegister(1, 0x8);
    beta.writeRegister(3, 0xFACADE)
    st.call(beta, 1, 0x8, 3);
    equal(beta.readWord(0x10), 0xFACADE, "Setting by relative address works");
});

test("XOR exec", function() {
    equal(testr(1, 3, 0x2A), 2, "1 ^ 3 = 2");
    equal(testr(8, 8, 0x2A), 0, "8 ^ 8 = 0");
    equal(testr(2, 4, 0x2A), 6, "2 ^ 4 = 6");
});

test("XORC exec", function() {
    equal(testc(1, 3, 0x3A), 2, "1 ^ 3 = 2");
    equal(testc(8, 8, 0x3A), 0, "8 ^ 8 = 0");
    equal(testc(2, 4, 0x3A), 6, "2 ^ 4 = 6");
});

test("XNOR exec", function() {
    equal(testr(1, 3, 0x2B), ~2, "1 ~^ 3 = ~2");
    equal(testr(8, 8, 0x2B), ~0, "8 ~^ 8 = ~0");
    equal(testr(2, 4, 0x2B), ~6, "2 ~^ 4 = ~6");
});

test("XNORC exec", function() {
    equal(testc(1, 3, 0x3B), ~2, "1 ~^ 3 = ~2");
    equal(testc(8, 8, 0x3B), ~0, "8 ~^ 8 = ~0");
    equal(testc(2, 4, 0x3B), ~6, "2 ~^ 4 = ~6");
});
