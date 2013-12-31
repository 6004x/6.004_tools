/***************************************************************************************
 ****************************************************************************************
 Simulator.simulate is what both simulate buttons call:
 simulate(text, filename, div, error_callback, type)
 args: -text: a string containing the text of a file to parse 
 -filename: the name of the file the text comes from
 -div: the div into which results should be inserted
 -error_callback: a callback function called whenever there is an error in an
 asynchronous part of the code
 -type: a string, either "device" or "gate"
 
 simulate calls Parser.parse, then when the parser is done, it calls run_simulation:
 run_simulation(data, div, type)
 args: -data: an object of the sort given by the parser (see parser comment)
 -div and type are the same as above
 run_simulation calls the analysis functions in cktsim/gatesim, then calls the
 appropriate prepare_<type>_data function.

 prepare_(tran|ac|dc)_data takes the raw data that cktsim/gatesim generates along with 
 the list of nodes to plot and turns them into a list of objects of the sort that a plotting
 library uses: the definition of each object is marked with a big star comment and the label
 "series object" for easy editing. These functions then call the appropriate plot functions.

 Plot functions are all defined at the bottom of the module: they're really just dummy 
 functions that call functions of the same name in plot.js, e.g., Plot.tran_plot, etc.

 ****************************************************************************************
 ***************************************************************************************/

