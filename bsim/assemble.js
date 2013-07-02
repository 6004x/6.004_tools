(function() {
    var root = this; // = window in a browser

    // This can take either a stream or a file/line pair.
    // If it's given a stream as the second argument, it will extract
    // the file, line number and column from that.
    // Otherwise it will assume the second argument to be a filename
    // and the third to be a line number.
    var SyntaxError = function(message, stream_or_file, line) {
        if(stream_or_file instanceof StringStream) {
            this.file = stream_or_file.file();
            this.line = stream_or_file.line_number();
            this.column = stream_or_file.column();
        } else {
            this.file = stream_or_file;
            this.line = line;
            this.column = 0;
        }
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
            } else {
                break;
            }
        }
        var value = parseInt(sequence, 8);
        if(value > 255) {
            throw new SyntaxError("Octal escape sequence \\" + sequence + " is larger than one byte (max is \\377)", stream);
        }
        return String.fromCharCode(value);
    };

    var readChar = function(stream, end_char) {
        var chr = stream.next();
        switch(chr) {
        case end_char:
            return false;
        case '\\':
            chr = stream.next();
            switch(chr) {
            case 'b': return '\b'; break;
            case 'f': return '\f'; break;
            case 'n': return '\n'; break;
            case 'r': return '\r'; break;
            case 't': return '\t'; break;
            case '"': return '"'; break;
            case "'": return "'"; break;
            case '\\': return '\\'; break;
            // Allow octal sequences like \123
            case '0': case '1': case '2': case '3':
            case '4': case '5': case '6': case '7':
                stream.backUp(1);
                return readOctalStringEscape(stream);
                break;
            default:
                throw new SyntaxError("Unknown escape sequence \\" + chr + ". (if you want a literal backslash, try \\\\)", stream);
            }
            break;
        default:
            return chr;
        }
    };

    var readString = function(stream) {
        if(stream.next() != '"') {
            throw new SyntaxError("Expected a string here.", stream);
        }
        var out = '';
        while(!stream.eol()) {
            var chr = readChar(stream, '"');
            if(chr === false) return out;
            else out += chr;
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
    };

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
        eatSpace(stream);
        var match = stream.match(/^[\$\.@A-Z_][\$\.@A-Z0-9_]*/i);
        
        if(match) {
            return match[0];
        } else {
            return null;
        }
    };

    var readTerm = function(stream) {
        eatSpace(stream);
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
        if(stream.peek() == "'") {
            stream.next();
            var chr = readChar(stream, "'");
            if(chr === false) {
                throw new SyntaxError("Zero-character char constant; char constants must have exactly one character.");
            }
            if(stream.next() != "'") {
                throw new SyntaxError("Multi-character char constant; char constants must have exactly one character (for more, try .ascii or .text)");
            }
            return chr.charCodeAt(0);
        };


        return null;
    };

    // Eats spaces and comments (so nothing else needs to worry about either)
    var eatSpace = function(stream) {
        stream.eatSpace();
        if(stream.match(/^\/\//)) {
            stream.skipToEnd();
        }
        if(stream.match(/^\/\*/)) {
            var start_line = stream.line_number();
            while(true) {
                if(stream.match(/^.*\*\//)) {
                    break;
                } else {
                    stream.skipToEnd();
                    if(!stream.next_line()) {
                        throw new SyntaxError("Unclosed block comment (starts here)", stream.file(), start_line);
                    }
                }
            }
        }
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
    Assignment.prototype.assemble = function(context, out) {
        // Dot is a special case.
        if(this.name === '.') {
            var dot = this.value.evaluate(context, true);
            if(dot < context.dot) {
                throw new SyntaxError("It is illegal to set . to a value lower than its current value (current value: " + context.dot + "; new value: " + dot + ")", this.file, this.line);
            }
            context.dot = dot;
        } else {
            context.symbols[this.name] = this.value.evaluate(context, !!out);
        }
        return null;
    };

    function Label(name, file, line) {
        this.name = name;
        this.file = file;
        this.line = line;
    };
    Label.prototype.assemble = function(context, out) {
        context.symbols[this.name] = context.dot;
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
    };
    MacroInvocation.prototype.assemble = function(context, out) {
        if(!_.has(context.macros, this.macro)) {
            throw new SyntaxError("Macro '" + this.macro + "' has not been defined.", this.file, this.line);
        }
        if(!_.has(context.macros[this.macro], this.args.length)) {
            throw new SyntaxError("Macro '" + this.macro + "' not defined for " + this.args.length + " arguments.", this.file, this.line);
        }
        // Evaluate the arguments, which should all be Expressions.
        var evaluated = [];
        _.each(this.args, function(value) {
            evaluated.push(value.evaluate(context, !!out));
        });
        context.macros[this.macro][this.args.length].transclude(context, evaluated, out);
    };

    function Operation(op, file, line) {
        this.op = op;
        this.file = file;
        this.line = line;
    };
    Operation.prototype.operate = function(a, b) {
        // All operations are done on 32-bit ints. Arithmetic operations are coerced
        // by bitwise OR with 0.
        var ops = {
            '+': function(a, b) { return (a + b)|0; },
            '-': function(a, b) { return (a - b)|0; },
            '/': function(a, b) { return (a / b)|0; },
            '*': function(a, b) { return (a * b)|0; },
            '>>': function(a, b) { return a >>> b; },
            '<<': function(a, b) { return a << b; },
            '%': function(a, b) { return a % b; },
            '&': function(a, b) { return a & b; },
            '|': function(a, b) { return a | b; }
        };
        if(!_.has(ops, this.op)) {
            throw new SyntaxError("Cannot perform operation '" + this.op + "'; no function defined.", this.file, this.line);
        }

        // a and b must both be unsigned, so if they're less than zero we force them to be the unsigned
        // two's-complement representation of the same value.
        if(a < 0) a = 0xFFFFFFFF + a + 1;
        if(b < 0) b = 0xFFFFFFFF + b + 1;
        var result =  ops[this.op](a, b);
        return result;
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
            eatSpace(stream);
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
                var op = stream.match(/^(?:[\+\-\/\*%&|]|<<|>>)/);
                if(op) {
                    terms.push(new Operation(op[0], stream.file(), stream.line_number()));
                    want_operation = false;
                    continue;
                } else {
                    break;
                }
            }

            // break;
        }

        return new Expression(terms, stream.file(), stream.line_number());
    };
    Expression.prototype.evaluate = function(context, strict) {
        // Expressions should be alternate values and operations.
        // If this isn't true, something has gone wrong (internally; the parser phase
        // should catch it as a syntax error if the user messed up).
        // Operations are always of type Operation.
        // Values can be Numbers (ints), Strings (token names) or Expressions.
        // Numbers are literal, tokens are expanded if possible, and expressions are
        // recursively evaluated.
        // If token expansion fails (because it is undefined), the expression's value is
        // undefined. If this happens during assembly phase one it's ignorable,
        // but during phase two it's a fatal error.
        // (Interestingly, the existing Java implementation sometimes gets this wrong and
        // allows you to use undefinable values, assigning them a value of zero. Let's do
        // better.)
        var self = this;
        var term = function(t) {
            if(_.isNumber(t)) {
                return t;
            }
            if(_.isString(t)) {
                // . is a special case.
                if(t === '.') {
                    return context.dot;
                }
                var value = context.symbols[t];
                if(value === undefined && strict) {
                    throw new SyntaxError("Symbol '" + t + "' is undefined.", self.file, self.line);
                }
                return value;
            }
            if(t instanceof Expression) {
                return t.evaluate(context, strict);
            }
            if(t instanceof Negate) {
                if(t.value instanceof Expression)
                    return -t.value.evaluate(context, strict);
                else
                    return -t.value;
            }
            console.log(t);
            throw "Unknown term type during expression evaluation.";
        }

        var i = 0;
        var a = term(this.expression[i++]);
        if(a === undefined) {
            return undefined;
        }

        while(i < this.expression.length) {
            var operation = this.expression[i++];
            var b = term(this.expression[i++]);
            if(b === undefined) {
                return undefined;
            }
            if(!(operation instanceof Operation)) {
                throw new SyntaxError("Internal error evaluating expression: expected operation but didn't get one!", this.file, this.line);
            }
            a = operation.operate(a, b);
        }

        return a;
    };
    Expression.prototype.assemble = function(context, out) {
        var value = this.evaluate(context, !!out);
        if(out) out[context.dot] = value;
        context.dot += 1;
    };

    function Macro(name, parameters, instructions, file, line) {
        this.name = name;
        this.parameters = parameters;
        this.instructions = instructions;
        this.file = file;
        this.line = line;
    };
    Macro.prototype.assemble = function(context, out) {
        if(out) return; // Only evalute macro definitions on first parse to avoid redefinition errors.
        if(!_.has(context.macros, this.name)) {
            context.macros[this.name] = {};
        }
        if(_.has(context.macros[this.name], this.parameters.length)) {
            var old = context.macros[this.name][this.parameters.length];
            throw new SyntaxError("Redefinition of " + this.parameters.length + "-argument macro " + this.name + ". (Original at " + old.file + ":" + old.line, this.file, this.line + ")");
        }
        context.macros[this.name][this.parameters.length] = this;
    };
    Macro.prototype.transclude = function(context, args, out) {
        if(args.length != this.parameters.length) {
            throw "Wrong number of parameters in Macro transclude (MacroInvocation should not permit this!)";
        }
        // Macros have their own scope, so create a new scope object for them.
        var old_scope = context.symbols;
        var scope = _.extend({}, context.symbols, _.object(this.parameters, args));
        context.symbols = scope;

        _.each(this.instructions, function(instruction) {
            instruction.assemble(context, out);
        });
        // Revert back to the old scope.
        context.symbols = old_scope;
    }

    function Include(filename, file, line) {
        this.filename = filename;
        this.file = file;
        this.line = line;
        this.instructions = null;
    };
    Include.parse = function(stream) {
        var filename = readString(stream);
        return new Include(filename, stream.file(), stream.line_number());
    };
    Include.prototype.assemble = function(context, out) {
        if(!this.instructions) {
            throw "Attempting to assemble Include without parsing file contents.";
        }
        _.each(this.instructions, function(instruction) {
            instruction.assemble(context, out);
        });
    }

    function Align(expression, file, line) {
        this.expression = expression;
        this.file = file;
        this.line = line;
    };
    Align.parse = function(stream) {
        var expression = Expression.parse(stream);
        return new Align(expression, stream.file(), stream.line_number());
    }
    Align.prototype.assemble = function(context, out) {
        var align = this.expression.evaluate(context, true);
        if(context.dot % align === 0) return;
        context.dot = context.dot + (align - (context.dot % align));
    }

    function AssemblyString(text, null_terminated, file, line) {
        this.text = text;
        this.null_terminated = null_terminated;
        this.file = file;
        this.line = line;
    };
    AssemblyString.prototype.assemble = function(context, out) {
        if(out) {
            for(var i = 0; i < this.text.length; ++i) {
                out[context.dot++] = this.text.charCodeAt(i);
            }
            if(this.null_terminated) out[context.dot++] = 0;
        } else {
            context.dot += this.text.length;
            if(this.null_terminated) context.dot += 1;
        }
        // Interesting undocumented tidbit: .text aligns!
        // This wasted at least an hour.
        if(this.null_terminated) {
            if(context.dot % 4 !== 0) {
                context.dot += (4 - (context.dot % 4));
            }
        }
    };

    function Breakpoint(file, line) {
        this.file = file;
        this.line = line;
    };
    Breakpoint.prototype.assemble = function(context, out) {
        if(out) context.breakpoints.push(context.dot);
    }

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

    var Assembler = function() {
        var mParsedFiles = {};
        var mPendingIncludes = [];

        var parse_macro = function(stream) {
            var macro_name = readSymbol(stream);
            if(macro_name === null) {
                throw new SyntaxError("Macro definitions must include a name.", stream);
            }
            var macro_args = [];
            eatSpace(stream);
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
                    eatSpace(stream);
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
        };

        var parse = function(stream, is_macro) {
            var fileContent = [];
            var allow_multiple_lines = !is_macro; // Macros are single-line by default
            // Helpful bits of state
            var eatingComments = false;

            // If we're in a macro, if the first character we receive is an open brace {,
            // we are allowed to span multiple lines (indeed, we run until we find a close brace)
            eatSpace(stream);
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
                    if(eatSpace(stream)) continue;

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
                    
                    eatSpace(stream);
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
                            case "ascii":
                            case "text":
                                var ascii = readString(stream);
                                fileContent.push(new AssemblyString(ascii, command == "text", stream.file(), stream.line_number()));
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
                            var label = new Label(token, stream.file(), stream.line_number());
                            fileContent.push(label);
                            continue;
                        }

                        // Or assigning something
                        if(stream.peek() == '=') {
                            
                            stream.next();
                            var expression = Expression.parse(stream);
                            var assignment = new Assignment(token, expression, stream.file(), stream.line_number());
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

                        var bad_thing = stream.match(/^[^\s]+/) || stream.match(/^[^\b]+/) || stream.peek();
                        throw new SyntaxError("Unexpected '" + bad_thing + "'; giving up.", stream);
                    }
                }
            } while(allow_multiple_lines && stream.next_line());
            return fileContent;
        };

        var run_assembly = function(syntax) {
            var context = {
                symbols: {},
                macros: {},
                breakpoints: [],
                dot: 0
            };
             _.each(syntax, function(item) {
                item.assemble(context);
            });
            var size = context.dot;
            context.dot = 0;
            var memory = new Uint8Array(size);
            // Now do it again!
            _.each(syntax, function(item) {
                item.assemble(context, memory);
            });
            return memory;
        };

        this.assemble = function(file, content, callback) {
            var stream = new StringStream(new FileStream(content, file));
            var errors = [];
            do {
                try {
                    var syntax = parse(stream);
                } catch(e) {
                    if(e instanceof SyntaxError) {
                        errors.push(e);
                    } else {
                        throw e;
                    }
                }
            } while(stream.next_line());
            if(errors.length) {
                callback(false, errors);
            } else {
                try {
                    var code = run_assembly(syntax);
                } catch(e) {
                    if(e instanceof SyntaxError) {
                        errors.push(e);
                    } else {
                        throw e;
                    }
                }
                console.log(code);
                if(errors.length) {
                    callback(false, errors);
                } else {
                    callback(true);
                }
            }
        };
    };

    root.BetaAssembler = Assembler;
})();
