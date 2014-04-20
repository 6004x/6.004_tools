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
            return true;
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
                    if(stream.match(/^\.(checkoff|connect|dc|ac|end|ends|global|include|mverify|options|plot|plotdef|subckt|tran|verify)\b/i)) {
                        state.in_args = true;
                        return 'keyword';
                    }
                    if(stream.match(/^[WRNPCLVIO][a-z0-9_:\$\[\]\.]+/i)) {
                        state.in_args = true;
                        return 'variable-3';
                    } else if(stream.match(/^[GX][a-z0-9_:\$\[\]\.]+/i)) {
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
                    if(stream.match(/^[+*\/-]/)) {
                        return 'operator';
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

    var primitiveSettings = {
        paramListStart: '',
        paramSpacer: ' ',
        paramListEnd: '',
        filter: function(completion, token) {
            return !(token.state.in_args || token.state.subckt_name || token.state.in_multi_line_comment) ? completion: false;
        }
    };
    var subcktSettings = {
        paramListStart: ' ',
        paramSpacer: ' ',
        paramListEnd: '',
        filter: function(completion, token) {
            return token.state.subckt_name ? completion : false;
        }
    };
    var keywordSettings = {
        paramListStart: ' ',
        paramSpacer: ' ',
        paramListEnd: '',
        filter: function(completion, token) {
            return !(
                (token.state.in_args && token.string != completion.term[0])
                || token.state.subckt_name
                || token.state.in_multi_line_comment
                ) ? completion : false;
        }
    };
    var fnSettings = {
        paramListStart: '(',
        paramSpacer: ', ',
        paramListEnd: ')',
        filter: function(completion, token) {
            return (token.state.in_args && !token.state.subckt_name) ? completion : false;
        }
    };
    Editor.Completions.jsim = {
        Settings: subcktSettings,
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
            ['mux2', ['s', 'd0', 'd1', 'out']],
            ['mux4', ['s0', 's1', 'd0', 'd1', 'd2', 'd3', 'out']],
            ['dreg', ['in', 'clk', 'out']],
            ['$memory', ['width=w', 'nlocations=nloc', 'options...']],
            {settings: primitiveSettings, term: ['C', ['id', 'n+', 'n-', 'capacitance']]},
            {settings: primitiveSettings, term: ['L', ['id', 'n+', 'n-', 'inductance']]},
            {settings: primitiveSettings, term: ['R', ['id', 'n+', 'n-', 'resistance']]},
            {settings: primitiveSettings, term: ['I', ['id', 'n+', 'n-', 'current']]},
            {settings: primitiveSettings, term: ['V', ['id', 'n+', 'n-', 'voltage']]},
            {settings: primitiveSettings, term: ['W', ['id', 'nodes...', 'fn', 'data...']]},
            {settings: primitiveSettings, term: ['P', ['id', 'drain', 'gate', 'source']]},
            {settings: primitiveSettings, term: ['N', ['id', 'drain', 'gate', 'source']]},
            {settings: primitiveSettings, term: ['O', ['id', 'n+', 'n-', 'output', 'a']]},
            {settings: keywordSettings, term: ['.connect', ['nodes...']]},
            {settings: keywordSettings, term: ['.dc', ['source1', 'start1', 'step2', 'source2', 'start2', 'stop2', 'step2']]},
            {settings: keywordSettings, term: ['.global', ['nodes...']]},
            {settings: keywordSettings, term: ['.include', ['filename']]},
            {settings: keywordSettings, term: ['.option', ['option']]},
            {settings: keywordSettings, term: ['.plot', ['things...']]},
            {settings: keywordSettings, term: ['.plotdef', ['name', 'labels...']]},
            {settings: keywordSettings, term: ['.subckt', ['name', 'nodes...']]},
            {settings: keywordSettings, term: ['.temp', ['temperature']]},
            {settings: keywordSettings, term: ['.tran', ['time']]},
            {settings: fnSettings, term: ['nrz', ['vlow', 'vhigh', 'tperiod', 'tdelay', 'trise', 'tfall']]},
            {settings: fnSettings, term: ['pulse', ['vA', 'vB', 'tdelay', 'tAtoB', 'tstable']]},
            {settings: fnSettings, term: ['pwl', ['t1', 'v1', 't2', 'v2...']]}
        ]
    };
})();
