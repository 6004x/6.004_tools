// convert string argument to a number, accepting usual notations
// (hex, octal, binary, decimal, floating point) plus engineering
// scale factors (eg, 1k = 1000.0 = 1e3).
// return default if argument couldn't be interpreted as a number
function parse_number(x) {
    var m;

    m = x.match(/^\s*([\-+]?)0x([0-9a-fA-F]+)\s*$/); // hex
    if (m) return parseInt(m[1] + m[2], 16);

    m = x.match(/^\s*([\-+]?)0b([0-1]+)\s*$/); // binary
    if (m) return parseInt(m[1] + m[2], 2);

    m = x.match(/^\s*([\-+]?)0([0-7]+)\s*$/); // octal
    if (m) return parseInt(m[1] + m[2], 8);

    m = x.match(/^\s*[\-+]?[0-9]*(\.([0-9]+)?)?([eE][\-+]?[0-9]+)?\s*$/); // decimal, float, exponential
    if (m) return parseFloat(m[0]);

    m = x.match(/^\s*([\-+]?[0-9]*(\.?([0-9]+)))([A-Za-z]+)/); // decimal, float
    if (m) {
        var result = parseFloat(m[1]);
        var scale = m[4][0];
        if (scale == 'P') result *= 1e15; // peta
        else if (scale == 't' || scale == 'T') result *= 1e12; // tera
        else if (scale == 'g' || scale == 'G') result *= 1e9; // giga
        else if (scale == 'M') result *= 1e6; // mega
        else if (scale == 'k' || scale == 'K') result *= 1e3; // kilo
        else if (scale == 'm') result *= 1e-3; // milli
        else if (scale == 'u' || scale == 'U') result *= 1e-6; // micro
        else if (scale == 'n' || scale == 'N') result *= 1e-9; // nano
        else if (scale == 'p') result *= 1e-12; // pico
        else if (scale == 'f' || scale == 'F') result *= 1e-15; // femto
        else if (scale == 'a' || scale == 'A') result *= 1e-18; // atto
        return result;
    }

    throw "Number expected";
}

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

