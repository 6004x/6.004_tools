module("Assembler");

test("Assembles an empty file", function() {
    expect(7);
    var assembler = new BetaAssembler();
    assembler.assemble("empty.uasm", "", function(success, result) {
        ok(success, "Empty file assembles succssfully");
        equal(result.image.length, 0, "Empty file produces empty image.");
        equal(result.breakpoints.length, 0, "Empty file produces no breakpoints.");
        deepEqual(result.labels, {}, "Empty file produces no labels.");
        deepEqual(result.options, {}, "Empty file produces no options.");
        equal(result.protection.length, 0, "Empty file has no protected regions.");
        deepEqual(result.checkoff, null, "Empty file has no checkoff.");
    });
});

test("Assembles integers", function() {
    expect(10);
    var assembler = new BetaAssembler();
    assembler.assemble("ints.uasm", "42", function(success, result) {
        ok(success, "Decimal integer assembles without error.");
        deepEqual(result.image, new Uint8Array([42]), "Decimal integer has correct value.");
    });

    assembler.assemble("ints.uasm", "0x42", function(success, result) {
        ok(success, "Hexadecimal integer assembles without error.");
        deepEqual(result.image, new Uint8Array([0x42]), "Decimal integer has correct value.");
    });

    assembler.assemble("ints.uasm", "042", function(success, result) {
        ok(success, "Octal integer assembles without error.");
        deepEqual(result.image, new Uint8Array([34]), "Octal integer has correct value.");
    });

    assembler.assemble("ints.uasm", "0b101010", function(success, result) {
        ok(success, "Binary integer assembles without error.");
        deepEqual(result.image, new Uint8Array([42]), "Binary integer has correct value.");
    });

    assembler.assemble("ints.uasm", "256", function(success, result) {
        ok(!success, "Integer larger than one byte is an error.");
        // ok(true);
    });

    assembler.assemble("ints.uasm", "0xabjs2", function(success, result) {
        ok(!success, "Invalid integer throws a syntax error");
        // ok(true);
    });
});

test("Character constants work", function() {
    var assembler = new BetaAssembler();
    assembler.assemble("char.uasm", "'a'", function(success, result) {
        ok(success, "Character constants are legal.");
        deepEqual(result.image, new Uint8Array([97]), "Lowercase constants have expected value.");
    });
    assembler.assemble("char.uasm", "'A'", function(success, result) {
        deepEqual(result.image, new Uint8Array([65]), "Uppercase constants have expected value.");
    });
    assembler.assemble("char.uasm", "''", function(success, result) {
        ok(!success, "Empty character constants are illegal.");
    });
    assembler.assemble("char.uasm", "'ab'", function(success, result) {
        ok(!success, "Multi-character character constants are illegal.");
    });

    var test_escape_char = function(chr, expected) {
        assembler.assemble("char.uasm", "'\\" + chr + "'", function(success, result) {
            // ok(success, "'\\" + chr + "' is legal");
            deepEqual(result.image, new Uint8Array([expected]), "'\\" + chr + "' has the expected value.");
        });
    };

    test_escape_char("\\", 92);
    test_escape_char("b", 8);
    test_escape_char("f", 12);
    test_escape_char("n", 10);
    test_escape_char("r", 13);
    test_escape_char("t", 9);
    test_escape_char("\"", 34);
    test_escape_char("'", 39);

    assembler.assemble("char.uasm", "'\\z'", function(success, result) {
        ok(!success, "Non-escape escape characters are illegal.");
    });

    assembler.assemble("char.uasm", "'\\4'", function(success, result) {
        ok(success, "Single-digit octal numbers are legal");
        deepEqual(result.image, new Uint8Array([4]), "Single-digit octal numbers have the expected value.");
    });

    assembler.assemble("char.uasm", "'\\42'", function(success, result) {
        ok(success, "Two-digit octal numbers are legal");
        deepEqual(result.image, new Uint8Array([34]), "Two-digit octal numbers have the expected value.");
    });

    assembler.assemble("char.uasm", "'\\234'", function(success, result) {
        ok(success, "Three-digit octal numbers are legal");
        deepEqual(result.image, new Uint8Array([156]), "Three-digit octal numbers have the expected value.");
    });

    assembler.assemble("char.uasm", "'\\402'", function(success, result) {
        ok(!success, "Octal numbers larger than 8-bits are illegal.");
    });
});

