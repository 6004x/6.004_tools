BSim.Beta.Mnemonics = {
    ADD: 0x20,
    ADDC: 0x30,
    AND: 0x28,
    ANDC: 0x38,
    BEQ: 0x1C,
    BNE: 0x1D,
    CMPEQ: 0x24,
    CMPEQC: 0x34,
    CMPLE: 0x26,
    CMPLEC: 0x36,
    CMPLT: 0x25,
    CMPLTC: 0x35,
    DIV: 0x23,
    DIVC: 0x33,
    JMP: 0x1B,
    LD: 0x18,
    LDR: 0x1F,
    MUL: 0x22,
    MULC: 0x32,
    OR: 0x29,
    ORC: 0x39,
    SHL: 0x2C,
    SHLC: 0x3C,
    SHR: 0x2D,
    SHRC: 0x3D,
    SRA: 0x2E,
    SRAC: 0x3E,
    SUB: 0x21,
    SUBC: 0x31,
    ST: 0x19,
    XOR: 0x2A,
    XORC: 0x3A,
    XNOR: 0x2B,
    XNORC: 0x3B
}

BSim.Beta.Instructions = {};

(function() {
    var M = BSim.Beta.Mnemonics;
    var I = BSim.Beta.Instructions;
    I[M.ADD] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) + this.readRegister(b));
    };

    I[M.ADDC] = function(a, c, literal) {
        console.log("ADDC(" + a + ", " + literal + ", " + c + ")");
        console.log(this, a, c, literal);
        this.writeRegister(c, this.readRegister(a) + literal);
    };

    I[M.AND] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) & this.readRegister(b));
    };

    I[M.ANDC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) & literal);
    };

    I[M.BEQ] = function(a, c, literal) {
        if(this.readRegister(a) === 0) {
            this.setPC(this.getPC() + 4*literal, false);
        }
    };

    I[M.BNE] = function(a, c, literal) {
        if(this.readRegister(a) !== 0) {
            this.setPC(this.getPC() + 4*literal, false);
        }
    };

    I[M.CMPEQ] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) == this.readRegister(b));
    };

    I[M.CMPEQC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) == literal);
    };

    I[M.CMPLE] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) <= this.readRegister(b));
    };

    I[M.CMPLEC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) <= literal);
    };

    I[M.CMPLT] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) < this.readRegister(b));
    };

    I[M.CMPLTC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) < literal);
    };

    I[M.DIV] = function(a, b, c) {
        this.writeRegister(c, (this.readRegister(a) / this.readRegister(b))|0);
    };

    I[M.DIVC] = function(a, c, literal) {
        this.writeRegister(c, (this.readRegister(c) / literal)|0);
    };

    I[M.JMP] = function(a, c) {
        this.writeRegister(c, this.getPC());
        this.setPC(this.readRegister(a));
    };

    I[M.LD] = function(a, c, literal) {
        this.writeRegister(c, this.readWord(this.readRegister(a) + literal));
    };

    I[M.LDR] = function(a, c, literal) {
        this.writeRegister(c, this.readWord(this.getPC() + 4*literal));
    };

    I[M.MUL] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) * this.readRegister(b));
    };

    I[M.MULC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) * literal);
    };

    I[M.OR] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) | this.readRegister(b));
    };

    I[M.ORC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) | literal);
    };

    I[M.SHL] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) << this.readRegister(b));
    };

    I[M.SHLC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) << literal);
    };

    I[M.SHR] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) >>> this.readRegister(b));
    };

    I[M.SHRC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) >>> literal);
    };

    I[M.SRA] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) >> this.readRegister(b));
    };

    I[M.SRAC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) >> literal);
    };

    I[M.SUB] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) - this.readRegister(b));
    };

    I[M.SUBC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) - literal);
    };

    I[M.ST] = function(a, c, literal) {
        this.writeWord(a + literal, c);
    };

    I[M.XOR] = function(a, b, c) {
        this.writeRegister(c, this.readRegister(a) ^ this.readRegister(b));
    };

    I[M.XORC] = function(a, c, literal) {
        this.writeRegister(c, this.readRegister(a) ^ literal);
    };

    I[M.XNOR] = function(a, b, c) {
        this.writeRegister(c, ~(this.readRegister(a) ^ this.readRegister(b)));
    };

    I[M.XNORC] = function(a, c, literal) {
        this.writeRegister(c, ~(this.readRegister(a) ^ literal));
    };
})();
