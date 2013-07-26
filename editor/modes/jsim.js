// This highlighter isn't very intelligent; the syntax makes that difficult.
(function() {
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
                    in_args: false,
                    subckt_name: false
                };
            },

            token: function(stream, state) {
                console.log(stream, state);
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
                        state.subckt_name = false;
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
                    if(state.subckt_name) {
                        stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
                        state.in_args = true;
                        return 'variable';
                    }
                    if(stream.match(/^\.(checkoff|connect|dc|ac|end|global|include|model|mverify|op|options|plot|plotdef|subckt|ends|temp|tempdir|tran|verify|gsubckt)\b/i)) {
                        state.in_args = true;
                        return 'keyword';
                    }
                    if(stream.match(/^[WRNPCLVI][a-z0-9_:\$\[\]\.]+/i)) {
                        state.in_args = true;
                        return 'variable-3';
                    } else if(stream.match(/^X[a-z0-9_:\$\[\]\.]+/i)) {
                        state.subckt_name = true;
                        return 'variable-3';
                    }

                } else {
                    state.subckt_name = false;
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
                    if(stream.match(/^[()]/)) {
                        return 'bracket';
                    }
                    if(stream.match(',')) return;
                    if(stream.match('=')) return 'operator';
                }
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

    Editor.Completions.jsim = {
        Settings: {
            paramListStart: ' ',
            paramSpacer: ' ',
            paramListEnd: '',
            filter: function(completion, token) {
                console.log(token.state);
                if(token.state.subckt_name) {
                    return completion;
                } else {
                    return false;
                }
            }
        },
        Terms: [
            ['constant0', ['nodes...']],
            ['constant1', ['nodes...']],
            ['inverter', ['in', 'out']],
            ['inverter_2', ['in', 'out']],
            ['inverter_4', ['in', 'out']],
            ['inverter_8', ['in', 'out']],
            ['buffer', ['in', 'out']],
            ['buffer_2', ['in', 'out']],
            ['buffer_4', ['in', 'out']],
            ['buffer_8', ['in', 'out']],
            ['tristate', ['e', 'in', 'out']],
            ['tristate_2', ['e', 'in', 'out']],
            ['tristate_4', ['e', 'in', 'out']],
            ['tristate_8', ['e', 'in', 'out']],
            ['and2', ['a', 'b', 'out']],
            ['and3', ['a', 'b', 'c', 'out']],
            ['and4', ['a', 'b', 'c', 'd', 'out']],
            ['nand2', ['a', 'b', 'out']],
            ['nand3', ['a', 'b', 'c', 'out']],
            ['nand4', ['a', 'b', 'c', 'd', 'out']],
            ['or2', ['a', 'b', 'out']],
            ['or3', ['a', 'b', 'c', 'out']],
            ['or4', ['a', 'b', 'c', 'd', 'out']],
            ['nor2', ['a', 'b', 'out']],
            ['nor3', ['a', 'b', 'c', 'out']],
            ['nor4', ['a', 'b', 'c', 'd', 'out']],
            ['xor2', ['a', 'b', 'out']],
            ['xnor2', ['a', 'b', 'out']],
            ['aoi21', ['a1', 'a2', 'b', 'out']],
            ['oai21', ['a1', 'a2', 'b', 'out']],
            ['mux2', ['s', 'd0', 'd1', 'out']],
            ['mux4', ['s0', 's1', 'd00', 'd10', 'd01', 'd11', 'out']],
            ['dreg', ['in', 'clk', 'out']]
        ]
    };
})();