function dc_plot(div, results, plots, sweep1, sweep2) {
    if (sweep1 === undefined) return;

    for (var p = 0; p < plots.length; p += 1) {
        var node = plots[p][0]; // for now: only one value per plot
        var series = [];
        var index2 = 0;
        while (true) {
            var values;
            var x, x2;
            if (sweep2 === undefined) {
                values = results[node];
                x = results['_sweep1_'];
            }
            else {
                values = results[index2][node];
                x = results[index2]['_sweep1_'];
                x2 = results[index2]['_sweep2_'];
                index2 += 1;
            }

            if (values === undefined) {
                div.text("No values to plot for node " + node);
                return;
            }
            var plot = [];
            for (var j = 0; j < values.length; j += 1) {
                plot.push([x[j], values[j]]);
            }
            var current = (node.length > 2 && node[0] == 'I' && node[1] == '(');
            var name = current ? node : "Node " + node;
            if (sweep2 !== undefined) name += " with " + sweep2.source + "=" + x2;
            series.push({
                name: name,
                data: plot,
                lineWidth: 5,
                units: current ? 'Amps (A)' : 'Volts (V)'
            });

            if (sweep2 === undefined || index2 >= results.length) break;
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
                    text: 'Volts (V)'
                },
                labels: {
                    formatter: suffix_formatter
                },
                type: 'linear',
                gridLineWidth: 1
            },
            yAxis: {
                title: {
                    text: series[0].units //'Volts (v)'
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

function tran_plot(div, results, plots) {
    if (results === undefined) {
        div.text("No results!");
        return;
    }

    for (var p = 0; p < plots.length; p += 1) {
        var plot_nodes = plots[p];
        var series = [];
        for (var i = 0; i < plot_nodes.length; i += 1) {
            var node = plot_nodes[i];
            var values = results[node];
            if (values === undefined) {
                div.text("No values to plot for node " + node);
                return;
            }
            var plot = [];
            for (var j = 0; j < values.length; j += 1) {
                plot.push([results._time_[j], values[j]]);
            }
            var current = (node.length > 2 && node[0] == 'I' && node[1] == '(');
            series.push({
                name: current ? node : "Node " + node,
                data: plot,
                lineWidth: 5,
                units: current ? 'Amps (A)' : 'Volts (V)'
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
                    text: series[0].units //'Volts (v)'
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

function ac_plot(div, results, plots) {
    if (results === undefined) {
        div.text("No results!");
        return;
    }

    for (var p = 0; p < plots.length; p += 1) {
        var plot_nodes = plots[p];
        var mplots = [];
        var pplots = [];
        for (var i = 0; i < plot_nodes.length; i += 1) {
            var node = plot_nodes[i];
            if (results[node] === undefined) {
                div.text('No values to plot for node ' + node);
                return;
            }
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
}

// parse number or f(number,...)
function parse_source(s) {
    src = {};
    var m = s.match(/^\s*(\w+)\s*\(([^\)]*)\)\s*$/); // parse f(arg,arg,...)
    if (m) {
        src.type = m[1];
        if (m[2] === '') src.args = [];
        else src.args = m[2].split(/\s*,\s*/).map(parse_number);
    } else {
	src.type = 'dc';
	src.args = [parse_number(s)];
    }
    return src;
}

// parse "prop=value" tokens
function parse_properties(tokens, properties) {
    for (var i = 0; i < tokens.length; i += 1) {
        var parts = tokens[i].split('=');
        if (parts.length != 2 || parts[0].length === 0 || parts[1].length === 0) throw "Malformed parameter: " + tokens[i];
        properties[parts[0]] = parse_number(parts[1]);
    }
}

var device_types = {
    'R': "resistor",
    'C': "capacitor",
    'L': "inductor",
    'V': "voltage source",
    'I': "current source",
    'N': "nfet",
    'P': "pfet"
};

function parse_netlist(text) {
    var netlist = [];
    netlist.push({type: 'ground', connections: ['gnd'], properties: {}});   // define ground node
    var analyses = [];
    var plots = [];
    var lines = text.split('\n');
    var properties;
    for (var i = 0; i < lines.length; i += 1) {
        var tokens = lines[i].split(/\s+/);
        if (tokens[0].length === 0) continue;
        var device = tokens[0][0].toUpperCase();
        switch (device) {
        case '*':
            // comment!
            break;
        case 'R':
            // resistor: Rname n1 n2 value
        case 'C':
            // capacitor: Cname n1 n2 value
        case 'L':
            // inductor: Lname n1 n2 value
            if (tokens.length != 4) return "Malformed device statement: " + lines[i];
            netlist.push({
                type: device_types[device],
                connections: {
                    n1: tokens[1],
                    n2: tokens[2]
                },
                properties: {
                    name: tokens[0],
                    value: parse_number(tokens[3])
                }
            });
            break;
        case 'V':
            // voltage source: Vname nplus nminus source_function
        case 'I':
            // current source: Iname nplus nminus source_function
            if (tokens.length != 4) return "Malformed source statement:" + lines[i];
            netlist.push({
                type: device_types[device],
                connections: {
                    nplus: tokens[1],
                    nminus: tokens[2]
                },
                properties: {
                    name: tokens[0],
                    value: parse_source(tokens[3])   // parse numbers....
                }
            });
            break;
        case 'N':
            // nfet: Nname drain gate source W=number L=number
        case 'P':
            // pfet: Pname drain gate source W=number L=number
            if (tokens.length < 4) return "Malformed fet statement: " + lines[i];
            properties = {
                name: tokens[0]
            };
            try {
                parse_properties(tokens.slice(4), properties);
            }
            catch (e) {
                return e;
            }
            if (properties.W === undefined) return "fet missing W parameterL: " + lines[i];
            if (properties.L === undefined) properties.L = 1;
            netlist.push({
                type: device_types[device],
                connections: {
                    D: tokens[1],
                    G: tokens[2],
                    S: tokens[3]
                },
                properties: properties
            });
            break;
        case 'O':
            // opamp: Oname nplus nminus output gnd A
            if (tokens.length != 6) return "Malformed opamp statement: " + lines[i];
            netlist.push({
                type: "opamp",
                connections: {
                    nplus: tokens[1],
                    nminus: tokens[2],
                    output: tokens[3],
                    ground: tokens[4]
                },
                properties: {
                    name: tokens[0],
                    A: parse_number(tokens[5])
                }
            });
            netlist.push
            break;
        case '.':
            switch (tokens[0]) {
            case '.tran':
                // .tran 10u
                if (tokens.length != 2) return "Malformed .tran statement";
                analyses.push({
                    type: 'tran',
                    tstop: parse_number(tokens[1])
                });
                break;
            case '.ac':
                // .ac source fstart fstop
                if (tokens.length != 4) return "Malformed .ac statement";
                analyses.push({
                    type: 'ac',
                    source: tokens[1],
                    fstart: parse_number(tokens[2]),
                    fstop: parse_number(tokens[3])
                });
                break;
            case '.dc':
                // .dc [src1 start1 stop1 step1 [src2 start2 stop2 step2]]
                if (tokens.length == 1) analyses.push({
                    type: 'dc'
                });
                else if (tokens.length == 5) analyses.push({
                    type: 'dc',
                    sweep1: {
                        source: tokens[1],
                        start: parse_number(tokens[2]),
                        stop: parse_number(tokens[3]),
                        step: parse_number(tokens[4])
                    }
                });
                else if (tokens.length == 9) analyses.push({
                    type: 'dc',
                    sweep1: {
                        source: tokens[1],
                        start: parse_number(tokens[2]),
                        stop: parse_number(tokens[3]),
                        step: parse_number(tokens[4])
                    },
                    sweep2: {
                        source: tokens[5],
                        start: parse_number(tokens[6]),
                        stop: parse_number(tokens[7]),
                        step: parse_number(tokens[8])
                    }
                });
                else return "Malformed .dc statement";
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
    return {
        netlist: netlist,
        analyses: analyses,
        plots: plots
    };
}

function simulate(text, div) {
    div.empty(); // we'll fill this with results
    var parse = parse_netlist(text);
    if ((typeof parse) === 'string') {
        div.text(parse);
        return;
    }
    //else div.append('<p>'+JSON.stringify(parse));

    var netlist = parse.netlist;
    var analyses = parse.analyses;
    var plots = parse.plots;

    if (netlist.length === 0) return;
    if (analyses.length === 0) return;

    try {
        var analysis = analyses[0];
        switch (analysis.type) {
        case 'tran':
            cktsim.transient_analysis(netlist, analysis.tstop, [], function(ignore, results) {
                tran_plot(div, results, plots);
            });
            break;
        case 'ac':
            var results = cktsim.ac_analysis(netlist, analysis.fstart, analysis.fstop, analysis.source);
            ac_plot(div, results, plots);
            break;
        case 'dc':
            var results = cktsim.dc_analysis(netlist, analysis.sweep1, analysis.sweep2);
            dc_plot(div, results, plots, analysis.sweep1, analysis.sweep2);
            break;
        }
    }
    catch (e) {
        div.append(e);
    }
}

function setup_test(div) {
    var text = div.text();
    div.empty();
    div.append('<hr></hr><textarea rows="10" cols="50"></textarea><button style="vertical-align:top">Simulate</button><div class="results"></div>');
    var textarea = div.find('textarea');
    var plotdiv = div.find('.results');

    div.find('button').on('click', function() {
        simulate(textarea.val(), plotdiv);
    });

    textarea.val(text);
    simulate(text, plotdiv);
}

$(document).ready(function() {
    $('.cktsim').each(function() {
        setup_test($(this));
    });
});