test("Assembles sequences", function() {
    expect(2);
    var assembler = new BetaAssembler();
    assembler.assemble("sequnce.uasm", "1 2 3 4 0x42 6 7 8", function(success, result) {
        ok(success, "Integer sequence assembles without error");
        deepEqual(result.image, new Uint8Array([1, 2, 3, 4, 0x42, 6, 7, 8]), "Sequence is assembled correctly.");
    });
});

test("Evaluates expressions", function() {
    expect(23);
    var assembler = new BetaAssembler();
    assembler.assemble("expression.uasm", "2 + 2", function(success, result) {
        ok(success, "Expression assembles without error");
        deepEqual(result.image, new Uint8Array([4]), "Expression is evaluated correctly.");
    });

    assembler.assemble("expression.uasm", "2 + 2 3 + 3", function(success, result) {
        ok(success, "Sequence of expressions assembles without error");
        deepEqual(result.image, new Uint8Array([4, 6]), "Sequence of expressions is assembled correctly.");
    });

    // convenience function
    var test_expression = function(expression, expected, description) {
        assembler.assemble("expression.uasm", expression, function(success, result) {
            // ok(success, expression + " assembled without error.");
            deepEqual(result.image, new Uint8Array([expected]), description);
        });
    };

    test_expression("2 * 3", 6, "Multiplication is evaluated correctly.");
    test_expression("3 - 2", 1, "Subtraction is evaluated correctly.");
    test_expression("2 - 3", 255, "Negative results are interpreted as two's-complement");
    test_expression("4 / 2", 2, "Integer division is evaluated correctly.");
    test_expression("10 / 6", 1, "Non-integer division rounds down (above 0.5)");
    test_expression("10 / 3", 3, "Non-integer division rounds down (below 0.5)");
    test_expression("3 / 2", 1, "Non-integer division rounds down (exactly 0.5)");
    test_expression("3*(5+5)", 30, "Single-level parentheses are first");
    test_expression("3*(10/(2+3))", 6, "Nested parentheses are first");
    test_expression("-5", 251, "Unary negation works");
    test_expression("~1", 254, "Unary NOT works");
    test_expression("~-1", 0, "Sequential unary operators work.");
    // ok(true);
    test_expression("3 & 2", 2, "Bitwise AND works");
    test_expression("4 | 1", 5, "Bitwise OR works");
    test_expression("17 % 10", 7, "Modulo works.");
    test_expression("8 >> 1", 4, "Right shift works");
    test_expression("8 << 1", 16, "Left shift works");

    assembler.assemble("expression.uasm", "(2+2", function(success, result) {
        ok(!success, "Missing closing parenthesis is an error.");
    });

    assembler.assemble("expression.uasm", "(2+2))", function(success, result) {
        ok(!success, "Extra closing parenthesis is an error.");
    });
});

test("Evaluates assignments", function() {
    expect(8);
    var assembler = new BetaAssembler();
    assembler.assemble("assign.uasm", "foo = 42", function(success, result) {
        ok(success, "Assignment assembles without error");
    });
    assembler.assemble("assign.uasm", "foo = 4 + 4", function(success, result) {
        ok(success, "Assigning an expression assembles without error.");
    });
    assembler.assemble("assign.uasm", "foo = 2 foo", function(success, result) {
        ok(success, "Assigning and using an expression assembles without error.");
        deepEqual(result.image, new Uint8Array([2]), "Assignment produces correct value.");
    });
    assembler.assemble("assign.uasm", "foo = 2 foo foo = 3 foo", function(success, result) {
        ok(success, "Reassignment assmbles without error.");
        deepEqual(result.image, new Uint8Array([2, 3]), "Reassignment reassigns.");
    });
    assembler.assemble("assign.uasm", "a = b\nb = a", function(success, result) {
        ok(!success, "Unresolvable assignment loops are an error.");
    });
    assembler.assemble("assign.uasm", "a = b", function(success, result) {
        ok(!success, "Using undefined symbols is an error.");
    });
});

