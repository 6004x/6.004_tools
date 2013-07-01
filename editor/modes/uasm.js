(function() {
    var EditorModeBSim = function() {
        // A 'linked list' of function names behaves better for highlighting than a
        // simple map, because it updates correctly as names are edited.
        // Unfortunately, we can't do the same thing for labels, because we expect
        // labels to work *before* they are defined.
        var has_fn = function(state, name) {
            for (var v = state.local_functions; v; v = v.next)
              if (v.name == name) return true;
        }

        return {
            startState: function() { return {local_functions: {}, labels: {}}; },
            token: function(stream, state) {
                // Handle special states.
                if(state.is_include) {
                    stream.eatSpace();
                    stream.eatWhile(/^[^|]/);
                    state.is_include = false;
                    return 'string';
                }
                if(state.is_macro_def) {
                    stream.eatSpace();
                    var token = stream.match(/^([^\s()]+)/);
                    if(token) {
                        state.local_functions = {name: token[0], next: state.local_functions};
                        // state.local_functions[token[0]] = true;
                    }
                    state.is_macro_def = false;
                    state.is_macro_value = true;
                    state.macro_ends_at_end_of_line = true;
                    return 'def';
                }
                if(state.is_macro_value) {
                    // Here we can have either a normal statement or a block.
                    // Check if it's a block.
                    stream.eatSpace();
                    if(stream.peek() == '{') {
                        stream.next();
                        if(state.macro_ends_at_end_of_line) {
                            state.macro_ends_at_end_of_line = false;
                            return 'bracket';
                        } else {
                            return 'error';
                        }
                    } else if(stream.peek() == '}') {
                        stream.next();
                        if(!state.macro_ends_at_end_of_line) {
                            state.is_macro_value = false;
                            return 'bracket';
                        }
                    }
                }
                if(stream.match(/^\s*[\{\}]/)) {
                    stream.eatSpace();
                    stream.next();
                    return 'error';
                }
                if(state.is_options) {
                    stream.eatSpace();
                    var opt = stream.match(/^[\w\d]+/);
                    var ret = 'error';
                    if(opt) {
                        var valid_opts = ['clock','noclock','div','nodiv','mul','nomul','kalways','nokalways','tty','notty','annotate','noannotate'];
                        if(_.contains(valid_opts, opt[0])) {
                            ret = 'keyword';
                        }
                    } else {
                        steam.eatWhile(/^\s/);
                    }
                    stream.eatSpace();
                    if(stream.eol()) {
                        state.is_options = false;
                    }
                    return ret;
                }
                var is_start = stream.sol();
                // It could be a label:
                if(is_start) {
                    if(state.macro_ends_at_end_of_line) {
                        state.is_macro_value = false;
                    }
                    var label = stream.match(/^\s*([a-zA-Z0-9_]+):/);
                    if(label) {
                        state.labels[label[1]] = true;
                        return 'def';
                    }
                }
                // Get rid of any unwanted whitespace.
                stream.eatSpace();
                // If it's the end of the line, go away.
                if(stream.eol()) return;
                // Check if we have a string.
                if(stream.peek() == '"' || stream.peek() == "'") {
                    // Keep going until we get to the end of the string, taking escapes into account.
                    var quote_type = stream.next();
                    var escaped = false;
                    while(true) {
                        if(escaped) {
                            stream.next();
                            escaped = false;
                            continue;
                        }
                        var next = stream.next();
                        if(next == '\\') {
                            escaped = true;
                        } else {
                            // We're unescaped and this is the same as our starting character
                            // This must be the end of the string token.
                            if(next == quote_type) {
                                return 'string';
                            } else if(!next) {
                                return 'error';
                            }
                        }
                        // All other characters are uninteresting parts of the string.
                        // This could change if we start highlighting the escape sequences.
                    }
                }
                // Not a string
                // Perhaps a comment
                if(stream.match(/^\/\//)) {
                    stream.skipToEnd();
                    return 'comment';
                }
                // Maybe a parenthesis
                if(stream.peek() == '(' || stream.peek() == ')') {
                    stream.next();
                    return 'bracket';
                }
                var asm = stream.match(/^\b(?:add|addc|and|andc|mul|mulc|div|divc|or|orc|shl|shlc|shr|shrc|sra|srac|sub|subc|xor|xorc|xnor|xnorc|cmpeq|cmpeqc|cmple|cmplec|cmplt|cmpltc|br|beq|bf|bne|bt|jmp|ld|st|ldr|move|cmove|halt|push|pop|allocate|deallocate|call|rtn|xrtn|word|long|storage|getframe|putframe|svc|rdchar|wrchar|cycle|time|click|random|seed|server)\b/i);
                if(asm) {
                    // Back up one to counter the \b we matched
                    // stream.backUp(1);
                    return 'builtin';
                }
                // Check if it's a register
                var reg = stream.match(/^\b(?:[rR](?:[0-9]|[12][0-9]|3[0-2])|bp|lp|sp|xp)\b/i);
                if(reg) {
                    // stream.backUp(1);
                    return 'variable-3';
                }
                // Or a number
                var number = stream.match(/^-?(0x[0-9a-f]+|0b[01]+|[0-9]+)/i); // Decimal must be last to avoid early matching.
                if(number) {
                    return 'number';
                }
                // Or some arithmetic operator
                var operator = stream.match(/^[\+\-\*\/~%=]|<<|>>/);
                if(operator) {
                    return 'operator';
                }
                // Perhaps a .command
                var command = stream.match(/^\.(macro|options|include|align|text|ascii|breakpoint|protect|unprotect|options|pcheckoff|tcheckoff|verify)/i);
                if(command) {
                    if(command[1] == "include") {
                        state.is_include = true;
                    } else if(command[1] == "macro") {
                        state.is_macro_def = true;
                    } else if(command[1] == "options") {
                        state.is_options = true;
                    }
                    return 'keyword';
                }
                // Maybe just a dot
                if(stream.match(/^\.\b/)) {
                    return 'keyword';
                }
                // If we have no idea it is probably a variable.
                // Apparently we don't know. Eat it.
                var something = stream.match(/^[a-zA-Z0-9_]+/);
                if(something) {
                    if(has_fn(state, something)) {
                        return 'variable-2';
                    } else if(state.labels[something]) {
                        return 'variable-2';
                    } else {
                        return 'variable';
                    }
                } else {
                    stream.next();
                }
                return null;
            },

            lineComment: '//' 
        };
    };

    CodeMirror.defineMode('uasm', EditorModeBSim);

})();
