// This highlighter isn't very intelligent; the syntax makes that difficult.

CodeMirror.defineMode('jsim', function() {
    var eatMultiComment = function(stream, state) {
        if(!state.in_multi_line_comment) {
            if(stream.match('/*')) {
                state.in_multi_line_comment = true;
            } else {
                return false;
            }
        }
        if(state.in_multi_line_comment) {
            // Try to find the end
            if(stream.match(/^.*\*\//)) {
                state.in_multi_line_comment = false;
            } else {
                stream.skipToEnd();
            }
        }
    };

    // Returns true if the string has actually ended, false if we ran out of line first
    var eatString = function(stream, state) {
        // Keep going until we get to the end of the string, taking escapes into account.
        var escaped = false;
        while(true) {
            if(escaped) {
                stream.next();
                escaped = false;
                continue;
            }
            if(stream.skipTo('\\')) {
                stream.next();
                escaped = true;
            } else if(stream.skipTo('"')) {
                stream.next();
                return true;
            } else {
                stream.skipToEnd()
                return false;
            }
        }
    };

    return {
        lineComment: '//',
        blockCommentStart: '/*',
        blockCommentEnd: ' */',
        blockCommentLead: '  *',

        startState: function() {
            return {
                in_multi_line_comment: false,
                last_state: null,
                sol: false,
                in_args: false
            };
        },

        token: function(stream, state) {
            // Kill whitespace
            if(stream.sol()) state.sol = true;
            if(stream.eatSpace()) return;
            // Eat multi-line comments.
            if(eatMultiComment(stream, state)) return 'comment';
            // Figure out if this is a continuation.
            if(state.sol) {
                state.sol = false;
                if(stream.peek() == '+') {
                    stream.next();
                    if(state.last_state == 'string') {
                        if(eatString(stream, state)) {
                            state.last_state = null;
                        }
                        return 'string';
                    } else {
                        return 'keyword';
                    }
                } else {
                    state.in_args = false;
                }
            }
            state.sol = false; // at any rate, we don't care any more
            state.last_state = null;
            // Eat single-line comments.
            if(stream.match('//')) {
                stream.skipToEnd();
                return 'comment';
            }
            if(!state.in_args) {
                if(stream.match(/^.(checkoff|connect|dc|end|global|include|model|mverify|op|options|plot|plotdef|subckt|ends|temp|tempdir|tran|verify)\b/i)) {
                    state.in_args = true;
                    return 'keyword';
                }
                if(stream.match(/^[WRMCLXVI][a-z0-9_:\$\[\]\.]+/i)) {
                    state.in_args = true;
                    return 'variable-3';
                }
            } else {
                if(stream.match('"')) {
                    if(!eatString(stream, state)) {
                        state.last_state = 'string';
                    }
                    return 'string';
                }
                if(stream.match(/^(?:[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|0x[0-9a-f]+|0b[01]+|0[0-7]+)(?:[a-zA-Z]+)?/i)) {
                    return 'number';
                }
                if(stream.match(/[a-z0-9_:\$\[\]\.#]+/i)) {
                    return 'variable-2';
                }
            }
            if(stream.match(/^[()]/)) {
                return 'bracket';
            }
            if(stream.match(',')) return;
            // Give up
            if(!stream.eatWhile(/^[^\s()]/)) {
                if(!stream.eatWhile(/^[^\s]/)) {
                    stream.skipToEnd();
                }
            }
            return 'error';
        }
    };
});