test("Special dot variable works", function() {
    expect(10);
    var assembler = new BetaAssembler();
    assembler.assemble("dot.uasm", ".", function(success, result) {
        ok(success, "'.' assembles.");
        deepEqual(result.image, new Uint8Array([0]), ". is zero as only token in program");
    });
    assembler.assemble("dot.uasm", ". 1 2 3", function(success, result) {
        deepEqual(result.image, new Uint8Array([0, 1, 2, 3]), ". is zero at start of nonempty program.");
    });
    assembler.assemble("dot.uasm", "1 2 .", function(success, result) {
        deepEqual(result.image, new Uint8Array([1, 2, 2]), ". is correct at end of program.");
    });
    assembler.assemble("dot.uasm", "1 . 2 3", function(success, result) {
        deepEqual(result.image, new Uint8Array([1, 1, 2, 3]), ". is correct in the middle of the program.");
    });
    assembler.assemble("dot.uasm", "1 . = 3", function(success, result) {
        deepEqual(result.image, new Uint8Array([1, 0, 0]), "Assignment to dot creates empty space at end of program.");
    });
    assembler.assemble("dot.uasm", ". = 3 42", function(success, result) {
        deepEqual(result.image, new Uint8Array([0, 0, 0, 42]), "Assignment to dot creates empty space at start of program.");
    });
    assembler.assemble("dot.uasm", "42 . = 3 24", function(success, result) {
        deepEqual(result.image, new Uint8Array([42, 0, 0, 24]), "Assignment to dot creates empty space in middle of program.");
    });
    assembler.assemble("dot.uasm", "5 5 5 . = 1", function(success, result) {
        ok(!success, "It is illegal to set dot to a lower value (by memory content).");
    });
    assembler.assemble("dot.uasm", ". = 5 . = 2", function(success, result) {
        ok(!success, "It is illegal to set dot to a lower value (by reassignment).");
    });
});

