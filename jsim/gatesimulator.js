var GateSimulator = (function(){
    function simulate(text, filename, div, error_callback){
        // input string, filename, callback
        Parser.parse(text, filename, function(data){console.log("netlist:",data.netlist)},
                     error_callback,true);
    }
    
    return {simulate:simulate}
}());