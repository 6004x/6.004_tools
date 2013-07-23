module("Common");

test("RegisterName", function() {
    r = BSim.Common.RegisterName;
    equal(r(0), 'R0', '0 -> R0');
    equal(r(16), 'R16', '16 -> R16');
    equal(r(26), 'R26', '26 -> R26');
    equal(r(27), 'BP', '27 -> BP');
    equal(r(28), 'LP', '28 -> LP');
    equal(r(29), 'SP', '29 -> SP');
    equal(r(30), 'XP', '30 -> XP');
    equal(r(31), 'R31', '31 -> R31');
});

test("FixUint", function() {
    f = BSim.Common.FixUint;
    equal(f(0), 0, "(uint)0 = 0");
    equal(f(1), 1, "(uint)1 = 1");
    equal(f(-1), 0xFFFFFFFF, "(uint)-1 = 0xFFFFFFFF");
    equal(f(0x7FFFFFFF), 0x7FFFFFFF, "(uint)0x7FFFFFFF = 0x7FFFFFFF");
    equal(f(0x80000000), 0x80000000, "(uint)0x80000000 = 0x80000000");
});

test("FormatWord", function() {
    f = BSim.Common.FormatWord;
    equal(f(0), "00000000", "0 = 0x00000000");
    equal(f(1), "00000001", "0 = 0x00000001");
    equal(f(65535), "0000ffff", "65535 = 0x0000ffff");
    equal(f(-1), "ffffffff", "-1 = 0xffffffff");
    equal(f(0x100000000), 0, "0x100000000 = 00000000"); // truncation!
    equal(f(false), "00000000", "false = 00000000");
    equal(f(true), "00000001", "true = 00000001");

    equal(f(0, 4), "0000", "0 = 0x0000");
    equal(f(0x100, 4), "0100", "0x100 = 0x0100");
    equal(f(0x1ffff, 4), "ffff", "0x1ffff = 0xffff"); // This one matters!
});
