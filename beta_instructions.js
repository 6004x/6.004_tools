BSim.Beta.Opcodes = {};

/*
 * betaop() takes one argument that should completely define an opcode.
 * It is an object with the following fields:
 *
 * opcode: numeric opcode (mandatory)
 * name: mnemonic for the opcode (mandatory)
 * exec: function that implements the opcode.
 *       Although it is redundant, do include the opcode name as an identifier. It shows in the profiler
 *       an back traces; if omitted you just get either 'exec' or '(anonymous function)'.
 * disassemble: returns a string giving the disassembly of the instruction (optional)
 * privileged: true if the opcode can only be used in supervisor mode (optional; default false)
 * has_literal: true if the opcode takes a literal instead of a register (optional; defualt false)
 */

// Build up our opcode table.
(function() {
    // Gives a register its best name
    var name_register = BSim.Common.RegisterName;

    // The generic dissasembly functions
    var generic_disassemble = function(op, a, b, c) {
        return op.name + "(" + name_register(a) + ", " + name_register(b) + ", " + name_register(c) + ")";
    };

    var generic_disassemblec = function(op, a, literal, c) {
        return op.name + "(" + name_register(a) + ", " + literal + ", " + name_register(c) + ")";
    };

    var betaop = function(op) {
        // Unify shorthand.
        if(!op.privileged) op.privileged = false;
        if(!op.has_literal) op.has_literal = false;
        if(!op.disassemble) {
            // op.disassemble = function() {return '';};
            if(!op.has_literal) {
                op.disassemble = function(decoded) {
                    return generic_disassemble(op, decoded.ra, decoded.rb, decoded.rc);
                };
            } else {
                op.disassemble = function(decoded) {
                    return generic_disassemblec(op, decoded.ra, decoded.literal, decoded.rc);
                };
            }
        }
        // Insert it into useful places.
        BSim.Beta.Opcodes[op.opcode] = op;
    };

    betaop({
        opcode: 0x20,
        name: 'ADD',
        exec: function ADD(a, b, c) {
            this.writeRegister(c, this.readRegister(a) + this.readRegister(b));
        },
        disassemble: function(op) {
            if(op.rb == 31) return "MOVE(" + name_register(op.ra) + ", " + name_register(op.rc) + ")";
            else return "ADD(" + name_register(op.ra) + ", " + name_register(op.rc) + ", " + name_register(op.rc) + ")";
        }
    });

    betaop({
        opcode: 0x30,
        name: 'ADDC',
        has_literal: true,
        exec: function ADDC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) + literal);
        },
        disassemble: function(op) {
            if(op.ra == 31) return "CMOVE(" + op.literal + ", " + name_register(op.rc) + ")";
            else return "ADDC(" + name_register(op.ra) + ", " + op.literal + ", " + name_register(op.rc) + ")";
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
        has_literal: true,
        exec: function ANDC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) & literal);
        }
    });

    betaop({
        opcode: 0x1C,
        name: 'BEQ',
        has_literal: true,
        exec: function BEQ(a, literal, c) {
            var pc = this.getPC();
            if(this.readRegister(a) === 0) {
                this.setPC(pc + 4*literal, false);
            }
            this.writeRegister(c, pc);
        }
    });

    betaop({
        opcode: 0x1D,
        name: 'BNE',
        has_literal: true,
        exec: function BNE(a, literal, c) {
            var pc = this.getPC();
            if(this.readRegister(a) !== 0) {
                this.setPC(pc + 4*literal, false);
            }
            this.writeRegister(c, pc);
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
        has_literal: true,
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
        has_literal: true,
        exec: function CMPLEC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) <= literal);
        }
    });

    betaop({
        opcode: 0x25,
        name: 'CMPLT',
        exec: function CMPLT(a, b, c) {
            this.writeRegister(c, this.readRegister(a) < this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x35,
        name: 'CMPLTC',
        has_literal: true,
        exec: function CMPLTC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) < literal);
        }
    });

    betaop({
        opcode: 0x23,
        name: 'DIV',
        exec: function DIV(a, b, c) {
            this.writeRegister(c, (this.readRegister(a) / this.readRegister(b))|0);
        }
    });

    betaop({
        opcode: 0x33,
        name: 'DIVC',
        has_literal: true,
        exec: function DIVC(a, literal, c) {
            this.writeRegister(c, (this.readRegister(a) / literal)|0);
        }
    });

    betaop({
        opcode: 0x1B,
        name: 'JMP',
        exec: function JMP(a, b, c) {
            this.writeRegister(c, this.getPC());
            this.setPC(this.readRegister(a));
        },
        disassemble: function(op) {
            if(op.rc == 31) return "JMP(" + name_register(op.ra) + ")";
            else return "JMP(" + name_register(op.ra) + ", " + name_register(op.rc) + ")";
        }
    });

    betaop({
        opcode: 0x18,
        name: 'LD',
        has_literal: true,
        exec: function LD(a, literal, c) {
            this.writeRegister(c, this.readWord(this.readRegister(a) + literal));
        }
    });

    betaop({
        opcode: 0x1F,
        name: 'LDR',
        has_literal: true,
        exec: function LDR(a, literal, c) {
            this.writeRegister(c, this.readWord(this.getPC() + 4*literal));
        }
    });

    betaop({
        opcode: 0x22,
        name: 'MUL',
        exec: function MUL(a, b, c) {
            this.writeRegister(c, this.readRegister(a) * this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x32,
        name: 'MULC',
        has_literal: true,
        exec: function MULC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) * literal);
        }
    });

    betaop({
        opcode: 0x29,
        name: 'OR',
        exec: function OR(a, b, c) {
            this.writeRegister(c, this.readRegister(a) | this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x39,
        name: 'ORC',
        has_literal: true,
        exec: function ORC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) | literal);
        }
    });

    betaop({
        opcode: 0x2C,
        name: 'SHL',
        exec: function SHL(a, b, c) {
            this.writeRegister(c, this.readRegister(a) << this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3C,
        name: 'SHLC',
        has_literal: true,
        exec: function SHLC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) << literal);
        }
    });

    betaop({
        opcode: 0x2D,
        name: 'SHR',
        exec: function SHR(a, b, c) {
            this.writeRegister(c, this.readRegister(a) >>> this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3D,
        name: 'SHRC',
        has_literal: true,
        exec: function SHRC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) >>> literal);
        }
    });

    betaop({
        opcode: 0x2E,
        name: 'SRA',
        exec: function SRA(a, b, c) {
            this.writeRegister(c, this.readRegister(a) >> this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3E,
        name: 'SRAC',
        has_literal: true,
        exec: function SRAC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) >> literal);
        }
    });

    betaop({
        opcode: 0x21,
        name: 'SUB',
        exec: function SUB(a, b, c) {
            this.writeRegister(c, this.readRegister(a) - this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x31,
        name: 'SUBC',
        has_literal: true,
        exec: function SUBC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) - literal);
        }
    });

    betaop({
        opcode: 0x19,
        name: 'ST',
        has_literal: true,
        exec: function ST(a, literal, c) {
            this.writeWord(this.readRegister(a) + literal, this.readRegister(c));
        }
    });

    betaop({
        opcode: 0x2A,
        name: 'XOR',
        exec: function XOR(a, b, c) {
            this.writeRegister(c, this.readRegister(a) ^ this.readRegister(b));
        }
    });

    betaop({
        opcode: 0x3A,
        name: 'XORC',
        has_literal: true,
        exec: function XORC(a, literal, c) {
            this.writeRegister(c, this.readRegister(a) ^ literal);
        }
    });

    betaop({
        opcode: 0x2B,
        name: 'XNOR',
        exec: function XNOR(a, b, c) {
            this.writeRegister(c, ~(this.readRegister(a) ^ this.readRegister(b)));
        }
    });

    betaop({
        opcode: 0x3B,
        name: 'XNORC',
        exec: function XNORC(a, b, c) {
            this.writeRegister(c, ~(this.readRegister(a) ^ literal));
        }
    });

    // Privileged instructions
    betaop({
        opcode: 0x00,
        name: 'PRIV_OP',
        has_literal: true,
        privileged: true,
        exec: function PRIV_OP(a, literal, c) {
            switch(literal) {
                case 0: // HALT
                    return false;
                case 2: // WRCHAR
                    this.trigger('out:text', String.fromCharCode(this.readRegister(a)));
                    break;
                case 6: // RANDOM
                    this.writeRegister(c, _.random(0xFFFFFFFF));
                    break;
                default:
                    return this.handleIllegalInstruction();
            }
        },
        disassemble: function(op) {
            var ops = ["HALT()", "RDCHAR()", "WRCHAR()", "CYCLE()", "TIME()", "CLICK()", "RANDOM()", "SEED()", "SERVER()"];
            if(op.literal >= 0 && op.literal < ops.length) return ops[op.literal];
            else return "illop";
        }
    });
})();