var Simulator = (function(){
    var mAnalyses;
    var mCurrent_analysis;
    var mCurrent_results;
    var mPlotDefs;
    var mDiv;
    var mOptions;
    var mType;
    
    /********************
     Called when either simulation button is pressed
     ********************/
    function simulate(text, filename, div, error_callback, type){
        // type is "gate" or "device"
        // parse args: input string, filename, success callback, error callback, reset
        Parser.parse(text, filename, function(data){run_simulation(data,div,type);},
                     error_callback, true);
    }
    
    /*********************
     Run simulation: Take parsed data and extract all the useful bits, then run the simulation
     *********************/
    function run_simulation(parsed,div,type) {
        div.empty();  // we'll fill this with results
        mDiv = div;
        //        $('#graphScrollInner').width($('#graphScrollOuter').width());
        
        var netlist = parsed.netlist;
        var plots = parsed.plots;
        mAnalyses = parsed.analyses;
        mOptions = parsed.options;
        mPlotDefs = parsed.plotdefs;
        mType = type;
        
        if (netlist.length === 0) {
            div.prepend('<div class="alert alert-danger"> Empty netlist.'+
                        '<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        if (mAnalyses.length === 0) {
            div.prepend('<div class="alert alert-danger"> No analyses requested.'+
                        '<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        if (plots.length === 0) {
            div.prepend('<div class="alert alert-danger"> No plots requested.'+
                        '<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        
        // transient analysis progress text and halt button
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
        
        // transient analysis callback function
        function tranCB (pct_complete, results, msg) {
            progressTxt.text("Performing Transient Analysis... "+pct_complete+"%");

            function error(err) {
                tranProgress.hide();
                div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                            '.<button class="close" data-dismiss="alert">&times;'+
                            '</button></div>');
            }

            if (msg) error(msg);
            else if (results) {
                tranProgress.hide();
                mCurrent_results = results;
                Checkoff.setResults(mCurrent_results, mOptions);
                
                try {
                    prepare_tran_data(plots,results);
                } catch (err) { error(err); }
            }
            return tranHalt;
        }
        
        // run the simulation and prepare data
        try {
            
            mCurrent_analysis = mAnalyses[0];
            switch (mCurrent_analysis.type) {
            case 'tran':
                tranProgress.show();
                var progressTxt = tranProgress.find('span');
                try {
                    if (mType == "device"){
                        cktsim.transient_analysis(netlist, mCurrent_analysis.parameters.tstop,
                                                  [], tranCB, mOptions);
                    } else {
                        gatesim.transient_analysis(netlist, mCurrent_analysis.parameters.tstop,
                                                   [], tranCB, mOptions);
                    }
                } catch (err) {
                    tranProgress.hide();
                    div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                '.<button class="close" data-dismiss="alert">&times;</button></div>');
                }
                break;
                
            case 'ac':
                if (mType == "device"){
                    try {
                        mCurrent_results = cktsim.ac_analysis(netlist, mCurrent_analysis.parameters.fstart,
                                                              mCurrent_analysis.parameters.fstop,
                                                              mCurrent_analysis.parameters.ac_source_name,
                                                              mOptions);
                        
                        prepare_ac_data(plots);
                    } catch (err) {
                        div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                    '.<button class="close" data-dismiss="alert">&times;</button></div>');
                    }
                } else {
                    div.prepend('<div class="alert alert-danger">No AC analysis in gate-level simulation.'+
                                '<button class="close" data-dismiss="alert">&times;</button></div>');
                }
                break;
                
            case 'dc':
                if (mType == "device"){
                    try {
                        mCurrent_results = cktsim.dc_analysis(netlist,mCurrent_analysis.parameters.sweep1,
                                                              mCurrent_analysis.parameters.sweep2,
                                                              mOptions);
                        
                        prepare_dc_data(plots);
                    } catch (err) {
                        div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                    '.<button class="close" data-dismiss="alert">&times;</button></div>');
                    }
                } else {
                    div.prepend('<div class="alert alert-danger">No DC analysis in gate-level simulation.'+
                                '<button class="close" data-dismiss="alert">&times;</button></div>');
                }
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
    
    // handle resizing of simulation pane
    $(window).resize(resize_sim_pane);

    function resize_sim_pane() {
        // limit the simulation pane's height to that of the editor pane
        var sim_pane = $('#simulation-pane');
        sim_pane.height($('#editor-pane').height());

        $('.timing-analysis').height(sim_pane.height());

        var plots = $('.plot-container');
        if (plots.length > 0) {
            plots[0].resize(plots[0],sim_pane.width(),sim_pane.height());
        }
    }

    /***********************
     Prepare data functions
     ************************/
    
    var colors = ['#268bd2','#dc322f','#859900','#b58900','#6c71c4','#d33682','#2aa198'];

    /***************
     Transient analysis
     ***************/
    function prepare_tran_data(plots,results){

        // build dataset from a list of nodes
        function new_dataset(nlist) {
            var dataset = {xvalues: [],
                           yvalues: [],
                           name: [],
                           color: [],
                           xunits: 's',
                           yunits: (mType == 'gate') ? '' : 'V',
                           type: []
                   };

            for (var i = 0; i < nlist.length; i += 1) {
                var node = nlist[i];
                var values = results.history(node);
                if (values === undefined) throw "Cannot get history for node: "+node;

                dataset.xvalues.push(values.xvalues);
                dataset.yvalues.push(values.yvalues);
                dataset.name.push(node);
                dataset.color.push(colors[i % colors.length]);
                if (node.length > 2 && node[0]=='I' && node[1]=='(')
                    dataset.yunits = 'A';
                dataset.type.push(mType == 'gate' ? 'digital' : 'analog');
            }

            if (dataset.xvalues.length > 0) return dataset;
            return undefined;
        }

        var dataseries = []; // list of datasets to pass to graph module

        // run through list of .plot requests for a particular graph
        // (actually we cheat and plot each request in a separate graph)
        function process_plist(plist) {
            $.each(plist,function(pindex,plot) {
                // build the dataset for that list
                var dataset = new_dataset(plot.args);
                if (dataset === undefined) return;

                var fn = plot.type;
                // do required post-processing
                if (fn !== undefined) {
                    // first merge all the nodes in the dataset into a single
                    // set of xvalues and yvalues, where each yvalue is an array of
                    // digital values from the component nodes
                    var xv = [];
                    var yv = [];
                    var vil = mOptions.vil || 0.2;
                    var vih = mOptions.vih || 0.8;
                    var nnodes = dataset.xvalues.length;  // number of nodes
                    var i,nindex,vindex,x,y,last_y,xvalues,yvalues,nvalues,type;
                    for (nindex = 0; nindex < nnodes; nindex += 1) {
                        xvalues = dataset.xvalues[nindex];
                        yvalues = dataset.yvalues[nindex];
                        nvalues = xvalues.length;
                        type = dataset.type[nindex];
                        i = 0;  // current index into merged values
                        last_y = undefined;
                        for (vindex = 0; vindex < nvalues; vindex += 1) {
                            x = xvalues[vindex];
                            y = yvalues[vindex];

                            // convert to a digital value if necessary
                            if (type == 'analog') y = (y <= vil) ? 0 : ((y >= vih) ? 1 : 2);

                            // don't bother if node already has this logic value
                            // unless it's the final time point, which we need to keep
                            if (vindex != nvalues-1 && y == last_y) continue;

                            // skip over merged values till we find where x belongs
                            while (i < xv.length) {
                                if (xv[i] >= x) break;
                                // add new bit to time point we're skipping over
                                yv[i][nindex] = last_y;  
                                i += 1;
                            }

                            if (xv[i] == x) {
                                // exact match of time with existing time point, so just add new bit
                                yv[i][nindex] = y;
                            } else {
                                // need to insert new time point, copy previous time point, if any
                                // otherwise make a new one from scratch
                                var new_value;
                                if (i > 0) new_value = yv[i-1].slice(0);  // copy previous one
                                else new_value = new Array();
                                new_value[nindex] = y;
                                // insert new time point into xv and yv arrays
                                xv.splice(i,0,x);
                                yv.splice(i,0,new_value);
                            }

                            // all done! move to next value to merge
                            last_y = y;    // needed to fill in entries we skip over
                        }

                        // propagate final value through any remaining elements
                        while (i < xv.length) {
                            // add new bit to time point we're skipping over
                            yv[i][nindex] = last_y;  
                            i += 1;
                        }
                    }

                    // convert the yv's to integers or undefined, then format as specified
                    for (vindex = 0; vindex < yv.length; vindex += 1) {
                        yvalues = yv[vindex];
                        y = 0;
                        for (nindex = 0; nindex < nnodes; nindex += 1) {
                            i = yvalues[nindex];
                            if (i === 0 || i == 1) y = y*2 + i;
                            else if (i == 3) y = -1;  // < 0 means Z
                            else { y = undefined; break; }
                        }

                        if (y !== undefined) {
                            if (y < 0) {
                                y = -1;  // indicate Z value for bus
                            } else if (fn in mPlotDefs) {
                                var v = mPlotDefs[fn][y];
                                if (v) y = v;
                                else {
                                    // use hex if for some reason plotDef didn't supply a string
                                    y = "0x" + ("0000000000000000" + y.toString(16)).substr(-Math.ceil(nnodes/4));
                                }
                            } else if (fn == 'L') {
                                // for now format as hex number
                                y = "0x" + ("0000000000000000" + y.toString(16)).substr(-Math.ceil(nnodes/4));
                            } else throw "No definition for plot function "+fn;
                        }
                        yv[vindex] = y;
                    }

                    // see if we can use iterator notation for args: all args are of the
                    // form foo[n] with a consistent step between successive n.
                    var args = Parser.iterator_notation(plot.args);

                    dataset.xvalues = [xv];
                    dataset.yvalues = [yv];
                    dataset.type = ['string'];
                    dataset.yunits = '';
                    dataset.name = [fn + '(' + args.join(',') + ')'];
                }

                dataseries.push(dataset);
            });
        }

        // repeat for every set of plots
        $.each(plots,function(p,plist) {
            process_plist(plist);
        });

        // called by plot.graph when user wants to add a plot
        dataseries.add_plot = function (node,callback) {
            // parse "node" here to handle iterators, etc.
            Parser.parse_plot(node,function(plist) {
                if (plist) process_plist(plist);  // will push to dataseries
            });
        };

        if (dataseries.length !== 0) {
            var container = plot.graph(dataseries);
            mDiv.empty();
            mDiv.append(container);

            var stat_button = $('<button style="margin-left:10px;">Stats</button>');
            $('.plot-toolbar').append(stat_button);
            stat_button.on('click',function () { do_stats(results); });

            //cjt for some reason with typeahead one can't type "L(xxx)" ???
            // add autocomplete to add plot input field
            //var node_list = results.node_list();
            //node_list.sort();
            //$('#add-plot').typeahead({source: node_list});  // feature of bootstrap!

            resize_sim_pane();
        }
    }
    
    function do_stats(network) {
        if (network.report) {
            var d = new ModalDialog();
            d.setTitle('Simulation Results');
            d.setContent(network.report());
            d.show();
        }
    }

    /***************
     AC analysis
     ***************/
    function prepare_ac_data(plots) {
        var results = mCurrent_results;
        
        if (results === undefined) {
            mDiv.prepend('<div class="alert alert-danger">No results from the simulation.'+
                         '.<button class="close" data-dismiss="alert">&times;</button></div>');
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
                    mDiv.prepend(novaldiv);
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
            
            //            var xmin = mag_plots[0].data[0][0];
            //            var len = mag_plots[0].data.length;
            //            var xmax = mag_plots[0].data[len-1][0];
            
            /************************ Plot function **********************************/
            ac_plot(mag_plots, phase_plots /* ... */);
            /************************ Plot function **********************************/
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
        var dataseries;
        
        if (sweep1 === undefined) return;
        for (var p = 0; p < plots.length; p += 1) {
            var node = plots[p][0];  // for now: only one value per plot
            dataseries = [];
            var index2 = 0;
            while (true) {
                var values;
                var x,x2;
                if (sweep2 === undefined) {
                    values = results[node];
                    x = results._sweep1_;
                } else {
                    values = results[index2][node];
                    x = results[index2]._sweep1_;
                    x2 = results[index2]._sweep2_;
                    index2 += 1;
                }
                
                // no values to plot for the given node
                if (values === undefined) {
                    var novaldiv = get_novaldiv(node);
                    mDiv.prepend(novaldiv);
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
        
        //        var xmin = x[0];
        //        var xmax = x[values.length-1];
        
        /************************ Plot function **********************************/
        dc_plot(dataseries /* ... */);
        /************************ Plot function **********************************/
    }
    
    function ac_plot(mdata,pdata){
        //        console.log("mdata:",mdata,"pdata:",pdata);
    }
    
    function dc_plot(dataseries){
        //        console.log("data:",dataseries);
    }
    
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    //
    //  Timing analysis
    //
    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    function timing_analysis(text, filename, div, error_callback){
        // parse args: input string, filename, success callback, error callback, reset
        Parser.parse(text, filename, function(data){run_timing_analysis(filename,data,div);},
                     error_callback, true);
    }

    function run_timing_analysis(filename,parsed,div) {
        div.empty();  // we'll fill this with results
        mDiv = div;
        
        var netlist = parsed.netlist;
        mOptions = parsed.options;
        
        if (netlist.length === 0) {
            div.prepend('<div class="alert alert-danger"> Empty netlist.'+
                        '<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }

        try {
            var result = gatesim.timing_analysis(netlist,mOptions);
            var header = "<b>Timing analysis for "+filename+" at "+(new Date().toTimeString())+"</b>";
            div.prepend($('<div class="timing-analysis"></div>').append(header,result));
        } catch (e) {
            div.prepend('<div class="alert alert-danger">'+e+
                        '<button class="close" data-dismiss="alert">&times;</button></div>');
            return;
        }
        resize_sim_pane();
    };

    /*********************
     Exports 
     **********************/
    return {simulate:simulate,
            hex_logic:hex_logic,
            resize: resize_sim_pane,
            timing_analysis: timing_analysis
           };
}());
