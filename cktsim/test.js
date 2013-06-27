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



function suffix_formatter(val,axis) {
    return engineering_notation(val,axis.tickDecimals);
}

function setup_test(div) {
    var netlist = JSON.parse(div.text());
    div.empty();

    var title = div.attr('data-title');
    div.append('<p>',title);
    var plotdiv = $('<div style="width:600px;height:300px"></div>');
    div.append(plotdiv);

    var plot_nodes,plots,results,i,j;
    var node,values,plot;
    try {
	var options = {
	    xaxis: {
		tickFormatter: suffix_formatter,
	    },
	    yaxis: {
		tickFormatter: suffix_formatter,
	    },
	}

	var analysis = div.attr('data-analysis');
	switch(analysis) {
	case 'tran':
	    var tstop = div.attr('data-tstop');
	    var plot_nodes = div.attr('data-plot').split(',');
	    //options.xaxis.axisLabel = 'Time (s)';
	    //options.xaxis.axisLabelUseCanvas = true;
	    //options.yaxis.axisLabel = 'Volts (V)';
	    //options.yaxis.axisLabelUseCanvas = true;
	    cktsim.transient_analysis(netlist,tstop,[],function(ignore,results) {
		    if (results !== undefined) {
			var plots = [];
			for (var i = 0; i < plot_nodes.length; i += 1) {
			    var node = plot_nodes[i];
			    var values = results[node];
			    var plot = [];
			    for (var j = 0; j < values.length; j += 1)
				plot.push([results._time_[j],values[j]]);
			    plots.push({label: node, data: plot});
			}
			$.plot(plotdiv,plots,options);
		    }
		});
	    break;
	case 'ac':
	    var fstart = div.attr('data-fstart') || 1;
	    var fstop = div.attr('data-fstop') || 1e9;
	    var ac_source_name = div.attr('ac_source_name');
	    plot_nodes = div.attr('data-plot').split(',');
	    results = cktsim.ac_analysis(netlist,fstart,fstop,ac_source_name);
	    //options.xaxis.axisLabel = 'Frequency (log Hz)';
	    //options.xaxis.axisLabelUseCanvas = true;
	    options.yaxes = [{position:"left",
			      tickFormatter:suffix_formatter,
			      //axisLabel:'Magnitude (dB)',axisLabelUseCanvas:true
		             },
			     {position:"right",
			      tickFormatter:suffix_formatter,
			      min:-180, max:180,
			      tickSize:45,
			      //axisLabel:'Phase (deg)',axisLabelUseCanvas:true
                             }];
	    if (results !== undefined) {
		plots = [];
		for (i = 0; i < plot_nodes.length; i += 1) {
		    node = plot_nodes[i];
		    var magnitudes = results[node].magnitude;
		    var phases = results[node].phase;
		    var mplot = [];
		    var pplot = [];
		    for (j = 0; j < magnitudes.length; j += 1) {
			var log_freq = Math.log(results._frequencies_[j])/Math.LN10;
			mplot.push([log_freq,magnitudes[j]]);
			pplot.push([log_freq,phases[j]]);
		    }
		    plots.push({label: node+" (dB)",data: mplot,yaxis:1});
		    plots.push({label: node+" phase (deg)",data: pplot,yaxis:2});
		}
		$.plot(plotdiv,plots,options);
	    }
	    break;
	case 'dc':
	    break;
	}
    } catch (e) { div.append(e) }
}

$(document).ready(function() {
    $('.cktsim').each(function() {
	setup_test($(this));
    });
});
