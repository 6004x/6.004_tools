var Simulator = (function(){    
/**************************************************
**************************************************
Number formatting functions
**************************************************
**************************************************/
    
    /*****************
    Engineering notation: formats a number in engineering notation
        --args: -n: value to be formatted
                -nplaces: the number of decimal places to keep
                -trim: boolean, defaults to true; if true, removes trailing 0s and decimals
        --returns: a string representing the value in engineering notation
        
    Written by Chris Terman (description by Stacey Terman)
    *********************/
    function engineering_notation(n, nplaces, trim) {
        
        if (n === 0) return '0';
        if (n === undefined) return 'undefined';
        if (trim === undefined) trim = true;
    
        var sign = n < 0 ? -1 : 1;
        var log10 = Math.log(sign * n) / Math.LN10;
        var exp = Math.floor(log10 / 3); // powers of 1000
        var mantissa = sign * Math.pow(10, log10 - 3 * exp);
    
        // keep specified number of places following decimal point
        var mstring = (mantissa + sign * 0.5 * Math.pow(10, - nplaces)).toString();
        var mlen = mstring.length;
        var endindex = mstring.indexOf('.');
        if (endindex != -1) {
            if (nplaces > 0) {
                endindex += nplaces + 1;
                if (endindex > mlen) endindex = mlen;
                if (trim) {
                    while (mstring.charAt(endindex - 1) == '0') endindex -= 1;
                    if (mstring.charAt(endindex - 1) == '.') endindex -= 1;
                }
            }
            if (endindex < mlen) mstring = mstring.substring(0, endindex);
        }
    
        switch (exp) {
        case -5:
            return mstring + "f";
        case -4:
            return mstring + "p";
        case -3:
            return mstring + "n";
        case -2:
            return mstring + "u";
        case -1:
            return mstring + "m";
        case 0:
            return mstring;
        case 1:
            return mstring + "K";
        case 2:
            return mstring + "M";
        case 3:
            return mstring + "G";
        }
    
        // don't have a good suffix, so just print the number
        return n.toPrecision(nplaces);
    }
    
    /*******************
    Suffix formatter: calls engineering_notation on a number with two decimal places specified
    ********************/
    function suffix_formatter(value,axis) {
//        console.log("axis:",axis);
        var base = engineering_notation(value, 2);
        if (axis && axis.options.units){ return base+axis.options.units; }
        else { return base; }
    }
    
/**************************************************
**************************************************
Graph setup functions 
**************************************************
**************************************************/
    
    /*********************
    Interpolate: given a data series, infer the y value at a given x value
        --args: -series: a data series of the sort returned by a flot plot object's
                         getData() method
                -x: the x value at which to calculate the y value
                
        --returns: the y value
        
    Code taken from flotcharts.org "Tracking Curves with Crosshair" example graph,
    with slight modifications for style
    ***********************/
    function interpolate(series,x){
        // find the closest point, x-wise
        for (j = 0; j < series.data.length; j += 1) {
            if (series.data[j][0] > x) {
                break;
            }
        }
        
        // now interpolate
        var y;
        var p1 = series.data[j - 1];
        var p2 = series.data[j];
    
        if (p1 == null) {
            y = p2[1];
        } else if (p2 == null) {
            y = p1[1];
        } else {
            y = p1[1] + (p2[1] - p1[1]) * (x - p1[0]) / (p2[0] - p1[0]);
        }
        return y;
    }
    
    /*****************
    Graph setup: calls all the other setup functions. Consolidated for neatness.
    ******************/
    var allPlots = [];
    
    function graph_setup(div,plotObj){
        allPlots.push(plotObj);
        div.css("position","relative");
        zoom_pan_setup(div,plotObj);
        hover_setup(div,plotObj);
        selection_setup(div,plotObj);
        set_plot_heights();
    }
    
    /*********************
    Resize functions: scale plots nicely when the window is resized
    **********************/
    $(window).resize(set_plot_heights);
        
    function set_plot_heights(){
        // limit the simulation pane's height to that of the editor pane
        $('#simulation-pane').css("max-height",$('#editor-pane').height());
        $.each(allPlots,function(index,item){
            // allow extra space for margins
            var margin_val = $('.plot-wrapper').css("margin-bottom").match(/\d+/)[0];
            var margin_allowance = margin_val * 2;
            var placeholder = item.getPlaceholder();
            
            // plot height = total height / number of plots - margin space,
            // bounded by min-height
            var plotHeight = $('#editor-pane').height() / allPlots.length - margin_allowance;
            placeholder.css("height",plotHeight);
        });
    }
    
    /*******************
    Zoom/pan setup: sets up zooming and panning buttons
    ********************/
    function general_zoompan(){
        // default options for tooltips
        var tooltipOpts = {delay:100, container:'body', placement:'right'};
        
        // helper function for creating buttons
        var zoompan_buttons = [];
        function create_button(tltp_txt, icon, onclick_fn){
            tooltipOpts.title = tltp_txt;
            zoompan_buttons.push( 
                $('<button class="btn btn-mini"><i class="icon-'+icon+'"></i></button>')
                .tooltip(tooltipOpts)
                .on("click",function(){
                    $.each(allPlots, function(index,item){
                        item.clearSelection();
                        onclick_fn(item);
                    });
                })
            );
        }
        
        // create all the proper buttons
        create_button("Zoom In","zoom-in",function(item){item.zoom()});
        create_button("Reset Zoom","search",
                      function(item){item.zoom({amount:1e-10})});
        create_button("Zoom Out","zoom-out",function(item){item.zoomOut()});
        create_button("Pan Left","chevron-left",
                      function(item){item.pan({left:-100})});
        create_button("Pan Right","chevron-right",
                      function(item){item.pan({left:100})});
        
        // set up a button group, add all the created buttons, append to the results div
        var btnGroup = $('<div class="btn-group btn-group-vertical zoompan"></div>');
        btnGroup.append(zoompan_buttons);
        $('#simulation-pane').append(btnGroup);
    }
    
    function zoom_pan_setup(div,plotObj){
        // mousewheel panning
        plotObj.getPlaceholder().on("mousewheel",function(evt){
//            evt.preventDefault();
            deltaX = evt.originalEvent.wheelDeltaX;
            if (deltaX !== 0){
                $.each(allPlots, function(index,item){
                    item.clearSelection();
                    item.pan({left:-1*evt.originalEvent.wheelDeltaX});
                });
            }
        });
        
        // doubleclick zooming
        plotObj.getPlaceholder().on("dblclick",function(evt){
            evt.preventDefault();
            
            var center = {};
            center.left = evt.pageX - plotObj.offset().left;
            center.top = evt.pageY - plotObj.offset().top;
            
            $.each(allPlots, function(index,item){
                item.clearSelection();
                if (evt.shiftKey){
                    item.zoomOut({center:center});
                    return;
                }
                item.zoom({center:center});
            });
        });   
    }
    
    /***********************
    Hover setup: displays values when the graph is moused over
    **********************/
    function hover_setup(div,plotObj){
        // create and position div to show hover tooltip
        var posTextDiv = $("<div class='posText'><div class='xpos'></div></div>");
        var top = plotObj.getPlotOffset().top;
        var left = plotObj.getPlotOffset().left;
        posTextDiv.css("left",left + 5);
        posTextDiv.css("top",top + 5);
        posTextDiv.hide();
        plotObj.getPlaceholder().append(posTextDiv);
        
        // on hover, set the crosshair position on all plots and call their showtooltip function
        var updateMouseTimeout;
        var latestPos;
        plotObj.getPlaceholder().on("plothover", function(event,pos,item){
            $.each(allPlots, function(index,value){
                if (value != plotObj){
                    value.setCrosshair(pos);
                }
                value.getPlaceholder().trigger("showPosTooltip",pos)
            });
            
        });
        
        // showtooltip function: after an appropriate interval to prevent 
        // awful lag, update the position tooltip
        plotObj.getPlaceholder().on("showPosTooltip", function(event,pos){
            latestPos = pos;
            if (!updateMouseTimeout){
                updateMouseTimeout = setTimeout(showMousePos, 50);
            }
        });
        
        /*******************
        showMousePos: called when a hover event is received and updates displayed values
        ********************/
        var innerPosTextDivs = {};
        
        function showMousePos(){
            updateMouseTimeout = null;
            pos = latestPos;
            
            // prevent the tooltip from blocking the legend
            var divWidth = plotObj.width() - 
                plotObj.getPlaceholder().find('.legend div').width() - 20;
            posTextDiv.css("max-width",divWidth);
            
            // only show the tooltip if the mouse is within graph boundaries (x only)
            var axes = plotObj.getAxes();
            if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max/* ||
                pos.y < axes.yaxis.min || pos.y > axes.yaxis.max*/) {
                posTextDiv.hide();
                return;
            }  
    
            // set tooltip text; each series gets its own div in innerPosTextDivs
            var dataset = plotObj.getData();
            for (var i = 0; i < dataset.length; i += 1) {
                var series = dataset[i];
                
                posTextDiv.find('.xpos').text("X = "+suffix_formatter(pos.x)+series.xUnits);
    
                var y = interpolate(series,pos.x);
                
                var divText = series.label+" = "+suffix_formatter(y)+series.yUnits;
                if (innerPosTextDivs["series"+i]===undefined){
                    var innerDiv = $("<div>"+divText+"</div>");
                    innerPosTextDivs["series"+i] = innerDiv;
                    posTextDiv.append(innerPosTextDivs["series"+i]);
                } else {
                    innerPosTextDivs["series"+i].text(divText);
                }
            }
            posTextDiv.show();
        }
    }
    
    /************************
    Selection setup: shows the range of values covered by a selection
    (similar to hover setup above)
    *************************/
    function selection_setup(div,plotObj){
        // create and position div to show range values
        var rangeTextDiv = $("<div class='posText'><div class='xrange'></div></div>");
        plotObj.getPlaceholder().append(rangeTextDiv);
        rangeTextDiv.css("bottom",plotObj.getPlotOffset().bottom + 5);
        rangeTextDiv.css("left",plotObj.getPlotOffset().left + 5);
        rangeTextDiv.hide();
        
        // when a selection is being made, if it's a valid selection, call each plot's
        // showtooltip method
        var updateSelTimeout;
        var selRanges;
        plotObj.getPlaceholder().on("plotselecting", function(event,ranges){
            $.each(allPlots, function(index, value) {
                if (value != plotObj){
                    if (ranges){
                        value.setSelection(ranges);
                    }
                }
                value.getPlaceholder().trigger("showRangeTooltip",ranges);
            }); 
        });
        
        // whenever one plot's selection is cleared, clear the others' as well
        plotObj.getPlaceholder().on("plotunselected",function(event,ranges){
            $.each(allPlots, function(index, value){
                value.clearSelection();
            });
            
            clearTimeout(updateSelTimeout);
            rangeTextDiv.hide();
        });
        
        // showtooltip -- show the tooltip after an appropriate timeout to prevent
        // awful lag
        plotObj.getPlaceholder().on("showRangeTooltip",function(event,ranges){
            if (!updateSelTimeout){
                selRanges = ranges;
                updateSelTimeout = setTimeout(showSelRange,50);
            }
        });
        
        /*****************
        showSelRange: called when a 'selecting' event is received and updates displayed info
        ******************/
        var innerRangeTextDivs = {};
        
        function showSelRange(){
            updateSelTimeout = null;
            ranges = selRanges;
            
            // if the range is invalid, do nothing
            if (!ranges){ return; }
            
            var xrange = ranges.xaxis.to - ranges.xaxis.from;
            
            // limit the length of the tooltip to avoid blocking the legend
//            var divWidth = plotObj.width() - 
//                plotObj.getPlaceholder().find('.legend div').width() - 20;
//            rangeTextDiv.css("max-width",divWidth);
            
            // calculate the range for each series. Each series gets its own div in
            // innerRangeTextDivs
            var dataset = plotObj.getData();
            for (i = 0; i < dataset.length; i += 1) {
                var series = dataset[i];
                
                rangeTextDiv.find('.xrange').text("X range = "+suffix_formatter(xrange)+
                                              series.xUnits);
    
                var y1 = interpolate(series, ranges.xaxis.from);
                var y2 = interpolate(series, ranges.xaxis.to);
                var yrange = y2-y1;
                
                var divText = series.label+" range = "+suffix_formatter(yrange)+series.yUnits;
                if (innerRangeTextDivs["series"+i]===undefined){
                    var innerDiv = $("<div>"+divText+"</div>");
                    innerRangeTextDivs["series"+i] = innerDiv;
                    rangeTextDiv.append(innerRangeTextDivs["series"+i]);
                } else {
                    innerRangeTextDivs["series"+i].text(divText);
                }
            }
            rangeTextDiv.show();
        }
    }
    
    /*********************
    Default graph options: each plot will need to specify axis labels and zoom and pan ranges
    **********************/
    var default_options = {
        yaxis:{
            color:"#848484",
            tickColor:"#dddddd",
            tickFormatter:suffix_formatter,
            zoomRange:false,
            panRange:false,
            autoscaleMargin: 0.05,
            axisLabelUseCanvas:true,
            axisLabelColor:'rgb(84,84,84)',
        },
        xaxis:{
            color:"#848484",
            tickColor:"#dddddd",
            tickFormatter:suffix_formatter,
            axisLabelUseCanvas:true,
            axisLabelColor:'rgb(84,84,84)',
            axisLabelPadding:5
        },
        series:{
            shadowSize:0
        },
        crosshair:{
            mode:"x",
            color:"#916e75"
        },
        selection:{
            mode:"x",
            color:'#cfbfc2'
        },
        grid:{
            hoverable:true,
            autoHighlight:false
        }
    }
    
/****************************************************
*****************************************************
Graphing functions
*****************************************************
*****************************************************/
    
    // helper function that returns a new generic placeholder div
    function get_plotdiv(){
        return $('<div class="placeholder" style="width:90%;height:200px;\
min-height:130px"></div>');
    }
    
    /*********************
    Tran_plot: plots a transient analysis
        --args: -div: the div into which the plot will be placed
                -results: results of the analysis as performed by cktsim.js
                -plots: an array of arrays of nodes to be plotted. Each array
                        represents nodes to be plotted on the same pair of axes
                        
    Preparing of data written by Chris Terman
    *********************/
    function tran_plot(div, results, plots) {
        if (results === undefined) {
            div.text("No results!");
            return;
        }
        
        // repeat for every set of plots
        for (var p = 0; p < plots.length; p += 1) {
            var plot_nodes = plots[p]; // the set of nodes that belong on one pair of axes
            var dataseries = []; // 'dataseries' is the list of objects that represent the 
                                 // data for the above set of nodes
            
            // repeat for each node
            for (var i = 0; i < plot_nodes.length; i += 1) {
                var node = plot_nodes[i];
                
                // get the results for the given node
                var values = results[node];
                if (values === undefined) {
                    div.text("No values to plot for node "+node);
                    return;
                }
                
                // 'plot' will be filled with data
                var plot = [];
                for (var j = 0; j < values.length; j += 1) {
                    plot.push([results._time_[j], values[j]]);
                }
                
                // boolean that records if the analysis asked for current through a node
                var current = (node.length > 2 && node[0]=='I' && node[1]=='(');
                
                // add a series object to 'dataseries'
                dataseries.push({
                    label: current ? node : "Node " + node,
                    data: plot,
                    xUnits: 's',
                    yUnits: current ? 'A' : 'V'
                });
            }

            var xmin = results._time_[0];
            var xmax = results._time_[plot.length-1];
            
            // prepare a div
            var wdiv = $('<div class="plot-wrapper"></div>');
            var plotdiv = get_plotdiv();
            wdiv.append(plotdiv);
            div.append(wdiv);
            
            // customize options
            var options = $.extend(true,{},default_options);
            options.yaxis.axisLabel = current ? 'Amps (A)' : 'Volts (V)';
//            options.xaxis.axisLabel = 'Time (s)';
            options.xaxis.zoomRange = [null, (xmax-xmin)];
            options.xaxis.panRange = [xmin, xmax];
            
            options.xaxis.units = 's';
            options.yaxis.units = current? 'A' : 'V';
        
            // graph the data
            var plotObj = $.plot(plotdiv,dataseries,options);
            graph_setup(wdiv,plotObj);
//            console.log("data:",plotObj.getData());
        }
    }
    
    /**************************
    AC plot: plot an AC analysis. Arguments same as above.
    *************************/
    function ac_plot(div, results, plots) {
        if (results === undefined) {
            div.text("No results!");
            return;
        }
        
        // repeated for each set of nodes
        for (var p = 0; p < plots.length; p += 1) {
            var plot_nodes = plots[p];
            var mplots = []; 
            var pplots = [];
            
            // repeated for each node in the set
            for (var i = 0; i < plot_nodes.length; i += 1) {
                var node = plot_nodes[i];
                if (results[node] === undefined) {
                    div.text('No values to plot for node '+node);
                    return;
                }
                var magnitudes = results[node].magnitude;
                var phases = results[node].phase;
                
                // 'mplot' will be filled with magnitude data; 'pplot' will be filled with
                // phase data
                var mplot = [];
                var pplot = [];
                for (var j = 0; j < magnitudes.length; j += 1) {
                    var log_freq = Math.log(results._frequencies_[j]) / Math.LN10;
                    mplot.push([log_freq, magnitudes[j]]);
                    pplot.push([log_freq, phases[j]]);
                }
                
                // push both series objects into their respective lists
                mplots.push({
                    label: "Node " + node,
                    data: mplot,
                    xUnits: ' log Hz',
                    yUnits: ' dB'
                });
                pplots.push({
                    label: "Node " + node,
                    data: pplot,
                    xUnits: ' log Hz',
                    yUnits: ' deg'
                });
            }
            
            var xmin = mplots[0].data[0][0];
            var len = mplots[0].data.length;
            var xmax = mplots[0].data[len-1][0];
            
            // prepare divs for magnitude graph
            var div1 = $('<div class="plot-wrapper"></div>');
            var plotDiv = get_plotdiv();
            div.append(div1);
            div1.append(plotDiv);
            
            // customize options for magnitude graph
            var options = $.extend(true, {}, default_options);
            options.yaxis.axisLabel = 'Magnitude (dB)';
            options.xaxis.axisLabel = 'Frequency (log Hz)';
            options.xaxis.zoomRange = [null,(xmax-xmin)];
            options.xaxis.panRange = [xmin, xmax];
            
            options.yaxis.units = ' dB';
            
            // graph magnitude
            var plotObj = $.plot(plotDiv, mplots, options);
            graph_setup(div1, plotObj);
            
            // prepare divs for phase graphs
            var div2 = $('<div class="plot-wrapper"></div>');
            plotDiv = get_plotdiv();
            div.append(div2);
            div2.append(plotDiv);
            
            // customize options for phase graph
            options.yaxis.axisLabel = "Phase (degrees)";
            options.yaxis.units = '\u00B0';
            
            // graph phase
            var plotObj = $.plot(plotDiv, pplots, options);
            graph_setup(div2, plotObj);
        }
    }
    
    /******************************
    Simulate: given a string, parse it and run the requested simulation(s)
    
    Modified from a function by Chris Terman
    *******************************/
    function simulate(text,filename,div) {
        div.empty();  // we'll fill this with results
        var parse = Parser.parse(text,filename);
        
        var netlist = parse.netlist;
        var analyses = parse.analyses;
        var plots = parse.plots;
        
        if (netlist.length === 0) return;
        if (analyses.length === 0) return;
        
        allPlots = [];
    
        try {
            var analysis = analyses[0];
            switch (analysis.type) {
            case 'tran':
                cktsim.transient_analysis(netlist, analysis.parameters.tstop,
                                          [], function(ignore, results) {
                    tran_plot(div, results, plots);
                });
                break;
            case 'ac':
                var results = cktsim.ac_analysis(netlist, analysis.parameters.fstart,
                                                 analysis.parameters.fstop,
                                                 analysis.parameters.ac_source_name);
                ac_plot(div, results, plots);
                break;
            case 'dc':
                break;
            }
        }
        catch (err) {
            throw new Parser.CustomError(err,analysis.line,0);
        }
        general_zoompan();
    }

/*********************
Exports
**********************/
    return {simulate:simulate};
    
}());
