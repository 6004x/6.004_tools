var BSim = {};

$(function() {
    var beta = new BSim.Beta(10240); // 10kB = 2.5 thousand words
    //beta.loadBytes(lab8);

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

    // Convenient way of loading a file for testing and such.
    var neuter = function(e) {
        e.stopPropagation();
        e.preventDefault();
    };
    $('body').on('dragenter', neuter);
    $('body').on('dragover', neuter);
    $('body').on('drop', function(e) {
        neuter(e);
        console.log(e);
        var dt = e.originalEvent.dataTransfer;
        var files = dt.files;

        if(files.length === 0) return;
        var file = files[0];
        beta.stop(); // Just in case.
        var reader = new FileReader();
        reader.onload = function(e) {
            console.log(e);
            //beta = new BSim.Beta(e.target.result.length);
            var result = new Uint8Array(e.target.result);
            beta.loadBytes(result);
            console.log("Loaded", result.length, "bytes");
        };
        reader.readAsArrayBuffer(file);
    });

    // For debugging
    window.beta = beta;
});
