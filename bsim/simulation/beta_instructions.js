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
 * paths: dictionary of signal values that the opcode should trigger. If omitted, default is determined by
 *        the value of has_literal and alufn must be provided.
 * alufn: Used when paths is omitted to provide a sane default. (mandatory iff paths is omitted)
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
        if(!op.paths) {
            var alufn = op.alufn || null;
            if(op.has_literal) {
                op.paths = {
                    alufn: alufn,
                    werf: 1,
                    bsel: 1,
                    wdsel: 1,
                    wr: 0,
                    pcsel: 0,
                    asel: 0,
                    wasel: 0
                };
            } else {
                op.paths = {
                    alufn: alufn,
                    werf: 1,
                    bsel: 0,
                    wdsel: 1,
                    wr: 0,
                    ra2sel: 0,
                    pcsel: 0,
                    asel: 0,
                    wasel: 0
                };
            }
        }
        var signals = ['alufn','werf','bsel','wdsel','wr','ra2sel','pcsel','asel','wasel'];
        _.each(signals, function(signal) {
            if(op.paths[signal] === undefined) {
                op.paths[signal] = null;
            }
        });
        // Insert it into useful places.
        BSim.Beta.Opcodes[op.opcode] = op;
    };

    betaop({
        opcode: 0x20,
        name: 'ADD',
        alufn: '+',
        exec: function ADD(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) + this.realReadRegister(b));
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
        alufn: '+',
        exec: function ADDC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) + literal);
        },
        disassemble: function(op) {
            if(op.ra == 31) return "CMOVE(" + op.literal + ", " + name_register(op.rc) + ")";
            else return "ADDC(" + name_register(op.ra) + ", " + op.literal + ", " + name_register(op.rc) + ")";
        }
    });

    betaop({
        opcode: 0x28,
        name: 'AND',
        alufn: '&',
        exec: function AND(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) & this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x38,
        name: 'ANDC',
        alufn: '&',
        has_literal: true,
        exec: function ANDC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) & literal);
        }
    });

    betaop({
        opcode: 0x1C,
        name: 'BEQ',
        paths: {
            werf: 1,
            wdsel: 0,
            wr: 0,
            pcsel: 'z',
            wasel: 0,
            z: true
        },
        has_literal: true,
        exec: function BEQ(a, literal, c) {
            var pc = this.getPC();
            if(this.realReadRegister(a) === 0) {
                this.setPC(pc + 4*literal, false);
            }
            this.realWriteRegister(c, pc);
        },
        disassemble: function(op, pc) {
            var target = ((op.literal * 4) + (pc + 4)) & ~0x80000000;
            var label = this.getLabel(target) || target;
            if(op.ra == 31) {
                if(op.rc == 31) {
                    return "BR(" + label + ")";
                } else {
                    return "BR(" + label + ", " + name_register(op.rc) + ")";
                }
            } else {
                return "BEQ(" + name_register(op.ra) + ", " + label + ", " + name_register(op.rc) + ")";
            }
        }
    });

    betaop({
        opcode: 0x1D,
        name: 'BNE',
        has_literal: true,
        paths: {
            werf: 1,
            wdsel: 0,
            wr: 0,
            pcsel: '~z',
            wasel: 0,
            z: true
        },
        exec: function BNE(a, literal, c) {
            var pc = this.getPC();
            if(this.realReadRegister(a) !== 0) {
                this.setPC(pc + 4*literal, false);
            }
            this.realWriteRegister(c, pc);
        },
        disassemble: function(op, pc) {
            var target = ((op.literal * 4) + (pc + 4)) & ~0x80000000;
            var label = this.getLabel(target) || target;
            return "BNE(" + name_register(op.ra) + ", " + label + ", " + name_register(op.rc) + ")";
        }
    });

    betaop({
        opcode: 0x24,
        name: 'CMPEQ',
        alufn: '=',
        exec: function CMPEQ(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) == this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x34,
        name: 'CMPEQC',
        has_literal: true,
        alufn: '=',
        exec: function CMPEQC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) == literal);
        }
    });

    betaop({
        opcode: 0x26,
        name: 'CMPLE',
        alufn: '<=',
        exec: function CMPLE(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) <= this.realReadRegister(b));
        }
    });

    betaop({
        opcode:  0x36,
        name: 'CMPLEC',
        alufn: '<=',
        has_literal: true,
        exec: function CMPLEC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) <= literal);
        }
    });

    betaop({
        opcode: 0x25,
        name: 'CMPLT',
        alufn: '<',
        exec: function CMPLT(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) < this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x35,
        name: 'CMPLTC',
        alufn: '<',
        has_literal: true,
        exec: function CMPLTC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) < literal);
        }
    });

    betaop({
        opcode: 0x23,
        name: 'DIV',
        alufn: '/',
        exec: function DIV(a, b, c) {
            if(!this.isOptionSet('div')) return this.handleIllegalInstruction();
            if(this.readRegister(b) === 0) {
                throw new BSim.Beta.RuntimeError("Division of " + this.readRegister(a) + " by zero");
            }
            this.realWriteRegister(c, (this.realReadRegister(a) / this.realReadRegister(b))|0);
        }
    });

    betaop({
        opcode: 0x33,
        name: 'DIVC',
        alufn: '/',
        has_literal: true,
        exec: function DIVC(a, literal, c) {
            if(!this.isOptionSet('div')) return this.handleIllegalInstruction();
            if(literal === 0) {
                throw new BSim.Beta.RuntimeError("Division of " + this.readRegister(a) + " by zero");
            }
            this.realWriteRegister(c, (this.realReadRegister(a) / literal)|0);
        }
    });

    betaop({
        opcode: 0x1B,
        name: 'JMP',
        paths: {
            werf: 1,
            wdsel: 0,
            wr: 0,
            pcsel: 2,
            wasel: 0
        },
        exec: function JMP(a, b, c) {
            this.realWriteRegister(c, this.getPC());
            this.setPC(this.realReadRegister(a));
        },
        disassemble: function(op) {
            if(op.rc == 31) return "JMP(" + name_register(op.ra) + ")";
            else return "JMP(" + name_register(op.ra) + ", " + name_register(op.rc) + ")";
        }
    });

    betaop({
        opcode: 0x18,
        name: 'LD',
        paths: {
            alufn: '+',
            werf: 1,
            bsel: 1,
            wdsel: 2,
            wr: 0,
            pcsel: 0,
            asel: 0,
            wasel: 0
        },
        has_literal: true,
        exec: function LD(a, literal, c) {
            this.realWriteRegister(c, this.readWord(this.realReadRegister(a) + literal, true));
        }
    });

    betaop({
        opcode: 0x1F,
        name: 'LDR',
        paths: {
            alufn: 'A',
            werf: 1,
            wdsel: 2,
            wr: 0,
            pcsel: 0,
            asel: 1,
            wasel: 0
        },
        has_literal: true,
        exec: function LDR(a, literal, c) {
            this.realWriteRegister(c, this.readWord(this.getPC() + 4*literal, true));
        },
        disassemble: function(op, pc) {
            var target = op.literal*4 + pc;
            var label = this.getLabel(target) || target;
            return "LDR(" + label + ", " + name_register(op.rc) + ")";
        }
    });

    betaop({
        opcode: 0x22,
        name: 'MUL',
        alufn: '*',
        exec: function MUL(a, b, c) {
            if(!this.isOptionSet('mul')) return this.handleIllegalInstruction();
            this.realWriteRegister(c, this.realReadRegister(a) * this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x32,
        name: 'MULC',
        alufn: '*',
        has_literal: true,
        exec: function MULC(a, literal, c) {
            if(!this.isOptionSet('mul')) return this.handleIllegalInstruction();
            this.realWriteRegister(c, this.realReadRegister(a) * literal);
        }
    });

    betaop({
        opcode: 0x29,
        name: 'OR',
        alufn: '|',
        exec: function OR(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) | this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x39,
        name: 'ORC',
        alufn: '|',
        has_literal: true,
        exec: function ORC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) | literal);
        }
    });

    betaop({
        opcode: 0x2C,
        name: 'SHL',
        alufn: '<<',
        exec: function SHL(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) << this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x3C,
        name: 'SHLC',
        alufn: '<<',
        has_literal: true,
        exec: function SHLC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) << literal);
        }
    });

    betaop({
        opcode: 0x2D,
        name: 'SHR',
        alufn: '>>>',
        exec: function SHR(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) >>> this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x3D,
        name: 'SHRC',
        alufn: '>>>',
        has_literal: true,
        exec: function SHRC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) >>> literal);
        }
    });

    betaop({
        opcode: 0x2E,
        name: 'SRA',
        alufn: '>>',
        exec: function SRA(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) >> this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x3E,
        name: 'SRAC',
        alufn: '>>',
        has_literal: true,
        exec: function SRAC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) >> literal);
        }
    });

    betaop({
        opcode: 0x21,
        name: 'SUB',
        alufn: '-',
        exec: function SUB(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) - this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x31,
        name: 'SUBC',
        alufn: '-',
        has_literal: true,
        exec: function SUBC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) - literal);
        }
    });

    betaop({
        opcode: 0x19,
        name: 'ST',
        paths: {
            alufn: '+',
            werf: 0,
            bsel: 1,
            wr: 1,
            ra2sel: 1,
            pcsel: 0,
            asel: 0
        },
        has_literal: true,
        exec: function ST(a, literal, c) {
            this.writeWord(this.realReadRegister(a) + literal, this.realReadRegister(c), true);
        }
    });

    betaop({
        opcode: 0x2A,
        name: 'XOR',
        alufn: '^',
        exec: function XOR(a, b, c) {
            this.realWriteRegister(c, this.realReadRegister(a) ^ this.realReadRegister(b));
        }
    });

    betaop({
        opcode: 0x3A,
        name: 'XORC',
        alufn: '^',
        has_literal: true,
        exec: function XORC(a, literal, c) {
            this.realWriteRegister(c, this.realReadRegister(a) ^ literal);
        }
    });

    betaop({
        opcode: 0x2B,
        name: 'XNOR',
        alufn: '~^',
        exec: function XNOR(a, b, c) {
            this.realWriteRegister(c, ~(this.realReadRegister(a) ^ this.realReadRegister(b)));
        }
    });

    betaop({
        opcode: 0x3B,
        name: 'XNORC',
        alufn: '~^',
        has_literal: true,
        exec: function XNORC(a, literal, c) {
            this.realWriteRegister(c, ~(this.realReadRegister(a) ^ literal));
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
                case 1: // RDCHAR
                    if(!this.isOptionSet('tty')) return this.handleIllegalInstruction();
                    if(this.mKeyboardInput === null) {
                        this.setPC(this.getPC() - 4); // loop
                    } else {
                        if(this.mKeyboardInput == 13) this.mKeyboardInput = 10; // Use the expected newline.
                        this.realWriteRegister(0, this.mKeyboardInput);
                        this.mKeyboardInput = null;
                    }
                    break;
                case 2: // WRCHAR
                    if(!this.isOptionSet('tty')) return this.handleIllegalInstruction();
                    var chr = String.fromCharCode(this.realReadRegister(a));
                    this.ttyOut(chr);
                    break;
                case 3: // CYCLE
                    this.realWriteRegister(0, this.getCycleCount());
                    break;
                case 4: // TIME
                    this.realWriteRegister(0, Date.now());
                    break;
                case 5: // MOUSE
                    if(!this.isOptionSet('tty')) return this.handleIllegalInstruction();
                    this.realWriteRegister(0, this.mMouseCoords);
                    this.mMouseCoords = -1;
                    break;
                case 6: // RANDOM
                    this.realWriteRegister(c, _.random(0xFFFFFFFF));
                    break;
                case 7: // SEED
                    throw new BSim.Beta.RuntimeError("SEED() is unimplemented. To implement, you must provide your own RNG (Math.random is unseedable)");
                case 8: // SERVER
                    this.mServerInfo.push(this.realReadRegister(0));
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
