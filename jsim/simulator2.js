var Simulator = (function(){
    var mAnalyses;
    var mCurrent_analysis;
    var mCurrent_results;
    var mPlotDefs;
    var mDiv;
    var mAllPlots = [];
    var mOptions;
    
    /********************
    Called when the device-level simulation button is pressed
    ********************/
    function simulate(text, filename, div, error_callback){
        // input string, filename, callback
        Parser.parse(text, filename, function(data){run_simulation(data,div);},
                     error_callback, true); // reset = true
    }
    
    /*********************
    Run simulation: Take parsed data and extract all the useful bits, then run the simulation
    *********************/
    function run_simulation(parsed,div) {
        div.empty();  // we'll fill this with results
        mDiv = div;
//        $('#graphScrollInner').width($('#graphScrollOuter').width());
        
        var netlist = parsed.netlist;
        var plots = parsed.plots;
        mAnalyses = parsed.analyses;
        mOptions = parsed.options;
        mPlotDefs = parsed.plotdefs;
        
//        mAllPlots = [];
        
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
        
//        if (plots.length >= 4){
//            compactPlot = true;
//        } else {
//            compactPlot = false;
//        }
        
        // set up the progress indicator and halt button for transient analysis
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
        
        // run the simulation and prepare data
        try {
//            $('#addPlotButton').data('button').enable();
            
            mCurrent_analysis = mAnalyses[0];
            switch (mCurrent_analysis.type) {
                case 'tran':
                    tranProgress.show();
                    
                    var progressTxt = tranProgress.find('span');
                    try{
                        cktsim.transient_analysis(netlist, mCurrent_analysis.parameters.tstop,
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
                    try {
                        mCurrent_results = cktsim.ac_analysis(netlist, mCurrent_analysis.parameters.fstart,
                                                         mCurrent_analysis.parameters.fstop,
                                                         mCurrent_analysis.parameters.ac_source_name,
                                                         mOptions);
//                        $('#results').data("current",mCurrent_results);
                        Checkoff.setResults(mCurrent_results);
                        
                        prepare_ac_data(plots);
                    } catch (err) {
                        div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                    '.\<button class="close" data-dismiss="alert">&times;</button></div>');
                    }
                    break;
                    
                case 'dc':
                    try {
                        mCurrent_results = cktsim.dc_analysis(netlist,mCurrent_analysis.parameters.sweep1,
                                                             mCurrent_analysis.parameters.sweep2,
                                                             mOptions);
                        Checkoff.setResults(mCurrent_results);
                        
                        prepare_dc_data(plots);
                    } catch (err) {
                        div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                    '.\<button class="close" data-dismiss="alert">&times;</button></div>');
                    }
    //                console.log("dc results:",mCurrent_results);
                    break;
            }
        }
        catch (err) {
            throw new Parser.CustomError(err,mCurrent_analysis.token);
        }
    }
    
    /*********************
    Helper functions
    *********************/
    
    // returns an alert when there are no values to plot for a node
    function get_novaldiv(node){
        var div = $('<div class="alert alert-danger">No values to plot for node '+node+
                    '<button class="close" type="button" data-dismiss="alert">&times;\
</button></div>');
        return div;
    }
    
    // adds a button to the given div that hides the plot and removes it from the list of plots
    function addCloseBtn(div){
        var closeBtn = $('<button class="close plot-close">&times;</button>');
        closeBtn.on("click",function(){
            div.hide();
            allPlots.splice(allPlots.indexOf(div.find('.placeholder').data("plot")),1);
        });
        div.prepend(closeBtn);
    }
    
    // returns a generic plot placeholder div
    function get_plotdiv(){
        var minHeight = 100;
//        if (compactPlot){
//            minHeight = 80;
//        } else {
//            minHeight = 130;
//        }
        return $('<div class="placeholder" style="width:100%;height:90%;min-height:'+
                 minHeight+'px"></div>');
    }
    
    // return "0", "1", or "X" based on the given thresholds, or default if none.
    function logic(value, vil, vih){
        if (!vil) vil = 0.6;
        if (!vih) vih = 2.7;
//        console.log("vil:",vil,"vih:",vih);
        
        if (value < vil) return "0";
        else if (value > vih) return "1";
        else return "X";
    }
    
    // turn a sequence of numbers into the hex value that represents each number's logic value in sequence
    function hex_logic(values, vil, vih){
        for (var v = 0; v < values.length; v += 1){
            values[v] = logic(values[v], vil, vih);
        }
        
        var new_vals = [];
        // break into fours from the right end, since one hex digit is four binary digits
        while (values.length > 0){
            new_vals.unshift(values.splice(-4,4));
        }
        
        for (var i = 0; i < new_vals.length; i += 1){
            // if any of the four digits is invalid, the current hex digit is invalid
            if (new_vals[i].indexOf("X") != -1) {
                new_vals[i] = "X";
            } else {
                var digit = new_vals[i].join('');
                digit = parseInt(digit,2).toString(16);
                new_vals[i] = digit;
            }
        }
        
        return "0x"+new_vals.join('').toUpperCase();
    }
    
    /***********************
    Prepare data functions
    ************************/
    
    /***************
    Transient analysis
    ***************/
    function prepare_tran_data(plots){
        var results = mCurrent_results;
        
        // this should never come up because this function is only called if results are defined
//        if (results === undefined) {
//            div.prepend('<div class="alert alert-danger">No results from the simulation.'+
//                        '\<button class="close" data-dismiss="alert">&times;</button></div>');
//            return;
//        }
        
        // repeat for every set of plots
        for (var p = 0; p < plots.length; p += 1) {
            var plot_nodes = plots[p]; // the set of nodes that belong on one pair of axes
            var dataseries = []; // 'dataseries' is the list of objects that represent the 
                                 // data for the above set of nodes
            
//            if (p == 0){
//                dataseries.push({
//                    label: 'time',
//                    data: results._time_.map(function(val){return [val,val]}),
//                    yUnits: 's',
//                    color: 'rgba(0,0,0,0)'
//                });
//            }
            
            // repeat for each node
            for (var i = 0; i < plot_nodes.length; i += 1) {
                var node = plot_nodes[i];
                
                var values = [];
                
                // check of it's a function, e.g. if something like L() or betaop() was asked for
                var fn_pttn = /([^\(]+)\((.+)\)$/;
                var matched_array = node.match(fn_pttn);
                if (matched_array){
                    var fn_name = matched_array[1];
                    var arg_nodes = matched_array[2].split(/[,\s]\s*/);
                    
                    console.log('fn:',fn_name,"args:",arg_nodes);
                    
                    if (fn_name == 'I'){
                        // continue on
                        values = results[node];
                    } else {
                        if (fn_name.toUpperCase() != 'L' && !(fn_name in mPlotDefs)) {
                            throw "No definition for plot function "+fn_name;
                        } 
                        values = results[arg_nodes[0]].slice(0);
                        values = values.map(function(val,index){
                            var tempval = [];
                            for (var j = 0; j < arg_nodes.length; j += 1){
                                tempval.push(results[arg_nodes[j]][index]);
                            }
                            var lval = hex_logic(tempval, mOptions.vil, mOptions.vih);
                            
                            if (fn_name == "L") {
                                return lval;
                            } else {
                                // look up the definition of the plot function and return the
                                // appropriate string; if the index is out of range return "???"
                                var nval = parseInt(lval,16);
                                if (mPlotDefs[fn_name][nval]) return mPlotDefs[fn_name][nval];
                                else return "???";
                            }
                        });
                        
                        
                        
                    }
                } else {
                    // if no function was asked for, just get node values
                    values = results[node];
                }
                
                // no values to plot for any given node
                if (values === undefined) {
                    var novaldiv = get_novaldiv(node);
                    mDiv.prepend(novaldiv);
                    continue;
                }
                
                var plotdata = [];
                for (var j = 0; j < values.length; j += 1) {
                    plotdata.push([results._time_[j], values[j]]);
                }
                
                // boolean that records if the analysis asked for current through a node
                var current = (node.length > 2 && node[0]=='I' && node[1]=='(');
                
                /***************************** series object ************************************/
                // add a series object to 'dataseries'
                dataseries.push({
                    label: node,
                    data: plotdata,
                    xUnits: 's',
                    yUnits: current ? 'A' : 'V'
                });
                /***************************** series object ************************************/
            }
            
            if (dataseries.length == 0) {
                continue;
            }
            
            var xmin = results._time_[0];
            var xmax = results._time_[plotdata.length-1];
            
//            // prepare a div
//            var wdiv = $('<div class="plot-wrapper"></div>');
//            addCloseBtn(wdiv);
//            if (compactPlot){
//                wdiv.css("margin-bottom",'-10px');
//            }
//            var ldiv;
//            if (compactPlot){
//                ldiv = $('<div class="plot-legend"></div>');
//                wdiv.append(ldiv);
//            }
//            var plotdiv = get_plotdiv();
//            wdiv.append(plotdiv);
//            div.append(wdiv);
            
            /************************ Plot function **********************************/
            tran_plot(dataseries /* ... */); 
            /************************ Plot function **********************************/
            
//            // customize options
//            var options = $.extend(true,{},default_options);
//            if (compactPlot) {
//                options.xaxis.font = {color:'rgba(0,0,0,0)',
//                                      size:1
//                                     }
//                options.yaxis.font = {color:'rgba(0,0,0,0)',
//                                      size:1
//                                     }
//            } else {
//                options.yaxis.axisLabel = current ? 'Amps (A)' : 'Volts (V)';
//            }
//            options.xaxis.zoomRange = [null, (xmax-xmin)];
//            options.xaxis.panRange = [xmin, xmax];
//            
//            options.xaxis.units = 's';
//            options.yaxis.units = current? 'A' : 'V';
//            
//        
//            // graph the data
//            var plotObj = $.plot(plotdiv,dataseries,options);
//            graph_setup(wdiv,plotObj);
        }
    }
    
    /***************
    AC analysis
    ***************/
    function prepare_ac_data(plots) {
        var results = mCurrent_results;
        
        if (results === undefined) {
            div.prepend('<div class="alert alert-danger">No results from the simulation.'+
                        '.\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        
        // repeated for each set of nodes
        for (var p = 0; p < plots.length; p += 1) {
            var plot_nodes = plots[p];
            var mag_plots = []; 
            var phase_plots = [];
            
            // repeated for each node in the set
            for (var i = 0; i < plot_nodes.length; i += 1) {
                var node = plot_nodes[i];
                if (results[node] === undefined) {
                    var novaldiv = get_novaldiv(node);
                    div.prepend(novaldiv);
                    continue;
                }
                var magnitudes = results[node].magnitude;
                var phases = results[node].phase;
                
                // 'm' for magnitude, 'p' for phase
                var mplotdata = [];
                var pplotdata = [];
                for (var j = 0; j < magnitudes.length; j += 1) {
                    var log_freq = Math.log(results._frequencies_[j]) / Math.LN10;
                    mplotdata.push([log_freq, magnitudes[j]]);
                    pplotdata.push([log_freq, phases[j]]);
                }
                
                /***************************** series object ************************************/
                // push both series objects into their respective lists
                mag_plots.push({
                    label: "Node " + node,
                    data: mplotdata,
                    xUnits: ' log Hz',
                    yUnits: ' dB'
                });
                phase_plots.push({
                    label: "Node " + node,
                    data: pplotdata,
                    xUnits: ' log Hz',
                    yUnits: ' deg'
                });
                /***************************** series object ************************************/
            }
            
            var xmin = mag_plots[0].data[0][0];
            var len = mag_plots[0].data.length;
            var xmax = mag_plots[0].data[len-1][0];
            
//            // prepare divs for magnitude graph
//            var div1 = $('<div class="plot-wrapper"></div>');
//            addCloseBtn(div1);
//            var magplotdiv = get_plotdiv();
//            div.append(div1);
//            div1.append(magplotdiv);
            
//            // customize options for magnitude graph
//            var options = $.extend(true, {}, default_options);
//            options.yaxis.axisLabel = 'Magnitude (dB)';
//            options.xaxis.axisLabel = 'Frequency (log Hz)';
//            options.xaxis.zoomRange = [null,(xmax-xmin)];
//            options.xaxis.panRange = [xmin, xmax];
//            
//            // graph magnitude
//            var plotObj = $.plot(plotDiv, mag_plots, options);
//            graph_setup(div1, plotObj);
//            
//            // prepare divs for phase graphs
//            var div2 = $('<div class="plot-wrapper"></div>');
//            addCloseBtn(div2);
//            phaseplotdiv = get_plotdiv();
//            div.append(div2);
//            div2.append(phaseplotdiv);
            
            /************************ Plot function **********************************/
            ac_plot(mag_plots, phase_plots /* ... */);
            /************************ Plot function **********************************/
//            
//            // customize options for phase graph
//            options.yaxis.axisLabel = "Phase (degrees)";
//            options.yaxis.units = '\u00B0';
//            
//            // graph phase
//            var plotObj = $.plot(plotDiv, phase_plots, options);
//            graph_setup(div2, plotObj);
        }
    }
    
    /***************
    DC analysis
    ***************/
    function prepare_dc_data(plots){
        var results = mCurrent_results;
        var analysis = mCurrent_analysis;
        var sweep1 = analysis.parameters.sweep1;
        var sweep2 = analysis.parameters.sweep2;
        
        if (sweep1 === undefined) return;
    
//        console.log("results:",results);
        for (var p = 0; p < plots.length; p += 1) {
            var node = plots[p][0];  // for now: only one value per plot
            var dataseries = [];
            var index2 = 0;
            while (true) {
                var values;
                var x,x2;
                if (sweep2 === undefined) {
                    values = results[node];
                    x = results['_sweep1_'];
                } else {
                    values = results[index2][node];
                    x = results[index2]['_sweep1_'];
                    x2 = results[index2]['_sweep2_'];
                    index2 += 1;
                }
        
                // no values to plot for the given node
                if (values === undefined) {
                    var novaldiv = get_novaldiv(node);
                    div.prepend(novaldiv);
                    continue;
                }
                var plotdata = [];
                for (var j = 0; j < values.length; j += 1) {
                    plotdata.push([x[j],values[j]]);
                }
                
                // boolean that records if the analysis asked for current through a node
                var current = (node.length > 2 && node[0]=='I' && node[1]=='(');
                var name = current ? node : "Node " + node; 
                if (sweep2 !== undefined) name += " with " + sweep2.source + "=" + x2;
                
                /***************************** series object ************************************/
                dataseries.push({label: name,
                                 data: plotdata,
                                 lineWidth: 5,
                                 yUnits: current ? 'A' : 'V'
                                });
                /***************************** series object ************************************/
                if (sweep2 === undefined || index2 >= results.length) break;
            }
        }
        
        var xmin = x[0];
        var xmax = x[values.length-1];
        
//        var wdiv = $('<div class="plot-wrapper"></div>');
//        addCloseBtn(wdiv);
//        var plotdiv = get_plotdiv();
//        wdiv.append(plotdiv);
//        div.append(wdiv);
        
        /************************ Plot function **********************************/
        dc_plot(dataseries, /* ... */);
        /************************ Plot function **********************************/
        
        
//        var options = $.extend(true, {}, default_options);
//        options.xaxis.axisLabel = 'Volts (V)';
//        options.xaxis.units = 'V';
//        options.xaxis.zoomRange = [null,(xmax-xmin)];
//        options.xaxis.panRange = [xmin, xmax];
//        options.yaxis.axisLabel = current? 'Amps (A)' : 'Volts (V)';
//        options.yaxis.units = current? 'A' : 'V';
//        
//        var plotObj = $.plot(plotdiv, dataseries, options);
//        graph_setup(wdiv, plotObj);
    }
    
    function tran_plot(dataseries){
        console.log("data:",dataseries);
    }
    
    function ac_plot(mdata,pdata){
        console.log("mdata:",mdata,"pdata:",pdata);
    }
    
    function dc_plot(dataseries){
        console.log("data:",dataseries);
    }
    
    /*********************
    Exports 
    **********************/
    return {simulate:simulate,
            hex_logic:hex_logic
           };
}());


