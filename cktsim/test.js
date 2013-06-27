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

function suffix_formatter() {
    return engineering_notation(this.value,2);
}

function label_formatter() {
    return engineering_notation(this.y,2);
}

function tran_plot(plotdiv,title,results,plot_nodes) {
    if (results === undefined) return;

    var plots = [];
    for (var i = 0; i < plot_nodes.length; i += 1) {
	var node = plot_nodes[i];
	var values = results[node];
	var plot = [];
	for (var j = 0; j < values.length; j += 1)
	    plot.push([results._time_[j],values[j]]);
	plots.push({name: "Node "+node, data: plot, lineWidth: 5});
    }
    plotdiv.highcharts({
	    chart: { type: 'line' },
		title: { text: title },
		xAxis: { title: {text: 'Time (s)'},
 		         labels: {formatter: suffix_formatter},
			 type: 'linear',
		       },
		yAxis: { title: {text: 'Volts (v)'},
 		         labels: {formatter: suffix_formatter},
			 type: 'linear',
		       },
		series: plots,
		plotOptions: {line: {marker: {enabled: false}}},
	});
}

function ac_plot(plotdiv,title,results,plot_nodes) {
    if (results === undefined) return;

    var mplots = [];
    var pplots = [];
    for (var i = 0; i < plot_nodes.length; i += 1) {
	var node = plot_nodes[i];
	var magnitudes = results[node].magnitude;
	var phases = results[node].phase;
	var mplot = [];
	var pplot = [];
	for (j = 0; j < magnitudes.length; j += 1) {
	    var log_freq = Math.log(results._frequencies_[j])/Math.LN10;
	    mplot.push([log_freq,magnitudes[j]]);
	    pplot.push([log_freq,phases[j]]);
	}
	mplots.push({name: "Node "+node+" (dB)", data: mplot, lineWidth: 5});
	pplots.push({name: "Node "+node+" phase (deg)", data: pplot, lineWidth: 5});
    }
    plotdiv.highcharts({
	    chart: { type: 'line' },
		title: { text: title },
		xAxis: { title: {text: 'Frequency (log Hz)'},
 		         labels: {formatter: suffix_formatter},
		       },
		yAxis: { title: {text: 'Magnitude (dB)'},
	                 labels: {formatter: suffix_formatter},
		       },
		series: mplots,
		plotOptions: {line: {marker: {enabled: false}}},
	});
}

function setup_test(div) {
    var netlist = JSON.parse(div.text());
    div.empty();

    var title = div.attr('data-title') || '';
    div.append('<p>',title);
    var plotdiv = $('<div style="width:600px;height:300px"></div>');
    div.append(plotdiv);

    var plot_nodes = div.attr('data-plot').split(',');
    try {
	var analysis = div.attr('data-analysis');
	switch(analysis) {
	case 'tran':
	    var tstop = div.attr('data-tstop');
	    plot_nodes = div.attr('data-plot').split(',');
	    cktsim.transient_analysis(netlist,tstop,[],function(ignore,results) {
		    tran_plot(plotdiv,title,results,plot_nodes);
		});
	    break;
	case 'ac':
	    var fstart = div.attr('data-fstart') || 1;
	    var fstop = div.attr('data-fstop') || 1e9;
	    var ac_source_name = div.attr('ac_source_name');
	    plot_nodes = div.attr('data-plot').split(',');
	    results = cktsim.ac_analysis(netlist,fstart,fstop,ac_source_name);
	    ac_plot(plotdiv,title,results,plot_nodes);
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
