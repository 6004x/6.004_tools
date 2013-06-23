var BSim = {};

$(function() {
    var beta = new BSim.Beta(8192); // 8kB = 2 thousand words
    beta.loadBytes(moo);

    $('.regfile').each(function() {
        new BSim.RegfileView(this, beta);
    });

    $('.program-controls').each(function() {
        new BSim.Controls(this, beta);
    });

    $('.tty').each(function() {
        new BSim.TTY(this, beta);
    });

    $('.disassembly').each(function() {
        new BSim.DisassebledView(this, beta);
    });

    window.beta = beta;
});