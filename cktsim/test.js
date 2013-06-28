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
    return engineering_notation(this.value, 2);
}

function tran_plot(div, title, results, plots) {
    if (results === undefined) return;
    
    for (var p = 0; p < plots.length; p += 1) {
        var plot_nodes = plots[p];
        var series = [];
        for (var i = 0; i < plot_nodes.length; i += 1) {
            var node = plot_nodes[i];
            var values = results[node];
            var plot = [];
            for (var j = 0; j < values.length; j += 1) {
                plot.push([results._time_[j], values[j]]);
            }
            series.push({
                name: "Node " + node,
                data: plot,
                lineWidth: 5
            });
        }
        var plotdiv = $('<div style="width:600px;height:300px"></div>');
        div.append(plotdiv);
        var options = {
            chart: {
                type: 'line'
            },
            title: {
                text: '' //title
            },
            xAxis: {
                title: {
                    text: 'Time (s)'
                },
                labels: {
                    formatter: suffix_formatter
                },
                type: 'linear',
                gridLineWidth: 1
            },
            yAxis: {
                title: {
                    text: 'Volts (v)'
                },
                labels: {
                    formatter: suffix_formatter
                },
                type: 'linear',
            },
            series: series,
            plotOptions: {
                line: {
                    marker: {
                        enabled: false
                    }
                }
            },
        };
        plotdiv.highcharts(options);
    }
}

function ac_plot(div, title, results, plot_nodes) {
    if (results === undefined) return;

    var mplots = [];
    var pplots = [];
    for (var i = 0; i < plot_nodes.length; i += 1) {
        var node = plot_nodes[i];
        var magnitudes = results[node].magnitude;
        var phases = results[node].phase;
        var mplot = [];
        var pplot = [];
        for (var j = 0; j < magnitudes.length; j += 1) {
            var log_freq = Math.log(results._frequencies_[j]) / Math.LN10;
            mplot.push([log_freq, magnitudes[j]]);
            pplot.push([log_freq, phases[j]]);
        }
        mplots.push({
            name: "Node " + node,
            data: mplot,
            lineWidth: 5
        });
        pplots.push({
            name: "Node " + node,
            data: pplot,
            lineWidth: 5
        });
    }

    var plotdiv = $('<div style="display: inline-block; width:400px;height:300px"></div>');
    div.append(plotdiv);
    plotdiv.highcharts({
        chart: {
            type: 'line'
        },
        title: {
            text: '' //title
        },
        xAxis: {
            title: {
                text: 'Frequency (log Hz)'
            },
            labels: {
                formatter: suffix_formatter
            },
            gridLineWidth: 1
        },
        yAxis: {
            title: {
                text: 'Magnitude (dB)'
            },
            labels: {
                formatter: suffix_formatter
            },
        },
        series: mplots,
        plotOptions: {
            line: {
                marker: {
                    enabled: false
                }
            }
        },
    });

    plotdiv = $('<div style="display: inline-block; width:400px;height:300px"></div>');
    div.append(plotdiv);
    plotdiv.highcharts({
        chart: {
            type: 'line'
        },
        title: {
            text: title
        },
        xAxis: {
            title: {
                text: 'Frequency (log Hz)'
            },
            labels: {
                formatter: suffix_formatter
            },
            gridLineWidth: 1
        },
        yAxis: {
            title: {
                text: 'Phase (deg)'
            },
            labels: {
                formatter: suffix_formatter
            },
            min: -180,
            max: 180,
            tickInterval: 45,
            startOnTick: false,
            endOnTick: false
        },
        series: pplots,
        plotOptions: {
            line: {
                marker: {
                    enabled: false
                }
            }
        },
    });
}

function parse_netlist(text) {
    var netlist = [];
    var analyses = [];
    var plots = [];
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i += 1) {
        var tokens = lines[i].split(/\s+/);
        if (tokens[0].length === 0) continue;
        switch (tokens[0][0]) {
            case '*':   // comment!
                break;
            case 'R':
                if (tokens.length != 4) return "Malformed R statement";
                netlist.push({
                    type: "resistor",
                    connections: {n1: tokens[1], n2: tokens[2]},
                    properties: {name: tokens[0], r: tokens[3]}
                });
                break;
            case 'C':
                if (tokens.length != 4) return "Malformed C statement";
                netlist.push({
                    type: "capacitor",
                    connections: {n1: tokens[1], n2: tokens[2]},
                    properties: {name: tokens[0], c: tokens[3]}
                });
                break;
            case 'L':
                if (tokens.length != 4) return "Malformed L statement";
                netlist.push({
                    type: "inductor",
                    connections: {n1: tokens[1], n2: tokens[2]},
                    properties: {name: tokens[0], l: tokens[3]}
                });
                break;
            case 'V':
                if (tokens.length != 4) return "Malformed V statement";
                netlist.push({
                    type: "voltage source",
                    connections: {nplus: tokens[1], nminus: tokens[2]},
                    properties: {name: tokens[0], value: tokens[3]}
                });
                break;
            case '.':
                switch (tokens[0]) {
                    case '.tran':   // .tran 10u
                        if (tokens.length != 2) return "Malformed .tran statement";
                        analyses.push({type: 'tran', tstop: tokens[1]});
                        break;
                    case '.ac':     // .ac source fstart fstop
                        if (tokens.length != 4) return "Malformed .ac statement";
                        analyses.push({type: 'ac', ac_source_name: tokens[1], fstart: tokens[2], fstop: tokens[3]});
                        break;
                    case '.plot':
                        if (tokens.length <= 1) return "Malformed .plot statement";
                        plots.push(tokens.slice(1));
                        break;
                    default:
                        return 'Unrecognized control card: ' + tokens[0];
                }
                break;
            default:
                return 'Unrecognized device: ' + tokens[0];
        }
        
    }
    console.log(JSON.stringify(netlist));
    return {netlist: netlist, analyses: analyses, plots: plots};
}

function setup_test(div) {
    var text = div.text();
    var parse = parse_netlist(text);
    div.empty();
    div.append('<hr></hr><pre></pre>');
    div.find('pre').text(text);
    
    if ((typeof parse) === 'string') {
        div.text(parse);
        return;
    }
    var netlist = parse.netlist;
    var analyses = parse.analyses;
    var plots = parse.plots;
    if (netlist.length === 0) return;
    if (analyses.length === 0) return;

    var title = div.attr('data-title') || '';

    try {
        var analysis = analyses[0];
        switch (analysis.type) {
        case 'tran':
            cktsim.transient_analysis(netlist, analysis.tstop, [], function(ignore, results) {
                tran_plot(div, title, results, plots);
            });
            break;
        case 'ac':
            var fstart = div.attr('data-fstart') || 1;
            var fstop = div.attr('data-fstop') || 1e9;
            var ac_source_name = div.attr('ac_source_name');
            plot_nodes = div.attr('data-plot').split(',');
            var results = cktsim.ac_analysis(netlist, fstart, fstop, ac_source_name);
            ac_plot(div, title, results, plot_nodes);
            break;
        case 'dc':
            break;
        }
    }
    catch (e) {
        div.append(e);
    }
}

$(document).ready(function() {
    $('.cktsim').each(function() {
        setup_test($(this));
    });
});
