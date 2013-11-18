var Mentoring = Mentoring || {};
(function() {
    Mentoring.BSimSync = {};

    Mentoring.BSimSync.Student = function(session, beta) {
        var mSession = session;
        var mBeta = beta;

        var init = function() {
            mBeta.on('all', handle_bsim_event);
        };

        var handle_bsim_event = function() {
            var args = Array.prototype.slice.call(arguments);
            console.log(args);
            mSession.getChannel().sendMessage({
                kind: 'bsim_event',
                args: args
            });
        };

        init();
    };

    Mentoring.BSimSync.Mentor = function() {
        var mSession;
        var mBeta = new RemoteBeta();

        this.setSession = function(session) {
            mSession = session;
            mSession.on('bsim_event', handle_bsim_event);
        };

        var handle_bsim_event = function(message) {
            console.log("Remote beta event", message);
            var args = message.args;
            mBeta.trigger.apply(mBeta, args);
        };

        this.getRemoteBeta = function() {
            return mBeta;
        };
    };

    var RemoteBeta = function() {
        var self = this;
        var mMemory = new BSim.Beta.Memory();
        var mRegisters = new Int32Array(32);
        var mLabels = {};

        _.extend(this, Backbone.Events);

        var init = function() {
            self.on('change:register', update_register);
            self.on('change:bulk:register', bulk_update_registers);
            self.on('change:word', change_word);
            self.on('change:bulk:word', bulk_change_words);
            self.on('resize:memory', resize_memory);
            self.on('change:bulk:labels', change_labels);
        };

        var update_register = function(register, value) {
            mRegisters[register] = value;
        };

        var bulk_update_registers = function(registers) {
            for(var register in registers) {
                update_register(register, registers[register]);
            }
        };

        var change_word = function(address, value) {
            mMemory.writeWord(address, value);
        };

        var bulk_change_words = function(words) {
            for(var word in words) {
                change_word(word, words[word]);
            }
        };

        var change_labels = function(labels) {
            mLabels = labels;
        };

        var resize_memory = function(size) {
            console.log('resize memory');
            mMemory.loadBytes(new Uint8Array(size));
        };

        this.readWord = function(address) {
            return mMemory.readWord(address);
        };

        this.readRegister = function(register) {
            return mRegisters[register];
        };

        this.signExtend16 = function(value) {
            value &= 0xFFFF;
            if(value & 0x8000) {
                value = value - 0x10000;
            }
            return value;
        };

        this.isOptionSet = function() {
            return false;
        };

        this.getLabel = function(address) {
            return mLabels[address & ~0x80000000] || null;
        };

        this.decodeInstruction = function(instruction) {
            var opcode = (instruction >> 26) & 0x3F;
            var rc = (instruction >> 21) & 0x1F;
            var ra = (instruction >> 16) & 0x1F;
            var rb = (instruction >> 11) & 0x1F;
            var literal = this.signExtend16(instruction & 0xFFFF);

            return {
                opcode: opcode,
                ra: ra,
                rb: rb,
                rc: rc,
                literal: literal
            };
        };

        init();
    };
})();
