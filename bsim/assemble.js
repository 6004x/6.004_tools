//(function() {
    var root = this; // = window in a browser

    var Symbol = function(name, value, kind) {
        this.name = name;
        this.value = value;
        this.kind = kind || Symbol.Assigned;
    };

    var SyntaxError = function(message, file, line) {
        this.file = file;
        this.line = line;
        this.message = message;
    };
    SyntaxError.prototype = new Error();
    SyntaxError.prototype.toString = function() {
        return "Error at " + file + ":" + line + ": " + message;
    };

    var readOctalStringEscape = function(stream, file, line) {
        var sequence = '';
        while(!stream.eol() && sequence.length < 3) {
            if(_.contains('01234567', stream.peek())) {
                sequence += stream.next();
            }
        }
        var value = parseInt(sequence, 8);
        if(value > 255) {
            throw new SyntaxError("Octal escape sequence \\" + sequence + " is larger than one byte (max is \\377)", file, line);
        }
        return String.fromCharCode(value);
    };

    var readString = function(stream, file, line) {
        if(stream.next() != '"') {
            throw new SyntaxError("Expected a string here.", file, line);
        }
        var out = '';
        while(!stream.eol()) {
            var chr = stream.next();
            switch(chr) {
            case '"':
                return out;
            case '\\':
                chr = stream.next();
                switch(chr) {
                case 'b': out += '\b'; break;
                case 'f': out += '\f'; break;
                case 'n': out += '\n'; break;
                case 'r': out += '\r'; break;
                case 't': out += '\t'; break;
                case '"': out += '"'; break;
                case '\\': out += '\\'; break;
                // Allow octal sequences like \123
                case '0': case '1': case '2': case '3':
                case '4': case '5': case '6': case '7':
                    stream.backUp(1);
                    out += readOctalStringEscape(stream, file, line);
                    break;
                default:
                    throw new SyntaxError("Unknown escape sequence \\" + chr + ". (if you want a literal backslash, try \\\\)", file, line);
                }
                break;
            default:
                out += chr;
            }
        }
        throw new SyntaxError("Unterminated string constant", file, line);
    };

    var parseNumber = function(text) {
        // Hex
        if(/^0x/i.test(text)) {
            return parseInt(text, 16);
        }
        // Binary
        else if(/^0b/i.test(text)) {
            return parseInt(text.slice(2), 2);
        }
        // Octal
        else if(/^0/i.test(text)) {
            return parseInt(text, 8);
        }
        // Decimal
        else {
            return parseInt(text, 10);
        }
        return NaN;
    }

    var readNumber = function(stream, file, line) {
        // This reads more than just sane numbers so we can actually see errors.
        // Anything this matches should be a number, though, so we can safely error
        // out if we can't extract a number from a match.
        var token = stream.match(/^[0-9][\$\.@A-Z0-9_]*/i);
        if(!token) return null; // Not intended as a Number (NiaaN)
        token = token[0];
        var num = parseNumber(token);
        // If whatever we had was Not a Number, then it is a syntax error.
        if(isNaN(num)) {
            throw new SyntaxError("Incomprehensible number " + token + ". Acceptable bases are hex (0x…), octal (0…), binary (0b…) and decimal.", file, line);
        }

        return num;
    };

    var readSymbol = function(stream, file, line) {
        stream.eatSpace();
        var match = stream.match(/^[\$\.@A-Z_][\$\.@A-Z0-9_]*/i);
        if(match) {
            return match[0];
        } else {
            return null;
        }
    }

    var readTerm = function(stream, file, line, accept_unary) {
        stream.eatSpace();
        // Is it a number?
        var num = readNumber(stream, file, line);
        if(num) return num;

        var symbol = readSymbol(stream, file, line);
        if(symbol) return symbol;

        if(accept_unary && stream.peek() == '-') {
            stream.next();
            var next = readTerm(stream, file, line);
            if(next) {
                return new Negate(next, file, line);
            } else {
                throw new SyntaxError("Expected value to negate after unary negation operator.", file, line);
            }
        }
        if(stream.peek() == '(') {
            stream.next();
            var expression = Expression.parse(stream, file, line);
            if(stream.next() != ')') {
                throw new SyntaxError("Expected closing parenthesis.", file, line);
            } else if(expression === null) {
                throw new SyntaxError("Expected expression between grouping parentheses.", file, line);
            }
            return expression;
        }


        return null;
    };

    // All of these are generated during a first pass over the file.
    // At this stage we don't know what exists, because we haven't yet processed
    // include files. References are thus generally strings or other instances of
    // these objects.
    function Assignment(name, value, file, line) {
        this.name = name;
        this.value = value;
        this.file = file;
        this.line = line;
    };

    function Label(name, file, line) {
        this.name = name;
        this.file = file;
        this.line = line;
    };

    function MacroInvocation(macro, args, file, line) {
        this.macro = macro;
        this.args = args;
        this.file = file;
        this.line = line;
    };
    MacroInvocation.parse = function(token, stream, file, line) {
        var macro_name = token;
        var args = [];
        if(stream.next() != "(") {
            throw new SyntaxError("Expected macro argument list; this is probably an internal error.", file, line);
        }
        if(stream.peek() == ")") {
            stream.next();
            return new MacroInvocation(macro_name, [], file, line);
        }
        while(!stream.eol()) {
            var expression = Expression.parse(stream, file, line);
            if(expression === null) {
                throw new SyntaxError("Missing expression in macro argument list.", file, line);
            }
            args.push(expression);
            var next = stream.next();
            if(next == ',') {
                continue;
            } else if(next == ')') {
                return new MacroInvocation(macro_name, args, file, line);
            } else {
                throw new SyntaxError("Unexpected '" + next + "'; expecting ',' or ')'", file, line);
            }
        }
        throw new SyntaxError("Expected ')' at end of macro argument list; got end of line.", file, line);
    }

    function Operation(op, file, line) {
        this.op = op;
        this.file = file;
        this.line = line;
    };

    function Negate(value, file, line) {
        this.value = value;
        this.file = file;
        this.line = line;
    };

    function Expression(expression, file, line) {
        this.expression = expression;
        this.file = file;
        this.line = line;
    };
    Expression.parse = function(stream, file, line) {
        var terms = []; // List of terms (which we don't generally evaluate while parsing)
        var want_operation = false;
        while(true) {
            stream.eatSpace();
            if(!want_operation) {
                var term = readTerm(stream, file, line, true);
                if(term !== null) {
                    terms.push(term);
                    want_operation = true;
                    continue;
                } else {
                    if(terms.length > 0) {
                        throw new SyntaxError("Expected operand after operator '" + _.last(terms).op + "'", file, line);
                    } else {
                        return null;
                    }
                }
            } else {
                // It could be an operation.
                var op = stream.match(/^(?:[\+\-\/\*]|<<|>>)/);
                if(op) {
                    terms.push(new Operation(op[0], file, line));
                    want_operation = false;
                    continue;
                } else {
                    break;
                }
            }

            // break;
        }

        // if(terms.length) {
            // if(_.last(terms) instanceof Operation) {
                // throw new SyntaxError("Expected operand after trailing operation '" + _.last(terms).op + "'.", file, line);
            // }
            return new Expression(terms, file, line);
        // } else {
            // return null;
        // }
    }

    /*
    Expression.parse = function(stream, file, line) {
        stream.eatSpace();
        var a = readTerm(stream, file, line);
        var b = null;
        // All operations are done on 32-bit ints. Arithmetic operations are coerced
        // by bitwise OR with 0.
        var ops = {
            '+': function(a, b) { return (a + b)|0; },
            '-': function(a, b) { return (a - b)|0; },
            '/': function(a, b) { return (a / b)|0; },
            '*': function(a, b) { return (a * b)|0; },
            '>>': function(a, b) { return a >>> b; },
            '<<': function(a, b) { return a << b; },
            '%': function(a, b) { return a % b; }
        }
        while(true) {
            stream.eatSpace();
            var operation = stream.match(/^(?:[\+\-\/\*]|<<|>>)/);
            if(operation) {
                b = readTerm(stream, line, file);
                a = ops[operation](a, b);
            } else {
                return a;
            }
        }
        throw "???";
    };*/

    function Macro(name, parameters, instructions, file, line) {
        this.name = name;
        this.parameters = parameters;
        this.instructions = instructions;
        this.file = file;
        this.line = line;
    };

    function Include(filename, file, line) {
        this.filename = filename;
        this.file = file;
        this.line = line;
    };
    Include.parse = function(stream, file, line) {
        var filename = readString(stream, file, line);
        return new Include(filename, file, line);
    };

    function Align(expression, file, line) {
        this.expression = expression;
        this.file = file;
        this.line = line;
    };

    function AssemblyString(text, null_terminated, file, line) {
        this.text = text;
        this.null_terminated = null_terminated;
        this.file = file;
        this.line = line;
    };

    function Breakpoint(file, line) {
        this.file = file;
        this.line = line;
    };

    var Protect = function(file, line) {
        this.file = file;
        this.line = line;
    };

    var Unprotect = function(file, line) {
        this.file = file;
        this.line = line;
    };

    var Options = function(options, file, line) {
        this.options = options;
        this.file = file;
        this.line = line;
    };

    Symbol.Undefined = undefined;
    Symbol.Assigned = 1;
    Symbol.Label = 2;

    var Assembler = function(source) {
        var mSource = source;
        var mSymbols = {};
        var mDot = Symbol('.', 0);

        var mParsedFiles = {};
        var mPendingIncludes = [];

        var parse = function(filename, text) {
            var lines = text.split("\n");
            var fileContent = [];

            // Helpful bits of state
            var eatingComments = false;

            for(var line_number = 0; line_number < lines.length; ++line_number) {
                var line = lines[line_number];
                var stream = new StringStream(line);
                while(!stream.eol()) {
                    // Handle a multi-line comment if we're in one.
                    if(eatingComments) {
                        if(!stream.match(/^.*\*/)) {
                            stream.skipToEnd();
                        } else {
                            eatingComments = false;
                        }
                        continue;
                    }

                    // Skip any whitespace
                    if(stream.eatSpace()) continue;

                    // Skip to the end of the line on single-line comments.
                    if(stream.match('//')) {
                        stream.skipToEnd();
                        continue;
                    }

                    // Handle multi-line comments
                    if(stream.match('/*')) {
                        if(!stream.match(/^.*\*\//)) {
                            stream.skipToEnd();
                            eatingComments = true;
                        }
                        continue;
                    }

                    // Pull out a token. Be ready to put it back, though.
                    var start_pos = stream.pos;
                    var token = readSymbol(stream, filename, line_number);
                    stream.eatSpace();
                    if(token) {
                        // Check for commands
                        if(token[0] == '.' && token.length > 1) {
                            var command = token.slice(1);
                            switch(command) {
                            case "include":
                                var include = Include.parse(stream, filename, line_number);
                                if(!_.contains(mPendingIncludes, include.filename)) {
                                    mPendingIncludes.push(include.filename);
                                }
                                fileContent.push(include);
                                break;
                            case "macro":
                                var macro_name = readSymbol(stream, filename, line_number);
                            default:
                                stream.skipToEnd();
                                throw new SyntaxError("Unrecognised directive '." + command + "'", filename, line_number);
                            }
                            continue;
                        }

                        // Check if we're defining a label
                        if(stream.peek() == ':') {
                            stream.next();
                            var label = new Label(token, filename, line_number);
                            fileContent.push(label);
                            continue;
                        }

                        // Or assigning something
                        if(stream.peek() == '=') {
                            var expression = Expression.parse(stream, filename, line_number);
                            var assignment = new Assignment(token, expression, filename, line_number);
                            fileContent.push(assignment);
                            continue;
                        }

                        // Or calling a macro
                        if(stream.peek() == '(') {
                            var invocation = MacroInvocation.parse(token, stream, filename, line_number);
                            fileContent.push(invocation);
                            continue;
                        }

                        // If we get here, put the token back and hand off to the expression parser
                        stream.pos = start_pos;
                    }

                    // This is an expression of some form
                    var expression = Expression.parse(stream, filename, line_number)
                    fileContent.push(expression);

                    if(!expression) {
                        if(stream.peek() == ')') {
                            throw new SyntaxError("Unexpected closing parenthesis.", filename, line_number);
                        }
                        if(stream.peek() == '=') {
                            throw new SyntaxError("Cannot assign to integer literals or expressions.");
                        }
                        console.log(fileContent);
                        // Just for now…
                        throw "Something happened that broke the tokeniser.";
                    }
                }
            }
            console.log("Tokenising completed successfully.");
            console.log("Files to include: ", mPendingIncludes);
            return fileContent;
        }
        try {
            return parse("foo", source);
        } catch(e) {
            if(e instanceof SyntaxError) {
                console.log(e.file + ":" + (e.line+1) + ": " + e.message);
            } else {
                throw e;
            }
        }
    };

    root.BetaAssembler = Assembler;
//})();
