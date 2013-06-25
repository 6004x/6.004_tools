(function() {
    var tsim = function() {
        var has = function(start, value) {
            for (var v = start; v; v = v.next) {
                if (v.name == value) return true;
            }
            return false;
        }

        var find_comment_end = function(stream, state) {
            var end = stream.match(/^.*\*\//);
            state.multiline_comment = !end;
            if(state.multiline_comment) stream.skipToEnd();
        }

        var read_symbol = function(stream, state) {
            if(stream.peek() == '"' || stream.peek() == "'") {
                // Keep going until we get to the end of the string, taking escapes into account.
                var quote_type = stream.next();
                var escaped = false;
                var token_name = '';
                while(true) {
                    if(escaped) {
                        token_name += stream.next();
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
                            if(stream.eol()) state.current_type = null;
                            return token_name;
                        } else if(!next) {
                            state.current_type = null;
                            return false;
                        } else {
                            token_name += next;
                        }
                    }
                    // All other characters are uninteresting parts of the string.
                }
            } else {
                var token = stream.match(/^[^\s\/"']+/);
                if(stream.eol()) state.current_type = null;
                if(token) {
                    token = token[0];
                    var m = token.match(/^\[.+\]$/)
                    if(m) token = m[1];
                    return token;
                } else {
                    token.eatWhile(/^[^\s]/);
                    return false;
                }
            }

        }

        return {
            startState: function() {
                return {states:{}, symbols:{}, multiline_comment: false, current_type: null, arg_count: null};
            },
            token: function(stream, state) {
                // If we're in a multi-line comment, keep trying to find the end
                if(state.multiline_comment) {
                    find_comment_end(stream, state);
                    if(stream.eol()) state.current_type = null;
                    return 'comment';
                }
                // If we're at the end of the line, exit any current type.
                if(stream.eol()) state.current_type = null;
                // Empty space shouldn't have a token type
                if(stream.eatSpace()) {
                    if(stream.eol()) state.current_type = null;
                    return;
                }
                // Line comment?
                if(stream.match('//')) {
                    state.current_type = null;
                    stream.skipToEnd();
                    return 'comment';
                }
                // Block comment?
                if(stream.match('/*')) {
                    find_comment_end(stream, state);
                    return 'comment';
                }

                // If we don't have a current type we're expecting some keyword
                if(state.current_type === null) {
                    var symbols = stream.match(/^symbols\b/);
                    if(symbols) {
                        state.current_type = 'symbols';
                        return 'keyword';
                    }
                    var states = stream.match(/^states\b/);
                    if(states) {
                        state.current_type = 'states';
                        return 'keyword';
                    }
                    var action = stream.match(/^action\b/);
                    if(action) {
                        state.current_type = 'action';
                        state.arg_count = 0;
                        return 'keyword';
                    }
                    var tape = stream.match(/^tape\b/);
                    if(tape) {
                        state.current_type = 'tape';
                        state.arg_count = 0;
                        return 'keyword';
                    }
                    var result = stream.match(/^result\b/);
                    if(result) {
                        state.current_type = 'result';
                        state.arg_count = 0;
                        return 'keyword';
                    }
                    var result1 = stream.match(/^result1\b/);
                    if(result1) {
                        state.current_type = 'result1';
                        state.arg_count = 0;
                        return 'keyword';
                    }
                    var checkoff = stream.match(/^checkoff\b/);
                    if(checkoff) {
                        state.current_type = 'checkoff';
                        state.arg_count = 0;
                        return 'keyword';
                    }
                    // If none of this matched, the whole thing is illegal. Return angrily.
                    if(!stream.eatWhile(/\w/)) {
                        stream.eatWhile(/[^\s]/);
                    }
                    return 'error';
                }

                if(state.current_type == 'symbols') {
                    // Everything we read in should be a symbol
                    // Apparently, these can be strings!
                    var symbol = read_symbol(stream, state);
                    if(!symbol) return 'error';
                    state.symbols = {name: symbol, next: state.symbols};
                    return 'variable';
                }

                if(state.current_type == 'states') {
                    var token = read_symbol(stream, state);
                    if(!token) return 'error';
                    state.states = {name: token, next: state.states};
                    return 'variable-2';
                }

                if(state.current_type == 'action') {
                    var token = read_symbol(stream, state);
                    ++state.arg_count;
                    if(!token) return 'error';
                    console.log(token);
                    switch(state.arg_count) {
                    case 1:
                        if(has(state.states, token)) return 'variable-2';
                        return 'error';
                    case 2:
                        if(token == '-') return 'keyword';
                        if(has(state.symbols, token)) return 'variable';
                        return 'error';
                    case 3:
                        if(token == '*halt*' || token == '*error*') return 'keyword';
                        if(has(state.states, token)) return 'variable-2';
                        return 'error';
                    case 4:
                        if(token == '-') return 'keyword';
                        if(has(state.symbols, token)) return 'variable';
                        return 'error';
                    case 5:
                        if(token == 'l' || token == 'r' || token == '-') return 'keyword';
                        return 'error';
                    default:
                        return 'error';
                    }
                }

                if(state.current_type == 'tape') {
                    var token = read_symbol(stream, state);
                    ++state.arg_count;
                    if(!token) return 'error';
                    if(state.arg_count == 1) return 'def';
                    else if(has(state.symbols, token)) return 'variable';
                    else return 'error';
                }

                if(state.current_type == 'result') {
                    var token = read_symbol(stream, state);
                    ++state.arg_count;
                    if(!token) return 'error';
                    if(state.arg_count == 1) return 'variable-3';
                    else if(has(state.symbols, token)) return 'variable';
                    else return 'error';
                }

                if(state.current_type == 'result1') {
                    var token = read_symbol(stream, state);
                    ++state.arg_count;
                    if(!token) return error;
                    switch(state.arg_count) {
                    case 1:
                        return 'variable-3';
                    case 2:
                        if(has(state.symbols, token)) return 'variable';
                        else return 'error';
                    default:
                        return 'error';
                    }
                }

                if(state.current_type == 'checkoff') {
                    var token = read_symbol(stream, state);
                    ++state.arg_count;
                    if(!token) return error;
                    switch(state.arg_count) {
                    case 1:
                        return 'string';
                    case 2:
                        return 'string';
                    case 3:
                        return 'number';
                    default:
                        return 'error';
                    }
                }

                // We probably shouldn't get here.
                token.eatWhile(/^[^\s]/);
                return 'error';
            },

            lineComment: '//',
            blockCommentStart: '/*',
            blockCommentEnd: ' */',
            blockCommentLead: '  *'
        };
    };
    CodeMirror.defineMode('tsim', tsim);
})();
