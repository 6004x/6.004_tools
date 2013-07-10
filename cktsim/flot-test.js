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

function suffix_formatter(value,axis) {
//    console.log("value:",value,"formatted:",
//                engineering_notation(value,2));
    return engineering_notation(value, 2);
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
                div.text("No values to plot for node "+node);
                return;
            }
            var plot = [];
            for (var j = 0; j < values.length; j += 1) {
                plot.push([results._time_[j], values[j]]);
            }
            var current = (node.length > 2 && node[0]=='I' && node[1]=='(');
            series.push({
                label: current ? node : "Node " + node,
                data: plot,
//                lineWidth: 5,
//                units: current ? 'Amps (A)' : 'Volts (V)'
            });
        }
        var plotdiv = $('<div style="width:600px;height:300px"></div>');
        div.append(plotdiv);
        var options = {
            yaxis:{
                axisLabel: current ? 'Amps (A)' : 'Volts (V)',
                color:"#848484",
                tickColor:"#dddddd",
                tickFormatter:suffix_formatter,
                zoomRange:false,
                panRange:false
            },
            xaxis:{
                axisLabel:'Time (s)',
                color:"#848484",
                tickColor:"#dddddd",
                tickFormatter:suffix_formatter,
                zoomRange:[null,(
                    results._time_[plot.length-1]-
                    results._time_[0])],
                panRange:[results._time_[0],
                          results._time_[plot.length-1]]
            },
            zoom:{
                interactive:true,
                trigger:"dblclick"
            },
            series:{
                shadowSize:0 
            },
            crosshair:{
                mode:"x",
                color:"#e8cfac"
            },
            selection:{
                mode:"x"
            }
        }
        var plotObj = $.plot(plotdiv,series,options);
        
        var zoomInButton = $('<button>+</button>');
        var zoomResetButton = $('<button>Reset</button>');
        var zoomOutButton = $('<button>-</button>');
        var scrollLeftButton = $('<button>\<</button>');
        var scrollRightButton = $('<button>\></button>');
        zoomInButton.on("click",function(){
            plotObj.zoom();
        });
        zoomResetButton.on("click",function(){
            plotObj.zoom({amount:1e-10});
        });
        zoomOutButton.on("click",function(){
            plotObj.zoomOut();
        });
        scrollLeftButton.on("click",function(){
            plotObj.pan({left:-100});
        });
        scrollRightButton.on("click",function(){
            plotObj.pan({left:100});
        });
        
        div.append(zoomInButton,
                   zoomResetButton,
                   zoomOutButton,
                   scrollLeftButton,
                  scrollRightButton);
        console.log("data:",plotObj.getData());
        
        
        
//        var options = {
//            chart: {
//                type: 'line'
//            },
//            title: {
//                text: '' //title
//            },
//            xAxis: {
//                title: {
//                    text: 'Time (s)'
//                },
//                labels: {
//                    formatter: suffix_formatter
//                },
//                type: 'linear',
//                gridLineWidth: 1
//            },
//            yAxis: {
//                title: {
//                    text: series[0].units //'Volts (v)'
//                },
//                labels: {
//                    formatter: suffix_formatter
//                },
//                type: 'linear',
//            },
//            series: series,
//            plotOptions: {
//                line: {
//                    marker: {
//                        enabled: false
//                    }
//                }
//            },
//        };
//        plotdiv.highcharts(options);
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
                div.text('No values to plot for node '+node);
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

/*
// parse "prop=value" tokens
function parse_properties(tokens,properties) {
    for (var i = 0; i < tokens.length; i += 1) {
        var parts = tokens[i].split('=');
        if (parts.length != 2 || parts[0].length===0 || parts[1].length===0) throw "Malformed parameter: " + tokens[i];
        properties[parts[0]] = parts[1];
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
}

function parse_netlist(text) {
    var netlist = [];
    var analyses = [];
    var plots = [];
    var lines = text.split('\n');
    var properties,j;
    for (var i = 0; i < lines.length; i += 1) {
        var tokens = lines[i].split(/\s+/);
        if (tokens[0].length === 0) continue;
        var device = tokens[0][0].toUpperCase();
        switch (device) {
            case '*':   // comment!
                break;
            case 'R':   // resistor: Rname n1 n2 value
            case 'C':   // capacitor: Cname n1 n2 value
            case 'L':   // inductor: Lname n1 n2 value
                if (tokens.length != 4) return "Malformed device statement: " + lines[i];
                netlist.push({
                    type: device_types[device],
                    connections: {n1: tokens[1], n2: tokens[2]},
                    properties: {name: tokens[0], value: tokens[3]}
                });
                break;
            case 'V':   // voltage source: Vname nplus nminus source_function
            case 'I':   // current source: Iname nplus nminus source_function
                if (tokens.length != 4) return "Malformed source statement:" + lines[i];
                netlist.push({
                    type: device_types[device],
                    connections: {nplus: tokens[1], nminus: tokens[2]},
                    properties: {name: tokens[0], value: tokens[3]}
                });
                break;
            case 'N':   // nfet: Nname drain gate source W=number L=number
            case 'P':   // pfet: Pname drain gate source W=number L=number
                if (tokens.length < 4) return "Malformed fet statement: " + lines[i];
                properties = {name: tokens[0]};
                try {
                    parse_properties(tokens.slice(4),properties);
                } catch (e) {
                    return e;
                }
                if (properties.W === undefined)
                    return "fet missing W parameterL: "+ lines[i];
                if (properties.L === undefined) properties.L = 1;
                netlist.push({
                    type: device_types[device],
                    connections: {D: tokens[1], G: tokens[2], S: tokens[3]},
                    properties: properties
                });
                break;
            case 'O':   // opamp: Oname nplus nminus output gnd A
                if (tokens.length != 6) return "Malformed opamp statement: " + lines[i];
                netlist.push({
                    type: "opamp",
                    connections: {nplus: tokens[1], nminus: tokens[2], output: tokens[3], ground: tokens[4]},
                    properties: {name: tokens[0], A: tokens[5]}
                });
                netlist.push
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
} */

function simulate(text,div) {
    div.empty();  // we'll fill this with results
    try{
        var parse = Parser.parse(text);
    } catch (e) {
        div.append("Message: ",e.message,"\nLine: ",e.line,"\nColumn: ",e.column);
    }
//    var parse = parse_netlist(text);
    if ((typeof parse) === 'string') {
        div.text(parse);
        return;
    }
    var netlist = parse.netlist;
    var analyses = parse.analyses;
    var plots = parse.plots;
    
//    console.log("My netlist:",netlist);
    
    if (netlist.length === 0) return;
    if (analyses.length === 0) return;

    try {
        var analysis = analyses[0];
        switch (analysis.type) {
        case 'tran':
            cktsim.transient_analysis(netlist, analysis.parameters.tstop, [], function(ignore, results) {
                tran_plot(div, results, plots);
            });
            break;
        case 'ac':
            var results = cktsim.ac_analysis(netlist, analysis.parameters.fstart, analysis.parameters.fstop, analysis.parameters.ac_source_name);
            ac_plot(div, results, plots);
            break;
        case 'dc':
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

    div.find('button').on('click',function () {
        simulate(textarea.val(),plotdiv)
    })

    textarea.val(text);
    simulate(text,plotdiv);
}

$(document).ready(function() {
    $('.cktsim').each(function() {
        setup_test($(this));
    });
});
