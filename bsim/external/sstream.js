// This object taken from CodeMirror.

// STRING STREAM

// Fed to the mode parsers, provides helper functions to make
// parsers more succinct.

// The character stream used by a mode's parser.
function StringStream(string) {
    this.pos = this.start = 0;
    this.string = string;
}

StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == 0;},
    peek: function() {return this.string.charAt(this.pos) || undefined;},
    next: function() {
        if (this.pos < this.string.length)
            return this.string.charAt(this.pos++);
    },
    eat: function(match) {
        var ch = this.string.charAt(this.pos);
        if (typeof match == "string") var ok = ch == match;
        else var ok = ch && (match.test ? match.test(ch) : match(ch));
        if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
        var start = this.pos;
        while (this.eat(match)){}
        return this.pos > start;
    },
    eatSpace: function() {
        var start = this.pos;
        while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
        return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
        var found = this.string.indexOf(ch, this.pos);
        if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    match: function(pattern, consume, caseInsensitive) {
        if (typeof pattern == "string") {
            var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
            var substr = this.string.substr(this.pos, pattern.length);
            if (cased(substr) == cased(pattern)) {
                if (consume !== false) this.pos += pattern.length;
                return true;
            }
        } else {
            var match = this.string.slice(this.pos).match(pattern);
            if (match && match.index > 0) return null;
            if (match && consume !== false) this.pos += match[0].length;
            return match;
        }
    },
    current: function(){return this.string.slice(this.start, this.pos);}
};