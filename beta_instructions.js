BSim.Beta.Opcodes = {};

// Build up our opcode table.
(function() {
    var betaop = function(op) {
        // Unify shorthand.
        if(!op.privileged) op.privileged = false;
        // Insert it into useful places.
        BSim.Beta.Opcodes[op.opcode] = op;
    };

    betaop({
        opcode: 0x20,
        name: 'ADD',
        exec: function ADD(a, b, c) {
            this.writeRegister(c, this.readRegister(a) + this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x30,
        name: 'ADDC',
        exec: function ADDC(a, literal, c) {
            console.log("ADDC(" + a + ", " + literal + ", " + c + ")");
            console.log(this, a, c, literal);
            this.writeRegister(c, this.readRegister(a) + literal);
        }
    });

    betaop({
        opcode: 0x28,
        name: 'AND',
        exec: function AND(a, b, c) {
            this.writeRegister(c, this.readRegister(a) & this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x38,
        name: 'ANDC',
        exec: function ANDC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) & literal);
        }
    });

    betaop({
        opcode: 0x1C,
        name: 'BEQ',
        exec: function BEQ(a, literal, c) {
            if(this.readRegister(a) === 0) {
                this.setPC(this.getPC() + 4*literal, false);
            }
        }
    });

    betaop({
        opcode: 0x1D,
        name: 'BNE',
        exec: function BNE(a, literal, c) {
            if(this.readRegister(a) !== 0) {
                this.setPC(this.getPC() + 4*literal, false);
            }
        }
    });

    betaop({
        opcode: 0x24,
        name: 'CMPEQ',
        exec: function CMPEQ(a, b, c) {
            this.writeRegister(c, this.readRegister(a) == this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x34,
        name: 'CMPEQC',
        exec: function CMPEQC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) == literal);
        }
    });

    betaop({
        opcode: 0x26,
        name: 'CMPLE',
        exec: function CMPLE(a, b, c) {
            this.writeRegister(c, this.readRegister(a) <= this.readRegister(b));
        }
    });

    betaop({
        opcode:  0x36,
        name: 'CMPLEC',
        exec: function CMPLEC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) <= literal);
        }
    });

    betaop({
        opcode: 0x25,
        name: 'CMPLT',
        exec: function CMPLT(a, b, c) {
            this.writeRegister(c, this.readRegister(b) < this.readRegister(a));
        }
    });

    betaop({
        opcode: 0x35,
        name: 'CMPLTC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) < literal);
        }
    });

    betaop({
        opcode: 0x23,
        name: 'DIV',
        exec: function(a, b, c) {
            this.writeRegister(c, (this.readRegister(a) / this.readRegister(b))|0);
        }
    });

    betaop({
        opcode: 0x33,
        name: 'DIVC',
        exec: function(a, literal, c) {
            this.writeRegister(c, (this.readRegister(c) / literal)|0);
        }
    });

    betaop({
        opcode: 0x1B,
        name: 'JMP',
        exec: function(a, b, c) {
            this.writeRegister(c, this.getPC());
            this.setPC(this.readRegister(a));
        }
    });

    betaop({
        opcode: 0x18,
        name: 'LD',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readWord(this.readRegister(a) + literal));
        }
    });

    betaop({
        opcode: 0x1F,
        name: 'LDR',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readWord(this.getPC() + 4*literal));
        }
    });

    betaop({
        opcode: 0x22,
        name: 'MUL',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) * this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x32,
        name: 'MULC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) * literal);
        }
    });

    betaop({
        opcode: 0x29,
        name: 'OR',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) | this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x39,
        name: 'ORC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) | literal);
        }
    });

    betaop({
        opcode: 0x2C,
        name: 'SHL',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) << this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3C,
        name: 'SHLC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) << literal);
        }
    });

    betaop({
        opcode: 0x2D,
        name: 'SHR',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) >>> this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3D,
        name: 'SHRC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) >>> literal);
        }
    });

    betaop({
        opcode: 0x2E,
        name: 'SRA',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) >> this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3E,
        name: 'SRAC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) >> literal);
        }
    });

    betaop({
        opcode: 0x21,
        name: 'SUB',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) - this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x31,
        name: 'SUBC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) - literal);
        }
    });

    betaop({
        opcode: 0x19,
        name: 'ST',
        exec: function(a, literal, c) {
            this.writeWord(a + literal, c);
        }
    });

    betaop({
        opcode: 0x2A,
        name: 'XOR',
        exec: function(a, b, c) {
            this.writeRegister(c, this.readRegister(a) ^ this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3A,
        name: 'XORC',
        exec: function(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) ^ literal);
        }
    });

    betaop({
        opcode: 0x2B,
        name: 'XNOR',
        exec: function(a, b, c) {
            this.writeRegister(c, ~(this.readRegister(a) ^ this.readRegister(b)));
        }
    });

    betaop({
        opcode: 0x3B,
        name: 'XNORC',
        exec: function(a, b, c) {
            this.writeRegister(c, ~(this.readRegister(a) ^ literal));
        }
    });
})();
