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
        } else if(stream_or_file !== undefined && line !== undefined) {
            this.file = stream_or_file;
            this.line = line;
            this.column = 0;
        } else {
            throw new Error("It is mandatory to provide either a stream or a file/line pair to SyntaxError.");
        }
        this.message = message;
    };
    SyntaxError.prototype = new Error();
    SyntaxError.prototype.toString = function() {
        return this.file + ":" + this.line + ":" + this.column + ": " + this.message;
    };

    // Reads an octal escape sequence, excluding the leading backslash.
    // Throws a SyntaxError if the sequence is outside the acceptable range (one byte)
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

    // Reads one character from a string and returns it.
    // If the character is equal to end_char, and it's not escaped,
    // returns false instead (this lets you detect end of string)
    var readChar = function(stream, end_char) {
        var chr = stream.next();
        switch(chr) {
        case end_char:
            return false;
        case '\\':
            chr = stream.next();
            switch(chr) {
            case 'b': return '\b';
            case 'f': return '\f';
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case '"': return '"';
            case "'": return "'";
            case '\\': return '\\';
            // Allow octal sequences like \123
            case '0': case '1': case '2': case '3':
            case '4': case '5': case '6': case '7':
                stream.backUp(1);
                return readOctalStringEscape(stream);
            default:
                throw new SyntaxError("Unknown escape sequence \\" + chr + ". (if you want a literal backslash, try \\\\)", stream);
            }
            break;
        default:
            return chr;
        }
    };

    // Reads in a double-quoted string, or throws a SyntaxError if it can't.
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

    // Parses the given text as a number (as understood by uasm)
    // If this is not possible, returns NaN.
    // This primarily exists as a helper for readNumber.
    var parseNumber = function(text) {
        // We have to do strict tests ourselves, otherwise parseInt is too lenient and accepts
        // invalid numbers.
        // Hex
        if(/^0x[0-9a-f]+$/i.test(text)) {
            return parseInt(text, 16);
        }
        // Binary
        else if(/^0b[10]+$/i.test(text)) {
            return parseInt(text.slice(2), 2);
        }
        // Octal
        else if(/^0[0-7]+$/.test(text)) {
            return parseInt(text, 8);
        }
        // Decimal (explicitly exclude octal)
        else if(/^[1-9][0-9]*$|^0$/.test(text)) {
            return parseInt(text, 10);
        }
        return NaN;
    };

    // Reads a number out of the stream.
    // If the stream doesn't appear to contain a number, returns null.
    // If the stream does appear to contain a number, but actually doesn't, throws
    // a SyntaxError.
    // If the stream really does contain a number, returns it as a Number.
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
            throw new SyntaxError("Incomprehensible number " + token + ". Acceptable bases are hex (0x...), octal (0...), binary (0b...) and decimal.", stream);
        }

        return num;
    };

    // Read any name symbol from the stream.
    // Returns the name of the symbol if it exists, null if there isn't one.
    var readSymbol = function(stream) {
        eatSpace(stream);
        var match = stream.match(/^[\$\.@A-Z_][\$\.@A-Z0-9_]*/i);
        
        if(match) {
            return match[0];
        } else {
            return null;
        }
    };

    // Reads in a 'term', as understood by an Expression.
    // This understands the following as terms:
    // - Integer literals
    // - Symbols (e.g. variable names)
    // - Parenthesised expressions
    // - Characters (single character strings quoted with '')
    // - Negations of the above (any of the above prefixed by a -)
    // Returns the term, whatever it happens to be (number, symbol name, Expression, UnaryOperation)
    var readTerm = function(stream) {
        eatSpace(stream);
        // Is it a number?
        var num = readNumber(stream);
        if(num !== null) return num;

        var symbol = readSymbol(stream);
        if(symbol !== null) return symbol;

        if(stream.peek() == '-' || stream.peek() == '~' || stream.peek() == '+') {
            var unary = stream.next();
            var next = readTerm(stream);
            if(next) {
                return new UnaryOperation(unary, next, stream.file(), stream.line_number());
            } else {
                throw new SyntaxError("Expected value after unary '" + unary + "' operator.", stream);
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
                throw new SyntaxError("Zero-character char constant; char constants must have exactly one character.", stream);
            }
            if(stream.next() != "'") {
                throw new SyntaxError("Multi-character char constant; char constants must have exactly one character (for more, try .ascii or .text)", stream);
            }
            return chr.charCodeAt(0);
        }


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
    }
    Assignment.prototype.assemble = function(context, out, source_map) {
        // Dot is a special case.
        if(this.name === '.') {
            var dot = this.value.evaluate(context, true);
            // This is bound to fail eventually, but to get the error messages in the right order, we
            // ensure that we only complain about this on the second iteration.
            if(out) {
                if(dot < context.vdot) {
                    throw new SyntaxError("It is illegal to set . to a value lower than its current value (current value: " + context.vdot + "; new value: " + dot + ")", this.file, this.line);
                }
            }
            context.pdot += dot - context.vdot;
            context.vdot = dot;
        } else {
            context.symbols[this.name] = this.value.evaluate(context, !!out);
        }
        return null;
    };

    // Represents the location of a label in the code
    function Label(name, file, line) {
        this.name = name;
        this.file = file;
        this.line = line;
    }
    Label.prototype.assemble = function(context, out, source_map) {
        context.symbols[this.name] = context.vdot;
        context.labels[this.name] = context.pdot;   // label lookup uses physical address
    };

    // Represents an invocation of a macro.
    function MacroInvocation(macro, args, file, line) {
        this.macro = macro;
        this.args = args;
        this.file = file;
        this.line = line;
    }
    // Creates a MacroInvocation. Expects to be given the name of the macro as `token`, and a
    // stream pointing immediately after the macro name 
    // Parses the parenthesised argument list, or throws a SyntaxError if it can't.
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
    MacroInvocation.prototype.assemble = function(context, out, source_map) {
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
        var start_dot = context.pdot;
        context.macros[this.macro][this.args.length].transclude(context, evaluated, out, source_map);
        // record file/line top-level macro call for all generated bytes
        if (source_map) while (start_dot < context.pdot) source_map[start_dot++] = this;
    };

    // Represents an arithmetic operation; used as part of an Expression.
    function Operation(op, file, line) {
        this.op = op;
        this.file = file;
        this.line = line;
    }
    // Returns the result of performing the Operation on a and b (a op b)
    // a and b will be treated as unsigned integers.
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

    // Indicates that the value should be subjected to some unary operation.
    function UnaryOperation(op, value, file, line) {
        this.op = op;
        this.value = value;
        this.file = file;
        this.line = line;
    }
    UnaryOperation.prototype.evaluate = function(context, strict) {
        var ops = {
            '-': function(a) { return -a; },
            '~': function(a) { return ~a; },
            '+': function(a) { return +a; }
        };
        if(typeof this.value.evaluate == 'function') {
            this.value = this.value.evaluate(context, strict);
        }
        if(!_.has(ops, this.op)) {
            throw new SyntaxError("Cannot perform unary operation '" + this.op + "'; no function defined.", this.file, this.line);
        }
        return ops[this.op](this.value);
    };

    // Represents an 'arithmetic expression'. This includes the degenerate cases of either an integer
    // literal or a symbol name with no operations.
    // Expressions may well contain nested Expressions.
    // Returns null if passed something that doesn't look like an expression
    // Returns an Expression if passed a valid expression
    // Throws a SyntaxError if passed something that looks like an expression but isn't
    function Expression(expression, file, line) {
        this.expression = expression;
        this.file = file;
        this.line = line;
    }
    Expression.parse = function(stream) {
        var terms = []; // List of terms (which we don't generally evaluate while parsing)
        var want_operation = false; // We alternate between expecting a value and an expression.
        while(true) {
            eatSpace(stream);
            if(!want_operation) {
                var term = readTerm(stream);
                if(term !== null) {
                    terms.push(term);
                    want_operation = true;
                    continue;
                } else {
                    // If we can't get a term and we already have some terms, that's a syntax error.
                    // If we don't already have some terms, though, we just assume it's not an expression at all.
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
        }

        return new Expression(terms, stream.file(), stream.line_number());
    };
    // Evaluates an expression, given the variable values in context.
    // If strict is false and it needs a variable that is either not yet set or currently has
    // undefined value (due to forward dependencies), returns 'undefined'.
    // If strict is true, it will instead throw a SyntaxError.
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
        // Evaluates a single term of the expression.
        var term = function(t) {
            if(_.isNumber(t)) {
                return t;
            }
            if(_.isString(t)) {
                // . is a special case.
                if(t === '.') {
                    return context.vdot;
                }
                var value = context.symbols[t];
                if(value === undefined) {
                    // look in kernel segment if not in current segment
                    value = context.segments['kernel'][t];
                }
                if(value === undefined && strict) {
                    throw new SyntaxError("Symbol '" + t + "' is undefined.", self.file, self.line);
                }
                return value;
            }
            // Evaluate expressions and unary operations recursively.
            if(typeof t.evaluate == 'function') {
                return t.evaluate(context, strict);
            }
            // We shouldn't be able to get here.
            console.log(t);
            throw "Unknown term type during expression evaluation.";
        };

        var i = 0;
        var a = term(this.expression[i++]);
        if(a === undefined) { // 'strict' handling is done in term().
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
    Expression.prototype.assemble = function(context, out, source_map) {
        var value = this.evaluate(context, !!out);
        if(out) {
            // Be sure to complain if it's illegal.
            if(value > 255) {
                throw new SyntaxError("Expression results must fit within one byte; " + value + " is too large.", this.file, this.line);
            }
            if(value < -128) {
                throw new SyntaxError("Expression results must fit within one byte; interpreted as a signed integer, " + value + " is too negative.", this.file, this.line);
            }
            // Set it.
            out[context.pdot] = value;
            source_map[context.pdot] = this;  // we'll want this.file and this.line
        }
        context.pdot += 1;
        context.vdot += 1;
    };

    // Represents a Macro definition.
    function Macro(name, parameters, instructions, file, line) {
        this.name = name;
        this.parameters = parameters;
        this.instructions = instructions;
        this.file = file;
        this.line = line;
    }
    Macro.prototype.assemble = function(context, out, source_map) {
        if(out) return; // Only evalute macro definitions on first parse to avoid redefinition errors.
        if(!_.has(context.macros, this.name)) {
            context.macros[this.name] = {};
        }
        if(_.has(context.macros[this.name], this.parameters.length)) {
            var old = context.macros[this.name][this.parameters.length];
            throw new SyntaxError("Redefinition of " + this.parameters.length + "-argument macro " + this.name + ". (Original at " + old.file + ":" + old.line + ")", this.file, this.line);
        }
        context.macros[this.name][this.parameters.length] = this;
    };
    // Called by MacroInvocation to put a macro in place during assembly.
    Macro.prototype.transclude = function(context, args, out, source_map) {
        if(args.length != this.parameters.length) {
            throw "Wrong number of parameters in Macro transclude (MacroInvocation should not permit this!)";
        }
        // Macros have their own scope, so create a new scope object for them.
        var old_scope = context.symbols;
        var scope = _.extend({}, context.symbols, _.object(this.parameters, args));
        context.symbols = scope;

        _.each(this.instructions, function(instruction) {
                instruction.assemble(context, out, source_map);
        });
        // Revert back to the old scope.
        context.symbols = old_scope;
    };

    // Represents a .include statement.
    function Include(filename, file, line) {
        this.filename = filename;
        this.file = file;
        this.line = line;
        this.instructions = null;
    }
    Include.parse = function(stream) {
        var filename = readString(stream);
        return new Include(filename, stream.file(), stream.line_number());
    };
    Include.prototype.assemble = function(context, out, source_map) {
        if(!this.instructions) {
            throw "Attempting to assemble Include without parsing file contents.";
        }
        _.each(this.instructions, function(instruction) {
                instruction.assemble(context, out, source_map);
        });
    };

    // Represents a .align statement.
    function Align(expression, file, line) {
        this.expression = expression;
        this.file = file;
        this.line = line;
    }
    Align.parse = function(stream) {
        var expression = Expression.parse(stream);
        return new Align(expression, stream.file(), stream.line_number());
    };
    Align.prototype.assemble = function(context, out, source_map) {
        var align = this.expression ? this.expression.evaluate(context, true) : 4;
        if(context.vdot % align === 0) return;
        context.vdot = context.vdot + (align - (context.vdot % align));
        context.pdot = context.pdot + (align - (context.pdot % align));
    };

    // Represents a .segment statement.
    function Segment(segname, file, line) {
        this.segname = segname;
        this.file = file;
        this.line = line;
    }
    Segment.parse = function(stream) {
        var segname = readSymbol(stream);
        if (segname == null) {
            throw new SyntaxError("Missing segment name", this.file, this.line);
        }
        return new Segment(segname, stream.file(), stream.line_number());
    };
    Segment.prototype.assemble = function(context, out, source_map) {
        // start with word alignment
        if(context.vdot % 4 !== 0) {
            context.vdot = context.vdot + (4 - (context.vdot % 4));
            context.pdot = context.pdot + (4 - (context.pdot % 4));
        }

        if (out) {
            // second pass, so restore saved symbol table
            context.symbols = context.segments[this.segname];
            context.current_segment = this.segname;
        } else {
            // first pass
            // remember virtual extent of previous segment in default segment symbol table
            context.segments['kernel'][context.current_segment + '_bounds'] = context.vdot;

            // remember physical base address of new segment in default segment symbol table
            context.current_segment = this.segname;
            context.segments['kernel'][this.segname + '_base'] = context.pdot;

            // first pass, so create new symbol table
            context.symbols = {};   // new symbol table
            context.segments[this.segname] = context.symbols;
        }
        context.vdot = 0;   // reset virtual location
    };
    
    // Represnts both .ascii (null_terminated = false) and .text (null_terminated = true)
    function AssemblyString(text, null_terminated, file, line) {
        this.text = text;
        this.null_terminated = null_terminated;
        this.file = file;
        this.line = line;
    }
    AssemblyString.prototype.assemble = function(context, out, source_map) {
        if(out) {
            for(var i = 0; i < this.text.length; ++i) {
                out[context.pdot] = this.text.charCodeAt(i);
                source_map[context.pdot] = this;  // we'll want this.file and this.line
                context.pdot += 1;
                context.vdot += 1;
            }
            if(this.null_terminated) {
                out[context.pdot++] = 0;
                context.vdot += 1;
            }
        } else {
            context.pdot += this.text.length;
            context.vdot += this.text.length;
            if(this.null_terminated) {
                context.pdot += 1;
                context.vdot += 1;
            }
        }
        // Interesting undocumented tidbit: .text aligns!
        // This wasted at least an hour.
        if(this.null_terminated) {
            if(context.vdot % 4 !== 0) {
                context.vdot += (4 - (context.vdot % 4));
                context.pdot += (4 - (context.pdot % 4));
            }
        }
    };

    // Represents .breakpoint
    function Breakpoint(file, line) {
        this.file = file;
        this.line = line;
    }
    Breakpoint.prototype.assemble = function(context, out, source_map) {
        if(out) context.breakpoints.push(context.pdot);
    };

    // Represents .protect
    var Protect = function(file, line) {
        this.file = file;
        this.line = line;
    };
    Protect.prototype.assemble = function(context, out, source_map) {
        if(out) {
            var last_range = _.last(context.protection);
            if(!last_range || last_range.end != Infinity) {
                context.protection.push({start: context.pdot, end: Infinity});
            }
        }
    };

    // Represents .unprotect
    var Unprotect = function(file, line) {
        this.file = file;
        this.line = line;
    };
    Unprotect.prototype.assemble = function(context, out, source_map) {
        if(out) {
            var last_range = _.last(context.protection);
            if(last_range && last_range.end == Infinity) {
                last_range.end = context.pdot;
            }
        }
    };

    // Represents .options
    var Options = function(options, file, line) {
        this.options = options;
        this.file = file;
        this.line = line;
    };
    Options.parse = function(stream) {
        var options = {};
        while(!stream.eol()) {
            eatSpace(stream);
            var option = readSymbol(stream);
            switch(option) {
                case "notty":
                    options.tty = false;
                    break;
                case "tty":
                    options.tty = true;
                    break;
                case "clock":
                case "clk":
                    options.clock = true;
                    break;
                case "noclock":
                case "noclk":
                    options.clock = false;
                    break;
                case "annotate":
                    options.annotate = true;
                    break;
                case "noannotate":
                    options.annotate = false;
                    break;
                case "kalways":
                    options.kalways = true;
                    break;
                case "nokalways":
                    options.kalways = false;
                    break;
                case "segmentation":
                    options.segmentation = true;
                    break;
                case "nosegmentation":
                    options.segmentation = false;
                    break;
                case "div":
                    options.div = true;
                    break;
                case "nodiv":
                    options.div = false;
                    break;
                case "mul":
                    options.mul = true;
                    break;
                case "nomul":
                    options.mul = false;
                    break;
                default:
                    throw new SyntaxError("Unrecognised option '" + option + "'", stream);
            }
        }
        return new Options(options, stream.file(), stream.line_number());
    };
    Options.prototype.assemble = function(context, out, source_map) {
        if(out) {
            _.extend(context.options, this.options);
        }
    };

    var Checkoff = function(url, name, checksum, file, line) {
        this.url = url;
        this.name = name;
        this.checksum = checksum;
        this.file = file;
        this.line = line;
    };
    Checkoff.parse = function(stream) {
        eatSpace(stream);
        var url = readString(stream);
        eatSpace(stream);
        var name = readString(stream);
        eatSpace(stream);
        var checksum = Expression.parse(stream);
        if(checksum === null) {
            throw new SyntaxError("Expected checkoff checksum.", stream);
        }
        return new this.prototype.constructor(url, name, checksum, stream.file(), stream.line_number());
    };
    Checkoff.prototype.assemble = function(context, out, source_map) {
        if(out) {
            if(context.checkoff) {
                throw new SyntaxError("Multiple checkoffs found! Only one checkoff statement is accepted per program.", this.file, this.line);
            }
            context.checkoff = {
                kind: this.kind,
                url: this.url,
                name: this.name,
                checksum: this.checksum.evaluate(context, true)
            };
        }
    };

    var TCheckoff = function(url, name, checksum, file, line) {
        Checkoff.call(this, url, name, checksum, file, line);
        this.kind = 'tty';
    };
    TCheckoff.prototype = Object.create(Checkoff.prototype, {constructor: {value: TCheckoff}});
    TCheckoff.parse = Checkoff.parse;

    var PCheckoff = function(url, name, checksum, file, line) {
        Checkoff.call(this, url, name, checksum, file, line);
        this.kind = 'memory';
    };
    PCheckoff.prototype = Object.create(Checkoff.prototype, {constructor: {value: PCheckoff}});
    PCheckoff.parse = Checkoff.parse;
    PCheckoff.prototype.assemble = function(context, out, source_map) {
        Checkoff.prototype.assemble.call(this, context, out, source_map);
        if(out) {
            context.checkoff.running_checksum = 36036;
            context.checkoff.addresses = {};
        }
    };

    var Verify = function(address, words, checksum, file, line) {
        this.address = address;
        this.words = words;
        this.file = file;
        this.line = line;
        this.checksum_contribution = checksum;
    };
    Verify.parse = function(stream) {
        eatSpace(stream);
        var address = readNumber(stream, false);
        if(address === null) {
            throw new SyntaxError("Expected address", stream);
        }
        eatSpace(stream);
        var count = readNumber(stream, false);
        if(count === null) {
            throw new SyntaxError("Expected number of words", stream);
        }
        var list = [];
        var checksum = 0;
        for(var i = 0; i < count; ++i) {
            eatSpace(stream);
            var value = readNumber(stream, false);
            if(value === null) {
                throw new SyntaxError("Expected " + count + " words; only got " + list.length + ".", stream);
            }
            list.push(value);
            var i32 = new Int32Array(1);
            i32[0] = value;
            i32[0] += (address + i*4);
            i32[0] *= i+1;
            i32[0] += checksum;
            checksum = i32[0];
        }
        return new Verify(address, list, checksum, stream.file(), stream.line_number());
    };
    Verify.prototype.assemble = function(context, out, source_map) {
        if(out) {
            if(!context.checkoff || context.checkoff.kind != 'memory') {
                throw new SyntaxError(".verify statements are only legal after a .pcheckoff statement.", this.file, this.line);
            }
            var i32 = new Int32Array(1);
            i32[0] = context.checkoff.running_checksum + this.checksum_contribution;
            context.checkoff.running_checksum = i32[0];
            // var values = _.map(this.words, function(v) { return v.evaluate(context, true); });
            _.extend(context.checkoff.addresses, _.object(_.range(this.address, this.address+this.words.length*4, 4), this.words));
        }
    };

    // Public Assembler interface. Constructor takes no arguments.
    var Assembler = function(editor) {
        var mParsedFiles = {};
        var mPendingIncludes = [];

        // Parses a macro definition
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

        var sources;  // list of {file: ..., content: ...}
        var parse_file = function(file, content, completion_callback, error_callback, metadata) {
            var stream = new StringStream(new FileStream(content, file));
            var errors = [];
            var waiting = 0;
            var completed = false;

            sources.push({file: file, content: content, metadata: metadata});

            var insert_include = function(include) {
                ++waiting;
                editor.getFile(include.filename, function(include_content) {
                    parse_file(include_content.name, include_content.data, function(syntax) {
                        --waiting;
                        include.instructions = syntax;
                        if(errors.length === 0 && waiting === 0 && completed) {
                            completion_callback(our_syntax);
                        }
                    }, error_callback, metadata);
                }, function() {
                    error_callback([new SyntaxError("File not found: " + include.filename, include.file, include.line)]);
                });
            };

            var our_syntax;
            do {
                try {
                    our_syntax = parse(stream, false, insert_include);
                } catch(e) {
                    if(e instanceof SyntaxError) {
                        errors.push(e);
                    } else {
                        throw e;
                    }
                }
            } while(stream.next_line());

            if(errors.length > 0) {
                error_callback(errors);
            } else {
                completed = true;
                if(waiting === 0) {
                    completion_callback(our_syntax);
                }
            }
        };

        // Parses a file (or a macro, if is_macro is true)
        var parse = function(stream, is_macro, include_callback) {
            var fileContent = [];
            var allow_multiple_lines = !is_macro; // Macros are single-line by default
            var expecting_brace = false;
            // Helpful bits of state
            var eatingComments = false;

            // If we're in a macro, if the first character we receive is an open brace {,
            // we are allowed to span multiple lines (indeed, we run until we find a close brace)
            eatSpace(stream);
            if(is_macro && stream.peek() == '{') {
                stream.next();
                allow_multiple_lines = true;
                expecting_brace = true;
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
                    // If we're at the end of the line, continue.
                    if(stream.eol()) break;

                    // If we're in a multi-line macro and we find a }, it's time for us to exit.
                    if(is_macro && allow_multiple_lines && stream.peek() == "}") {
                        expecting_brace = false;
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
                                if(!include_callback) {
                                    throw new SyntaxError(".include statement in illegal context.", stream);
                                }
                                include_callback(include);
                                fileContent.push(include);
                                break;
                            case "macro":
                                fileContent.push(parse_macro(stream));
                                break;
                            case "align":
                                fileContent.push(Align.parse(stream));
                                break;
                            case "segment":
                                fileContent.push(Segment.parse(stream));
                                break;
                            case "ascii":
                            case "text":
                                var ascii = readString(stream);
                                fileContent.push(new AssemblyString(ascii, command == "text", stream.file(), stream.line_number()));
                                break;
                            case "breakpoint":
                                fileContent.push(new Breakpoint(stream.file(), stream.line_number()));
                                break;
                            case "options":
                                fileContent.push(Options.parse(stream));
                                break;
                            case "protect":
                                fileContent.push(new Protect(stream.file(), stream.line_number()));
                                break;
                            case "unprotect":
                                fileContent.push(new Unprotect(stream.file(), stream.line_number()));
                                break;
                            case "tcheckoff":
                                fileContent.push(TCheckoff.parse(stream));
                                break;
                            case "pcheckoff":
                                fileContent.push(PCheckoff.parse(stream));
                                break;
                            case "verify":
                                fileContent.push(Verify.parse(stream));
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
                            var assigned_expression = Expression.parse(stream);
                            var assignment = new Assignment(token, assigned_expression, stream.file(), stream.line_number());
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
                    var expression = Expression.parse(stream);
                    fileContent.push(expression);

                    if(expression === null) {
                        // This is a collection of ways we can get here.
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

                        // This is just the user being unreasonable
                        var bad_thing = stream.match(/^[^\s]+/) || stream.match(/^[^\b]+/) || stream.peek();
                        throw new SyntaxError("Unexpected '" + bad_thing + "'; giving up.", stream);
                    }
                }
            } while(allow_multiple_lines && stream.next_line());
            if(expecting_brace) {
                throw new SyntaxError("Expected closing brace to end block macro declaration.", stream);
            }
            return fileContent;
        };

        // Given a syntax tree, returns a Uint8Array representing the program
        // Alternatively, throws a SyntaxError.
        var run_assembly = function(syntax,sources) {
            var context = {
                segments: {},  // name => symbols
                current_segment: 'kernel',
                symbols: {},
                macros: {},
                pdot: 0,      // physical address for dot
                vdot: 0,      // virtual address for dot (reset by .segment)
                // Things to be passed out to the driver.
                breakpoints: [],
                labels: {},
                options: {},
                protection: [],
                checkoff: null
            };
            context.segments['kernel'] = context.symbols;   // remember symbols from default segment

            // First pass: figure out where everything goes.
             _.each(syntax, function(item) {
                item.assemble(context);
            });
            // remember bounds for last segment
            context.segments['kernel'][context.current_segment + '_bounds'] = context.vdot;

            // Reset our start position, but keep the values defined.
            var size = context.pdot;
            context.pdot = 0;
            context.vdot = 0;
            context.symbols = context.segments['kernel'];
            context.current_segment = 'kernel';
            var memory = new Uint8Array(size);
            // keep track of file & line for each output byte
            var source_map = new Array(size);

            // Now do it again! Put things into our memory image this time.
            _.each(syntax, function(item) {
                    item.assemble(context, memory, source_map);
            });
            return {
                image: memory,
                source_map: source_map,
                breakpoints: context.breakpoints,
                labels: context.labels,
                options: context.options,
                protection: context.protection,
                checkoff: context.checkoff,
                sources: sources
            };
        };

        // Public driver function.
        // file: the name of the file
        // content: the contents of the file
        // callback(false, error_list): called on failure. error_list is a list of SyntaxErrors, if any
        // callback(true, bytecode): called on success. bytecode is a Uint8Array containing the result of compilation.
        this.assemble = function(file, content, metadata, callback) {
            //var stream = new StringStream(new FileStream(content, file));
            //var can_succeed = true;
            var errors = [];

            sources = [];  // initialize list of sources
            parse_file(file, content, function(syntax) {
                var code;
                try {
                    code = run_assembly(syntax,sources);
                } catch(e) {
                    if(e instanceof SyntaxError) {
                        errors.push(e);
                    } else {
                        throw e;
                    }
                }
                if(errors.length) {
                    callback(false, errors);
                } else {
                    callback(true, code);
                }
            }, function(errors) {
                callback(false, errors);
            }, metadata);
        };
    };

    root.BetaAssembler = Assembler;
})();