test("Macros work", function() {
    expect(23);
    var assembler = new BetaAssembler();
    assembler.assemble("macro.uasm", ".macro FOO() 42", function(success, result) {
        ok(success, "Defining a macro assembles.");
    });
    assembler.assemble("macro.uasm", ".macro FOO()", function(success, result) {
        ok(success, "Empty macros are legal.");
    });
    assembler.assemble("macro.uasm", ".macro FOO bar", function(success, result) {
        ok(!success, "Defining a macro without any parameter list (even an empty one) is illegal.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a)", function(success, result) {
        ok(success, "Defining a macro with an argument assembles.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a, b)", function(success, result) {
        ok(success, "Macros may have multiple arguments.");
    });
    assembler.assemble("macro.uasm", ".macro FOO( a", function(success, result) {
        ok(!success, "Omitting the trailing parenthesis in the argument list is illegal.");
    });
    assembler.assemble("macro.uasm", ".macro FOO ) b", function(success, result) {
        ok(!success, "Omitting the leading parenthesis in the argument list is illegal.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a, b) { }", function(success, result) {
        ok(success, "Defining a macro using block syntax on a single line assembles.");
    });
    assembler.assemble("macro.uasm", ".macro FOO() {", function(success, result) {
        console.log(result);
        ok(!success, "Omitting the trailing brace in macro block syntax is illegal.");
    });
// ok(true);
    assembler.assemble("macro.uasm", ".macro FOO() }", function(success, result) {
        ok(!success, "Omitting the leading brace in macro block syntax is illegal.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a, b) {\na\nb\n}", function(success, result) {
        ok(success, "Defining a macro using block syntax across multiple lines assembles.");
    });
    assembler.assemble("macro.uasm", ".macro FOO() 42\nFOO() FOO()", function(success, result) {
        ok(success, "Invoking a macro assembles.");
        deepEqual(result.image, new Uint8Array([42, 42]), "Trivial macro expansion works.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a) a\n FOO(42) FOO(24)", function(success, result) {
        ok(success, "Passing a macro a parameter assembles.");
        deepEqual(result.image, new Uint8Array([42, 24]), "Multiple macro invocations with differing parameters work.");
    });
    // assembler.assemble("macro.uasm", ".macro FOO(a) FOO(a)\nFOO(24)", function(success, result) {
    //     ok(!success, "I don't even know what I expect.");
    // })
    assembler.assemble("macro.uasm", ".macro FOO(a, b) b a\nFOO(1, 2)", function(success, result) {
        ok(success, "Passing a macro multiple parameters assembles.");
        deepEqual(result.image, new Uint8Array([2, 1]), "Macro invocations with multiple parameters work.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a, b) BAR(a) BAR(b)\n.macro BAR(a) a*2\nFOO(7, 2)", function(success, result) {
        ok(success, "Recursive macro expansion assembles.");
        deepEqual(result.image, new Uint8Array([14, 4]), "Nested macro expansion works.");
    });
    assembler.assemble("macro.uasm", ".macro FOO(a) a\na = 5\na\nFOO(7)\na", function(success, result) {
        ok(success, "Shadowing global symbols in macro parameters is legal.");
        deepEqual(result.image, new Uint8Array([5, 7, 5]), "Macro arguments do not affect global symbols by the same name.");
    });
    assembler.assemble("macro.uasm", ".macro FOO() a = 5 a\na = 2\na FOO() a", function(success, result) {
        ok(success, "Shadowing global symbols in macro bodies is legal.");
        deepEqual(result.image, new Uint8Array([2, 5, 2]), "Macro symbols exist in their own scope.");
    });
});

test("Labels work", function() {
    expect(11);
    var assembler = new BetaAssembler();
    assembler.assemble("label.uasm", "foo:", function(success, result) {
        ok(success, "A program consisting solely of a label is legal.");
        deepEqual(result.labels, {foo: 0}, 'foo is at address 0.');
    });
    assembler.assemble("label.uasm", "42 foo: 24", function(success, result) {
        ok(success, "A program containing a label is legal.");
        deepEqual(result.labels, {foo: 1}, 'foo points to the expected location.');
        deepEqual(result.image, new Uint8Array([42, 24]), 'Labels are not represented in the assembled output.');
    });
    assembler.assemble("label.uasm", "42 foo: bar: 24", function(success, result) {
        ok(success, "A program with multiple labels in the same place is legal.");
        deepEqual(result.labels, {foo: 1, bar: 1}, 'Multiple labels at the same location are assigned correctly.');
    });
    assembler.assemble("label.uasm", "42 foo: 8 bar: 24", function(success, result) {
        ok(success, "A program with multiple labels in multiple locations is legal");
        deepEqual(result.labels, {foo: 1, bar: 2}, 'Multiple labels at distinct locations are assigned correctly.');
    });
    assembler.assemble("label.uasm", "42 24 foo: 3*foo*bar bar: 24", function(success, result) {
        ok(success, "A program using a label in an expression is legal.");
        deepEqual(result.image, new Uint8Array([42, 24, 18, 24]), "Labels have the expected value in expressions.");
    });
});

test(".align works", function() {
    expect(8);
    var assembler = new BetaAssembler();
    assembler.assemble("align.uasm", ".align 4", function(success, result) {
        ok(success, "Alignment is legal.");
        equal(result.image.length, 0, "Aligning zero-length to 4 gives zero-length.");
    });
    assembler.assemble("align.uasm", "1 .align 4", function(success, result) {
        equal(result.image.length, 4, "Aligning a single byte to the nearest 4 gives 4.");
    });
    assembler.assemble("align.uasm", "1 1 1 1 .align 4", function(success, result) {
        equal(result.image.length, 4, "Aligning four bytes to the nearest 4 gives 4.");
    });
    assembler.assemble("align.uasm", "1 1 1 1 .align 5", function(success, result) {
        equal(result.image.length, 5, "Aligning four bytes to the nearest 5 gives 5.");
    });
    assembler.assemble("align.uasm", "1 1 1 1 1 1 .align 5", function(success, result) {
        equal(result.image.length, 10, "Aligning six bytes to the nearest 5 gives 10.");
    });
    assembler.assemble("align.uasm", "1 .align", function(success, result) {
        equal(result.image.length, 4, "Aligning one byte to an unspecified width gives 4.");
    });
    assembler.assemble("align.uasm", ".align", function(success, result) {
        equal(result.image.length, 0, "Aligning zero bytes to an unspecified width gives 0.");
    });
});

test(".ascii works", function() {
    expect(23);
    var assembler = new BetaAssembler();
    assembler.assemble("ascii.uasm", '.ascii "Hello, world!"', function(success, result) {
        ok(success, ".ascii is legal");
        deepEqual(result.image, new Uint8Array([72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33]), "Standard characters assemble correctly.");
    });

    assembler.assemble("ascii.uasm", '.ascii ""', function(success, result) {
        ok(success, ".ascii with empty strings is legal");
        equal(result.image.length, 0, "Empty .ascii strings have no content.");
    });


    var test_escape_char = function(chr, expected) {
        assembler.assemble("char.uasm", '.ascii "\\' + chr + '"', function(success, result) {
            // ok(success, "'\\" + chr + "' is legal");
            deepEqual(result.image, new Uint8Array([expected]), "\"\\" + chr + "\" has the expected value.");
        });
    };

    test_escape_char("\\", 92);
    test_escape_char("b", 8);
    test_escape_char("f", 12);
    test_escape_char("n", 10);
    test_escape_char("r", 13);
    test_escape_char("t", 9);
    test_escape_char("\"", 34);
    test_escape_char("'", 39);

    assembler.assemble("ascii.uasm", ".ascii \"\\z\"", function(success, result) {
        ok(!success, "Non-escape escape characters are illegal.");
    });

    assembler.assemble("ascii.uasm", '.ascii "\\4"', function(success, result) {
        ok(success, "Single-digit octal numbers are legal");
        deepEqual(result.image, new Uint8Array([4]), "Single-digit octal numbers have the expected value.");
    });

    assembler.assemble("ascii.uasm", '.ascii "\\42"', function(success, result) {
        ok(success, "Two-digit octal numbers are legal");
        deepEqual(result.image, new Uint8Array([34]), "Two-digit octal numbers have the expected value.");
    });

    assembler.assemble("ascii.uasm", '.ascii "\\234"', function(success, result) {
        ok(success, "Three-digit octal numbers are legal");
        deepEqual(result.image, new Uint8Array([156]), "Three-digit octal numbers have the expected value.");
    });

    assembler.assemble("ascii.uasm", '.ascii "\\402"', function(success, result) {
        console.log(result);
        ok(!success, "Octal numbers larger than 8-bits are illegal.");
    });

    assembler.assemble("ascii.uasm", '1 .ascii "a"', function(success, result) {
        equal(result.image.length, 2, ".ascii does not word-align.");
    });

    assembler.assemble("ascii.uasm", '.ascii "foo', function(success, result) {
        ok(!success, "Omitting the trailing quote is a syntax error.");
    });

    assembler.assemble("ascii.uasm", '.ascii foo', function(success, result) {
        ok(!success, "Omitting quotes around the string is a syntax error.");
    });
});

test(".text extensions to .ascii work", function() {
    expect(3);
    var assembler = new BetaAssembler();
    assembler.assemble("text.uasm", '.text "aaa"', function(success, result) {
        ok(success, ".text assembles");
        deepEqual(result.image, new Uint8Array([97, 97, 97, 0]), ".text null-terminates strings.");
    });

    assembler.assemble("text.uasm", '.text "a" 42', function(success, result) {
        deepEqual(result.image, new Uint8Array([97, 0, 0, 0, 42]), ".text word-aligns.");
    });
});

test(".breakpoint works", function() {
    expect(10);
    var assembler = new BetaAssembler();
    assembler.assemble("br.uasm", ".breakpoint", function(success, result) {
        ok(success, "A solitary breakpoint assembles successfully.");
        equal(result.image.length, 0, "A breakpoint does not affect the resulting image.");
        deepEqual(result.breakpoints, [0], "The breakpoint is recorded correctly.");
    });

    assembler.assemble("br.uasm", "0 1 .breakpoint 2 3", function(success, result) {
        ok(success, "Breakpoints are legal mid-program.");
        deepEqual(result.image, new Uint8Array([0, 1, 2, 3]), "Mid-program breakpoints do not affect the resulting image.");
        deepEqual(result.breakpoints, [2], "Mid-program breakpoints are recorded correctly.");
    });

    assembler.assemble("br.uasm", "0 1 .breakpoint .breakpoint 2 3", function(success, result) {
        ok(success, "Multiple breakpoints at the same address are legal.");
        deepEqual(result.breakpoints, [2, 2], "Multiple breakpoints at one address are recorded correctly.");
    });

    assembler.assemble("br.uasm", "0 1 .breakpoint 2 .breakpoint 3", function(success, result) {
        ok(success, "Multiple breakpoints at the distinct addresses are legal.");
        deepEqual(result.breakpoints, [2, 3], "Multiple breakpoints at distinct addresses are recorded correctly.");
    });
});

test(".options works", function() {
    expect(18);
    var assembler = new BetaAssembler();
    assembler.assemble("opt.uasm", ".options", function(success, result) {
        ok(success, "Empty .options statement is legal.");
    });

    var test_options = function(options, expected, description) {
        assembler.assemble("opt.uasm", ".options " + options, function(success, result) {
            deepEqual(result.options, expected, description);
        });
    };

    test_options("tty", {tty: true}, "tty works");
    test_options("notty", {tty: false}, "notty works");
    test_options("clock", {clock: true}, "clock works");
    test_options("noclock", {clock: false}, "noclock works");
    test_options("annotate", {annotate: true}, "annotate works");
    test_options("noannotate", {annotate: false}, "noannotate works");
    test_options("kalways", {kalways: true}, "kalways works");
    test_options("nokalways", {kalways: false}, "nokalways works");
    test_options("div", {div: true}, "div works");
    test_options("nodiv", {div: false}, "nodiv works");
    test_options("mul", {mul: true}, "mul works");
    test_options("nomul", {mul: false}, "nomul works");
    test_options("clock mul tty", {clock: true, mul: true, tty: true}, "multiple options work");

    assembler.assemble("opt.uasm", ".options foobar", function(success, result) {
        ok(!success, "Unrecognised options are illegal.");
    });

    assembler.assemble("opt.uasm", ".options notty foobar", function(success, result) {
        ok(!success, "Unrecognised options combined with recognised options are illegal.");
    });

    assembler.assemble("opt.uasm", ".options tty\n.options clock", function(success, result) {
        deepEqual(result.options, {tty: true, clock: true}, "Multiple .options are cumulative.");
    });

    assembler.assemble("opt.uasm", ".options tty\n.options notty", function(success, result) {
        deepEqual(result.options, {tty: false}, "Later settings of conflicting options override earlier ones.");
    });
});

test(".protect and .unprotect work", function() {
    expect(10);
    var assembler = new BetaAssembler();

    assembler.assemble("p.uasm", ".protect 1", function(success, result) {
        ok(success, "A solitary .protect is legal.");
        deepEqual(result.protection, [{start: 0, end: Infinity}], "A single .protect protects everything.");
    });

    assembler.assemble("p.uasm", "1 .unprotect 2", function(success, result) {
        ok(success, "A solitary .unprotect is legal.");
        deepEqual(result.protection, [], "An unmatched .unprotect does nothing.");
    });

    assembler.assemble("p.uasm", "1 .protect 2 3 4 .unprotect 5", function(success, result) {
        ok(success, "A matched .protect/.unprotect pair is legal.");
        deepEqual(result.protection, [{start: 1, end: 4}], "A .protect/.unprotect pair protects the correct region.");
    });

    assembler.assemble("p.uasm", "1 .protect 2 .protect 3 4 .unprotect 5", function(success, result) {
        ok(success, "Multiple .protects paired with a single .unprotect is legal");
        deepEqual(result.protection, [{start: 1, end: 4}], "Multiple sequential .protects are merged correctly.");
    });

    assembler.assemble("p.uasm", "1 .protect 2 .unprotect 3 4 .protect 5 6 .unprotect 7", function(success, result) {
        ok(success, "Multiple .protects/.unprotect pairs are legal.");
        deepEqual(result.protection, [{start: 1, end: 2}, {start: 4, end: 6}], "Multiple protected regions are created correctly.");
    });
});

// Put in a FileSystem singleton so QUnit doesn't complain about added globals.
if(!_.has(window, 'FileSystem')) {
    window.FileSystem = undefined;
}

test(".include works", function() {
    expect(9);
    // Set up a dummy filesystem.
    var fs = window.FileSystem;
    window.FileSystem = {
        getFile: function(filename, success_callback, error_callback) {
            switch(filename) {
            case "/basic.uasm":
                success_callback({name: filename, data: "1 2 3 4"});
                break;
            case "/recursive/1.uasm":
                success_callback({name: filename, data: "1\n.include \"/recursive/2.uasm\"\n2"});
                break;
            case "/recursive/2.uasm":
                success_callback({name: filename, data: "42 24"});
                break;
            case "/recursive/bad.uasm":
                success_callback({name: filename, data: '.include "/bad.uasm"'});
                break;
            case "/syntax_error.uasm":
                success_callback({name: filename, data: '!'})
                break;
            default:
                error_callback();
                break;
            }
        }
    };

    var assembler = new BetaAssembler();
    assembler.assemble('i.uasm', '.include "/basic.uasm"', function(success, result) {
        ok(success, "Simple include assembled successfully.");
        deepEqual(result.image, new Uint8Array([1, 2, 3, 4]), ".included file assembled correctly.");
    });

    assembler.assemble("i.uasm", '24 .include "/basic.uasm" 42', function(success, result) {
        ok(success, "Include mid-program assembled successfully.");
        deepEqual(result.image, new Uint8Array([24, 1, 2, 3, 4, 42]), "Include mid-program assembled correctly.");
    });

    assembler.assemble("i.uasm", '.include "/recursive/1.uasm"', function(success, result) {
        ok(success, "Recursive include assembled successfully.");
        deepEqual(result.image, new Uint8Array([1, 42, 24, 2]), "Recursive include assembled correctly.");
    });

    assembler.assemble("i.uasm", '.include "/bad.uasm"', function(success, result) {
        ok(!success, "Including nonexistent files is an error.");
    });

    assembler.assemble("i.uasm", '.include "/recursive/bad.uasm"', function(success, result) {
        ok(!success, "Included files including nonexistent files is an error.");
    });

    assembler.assemble("i.uasm", '.include "/recursive/syntax_error"', function(success, result) {
        ok(!success, "Syntax errors in included files are errors.");
    });

    // Put back the real one, if any.
    window.FileSystem = fs;
});

test(".tcheckoff works", function() {
    expect(5);
    var assembler = new BetaAssembler();

    assembler.assemble('t.uasm', '.tcheckoff "some url" "some name" 42', function(success, result) {
        ok(success, ".tcheckoff assembles successfully.");
        deepEqual(result.checkoff, {kind: 'tty', url: 'some url', name: 'some name', checksum: 42}, ".tcheckoff creates checkoff correctly.");
    });

    assembler.assemble('t.uasm', '.tcheckoff "some url" "some name" -42', function(success, result) {
        ok(success, ".tcheckoff with negative checksum assembles successfully.");
        equal(result.checkoff.checksum, -42, ".tcheckoff negative checksum assembles correctly.");
    });

    assembler.assemble('t.uasm', '.tcheckoff "some url" "some name" 42\n.tcheckoff "some url" "some name" 58', function(success, result) {
        ok(!success, "Multiple checkoff statements are illegal.");
    });
});

test(".pcheckoff works", function() {
    expect(17);
    var assembler = new BetaAssembler();

    assembler.assemble('t.uasm', '.pcheckoff "some url" "some name" 42', function(success, result) {
        ok(success, ".pcheckoff assembles successfully.");
        deepEqual(result.checkoff, {
            kind: 'memory',
            addresses: {},
            running_checksum: 36038,
            url: 'some url',
            name: 'some name',
            checksum: 42
        }, ".pcheckoff creates checkoff correctly.");
    });

    assembler.assemble('t.uasm', '.verify 0 1 2', function(success, result) {
        ok(!success, ".verify without .pcheckoff is illegal.");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.pcheckoff "some url" "some name" 58', function(success, result) {
        ok(!success, "Multiple pcheckoff statements are illegal.");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.tcheckoff "some url" "some name" 58', function(success, result) {
        ok(!success, "Mixing checkoff types is illegal.");
    });

    assembler.assemble("t.uasm", '.tcheckoff "some url" "some name" 58\n.verify 0 1 2', function(success, result) {
        ok(!success, ".verify with .tcheckoff is illegal.");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.verify 0 1 2', function(success, result) {
        deepEqual(result.checkoff.addresses, {0: 2}, "Single address is correct.");
        equal(result.checkoff.running_checksum, 36040, "Single address checksum is correct");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.verify 0 2 6 5', function(success, result) {
        deepEqual(result.checkoff.addresses, {0: 6, 4: 5}, "Multiple address is correct.");
        equal(result.checkoff.running_checksum, 36062, "Multiple address checksum is correct");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.verify 8 1 6', function(success, result) {
        deepEqual(result.checkoff.addresses, {8: 6}, "Single offset address is correct.");
        equal(result.checkoff.running_checksum, 36052, "Single offset address checksum is correct");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.verify 8 2 6 9', function(success, result) {
        deepEqual(result.checkoff.addresses, {8: 6, 12: 9}, "Multiple offset address is correct.");
        equal(result.checkoff.running_checksum, 36094, "Multiple offset address checksum is correct");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.verify 4 2 3 7\n.verify 32 3 20 21 22', function(success, result) {
        deepEqual(result.checkoff.addresses, {4: 3, 8: 7, 32: 20, 36: 21, 40: 22}, "Multiple statementt address is correct.");
        equal(result.checkoff.running_checksum, 36427, "Multiple statement checksum is correct");
    });

    assembler.assemble("t.uasm", '.pcheckoff "some url" "some name" 42\n.verify 0x20 8 0x73657420 0x2e2e2e74 0xa 0x20000000 0x73ff0143 0xc15f04e0 0x42ff04e1 0xd2370056', function(success, result) {
        equal(result.checkoff.running_checksum, -2102874766, "Negative checksum is calculated correctly.");
    });
});
