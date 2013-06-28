(function() {
    var root = this; // = window in a browser

    var Symbol = function(name, value, kind) {
        this.name = name;
        this.value = value;
        this.kind = kind || Symbol.Assigned;
    };

    var SyntaxError = function(message, stream) {
        this.file = stream.file();
        this.line = stream.line_number();
        this.column = stream.column();
        this.message = message;
    };
    SyntaxError.prototype = new Error();
    SyntaxError.prototype.toString = function() {
        return this.file + ":" + this.line + ":" + this.column + ": " + this.message;
    };

    var readOctalStringEscape = function(stream) {
        var sequence = '';
        while(!stream.eol() && sequence.length < 3) {
            if(_.contains('01234567', stream.peek())) {
                sequence += stream.next();
            }
        }
        var value = parseInt(sequence, 8);
        if(value > 255) {
            throw new SyntaxError("Octal escape sequence \\" + sequence + " is larger than one byte (max is \\377)", stream);
        }
        return String.fromCharCode(value);
    };

    var readString = function(stream) {
        if(stream.next() != '"') {
            throw new SyntaxError("Expected a string here.", stream);
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
                    out += readOctalStringEscape(stream);
                    break;
                default:
                    throw new SyntaxError("Unknown escape sequence \\" + chr + ". (if you want a literal backslash, try \\\\)", stream);
                }
                break;
            default:
                out += chr;
            }
        }
        throw new SyntaxError("Unterminated string constant", stream);
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

    var readNumber = function(stream, optional) {
        // This reads more than just sane numbers so we can actually see errors.
        // Anything this matches should be a number, though, so we can safely error
        // out if we can't extract a number from a match.
        var token = stream.match(/^[0-9][\$\.@A-Z0-9_]*/i);
        if(!token) return null; // Not intended as a Number (NiaaN)
        token = token[0];
        var num = parseNumber(token);
        // If whatever we had was Not a Number, then it is a syntax error.
        if(isNaN(num) && !optional) {
            throw new SyntaxError("Incomprehensible number " + token + ". Acceptable bases are hex (0x…), octal (0…), binary (0b…) and decimal.", stream);
        }

        return num;
    };

    var readSymbol = function(stream) {
        stream.eatSpace();
        var match = stream.match(/^[\$\.@A-Z_][\$\.@A-Z0-9_]*/i);
        
        if(match) {
            return match[0];
        } else {
            return null;
        }
    }

    var readTerm = function(stream) {
        stream.eatSpace();
        // Is it a number?
        var num = readNumber(stream);
        if(num !== null) return num;

        var symbol = readSymbol(stream);
        if(symbol !== null) return symbol;

        if(stream.peek() == '-') {
            stream.next();
            var next = readTerm(stream);
            if(next) {
                return new Negate(next, stream.file(), stream.line_number());
            } else {
                throw new SyntaxError("Expected value to negate after unary negation operator.", stream);
            }
        }
        if(stream.peek() == '(') {
            stream.next();
            var expression = Expression.parse(stream);
            if(stream.next() != ')') {
                throw new SyntaxError("Expected closing parenthesis.", stream);
            } else if(expression === null) {
                throw new SyntaxError("Expected expression between grouping parentheses.", stream);
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
    MacroInvocation.parse = function(token, stream) {
        var macro_name = token;
        var args = [];
        if(stream.next() != "(") {
            throw new SyntaxError("Expected macro argument list; this is probably an internal error.", stream);
        }
        if(stream.peek() == ")") {
            stream.next();
            return new MacroInvocation(macro_name, [], stream.file(), stream.line_number());
        }
        while(!stream.eol()) {
            var expression = Expression.parse(stream);
            if(expression === null) {
                throw new SyntaxError("Missing expression in macro argument list.", stream);
            }
            args.push(expression);
            var next = stream.next();
            if(next == ',') {
                continue;
            } else if(next == ')') {
                return new MacroInvocation(macro_name, args, stream.file(), stream.line_number());
            } else {
                if(next === undefined) next = 'end of line';
                throw new SyntaxError("Unexpected '" + next + "'; expecting ',' or ')'", stream);
            }
        }
        throw new SyntaxError("Expected ')' at end of macro argument list; got end of line.", stream);
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
    Expression.parse = function(stream) {
        var terms = []; // List of terms (which we don't generally evaluate while parsing)
        var want_operation = false;
        while(true) {
            stream.eatSpace();
            if(!want_operation) {
                var term = readTerm(stream);
                if(term !== null) {
                    terms.push(term);
                    want_operation = true;
                    continue;
                } else {
                    if(terms.length > 0) {
                        throw new SyntaxError("Expected operand after operator '" + _.last(terms).op + "'", stream);
                    } else {
                        return null;
                    }
                }
            } else {
                // It could be an operation.
                var op = stream.match(/^(?:[\+\-\/\*%]|<<|>>)/);
                if(op) {
                    // Comments are not division!
                    if(op[0] == '/' && stream.peek() == '/') {
                        stream.backUp(1);
                        break;
                    }
                    terms.push(new Operation(op[0], stream.file(), stream.line_number()));
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
            return new Expression(terms, stream.file(), stream.line_number());
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
    Include.parse = function(stream) {
        var filename = readString(stream);
        return new Include(filename, stream.file(), stream.line_number());
    };

    function Align(expression, file, line) {
        this.expression = expression;
        this.file = file;
        this.line = line;
    };
    Align.parse = function(stream) {
        var expression = Expression.parse(stream);
        return new Align(expression, stream.file(), stream.line_number());
    }

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

    var Assembler = function() {
        var mSymbols = {};
        var mDot = Symbol('.', 0);

        var mParsedFiles = {};
        var mPendingIncludes = [];

        var parse_macro = function(stream) {
            var macro_name = readSymbol(stream);
            if(macro_name === null) {
                throw new SyntaxError("Macro definitions must include a name.", stream);
            }
            var macro_args = [];
            stream.eatSpace();
            if(stream.next() != '(') {
                throw new SyntaxError("Macro definitions must include a parenthesised argument list.", stream);
            }
            while(true) {
                if(stream.peek() == ')') {
                    stream.next();
                    break;
                } else {
                    var macro_arg = readSymbol(stream);
                    if(macro_arg === null) {
                        throw new SyntaxError("Macro arguments must be valid symbol names", stream);
                    }
                    macro_args.push(macro_arg);
                    stream.eatSpace();
                    var next = stream.next();
                    if(next == ')') {
                        break;
                    }
                    if(next != ',') {
                        throw new SyntaxError("Expected comma ',' or close parenthesis ')' after macro argument.", stream);
                    }
                }
            }
            var start_line = stream.line_number();
            var macro_content = parse(stream, true);
            var macro = new Macro(macro_name, macro_args, macro_content, stream.file(), start_line);
            return macro;
        }

        var parse = function(stream, is_macro) {
            var fileContent = [];
            var allow_multiple_lines = !is_macro; // Macros are single-line by default
            // Helpful bits of state
            var eatingComments = false;

            // If we're in a macro, if the first character we receive is an open brace {,
            // we are allowed to span multiple lines (indeed, we run until we find a close brace)
            stream.eatSpace();
            if(is_macro && stream.peek() == '{') {
                stream.next();
                allow_multiple_lines = true;
            }
        parse_loop:
            do {
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

                    // If we're in a multi-line macro and we find a }, it's time for us to exit.
                    if(is_macro && allow_multiple_lines && stream.peek() == "}") {
                        stream.next();
                        break parse_loop;
                    }

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
                    var token = readSymbol(stream);
                    
                    stream.eatSpace();
                    if(token) {
                        // Check for commands
                        if(token[0] == '.' && token.length > 1) {
                            var command = token.slice(1);
                            switch(command) {
                            case "include":
                                var include = Include.parse(stream);
                                if(!_.contains(mPendingIncludes, include.filename)) {
                                    mPendingIncludes.push(include.filename);
                                }
                                fileContent.push(include);
                                break;
                            case "macro":
                                fileContent.push(parse_macro(stream));
                                break;
                            case "align":
                                fileContent.push(Align.parse(stream));
                                break;
                            default:
                                stream.skipToEnd();
                                throw new SyntaxError("Unrecognised directive '." + command + "'", stream);
                            }
                            continue;
                        }

                        // Check if we're defining a label
                        if(stream.peek() == ':') {
                            stream.next();
                            var label = new Label(token, stream);
                            fileContent.push(label);
                            continue;
                        }

                        // Or assigning something
                        if(stream.peek() == '=') {
                            
                            stream.next();
                            var expression = Expression.parse(stream);
                            var assignment = new Assignment(token, expression, stream);
                            fileContent.push(assignment);
                            continue;
                        }

                        // Or calling a macro
                        if(stream.peek() == '(') {
                            var invocation = MacroInvocation.parse(token, stream, stream);
                            fileContent.push(invocation);
                            continue;
                        }

                        // If we get here, put the token back and hand off to the expression parser
                        stream.pos = start_pos;
                    }

                    // This is an expression of some form
                    var expression = Expression.parse(stream)
                    fileContent.push(expression);

                    if(expression === null) {
                        if(stream.peek() == ')') {
                            throw new SyntaxError("Unexpected closing parenthesis.", stream);
                        }
                        if(stream.peek() == '=') {
                            throw new SyntaxError("Cannot assign to integer literals or expressions.", stream);
                        }
                        if(stream.peek() == '{') {
                            throw new SyntaxError("An opening brace '{' is only permitted at the beginning of a macro definition.", stream);
                        }
                        if(stream.peek() == '}') {
                            throw new SyntaxError("Unexpected closing brace '}' without matching open brace '{'", stream);
                        }

                        var bad_thing = stream.match(/^[^\s]/) || stream.match(/^[^\b]/) || stream.peek();
                        throw new SyntaxError("Unexpected '" + bad_thing + "'; giving up.", stream);
                    }
                }
            } while(allow_multiple_lines && stream.next_line());
            return fileContent;
        }

        // var run_assembly = function() {
        //     mDot
        // }

        // try {
        //     var stream = new StringStream(new FileStream(source, "foo.uasm"));
        //     return parse(stream);
        // } catch(e) {
        //     if(e instanceof SyntaxError) {
        //         console.log(e.toString());
        //         // console.log(stream.next_line());
        //     } else {
        //         throw e;
        //     }
        // }

        this.assemble = function(file, content, callback) {
            var stream = new StringStream(new FileStream(content, file));
            try {
                var content = parse(stream);
            } catch(e) {
                if(e instanceof SyntaxError) {
                    callback(false, e);
                    return;
                } else {
                    throw e;
                }
            }
            console.log(content);
            callback(true);
        }
    };

    root.BetaAssembler = Assembler;
})();
