var GateSimulator = (function(){
    var mDiv;
    var mAnalyses;
    var mOptions;
    var mPlotDefs;
    
    function simulate(text, filename, div, error_callback){
        // input string, filename, callback
        Parser.parse(text, filename, function(data){run_simulation(data,div);},
                     error_callback,true);
    }
    
    function run_simulation(parsed,div){
        mDiv = div;
        
        var netlist = parsed.netlist;
        var plots = parsed.plots;
        mAnalyses = parsed.analyses;
        mOptions = parsed.options;
        mPlotDefs = parsed.plotdefs;
        
        if (netlist.length === 0) {
            div.prepend('<div class="alert alert-danger"> Empty netlist.'+
                        '\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        if (mAnalyses.length === 0) {
            div.prepend('<div class="alert alert-danger"> No analyses requested.'+
                        '\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        if (plots.length === 0) {
            div.prepend('<div class="alert alert-danger"> No plots requested.'+
                        '\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        
        var tranProgress = $('<div><span></span></br></div>');
        div.append(tranProgress);
        tranProgress.hide();
        var tranHalt = false;
        var haltButton = $('<button class="btn btn-danger">Halt</button>');
        haltButton.tooltip({title:'Halt Simulation',delay:100,container:'body'});
        haltButton.on("click",function(){
            tranHalt = true;
        });
        tranProgress.append(haltButton);
        
        try {
            mCurrent_analysis = mAnalyses[0];
            switch (mCurrent_analysis.type) {
                case 'tran':
                    tranProgress.show();
                    
                    var progressTxt = tranProgress.find('span');
                    try{
                        gatesim.transient_analysis(netlist, mCurrent_analysis.parameters.tstop,
                                                  [], function(pct_complete, results) {
                            progressTxt.text("Performing Transient Analysis... "+pct_complete+"%");
                            if (results){
                                tranProgress.hide();
                                mCurrent_results = results;
//                                $('#results').data("current",results);
                                Checkoff.setResults(mCurrent_results);
                                
                                try{
                                    prepare_tran_data(plots);
                                } catch (err) {
                                    tranProgress.hide();
                                    div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                                '.\<button class="close" data-dismiss="alert">&times;'+
                                                '</button></div>');
                                }
                            }
                            return tranHalt;
                        }, mOptions);
                    } catch (err) {
                        tranProgress.hide();
                        div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                    '.\<button class="close" data-dismiss="alert">&times;</button></div>');
                    }
                    break;
                    
                case 'ac':
                    div.prepend('<div class="alert alert-danger">No AC analysis in gate-level simulation.'+
                                '\<button class="close" data-dismiss="alert">&times;</button></div>');
                    break;
                    
                case 'dc':
                    div.prepend('<div class="alert alert-danger">No DC analysis in gate-level simulation.'+
                                '\<button class="close" data-dismiss="alert">&times;</button></div>');
                    break;
            }
        } catch (err) {
            throw new Parser.CustomError(err,mCurrent_analysis.token);
        }
        // Note: multiple nodes in one plot statement should always be graphed as L(blah) in gatelevel!
    }
    
    return {simulate:simulate}
}());