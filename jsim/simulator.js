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
        var base = engineering_notation(value, 2);
        if (axis && axis.options.units){ return base+axis.options.units; }
        else { return base; }
    }
    
/**************************************************
**************************************************
Graph setup functions 
**************************************************
**************************************************/
    var compactPlot = true;
    
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
        $('#simulation-pane').height($('#editor-pane').height());
        $('#results').height($('#simulation-pane').height() - $('#graph-toolbar').height() - 40);
        $.each(allPlots,function(index,item){
            
            // allow extra space for margins
            var margin_val;
            try{
                margin_val = $('.plot-wrapper').css("margin-bottom").match(/-?\d+/)[0];
            } catch (err) {
                margin_val = 0;
            }
            var placeholder = item.getPlaceholder();
            
            // plot height = total height / number of plots - margin space,
            // bounded by min-height; -30 for scrollbar width
            var plotHeight = ($('#results').height() - 30) / allPlots.length 
            plotHeight -= margin_val;
            placeholder.css("height",plotHeight);
        });
    }
    
    /**********************
    Zoom/pan setup: sets up mousewheel and doubleclick panning/zooming
    **********************/
    function zoom_pan_setup(div,plotObj){
        // mousewheel panning
        plotObj.getPlaceholder().on("mousewheel",function(evt){
            deltaX = evt.originalEvent.wheelDeltaX;
            if (deltaX !== 0){
                evt.preventDefault();
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
        // on hover, set the crosshair position on all plots and call their showtooltip function
        var updateMouseTimeout;
        var latestPos;
        plotObj.getPlaceholder().on("plothover", function(event,pos,item){
            $(this).trigger("showPosTooltip",pos);
            $.each(allPlots, function(index,value){
                value.getPlaceholder().trigger("showPosTooltip",pos);
                if (value != plotObj){
                    value.setCrosshair(pos);
                    if (compactPlot){
                        value.getPlaceholder().trigger("hidePosTooltip");
                    }
                }
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
        function showMousePos(){
            updateMouseTimeout = null;
            pos = latestPos;
            
            var dataset = plotObj.getData();
            var legendBoxes = plotObj.getPlaceholder().find('.legendValue');
            
            for (var i = 0; i < dataset.length; i += 1){
                var series = dataset[i];
                var y = interpolate(series,pos.x);
                legendBoxes.eq(i).text(suffix_formatter(y)+series.yUnits);
            }
        }
    }
    
    /************************
    Selection setup: shows the range of values covered by a selection
    (similar to hover setup above)
    *************************/
    function select_zoom(ranges){
        if (ranges){
            $.each(allPlots,function(index,item){
                opts = item.getAxes.xaxis.options;
                opts.min = ranges.xaxis.from;
                opts.max = ranges.xaxis.to;
                
                item.setupGrid();
                item.draw();
            });
        }
    }
    
    function selection_setup(div,plotObj){
        // create and position div to show range values
        var rangeTextDiv = $("<div class='posText'><div class='xrange'></div></div>");
        plotObj.getPlaceholder().append(rangeTextDiv);
        rangeTextDiv.css("bottom",plotObj.getPlotOffset().bottom);
        rangeTextDiv.css("left",plotObj.getPlotOffset().left + 5);
        rangeTextDiv.hide();
        
        // when a selection is being made, if it's a valid selection, call each plot's
        // showtooltip method
        var updateSelTimeout;
        var selRanges;
        var hasSel;
        
        plotObj.getPlaceholder().on("plotselecting", function(event,ranges){
            $.each(allPlots, function(index, value) {
                if (value != plotObj){
                    if (ranges){
                        value.setSelection(ranges,true);
                    }
                }
                value.getPlaceholder().trigger("showRangeTooltip",ranges);
            }); 
            hasSel = true;
        });
        
        // whenever one plot's selection is cleared, clear the others' as well
        plotObj.getPlaceholder().on("plotunselected",function(event,ranges){
            $.each(allPlots, function(index, value){
                value.clearSelection();
            });
            
            clearTimeout(updateSelTimeout);
            rangeTextDiv.hide();
            hasSel = false;
        });
        
        plotObj.getPlaceholder().on("plothover",function(){
            if (hasSel && compactPlot){
                rangeTextDiv.show();
            }
        });
        
        plotObj.getPlaceholder().on("mouseleave",function(){
            if (compactPlot){
                rangeTextDiv.hide();
            }
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
            hasSel = true;
            
            // if the range is invalid, do nothing
            if (!ranges){ 
                hasSel = false;
                return; 
            }
            
            var xrange = ranges.xaxis.to - ranges.xaxis.from;
            
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
                
                var divText = series.label+" range = "+
                    suffix_formatter(yrange)+series.yUnits;
                var legendBoxes = plotObj.getPlaceholder().find('.legendCheckbox');
                var toggleBox = legendBoxes.eq(i);
                if (innerRangeTextDivs["series"+i]===undefined){
                    var innerDiv = $("<div>"+divText+"</div>");
                    innerRangeTextDivs["series"+i] = innerDiv;
                    rangeTextDiv.append(innerRangeTextDivs["series"+i]);
                } else {
                    innerRangeTextDivs["series"+i].text(divText);
                }
                
                if (toggleBox.prop("checked")){
                    innerRangeTextDivs["series"+i].show();
                } else {
                    innerRangeTextDivs["series"+i].hide();
                }
            }
            if (!compactPlot){
                rangeTextDiv.show();
            }
        }
    }
    
    /**********************
    General setup
    ***********************/
    function general_setup(){
        var tlbar = new Toolbar($('#graph-toolbar'));   
        
        var addPlotModal;
        var addPlotDropdown;
        var addPlotButton = new ToolbarButton('<i class="icon-plus"></i> Add Plot',function(){
            
            addPlotModal = new ModalDialog();
            addPlotModal.setTitle("Add a New Plot");
            var content =$("<div><p>Enter one or more node names, separated by spaces or commas,\
    to plot on a single pair of axes.</p></div>");
            var nodeList = [];
            for (var item in current_results){
                if (item != "contains" && item != "_time_") {
                    nodeList.push(item);
                }
            }
            addPlotModal.setContent(content);
            addPlotModal.addButton("Cancel",'dismiss');
            addPlotModal.addButton("Add Plot",addPlot,'btn-primary');
            addPlotModal.inputBox({placeholder:'New nodes...',
                                   callback:addPlot,
                                   typeahead:nodeList
                                  });
            addPlotModal.show();
        },"Add Plot");
                               
        function addPlot(){
            gbf(function(item){
                item.zoom({amount:1e-10});
            })
            
            var newPlotRaw = addPlotModal.inputContent();
            newPlot = [newPlotRaw.match(/[^,\s]+/g)];
            addPlotModal.dismiss();
            if (newPlot[0] == null) return;
            
            switch (current_analysis.type){
                case 'tran':
                    tran_plot(bigDiv,current_results,newPlot);
                    break;
                case 'ac':
                    ac_plot(bigDiv,current_results,newPlot);
                    break;
                case 'dc':
                    dc_plot(bigDiv, current_results, newPlot, current_analysis.parameters.sweep1,
                       current_analysis.parameters.sweep2);
                    break;
            }
        }
        
        tlbar.addButtonGroup([addPlotButton]);
        addPlotButton.disable();
        addPlotButton.setID("addPlotButton");

        /**** set up zooming and panning buttons ****/
        
        // generic button function
        function gbf(onclick_fn){
            $.each(allPlots, function(index,item){
                item.clearSelection();
                onclick_fn(item);
            });
        }
        
        var resetZoomBtn = new ToolbarButton('icon-search',function(){
            gbf(function(item){
                item.zoom({amount:1e-10});
            });
        },"Reset Zoom");
        
        tlbar.addButtonGroup([
            new ToolbarButton('icon-zoom-in',function(){
                gbf(function(item){
                    item.zoom();
                });
            },"Zoom In (Shortcut: double click)"),
            resetZoomBtn,
            new ToolbarButton('icon-zoom-out',function(){
                gbf(function(item){
                    item.zoomOut();
                });
            }, "Zoom Out (Shortcut: shift + double click)")
        ]);  
        
        var selZoomButton = new ToolbarButton(
            '<i class="icon-resize-full"></i> Zoom to Selection',zoomToSel,
                                                "Zoom to Selection");
        tlbar.addButtonGroup([selZoomButton]);
        selZoomButton.disable();
        
        var selRanges;
        function zoomToSel(){
            ranges = selRanges;
            if (ranges){
                $.each(allPlots, function(index,item){
                    var opts = item.getAxes().xaxis.options;
                    opts.min = ranges.xaxis.from;
                    opts.max = ranges.xaxis.to;
                    
                    item.setupGrid();
                    item.draw();
                    item.clearSelection();
                });
                $('#results').triggerHandler("plotzoom",allPlots[0]);
            }
        }
        
        $('#results').on("plotunselected",function(){
            selZoomButton.disable();
        });
        
        $('#results').on("plotselected",function(evt,ranges){
            selZoomButton.enable();
            selRanges = ranges;
        });
    }
    
    /*********************************
    Scrollbar setup: sets up the scrollbar for panning
    *********************************/
    function scrollbar_setup(){
        $('#results').on("plotzoom",function(evt,plot){
            var xaxis = plot.getAxes().xaxis;
            var new_range = xaxis.max - xaxis.min;
            var max_range = xaxis.datamax - xaxis.datamin;
            
            var inv_fraction = max_range/new_range;
            $('#graphScrollInner').width($('#graphScrollOuter').width() * inv_fraction);
            
            var left_fraction = (xaxis.min - xaxis.datamin) / max_range;
            var left_amt_px = $('#graphScrollInner').width() * left_fraction;
            $('#graphScrollOuter').scrollLeft(left_amt_px);
            
        });
        
        var preventScroll = false;
        $('#results').on("plotpan",function(evt,plot,args){
            var xaxis = plot.getAxes().xaxis;
            var max_range = xaxis.datamax - xaxis.datamin;
            
            var left_fraction = (xaxis.min - xaxis.datamin) / max_range;
            
            var left_amt_px = $('#graphScrollInner').width() * left_fraction;
            
            preventScroll = true;
            $('#graphScrollOuter').scrollLeft(left_amt_px);
        });
        
        var updateScrollTimeout = null;
        $('#graphScrollOuter').on("scroll",function(evt){
            if (!updateScrollTimeout){
                setTimeout(function(){syncScroll(evt);},1)
            }
        });
        
        function syncScroll(evt){
            updateScrollTimeout = null;
            if (preventScroll){ 
                preventScroll = false;
                return; 
            } else {
                var left_amt_px = $('#graphScrollOuter').scrollLeft();
                var left_frac = left_amt_px / $('#graphScrollInner').width();
                
                var xaxis_sample = allPlots[0].getAxes().xaxis;
                var xrange = xaxis_sample.max - xaxis_sample.min;
                var max_range = xaxis_sample.datamax - xaxis_sample.datamin;
                var left_amt_graph = max_range * left_frac;
                
                $.each(allPlots,function(index,item){
                    var xaxis = item.getAxes().xaxis;
                    xaxis.options.min = left_amt_graph;
                    xaxis.options.max = left_amt_graph + xrange;
                    
                    item.setupGrid();
                    item.draw();
                });
            }
        }
    }
    
    
    /**********************
    Label formatter: sets up space to show values next to legend labels
    ***********************/
    function legendFormatter(label,series){
        return '<table><tr><td>'+label+'</td><td>=</td>\
<td class="legendValue">000.00'+series.yUnits+'</td></tr></table>'
    }
    
    /*********************
    Default graph options: each plot will need to specify axis labels and zoom and pan ranges. 
        NB: this is an OBJECT
    **********************/
    var default_options = {
        yaxis:{
            color:"#545454",
            tickColor:"#dddddd",
            tickFormatter:suffix_formatter,
            zoomRange:false,
            panRange:false,
            autoscaleMargin: 0.05,
            axisLabelUseCanvas:true,
            axisLabelColor:'rgb(84,84,84)',
        },
        xaxis:{
            color:"#545454",
            tickColor:"#dddddd",
            tickFormatter:suffix_formatter,
            labelHeight:1,
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
        },
        legend:{
            labelFormatter:legendFormatter,
            position:'nw',
            backgroundOpacity:0.7
        },
        colors:['#268bd2','#dc322f','#859900','#b58900','#6c71c4','#d33682','#2aa198']
    }
    
/****************************************************
*****************************************************
Graphing functions
*****************************************************
*****************************************************/
    
    // helper function that returns a new generic placeholder div
    function get_plotdiv(){
        var minHeight;
        if (compactPlot){
            minHeight = 80;
        } else {
            minHeight = 130;
        }
        return $('<div class="placeholder" style="width:100%;height:90%;\
min-height:'+minHeight+'px"></div>');
    }
    
    function get_novaldiv(node){
        var div = $('<div class="alert alert-danger">No values to plot for node '+node+
                    '<button class="close" type="button" data-dismiss="alert">&times;\
</button></div>');
        return div;
    }
    
    function addCloseBtn(div){
        var closeBtn = $('<button class="close plot-close">\u00D7</button>');
        closeBtn.on("click",function(){
            div.hide();
            allPlots.splice(allPlots.indexOf(div.find('.placeholder').data("plot")),1);
        });
        div.prepend(closeBtn);
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
            
            if (p == 0){
                dataseries.push({
                    label: 'time',
                    data: results._time_.map(function(val){return [val,val]}),
                    yUnits: 's',
                    color: 'rgba(0,0,0,0)'
                });
            }
            
            // repeat for each node
            for (var i = 0; i < plot_nodes.length; i += 1) {
                var node = plot_nodes[i];
                
                // get the results for the given node
                var values = results[node];
                if (values === undefined) {
                    var novaldiv = get_novaldiv(node);
                    div.prepend(novaldiv);
                    continue;
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
                    label: node,
                    data: plot,
                    xUnits: 's',
                    yUnits: current ? 'A' : 'V'
                });
            }
            
            if (dataseries.length == 0 || (p == 0 && dataseries.length == 1)) {
                continue;
            }
            
            var xmin = results._time_[0];
            var xmax = results._time_[plot.length-1];
            
            // prepare a div
            var wdiv = $('<div class="plot-wrapper"></div>');
            addCloseBtn(wdiv);
            if (compactPlot){
                wdiv.css("margin-bottom",'-10px');
            }
//            var ldiv;
//            if (compactPlot){
//                ldiv = $('<div class="plot-legend"></div>');
//                wdiv.append(ldiv);
//            }
            var plotdiv = get_plotdiv();
            wdiv.append(plotdiv);
            div.append(wdiv);
            
            // customize options
            var options = $.extend(true,{},default_options);
            if (compactPlot) {
                options.xaxis.font = {color:'rgba(0,0,0,0)',
                                      size:1
                                     }
                options.yaxis.font = {color:'rgba(0,0,0,0)',
                                      size:1
                                     }
            } else {
                options.yaxis.axisLabel = current ? 'Amps (A)' : 'Volts (V)';
            }
            options.xaxis.zoomRange = [null, (xmax-xmin)];
            options.xaxis.panRange = [xmin, xmax];
            
            options.xaxis.units = 's';
            options.yaxis.units = current? 'A' : 'V';
            
        
            // graph the data
            var plotObj = $.plot(plotdiv,dataseries,options);
            graph_setup(wdiv,plotObj);
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
                    var novaldiv = get_novaldiv(node);
                    div.prepend(novaldiv);
                    continue;
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
            addCloseBtn(div1);
            var plotDiv = get_plotdiv();
            div.append(div1);
            div1.append(plotDiv);
            
            // customize options for magnitude graph
            var options = $.extend(true, {}, default_options);
            options.yaxis.axisLabel = 'Magnitude (dB)';
            options.xaxis.axisLabel = 'Frequency (log Hz)';
            options.xaxis.zoomRange = [null,(xmax-xmin)];
            options.xaxis.panRange = [xmin, xmax];
            
            // graph magnitude
            var plotObj = $.plot(plotDiv, mplots, options);
            graph_setup(div1, plotObj);
            
            // prepare divs for phase graphs
            var div2 = $('<div class="plot-wrapper"></div>');
            addCloseBtn(div2);
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
    
    /**************************
    DC plot
    **************************/
    function dc_plot(div, results, plots, sweep1, sweep2){
        if (sweep1 === undefined) return;
    
        console.log("results:",results);
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
                var plot = [];
                for (var j = 0; j < values.length; j += 1) {
                    plot.push([x[j],values[j]]);
                }
                var current = (node.length > 2 && node[0]=='I' && node[1]=='(');
                var name = current ? node : "Node " + node; 
                if (sweep2 !== undefined) name += " with " + sweep2.source + "=" + x2;
                
                dataseries.push({label: name,
                                 data: plot,
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
        
        var options = $.extend(true, {}, default_options);
        options.xaxis.axisLabel = 'Volts (V)';
        options.xaxis.units = 'V';
        options.xaxis.zoomRange = [null,(xmax-xmin)];
        options.xaxis.panRange = [xmin, xmax];
        options.yaxis.axisLabel = current? 'Amps (A)' : 'Volts (V)';
        options.yaxis.units = current? 'A' : 'V';
        
        var plotObj = $.plot(plotdiv, dataseries, options);
        graph_setup(wdiv, plotObj);
    }
    
    /******************************
    Simulate: given a string, parse it and run the requested simulation(s)
    
    Modified from a function by Chris Terman
    *******************************/
    var analyses;
    var current_analysis;
    var current_results;
    var bigDiv;
    
    function simulate(text, filename, div, error_callback){
        // input string, filename, callback
        Parser.parse(text, filename, function(data){run_simulation(data,div);},
                     error_callback,true);
    }
    
    function run_simulation(parsed,div) {
        div.empty();  // we'll fill this with results
        bigDiv = div;
        $('#graphScrollInner').width($('#graphScrollOuter').width());
        
        var netlist = parsed.netlist;
        analyses = parsed.analyses;
        var plots = parsed.plots;
        
        allPlots = [];
        
        if (netlist.length === 0) {
            div.html("</br>Empty netlist!");
            return;
        }
        if (analyses.length === 0) {
            div.html("</br>No analyses requested!");
            return;
        }
        if (plots.length === 0) {
            div.html("</br>No plots requested!");
            return;
        }
        
        if (plots.length >= 4){
            compactPlot = true;
        } else {
            compactPlot = false;
        }
        
        
        var tranProgress = $('<div><span></span></br></div>');
        tranProgress.hide();
        div.append(tranProgress);
        var tranHalt = false;
        var haltButton = $('<button class="btn btn-danger">Halt</button>');
        haltButton.tooltip({title:'Halt Simulation',delay:100,container:'body'});
        haltButton.on("click",function(){
            tranHalt = true;
        });
        tranProgress.append(haltButton);
        
        try {
            current_analysis = analyses[0];
            $('#addPlotButton').data('button').enable();
            switch (current_analysis.type) {
            case 'tran':
                tranProgress.show();
                var progressTxt = tranProgress.find('span');
                try{
                    cktsim.transient_analysis(netlist, current_analysis.parameters.tstop,
                                              [], function(pct_complete, results) {
                        progressTxt.text("Performing Transient Analysis... "+pct_complete+"%");
                        if (results){
                            tranProgress.hide();
                            current_results = results;
                            $('#results').data("current",results);
                            tran_plot(div, current_results, plots);
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
                    current_results = cktsim.ac_analysis(netlist, current_analysis.parameters.fstart,
                                                     current_analysis.parameters.fstop,
                                                     current_analysis.parameters.ac_source_name);
                    $('#results').data("current",current_results);
                    ac_plot(div, current_results, plots);
                } catch (err) {
                    div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                '.\<button class="close" data-dismiss="alert">&times;</button></div>');
                }
                break;
            case 'dc':
                try {
                    current_results = cktsim.dc_analysis(netlist,current_analysis.parameters.sweep1,
                                                         current_analysis.parameters.sweep2);
                    dc_plot(div, current_results, plots, current_analysis.parameters.sweep1,
                           current_analysis.parameters.sweep2);
                } catch (err) {
                    div.prepend('<div class="alert alert-danger">Simulation error: '+err+
                                '.\<button class="close" data-dismiss="alert">&times;</button></div>');
                }
//                console.log("dc results:",current_results);
                break;
            }
        }
        catch (err) {
            throw new Parser.CustomError(err,current_analysis.line,0);
        }
    }

    
    function setup(){
        general_setup();
        scrollbar_setup();
    }
/*********************
Exports
**********************/
    return {setup:setup,
            simulate:simulate,
            engineering_notation:engineering_notation};
    
}());
