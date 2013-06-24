var BSim = {};

$(function() {
    var beta = new BSim.Beta(10240); // 10kB = 2.5 thousand words
    beta.loadBytes(lab8);
    window.beta = beta;

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