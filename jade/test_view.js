// Copyright (C) 2011-2014 Massachusetts Institute of Technology
// Chris Terman

// keep jslint happy
//var console,JSON;

var test_view = (function() {

    //////////////////////////////////////////////////////////////////////
    //
    // Test editor
    //
    //////////////////////////////////////////////////////////////////////

    /* example test script:

     // set up Vdd, establish signaling voltages
     .power Vdd=1
     .thresholds Vol=0 Vil=0.1 Vih=0.9 Voh=1

     // test actions are applied to named groups of signals.
     // A signal can appear in more than one group.  Order
     // of groups and signals within each group determine 
     // order of values on each line of test values
     .group inputs A B
     .group outputs Z

     // tests are sequences of lines supplying test values; .cycle specifies
     // actions that will be performed for each test.  Available actions are
     //   assert <group> -- set values for signals in <group> with H,L test values
     //   deassert <group> -- stop setting values for signals in <group> with H,L test values
     //   sample <group> -- check values of signals in <group> with 0,1 test values
     //   tran <time> -- run transient simulation for specified time interval
     //   <signal>=<val> -- set signal to specified value
     .cycle assert inputs tran 9n sample outputs tran 1n

     // the tests themselves -- one test per line
     //   to assert signal this cycle use 0,1,Z
     //   to sample signal this cycle use L,H
     //   use - if signal shouldn't be asserted/sampled
     // whitespace can be used to improve readability
     00 L
     01 H
     10 H 
     11 L

     */

    function TestEditor(div, jade) {
        this.parent = $(div);
        this.jade = jade;
        this.status = jade.status;
        this.module = undefined;
        this.aspect = undefined;
        this.test_component = undefined;

        var textarea = $('<textarea class="jade-test-editor" spellcheck="false"></textarea>');
        this.textarea = textarea;
        // on changes, update test component of module's test aspect
        var editor = this;  // for closure
        textarea.on('mouseleave',function() {
            if (editor.test_component) {
                var text = textarea.val();
                if (editor.test_component.test != text) {
                    editor.test_component.test = text;
                    editor.aspect.set_modified(true);
                }
            }
        });
        div.appendChild(textarea[0]);
    }

    TestEditor.prototype.resize = function(w, h, selected) {
        var e = this.textarea;

        // .jade-test-editor: border: 1, padding-l/r: 6, padding-t/b: 4
        w -= 14;
        h -= 10;

        e.width(w);
        e.height(h);
    };

    TestEditor.prototype.show = function() {
        this.textarea.focus(); // capture key strokes
        this.resize(this.parent.width(),this.parent.height(),true);
    };

    TestEditor.prototype.set_aspect = function(module) {
        this.module = module;
        this.aspect = module.aspect('test');
        this.test_component = this.aspect.components[0];
        if (this.test_component === undefined) {
            this.test_component = jade_model.make_component(["test",""]);
            this.aspect.add_component(this.test_component);
        }
        this.textarea.val(this.test_component.test);
    };

    TestEditor.prototype.event_coords = function () { };

    TestEditor.prototype.check = function () {
        var source = this.textarea.val();

        // remove multiline comments, in-line comments
        source = source.replace(/\/\*(.|\n)*?\*\//g,'');   // multi-line using slash-star
        source = source.replace(/\/\/.*\n/g,'\n');

        var i,j,k,v;
        var plots = [];     // list of signals to plot
        var tests = [];     // list of test lines
        var power = {};     // node name -> voltage
        var thresholds = {};  // spec name -> voltage
        var cycle = [];    // list of test actions: [action args...]
        var groups = {};   // group name -> list of indicies
        var signals = [];  // list if signals in order that they'll appear on test line
        var driven_signals = {};   // if name in dictionary it will need a driver ckt
        var sampled_signals = {};   // if name in dictionary we want its value
        var errors = [];

        // process each line in test specification
        source = source.split('\n');
        for (k = 0; k < source.length; k += 1) {
            var line = source[k].match(/([A-Za-z0-9_.\[\]]+|=|-)/g);
            if (line === null) continue;
            if (line[0] == '.power' || line[0] == '.thresholds') {
                // .power/.thresholds name=float name=float ...
                for (i = 1; i < line.length; i += 3) {
                    if (i + 2 >= line.length || line[i+1] != '=') {
                        errors.push('Malformed '+line[0]+' statement: '+source[k]);
                        break;
                    }
                    v = jade_utils.parse_number(line[i+2]);
                    if (isNaN(v)) {
                        errors.push('Unrecognized voltage specification "'+line[i+2]+'": '+source[k]);
                        break;
                    }
                    if (line[0] == '.power') power[line[i]] = v;
                    else thresholds[line[i]] = v;
                }
            }
            else if (line[0] == '.group') {
                // .group group_name name...
                if (line.length < 3) {
                    errors.push('Malformed .group statement: '+source[k]);
                } else {
                    // each group has an associated list of signal indicies
                    groups[line[1]] = [];
                    for (j = 2; j < line.length; j += 1) {
                        // remember index of this signal in the signals list
                        groups[line[1]].push(signals.length);
                        // keep track of signal names
                        signals.push(line[j]);
                    }
                }
            }
            else if (line[0] == '.plot') {
                for (j = 1; j < line.length; j += 1) {
                    plots.push(line[j]);
                    sampled_signals[line[j]] = [];
                }
            }
            else if (line[0] == '.cycle') {
                // .cycle actions...
                //   assert <group_name>
                //   deassert <group_name>
                //   sample <group_name>
                //   tran <duration>
                //   <name> = <voltage>
                if (cycle.length != 0) {
                    errors.push('More than one .cycle statement: '+source[k]);
                    break;
                }
                i = 1;
                while (i < line.length) {
                    if ((line[i] == 'assert' || line[i] == 'deassert' || line[i] == 'sample') && i + 1 < line.length) {
                        var glist = groups[line[i+1]];
                        if (glist === undefined) {
                            errors.push('Use of undeclared group name "'+line[i+1]+'" in .cycle: '+source[k]);
                            break;
                        }
                        // keep track of which signals are driven and sampled
                        for (j = 0; j < glist.length; j += 1) {
                            if (line[i] == 'assert' || line[i] == 'deassert')
                                driven_signals[signals[glist[j]]] = [[0,'Z']]; // driven node is 0 at t=0
                            if (line[i] == 'sample')
                                sampled_signals[signals[glist[j]]] = []; // list of tvpairs
                        }
                        cycle.push([line[i],line[i+1]]);
                        i += 2;
                        continue;
                    }
                    else if (line[i] == 'tran' && (i + 1 < line.length)) {
                        v = jade_utils.parse_number(line[i+1]);
                        if (isNaN(v)) {
                            errors.push('Unrecognized tran duration "'+line[i+1]+'": '+source[k]);
                            break;
                        }
                        cycle.push(['tran',v]);
                        i += 2;
                        continue;
                    }
                    else if (line[i+1] == '=' && (i + 2 < line.length)) {
                        v = line[i+2];   // expect 0,1,Z
                        if ("01Z".indexOf(v) == -1) {
                            errors.push('Unrecognized value specification "'+line[i+2]+'": '+source[k]);
                            break;
                        }
                        cycle.push(['set',line[i],v]);
                        driven_signals[line[i]] = [[0,'Z']];  // driven node is 0 at t=0
                        i += 3;
                        continue;
                    }
                    errors.push('Malformed .cycle action "'+line[i]+'": '+source[k]);
                    break;
                }
            }
            else if (line[0][0] == '.') {
                errors.push('Unrecognized control statment: '+source[k]);
            }
            else {
                var test = line.join('');
                // each test should specify values for each signal in each group
                if (test.length != signals.length) {
                    errors.push('Test line does not specify '+signals.length+' signals: '+source[k]);
                    break;
                }
                // check for legal test values
                for (j = 0; j < test.length; j += 1) {
                    if ("01ZLH-".indexOf(test[j]) == -1) {
                        errors.push('Illegal test value '+test[j]+': '+source[k]);
                        break;
                    }
                }
                tests.push(test);
            }
        };

        // check for necessary threshold specs
        if (!('Vol' in thresholds)) errors.push('Missing Vol threshold specification');
        if (!('Vil' in thresholds)) errors.push('Missing Vil threshold specification');
        if (!('Vih' in thresholds)) errors.push('Missing Vih threshold specification');
        if (!('Voh' in thresholds)) errors.push('Missing Voh threshold specification');

        if (cycle.length == 0) errors.push('Missing .cycle specification');
        if (tests.length == 0) errors.push('No tests specified!');

        if (errors.length != 0) {
            this.status.html('The following errors were found in the test specification:<li>'+errors.join('<li>'));
            return;
        }

        //console.log('power: '+JSON.stringify(power));
        //console.log('thresholds: '+JSON.stringify(thresholds));
        //console.log('groups: '+JSON.stringify(groups));
        //console.log('cycle: '+JSON.stringify(cycle));
        //console.log('tests: '+JSON.stringify(tests));

        // extract netlist and make sure it has the signals referenced by the test
        if (!this.module.has_aspect('schematic')) {
            this.status.text('This module does not have a schematic!');
            return;
        }

        var netlist;
        var mlist = ['ground','jumper'];
        $.each(cktsim.analog_modules,function (index,mname) { mlist.push(mname); });
        try {
            netlist = this.module.aspect('schematic').netlist(mlist, '', {});
            netlist = schematic_view.cktsim_netlist(netlist);
        }
        catch (e) {
            console.log("Error extracting netlist:<p>" + e);
            this.status.html("Error extracting netlist:<p>" + e);
            return;
        }

        var nodes = schematic_view.extract_nodes(netlist);  // get list of nodes in netlist
        function check_node(node) {
            if (nodes.indexOf(node) == -1)
                errors.push('Circuit does not have a node named "'+node+'".');
        }
        $.each(driven_signals,check_node);
        $.each(sampled_signals,check_node);

        if (errors.length != 0) {
            this.status.html('The following errors were found in the test specification:<li>'+errors.join('<li>'));
            return;
        }

        // ensure cktsim knows what gnd is
        netlist.push({type: 'ground',connections:['gnd'],properties:{}});

        // add voltage sources for power supplies
        $.each(power,function(node,v) {
            netlist.push({type:'voltage source',
                          connections:{nplus:node, nminus:'gnd'},
                          properties:{value:{type:'dc', args:[v]}, name:node+'_source'}});
        });

        // add pullup and pulldown FETs for driven nodes, connected to sources for Voh and Vol
        netlist.push({type: 'voltage source',
                      connections:{nplus: '_Voh_', nminus: 'gnd'},
                      properties:{name: '_Voh_source', value:{type:'dc',args:[thresholds.Voh]}}});
        netlist.push({type: 'voltage source',
                      connections:{nplus: '_Vol_', nminus: 'gnd'},
                      properties:{name: '_Voh_source', value:{type:'dc',args:[thresholds.Vol]}}});
        $.each(driven_signals,function(node) {
            netlist.push({type:'pfet',
                          connections:{D:'_Voh_', G:node+'_pullup', S:node},
                          properties:{W:8, L:1,name:node+'_pullup'}});
            netlist.push({type:'nfet',
                          connections:{D:node ,G:node+'_pulldown', S:'_Vol_'},
                          properties:{W:8, L:1,name:node+'_pulldown'}});
        });

        // go through each test determining transition times for each driven node, adding
        // [t,v] pairs to driven_nodes dict.  v = '0','1','Z'
        var time = 0;
        function set_voltage(tvlist,v) {
            if (v != tvlist[tvlist.length - 1][1]) tvlist.push([time,v]);
        }
        $.each(tests,function(tindex,test) {
            $.each(cycle,function(index,action) {
                if (action[0] == 'assert' || action[0] == 'deassert') {
                    $.each(groups[action[1]],function(index,sindex) {
                        if (action[0] == 'deassert' || "01Z".indexOf(test[sindex]) != -1)
                            set_voltage(driven_signals[signals[sindex]],
                                        action[0] == 'deassert' ? 'Z' : test[sindex]);
                    });
                }
                else if (action[0] == 'sample') {
                    $.each(groups[action[1]],function(index,sindex) {
                        if ("HL".indexOf(test[sindex]) != -1)
                            sampled_signals[signals[sindex]].push([time,test[sindex]]);
                    });
                }
                else if (action[0] == 'set') {
                    set_voltage(driven_signals[action[1]],action[2]);
                }
                else if (action[0] == 'tran') {
                    time += action[1];
                }
            });
        });

        // construct PWL voltage sources to control pullups/pulldowns for driven nodes
        $.each(driven_signals,function(node,tvlist) {
            var pulldown = [0,thresholds.Vol];   // initial <t,v> for pulldown (off)
            var pullup = [0,thresholds.Voh];     // initial <t,v> for pullup (off)
            // run through tvlist, setting correct values for pullup and pulldown gates
            $.each(tvlist,function(index,tvpair) {
                var t = tvpair[0];
                var v = tvpair[1];
                var pu,pd;
                if (v == '0') {
                    // want pulldown on, pullup off
                    pd = thresholds.Voh;
                    pu = thresholds.Voh;
                }
                else if (v == '1') {
                    // want pulldown off, pullup on
                    pd = thresholds.Vol;
                    pu = thresholds.Vol;
                }
                else if (v == 'Z') {
                    // want pulldown off, pullup off
                    pd = thresholds.Vol;
                    pu = thresholds.Voh;
                }
                else
                    console.log('node: '+node+', tvlist: '+JSON.stringify(tvlist));
                // ramp to next control voltage over 0.1ns
                var last_pu = pullup[pullup.length - 1];
                if (last_pu != pu) {
                    if (t != pullup[pullup.length - 2])
                        pullup.push.apply(pullup,[t,last_pu]);
                    pullup.push.apply(pullup,[t+0.1e-9,pu]);
                }
                var last_pd = pulldown[pulldown.length - 1];
                if (last_pd != pd) {
                    if (t != pulldown[pulldown.length - 2])
                        pulldown.push.apply(pulldown,[t,last_pd]);
                    pulldown.push.apply(pulldown,[t+0.1e-9,pd]);
                }
            });
            // set up voltage sources for gates of pullup and pulldown
            netlist.push({type: 'voltage source',
                          connections: {nplus: node+'_pullup', nminus: 'gnd'},
                          properties: {name: node+'_pullup_source', value: {type: 'pwl', args: pullup}}});
            netlist.push({type: 'voltage source',
                          connections: {nplus: node+'_pulldown', nminus: 'gnd'},
                          properties: {name: node+'_pulldown_source', value: {type: 'pwl', args: pulldown}}});
        });
        //console.log('stop time: '+time);
        //schematic_view.print_netlist(netlist);

        // do the simulation
        var editor = this;  // for closure
        var progress = schematic_view.tran_progress_report();
        jade_view.window('Progress',progress[0],editor.textarea.offset());
        cktsim.transient_analysis(netlist, time, Object.keys(sampled_signals), function(percent_complete,results) {
            if (percent_complete === undefined) {
                jade_view.window_close(progress[0].win);  // done with progress bar

                // error? let user see what's up...
                if (_.isString(results)) {
                    editor.status.html(results);
                    return;
                }

                // check the sampled node values for each test cycle
                var errors = [];
                $.each(sampled_signals,function(node,tvlist) {
                    if (!Object.prototype.hasOwnProperty.call(results, node))
                        errors.push('No results for node '+node);
                    else {
                        var times = results[node].xvalues;
                        var observed = results[node].yvalues;
                        $.each(tvlist,function(index,tvpair) {
                            var v = schematic_view.interpolate(tvpair[0], times, observed);
                            if ((tvpair[1] == 'L' && v > thresholds.Vil) ||
                                (tvpair[1] == 'H' && v < thresholds.Vih)) 
                                errors.push('Expected signal '+node+' to be a valid '+tvpair[1]+
                                            ' at time '+jade_utils.engineering_notation(tvpair[0],2)+'s.');
                        });
                    }
                });
                if (errors.length > 0) {
                    var postscript = '';
                    if (errors.length > 3) {
                        errors = errors.slice(0,5);
                        postscript = '<br>...';
                    }
                    editor.status.html('<li>'+errors.join('<li>')+postscript);
                    return;
                }
                else editor.status.text('Test succesful!');

                // construct a data set for the given signal
                function new_dataset(signal) {
                    if (results[signal] !== undefined) {
                        return {xvalues: results[signal].xvalues,
                                yvalues: results[signal].yvalues,
                                name: signal,
                                xunits: 's',
                                yunits: 'V'
                               };
                    } else return undefined;
                }

                // called by plot.graph when user wants to plot another signal
                function add_plot(callback) {
                    // use dialog to get new signal name
                    var fields = {'Signal name': jade_view.build_input('text',10,'')};
                    var content = jade_view.build_table(fields);
                    jade_view.dialog('Add Plot', content, function() {
                        var signal = fields['Signal name'].value;

                        // construct data set for requested signal
                        // if the signal was legit, use callback to plot it
                        var dataset = new_dataset(signal);
                        if (dataset !== undefined) {
                            callback(dataset);
                        }
                    },editor.textarea.offset());
                }

                // produce requested plots
                if (plots.length > 0) {
                    var dataseries = []; // plots we want
                    $.each(plots,function(index,signal) {
                        dataseries.push(new_dataset(signal));
                    });

                    // callback to use if user wants to add a new plot
                    dataseries.add_plot = add_plot;  

                    // graph the result and display in a window
                    var graph1 = plot.graph(dataseries);
                    var offset = editor.textarea.offset();
                    var win = jade_view.window('Test Results',graph1,offset);

                    // resize window to 75% of test pane
                    var win_w = win.width();
                    var win_h = win.height();
                    win[0].resize(Math.floor(0.75*editor.textarea.width()) - win_w,
                                  Math.floor(0.75*editor.textarea.height()) - win_h);
                }
            } else {
                progress.find('.jade-progress-bar').css('width',percent_complete+'%');
                return progress[0].stop_requested;
            }
        });
    };

    TestEditor.prototype.message = function(msg) {
        this.status.text(msg);
    };

    TestEditor.prototype.clear_message = function(msg) {
        if (this.status.text() == msg)
            this.status.text('');
    };

    TestEditor.prototype.editor_name = 'test';
    jade_view.editors.push(TestEditor);

    // Test component that lives inside a Test aspect
    function Test(json) {
        jade_model.Component.call(this);
        this.load(json);
    }
    Test.prototype = new jade_model.Component();
    Test.prototype.constructor = Test;
    jade_model.built_in_components.test = Test;

    Test.prototype.load = function(json) {
        this.type = json[0];
        this.test = json[1];
    };

    Test.prototype.json = function() {
        return [this.type, this.test];
    };

    function test_parse(module) {
        var source = module.aspect('test').components[0];
        if (source === undefined || source.test.length == 0) throw module.name + ' doesn\'t have a test aspect.';
        source = source.test;

        // remove multiline comments, in-line comments
        source = source.replace(/\/\*(.|\n)*?\*\//g,'');   // multi-line using slash-star
        source = source.replace(/\/\/.*\n/g,'\n');

        var i,j,k,v;
        var plots = [];     // list of signals to plot
        var tests = [];     // list of test lines
        var power = {};     // node name -> voltage
        var thresholds = {};  // spec name -> voltage
        var cycle = [];    // list of test actions: [action args...]
        var groups = {};   // group name -> list of indicies
        var signals = [];  // list if signals in order that they'll appear on test line
        var driven_signals = {};   // if name in dictionary it will need a driver ckt
        var sampled_signals = {};   // if name in dictionary we want its value
        var errors = [];

        // process each line in test specification
        source = source.split('\n');
        for (k = 0; k < source.length; k += 1) {
            var line = source[k].match(/([A-Za-z0-9_.\[\]]+|=|-)/g);
            if (line === null) continue;
            if (line[0] == '.power' || line[0] == '.thresholds') {
                // .power/.thresholds name=float name=float ...
                for (i = 1; i < line.length; i += 3) {
                    if (i + 2 >= line.length || line[i+1] != '=') {
                        errors.push('Malformed '+line[0]+' statement: '+source[k]);
                        break;
                    }
                    v = jade_utils.parse_number(line[i+2]);
                    if (isNaN(v)) {
                        errors.push('Unrecognized voltage specification "'+line[i+2]+'": '+source[k]);
                        break;
                    }
                    if (line[0] == '.power') power[line[i]] = v;
                    else thresholds[line[i]] = v;
                }
            }
            else if (line[0] == '.group') {
                // .group group_name name...
                if (line.length < 3) {
                    errors.push('Malformed .group statement: '+source[k]);
                } else {
                    // each group has an associated list of signal indicies
                    groups[line[1]] = [];
                    for (j = 2; j < line.length; j += 1) {
                        // remember index of this signal in the signals list
                        groups[line[1]].push(signals.length);
                        // keep track of signal names
                        signals.push(line[j]);
                    }
                }
            }
            else if (line[0] == '.plot') {
                for (j = 1; j < line.length; j += 1) {
                    plots.push(line[j]);
                    sampled_signals[line[j]] = [];
                }
            }
            else if (line[0] == '.cycle') {
                // .cycle actions...
                //   assert <group_name>
                //   deassert <group_name>
                //   sample <group_name>
                //   tran <duration>
                //   <name> = <voltage>
                if (cycle.length != 0) {
                    errors.push('More than one .cycle statement: '+source[k]);
                    break;
                }
                i = 1;
                while (i < line.length) {
                    if ((line[i] == 'assert' || line[i] == 'deassert' || line[i] == 'sample') && i + 1 < line.length) {
                        var glist = groups[line[i+1]];
                        if (glist === undefined) {
                            errors.push('Use of undeclared group name "'+line[i+1]+'" in .cycle: '+source[k]);
                            break;
                        }
                        // keep track of which signals are driven and sampled
                        for (j = 0; j < glist.length; j += 1) {
                            if (line[i] == 'assert' || line[i] == 'deassert')
                                driven_signals[signals[glist[j]]] = [[0,'Z']]; // driven node is 0 at t=0
                            if (line[i] == 'sample')
                                sampled_signals[signals[glist[j]]] = []; // list of tvpairs
                        }
                        cycle.push([line[i],line[i+1]]);
                        i += 2;
                        continue;
                    }
                    else if (line[i] == 'tran' && (i + 1 < line.length)) {
                        v = jade_utils.parse_number(line[i+1]);
                        if (isNaN(v)) {
                            errors.push('Unrecognized tran duration "'+line[i+1]+'": '+source[k]);
                            break;
                        }
                        cycle.push(['tran',v]);
                        i += 2;
                        continue;
                    }
                    else if (line[i+1] == '=' && (i + 2 < line.length)) {
                        v = line[i+2];   // expect 0,1,Z
                        if ("01Z".indexOf(v) == -1) {
                            errors.push('Unrecognized value specification "'+line[i+2]+'": '+source[k]);
                            break;
                        }
                        cycle.push(['set',line[i],v]);
                        driven_signals[line[i]] = [[0,'Z']];  // driven node is 0 at t=0
                        i += 3;
                        continue;
                    }
                    errors.push('Malformed .cycle action "'+line[i]+'": '+source[k]);
                    break;
                }
            }
            else if (line[0][0] == '.') {
                errors.push('Unrecognized control statment: '+source[k]);
            }
            else {
                var test = line.join('');
                // each test should specify values for each signal in each group
                if (test.length != signals.length) {
                    errors.push('Test line does not specify '+signals.length+' signals: '+source[k]);
                    break;
                }
                // check for legal test values
                for (j = 0; j < test.length; j += 1) {
                    if ("01ZLH-".indexOf(test[j]) == -1) {
                        errors.push('Illegal test value '+test[j]+': '+source[k]);
                        break;
                    }
                }
                tests.push(test);
            }
        };

        // check for necessary threshold specs
        if (!('Vol' in thresholds)) errors.push('Missing Vol threshold specification');
        if (!('Vil' in thresholds)) errors.push('Missing Vil threshold specification');
        if (!('Vih' in thresholds)) errors.push('Missing Vih threshold specification');
        if (!('Voh' in thresholds)) errors.push('Missing Voh threshold specification');

        if (cycle.length == 0) errors.push('Missing .cycle specification');
        if (tests.length == 0) errors.push('No tests specified!');

        if (errors.length != 0) {
            throw 'The following errors were found in the test specification:<li>'+errors.join('<li>');
            return undefined;
        } else return {
            module: module,     // module we're testing
            power: power,       // node name -> voltage
            thresholds: thresholds,  // spec name -> voltage
            groups: groups,     // group name -> list of indicies
            cycle: cycle,       // list of test actions: [action args...]
            tests: tests,       // list of test lines
            plots: plots,       // list of signals to plot
            signals: signals,   // list if signals in order that they'll appear on test line
            driven_signals: driven_signals,  // if name in dictionary it will need a driver ckt
            sampled_signals: sampled_signals // if name in dictionary we want its value
        };
    }

    function test_netlist(test) {
        // extract netlist and make sure it has the signals referenced by the test
        if (!test.module.has_aspect('schematic')) {
            throw 'This module does not have a schematic!';
        }

        var errors = [];
        var netlist;
        var mlist = ['ground','jumper'];
        $.each(cktsim.analog_modules,function (index,mname) { mlist.push(mname); });
        try {
            netlist = test.module.aspect('schematic').netlist(mlist, '', {});
            netlist = schematic_view.cktsim_netlist(netlist);
        }
        catch (e) {
            console.log("Error extracting netlist:<p>" + e);
            throw "Error extracting netlist:<p>" + e;
        }

        var nodes = schematic_view.extract_nodes(netlist);  // get list of nodes in netlist
        function check_node(node) {
            if (nodes.indexOf(node) == -1)
                errors.push('Circuit does not have a node named "'+node+'".');
        }
        $.each(test.driven_signals,check_node);
        $.each(test.sampled_signals,check_node);

        if (errors.length != 0) {
            throw 'The following errors were found in the test specification:<li>'+errors.join('<li>');
        }

        // ensure cktsim knows what gnd is
        netlist.push({type: 'ground',connections:['gnd'],properties:{}});

        // add voltage sources for power supplies
        $.each(test.power,function(node,v) {
            netlist.push({type:'voltage source',
                          connections:{nplus:node, nminus:'gnd'},
                          properties:{value:{type:'dc', args:[v]}, name:node+'_source'}});
        });

        // add pullup and pulldown FETs for driven nodes, connected to sources for Voh and Vol
        netlist.push({type: 'voltage source',
                      connections:{nplus: '_Voh_', nminus: 'gnd'},
                      properties:{name: '_Voh_source', value:{type:'dc',args:[test.thresholds.Voh]}}});
        netlist.push({type: 'voltage source',
                      connections:{nplus: '_Vol_', nminus: 'gnd'},
                      properties:{name: '_Voh_source', value:{type:'dc',args:[test.thresholds.Vol]}}});
        $.each(test.driven_signals,function(node) {
            netlist.push({type:'pfet',
                          connections:{D:'_Voh_', G:node+'_pullup', S:node},
                          properties:{W:8, L:1,name:node+'_pullup'}});
            netlist.push({type:'nfet',
                          connections:{D:node ,G:node+'_pulldown', S:'_Vol_'},
                          properties:{W:8, L:1,name:node+'_pulldown'}});
        });

        // go through each test determining transition times for each driven node, adding
        // [t,v] pairs to driven_nodes dict.  v = '0','1','Z'
        var time = 0;
        function set_voltage(tvlist,v) {
            if (v != tvlist[tvlist.length - 1][1]) tvlist.push([time,v]);
        }
        $.each(test.tests,function(tindex,xtest) {
            $.each(test.cycle,function(index,action) {
                if (action[0] == 'assert' || action[0] == 'deassert') {
                    $.each(test.groups[action[1]],function(index,sindex) {
                        if (action[0] == 'deassert' || "01Z".indexOf(xtest[sindex]) != -1)
                            set_voltage(test.driven_signals[test.signals[sindex]],
                                        action[0] == 'deassert' ? 'Z' : xtest[sindex]);
                    });
                }
                else if (action[0] == 'sample') {
                    $.each(test.groups[action[1]],function(index,sindex) {
                        if ("HL".indexOf(xtest[sindex]) != -1)
                            test.sampled_signals[test.signals[sindex]].push([time,xtest[sindex]]);
                    });
                }
                else if (action[0] == 'set') {
                    set_voltage(test.driven_signals[action[1]],action[2]);
                }
                else if (action[0] == 'tran') {
                    time += action[1];
                }
            });
        });

        // construct PWL voltage sources to control pullups/pulldowns for driven nodes
        $.each(test.driven_signals,function(node,tvlist) {
            var pulldown = [0,test.thresholds.Vol];   // initial <t,v> for pulldown (off)
            var pullup = [0,test.thresholds.Voh];     // initial <t,v> for pullup (off)
            // run through tvlist, setting correct values for pullup and pulldown gates
            $.each(tvlist,function(index,tvpair) {
                var t = tvpair[0];
                var v = tvpair[1];
                var pu,pd;
                if (v == '0') {
                    // want pulldown on, pullup off
                    pd = test.thresholds.Voh;
                    pu = test.thresholds.Voh;
                }
                else if (v == '1') {
                    // want pulldown off, pullup on
                    pd = test.thresholds.Vol;
                    pu = test.thresholds.Vol;
                }
                else if (v == 'Z') {
                    // want pulldown off, pullup off
                    pd = test.thresholds.Vol;
                    pu = test.thresholds.Voh;
                }
                else
                    console.log('node: '+node+', tvlist: '+JSON.stringify(tvlist));

                // ramp to next control voltage over 0.1ns
                var last_pu = pullup[pullup.length - 1];
                if (last_pu != pu) {
                    if (t != pullup[pullup.length - 2])
                        pullup.push.apply(pullup,[t,last_pu]);
                    pullup.push.apply(pullup,[t+0.1e-9,pu]);
                }
                var last_pd = pulldown[pulldown.length - 1];
                if (last_pd != pd) {
                    if (t != pulldown[pulldown.length - 2])
                        pulldown.push.apply(pulldown,[t,last_pd]);
                    pulldown.push.apply(pulldown,[t+0.1e-9,pd]);
                }
            });

            // set up voltage sources for gates of pullup and pulldown
            netlist.push({type: 'voltage source',
                          connections: {nplus: node+'_pullup', nminus: 'gnd'},
                          properties: {name: node+'_pullup_source', value: {type: 'pwl', args: pullup}}});
            netlist.push({type: 'voltage source',
                          connections: {nplus: node+'_pulldown', nminus: 'gnd'},
                          properties: {name: node+'_pulldown_source', value: {type: 'pwl', args: pulldown}}});
        });

        test.netlist = netlist;  // circuit augmented with appropriate sources
        test.time = time;       // total simulation time
    }

    function test_simulate(test,pane) {
        // transient analysis progress text and halt button
        var tranProgress = $('<div><span></span></br></div>');
        var progressTxt = tranProgress.find('span');
        var tranHalt = false;
        var haltButton = $('<button class="btn btn-danger">Halt</button>');
        haltButton.tooltip({title:'Halt Simulation',delay:100,container:'body'});
        haltButton.on("click",function(){
            tranHalt = true;
        });
        tranProgress.append(haltButton);
        pane.append(tranProgress);

        // process results from the simulation
        function simulation_results(percent_complete,results) {
            if (percent_complete !== undefined) {
                progressTxt.text("Performing Transient Analysis... "+percent_complete+"%");
                return tranHalt;
            }

            tranProgress.remove();  // all done with progress bar

            // error? let user see what's up...
            if (_.isString(results)) throw results;

            // check the sampled node values for each test cycle
            var errors = [];
            $.each(test.sampled_signals,function(node,tvlist) {
                if (!Object.prototype.hasOwnProperty.call(results, node))
                    errors.push('No results for node '+node);
                else {
                    var times = results[node].xvalues;
                    var observed = results[node].yvalues;
                    $.each(tvlist,function(index,tvpair) {
                        var v = schematic_view.interpolate(tvpair[0], times, observed);
                        if ((tvpair[1] == 'L' && v > test.thresholds.Vil) ||
                            (tvpair[1] == 'H' && v < test.thresholds.Vih)) 
                            errors.push('Expected signal '+node+' to be a valid '+tvpair[1]+
                                        ' at time '+jade_utils.engineering_notation(tvpair[0],2)+'s.');
                    });
                }
            });
            if (errors.length > 0) {
                var postscript = '';
                if (errors.length > 3) {
                    errors = errors.slice(0,5);
                    postscript = '<br>...';
                }
                pane.prepend('<div class="alert alert-danger"><li>'+ errors.join('<li>') + postscript +
                             '<button class="close" data-dismiss="alert">&times;</button></div>');
                //throw '<li>'+errors.join('<li>')+postscript;
            } else {
                pane.prepend('<div class="alert alert-success"> Tests successful!'+
                             '<button class="close" data-dismiss="alert">&times;</button></div>');
            }

            // construct a data set for the given signal
            function new_dataset(signal) {
                if (results[signal] !== undefined) {
                    return {xvalues: [results[signal].xvalues],
                            yvalues: [results[signal].yvalues],
                            name: [signal],
                            xunits: 's',
                            yunits: 'V',
                            color: ['#268bd2'],
                            type: ['analog']
                           };
                } else return undefined;
            }

            // called by plot.graph when user wants to plot another signal
            function add_plot(signal) {
                // construct data set for requested signal
                // if the signal was legit, use callback to plot it
                var dataset = new_dataset(signal);
                if (dataset !== undefined) dataseries.push(dataset);
            }

            // produce requested plots
            if (test.plots.length > 0) {
                var dataseries = []; // plots we want
                $.each(test.plots,function(index,signal) {
                    dataseries.push(new_dataset(signal));
                });

                // callback to use if user wants to add a new plot
                dataseries.add_plot = add_plot;  

                // graph the result and display in a window
                var graph = plot.graph(dataseries);
                pane.append(graph);
                $(window).resize();  // resize everything to fit
            }
        }

        // do the simulation
        cktsim.transient_analysis(test.netlist, test.time, Object.keys(test.sampled_signals),simulation_results);
    }


    function do_test (editor,pane) {
        try {
            var test = test_parse(editor.module);
            test_netlist(test);
            test_simulate(test,pane);
        } catch (e) {
            //console.log(e.stack);
            pane.empty();
            pane.prepend('<div class="alert alert-danger">' + e +
                        '<button class="close" data-dismiss="alert">&times;</button></div>');
        };
    }

    schematic_view.schematic_tools.push([$('<img>').attr('src',jade_icons.check_icon), 'Run test', do_test]);
 })();
