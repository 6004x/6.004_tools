// BSim.ProgramView = function() {
    // Just for now...
    var code = moo; //[0x02, 0x00, 0x3f, 0xc0, 0x02, 0x00, 0x5f, 0xc0, 0x00, 0x10, 0x61, 0x80, 0x00, 0x18, 0x82, 0x94, 0x01, 0x00, 0xe4, 0x77, 0xf4, 0x01, 0x3f, 0xc0, 0x01, 0x00, 0xa5, 0xc0, 0x18, 0x00, 0x5f, 0xc1, 0x00, 0x00, 0xea, 0x6f];

    var beta = new BSim.Beta(4096);
    beta.loadBytes(code);

    var running = false;
    var run = function() {
        if(!running) return;
        for(var i = 0; i < 10000; ++i) {
            beta.runCycle();
        }
        step_forward();
        setTimeout(run, 1);
    }

    var step_forward = function() {
        beta.runCycle();
        $('#registers .value').each(function() {
            var reg = $(this).data('register');
            $(this).text(display_word(beta.readRegister(reg)));
        });
        $('#pc').text(display_word(beta.getPC()));
    }

    var display_word = function(value) {
        // Fix up negative numbers
        if (value < 0)
        {
            value = 0xFFFFFFFF + value + 1;
        }
        var s = value.toString(16);
        while(s.length < 8) s = "0" + s;
        return s;
    }

    $(function() {
        $('#step-forward').click(step_forward);
        $('#run-toggle').click(function() {
            if(running) {
                running = false;
            } else {
                running = true;
                run();
            }
        });
    });
// };
