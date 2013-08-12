var Simulator = (function(){
    var mAnalyses;
    var mCurrent_analysis;
    var mCurrent_results;
    var mDiv;
    var mAllPlots = [];
    
    function simulate(text, filename, div, error_callback){
        // input string, filename, callback
        Parser.parse(text, filename, function(data){run_simulation(data,div);},
                     error_callback, true); // reset = true
    }
    
    function run_simulation(parsed,div) {
        div.empty();  // we'll fill this with results
        mDiv = div;
        $('#graphScrollInner').width($('#graphScrollOuter').width());
        
        var netlist = parsed.netlist;
        mAnalyses = parsed.analyses;
        var plots = parsed.plots;
        
        mAllPlots = [];
        
        if (netlist.length === 0) {
            div.prepend('<div class="alert alert-danger"> Empty netlist.'+
                        '.\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        if (analyses.length === 0) {
            div.prepend('<div class="alert alert-danger"> No analyses requested.'+
                        '.\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        if (plots.length === 0) {
            div.prepend('<div class="alert alert-danger"> No plots requested.'+
                        '.\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        
        if (plots.length >= 4){
            compactPlot = true;
        } else {
            compactPlot = false;
        }
        
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
            $('#addPlotButton').data('button').enable();
            
            mCurrent_analysis = analyses[0];
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
                                
                                prepare_tran_data(plots);
                            }
                            return tranHalt;
                        });
                    } catch (err) {
                        tranProgress.hide();
                        div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                    '.\<button class="close" data-dismiss="alert">&times;</button></div>')
                    }
                    break;
                    
                case 'ac':
                    try {
                        mCurrent_results = cktsim.ac_analysis(netlist, mCurrent_analysis.parameters.fstart,
                                                         mCurrent_analysis.parameters.fstop,
                                                         mCurrent_analysis.parameters.ac_source_name);
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
                                                             mCurrent_analysis.parameters.sweep2);
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
            throw new Parser.CustomError(err,mCurrent_analysis.line,0);
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
        var minHeight;
        if (compactPlot){
            minHeight = 80;
        } else {
            minHeight = 130;
        }
        return $('<div class="placeholder" style="width:100%;height:90%;min-height:'+
                 minHeight+'px"></div>');
    }
    
    /***********************
    Prepare data functions
    ************************/
    
    /***************
    Transient analysis
    ***************/
    function prepare_tran_data(plots){
        var results = mCurrent_results;
        
        if (results === undefined) {
            div.prepend('<div class="alert alert-danger">No results from the simulation.'+
                        '.\<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        
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
                
                var fn_pttn = /([^\(]+)\((.+)\)$/;
                var matched_array = node.match(fn_pttn);
                if (matched_array){
                    var fn_name = matched_array[1];
                    var fn_args = matched_array[2].split(/[,\s]\s*/);
                    
                    console.log('fn:',fn_name,"args:",fn_args);
                }
                
                // get the results for the given node
                var values = results[node];
                if (values === undefined) {
                    var novaldiv = get_novaldiv(node);
                    mDiv.prepend(novaldiv);
                    continue;
                }
                
                // 'plot' will be filled with data
                var plotdata = [];
                for (var j = 0; j < values.length; j += 1) {
                    plotdata.push([results._time_[j], values[j]]);
                }
                
                // boolean that records if the analysis asked for current through a node
                var current = (node.length > 2 && node[0]=='I' && node[1]=='(');
                
                // add a series object to 'dataseries'
                dataseries.push({
                    label: node,
                    data: plotdata,
                    xUnits: 's',
                    yUnits: current ? 'A' : 'V'
                });
            }
            
            if (dataseries.length == 0 /*|| (p == 0 && dataseries.length == 1)*/) {
                continue;
            }
            
            var xmin = results._time_[0];
            var xmax = results._time_[plotdata.length-1];
            
            // prepare a div
            var wdiv = $('<div class="plot-wrapper"></div>');
            addCloseBtn(wdiv);
//            if (compactPlot){
//                wdiv.css("margin-bottom",'-10px');
//            }
//            var ldiv;
//            if (compactPlot){
//                ldiv = $('<div class="plot-legend"></div>');
//                wdiv.append(ldiv);
//            }
            var plotdiv = get_plotdiv();
            wdiv.append(plotdiv);
            div.append(wdiv);
            
            /************************ Plot function **********************************/
            tran_plot(plotdiv,dataseries); 
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
                
                // 'mplot' will be filled with magnitude data; 'pplot' will be filled with
                // phase data
                var mplotdata = [];
                var pplotdata = [];
                for (var j = 0; j < magnitudes.length; j += 1) {
                    var log_freq = Math.log(results._frequencies_[j]) / Math.LN10;
                    mplotdata.push([log_freq, magnitudes[j]]);
                    pplotdata.push([log_freq, phases[j]]);
                }
                
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
            }
            
            var xmin = mag_plots[0].data[0][0];
            var len = mag_plots[0].data.length;
            var xmax = mag_plots[0].data[len-1][0];
            
            // prepare divs for magnitude graph
            var div1 = $('<div class="plot-wrapper"></div>');
            addCloseBtn(div1);
            var magplotdiv = get_plotdiv();
            div.append(div1);
            div1.append(magplotdiv);
            
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
            // prepare divs for phase graphs
            var div2 = $('<div class="plot-wrapper"></div>');
            addCloseBtn(div2);
            phaseplotdiv = get_plotdiv();
            div.append(div2);
            div2.append(phaseplotdiv);
            
            /************************ Plot function **********************************/
            ac_plot(magplotdiv, phaseplotdiv, mag_plots, phase_plots);
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
                
                dataseries.push({label: name,
                                 data: plotdata,
                                 lineWidth: 5,
                                 yUnits: current ? 'A' : 'V'
                                });
                if (sweep2 === undefined || index2 >= results.length) break;
            }
        }
        
        var xmin = x[0];
        var xmax = x[values.length-1];
        
        var wdiv = $('<div class="plot-wrapper"></div>');
        addCloseBtn(wdiv);
        var plotdiv = get_plotdiv();
        wdiv.append(plotdiv);
        div.append(wdiv);
        
        /************************ Plot function **********************************/
        dc_plot(plotdiv,dataseries);
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
    
    /*********************
    Exports 
    **********************/
    return {simulate:simulate};
}());


