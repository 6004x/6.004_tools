/***************************************************************************************
****************************************************************************************
Checkoff.reset clears existing results and checkoff and verify statements
Checkoff.addVerify adds a verify statement to the current list
Checkoff.setCheckoffStatement and Checkoff.setResults set the current checkoff and simulation
    results. Nothing is done with the checkoff statement besides checking that it exists
    and that it has all the required parameters (server path, assignment name, checksum)
    
Checkoff.testResults performs a checkoff. It calls runVerify, which checks all the previously set
    verify statements against the current results and returns any mistakes. testResults then 
    displays a notification indicating the success or failure of the checkoff.
****************************************************************************************
***************************************************************************************/

var Checkoff = (function(){
    var mVerify_statements = [];
    var mCheckoffStatement = null;
    var mResults = null;
    var mOptions = null;
    var mEditor;
    
    /**************************
    Reset: clear the stored results and verify and checkoff statements
    **************************/
    function reset(){
        mVerify_statements = [];
        mCheckoffStatement = null;
        mResults = null;
    }
    
    /**************************
    Add a verify statement -- called by the parser
    **************************/
    function addVerify(obj){
        mVerify_statements.push(obj);
//        console.log('adding verify: ',obj);
    }
    
    /**************************
    Add a checkoff statement -- called by the parser
    **************************/
    function setCheckoffStatement(checkoff_obj){
        mCheckoffStatement = checkoff_obj;
//        console.log("checkoff statement:",mCheckoffStatement);
    }
    
    /**************************
    Get the results of the last simulation -- deprecated
    **************************/
//    function getResults(){
//        mResults = $('#results').data("current"); 
//    }
    
    /************************
    Set results to the given results
    *************************/
    function setResults(data, options){
        mResults = data;
        mOptions = options;
    }
    
    function setEditor(editor){
        mEditor = editor;
    }
    
    /**************************
    Failed Modal maker: helper function for failed checkoff messages -- creates a failed 
    checkoff modal with the given message
    **************************/
    function FailedModal(msg){
        var failedModal = new ModalDialog();
        failedModal.setTitle("Checkoff Failed!");
        failedModal.setContent("<div class='text-error'>"+msg+"</div>");
        failedModal.addButton("Dismiss",'dismiss');
        return failedModal;
    }
    
    /**************************
    Test Results: called when the Checkoff button is pressed
    **************************/
    function testResults(){
        var failedModal;
//        getResults();
        if (!mResults){
            failedModal = new FailedModal("No results to verify. Did you run the simulation?");
            failedModal.show();
            return;
        }
        
        if (mCheckoffStatement === null){
            failedModal = new FailedModal("No checkoff requested. Did you include the appropriate \
'labXcheckoff.jsim' file?");
            failedModal.show();
            return;
        }
        
        var mistake = runVerify();
//        console.log("mistake:",mistake);
        if (!mistake){
            var passedModal = new ModalDialog();
            passedModal.setTitle("Checkoff Succeeded!");
            passedModal.setText("Verification succeeded!");
            passedModal.addButton("Dismiss",'dismiss');
            passedModal.addButton("Submit", 
                                  function(){show_checkoff_form(passedModal)},
                                  'btn-primary');
            passedModal.show();
        } else {
            if (mistake.verifyError){
                failedModal = new FailedModal(mistake.msg);
                failedModal.show();
            } else {
                failedModal = new ModalDialog();
                failedModal.setTitle("Checkoff Failed!");
                failedModal.setContent("<p><div class='text-error'>Node value verification error:</div></p>\
    <p><table class='table'><tr><td>Node(s):</td><td>"+mistake.nodes+"</tr>\
    <tr><td>Time:</td><td>"+engineering_notation(mistake.time,2)+"s</td></tr>\
    <tr><td>Expected Logic Value:</td><td>"+mistake.exp+"</td></tr>\
    <tr><td>Actual Logic Value:</td><td>"+mistake.given+"</td></tr></table></p>");
    
                failedModal.addButton("Dismiss",'dismiss');
                
                failedModal.show();
            }
        }
    }
    
    
    /*************************
    Find Time Index: given a time, returns the index of the closest sampled time that is less than 
    the given time
    *************************/
    function findTimeIndex(time, start_index){
        var times = mResults._time_;
        for (var i = start_index; i < times.length; i += 1){
            if (times[i] > time){
                if (i == start_index) return start_index;
                else return i-1;
            }
        }
    }
    
    /**************************
    Run Verify: runs the stored verify statements
    **************************/
    function runVerify(){
        var checksum = 0;
        for (var v = 0; v < mVerify_statements.length; v += 1){
            var vobj = mVerify_statements[v];
            
            if (vobj.type == "memory"){
                var mem_mistake = verify_memory(vobj);
                if (mem_mistake) return mem_mistake;
                continue;
            }
            
            var time_indices = [];
            var time_steps = [];
            var nodes = vobj.nodes.slice(0);
            var results = {};
            var index;
            var node;
            
            for (var i = 0; i < nodes.length; i += 1){
                results[nodes[i]] = [];
            }
            
            if (vobj.type == "periodic"){
                time_steps.push(vobj.tstart);
                index = findTimeIndex(vobj.tstart,0);
                time_indices.push(index);
                for (node in results){
                    if (!(node in mResults)){
                        return {verifyError:true,
                                msg:"Verify error: No results for node "+node+
                                ". (This indicates an error in the checkoff file)."};
                    }
                    results[node].push(mResults[node][index]);
                }
                for (i = 1; i < vobj.values.length; i += 1){
                    time_steps.push(vobj.tstart + vobj.tstep * i);
                    index = findTimeIndex(vobj.tstart + vobj.tstep * i, time_indices[i-1]);
                    time_indices.push(index);
                    for (node in results){
                        results[node].push(mResults[node][index]);
                    }
                }
            }
            if (vobj.type == "tvpairs"){
                for (i = 0; i < vobj.values.length; i += 1){
                    time_steps.push(vobj.values[i].time);
                    
                    var temp_index = (i === 0) ? 0 : time_indices[i-1];
                    index = findTimeIndex(vobj.values[i].time,temp_index);
                    time_indices.push(index);
                    for (node in results){
                        results[node].push(mResults[node][index]);
                    }
                }
            }
                
            var base;
            var base_prefix;
            // change decimal numbers to hex automatically because otherwise it's a huge pain
            if (vobj.display_base == 'hex' || vobj.display_base == 'dec') {
                base = 16;
                base_prefix = '0x';
            } else if (vobj.display_base == 'oct') {
                base = 8;
                base_prefix = '0';
            } else if (vobj.display_base == 'bin') {
                base = 2;
                base_prefix = '0b';
            }/* else {
                base = 10;
                base_prefix = '';
            }*/
                
            var mistake = false;
            for (i = 0; i < vobj.values.length; i += 1){
                var expectedVal;
                if (vobj.type == "periodic"){
                    expectedVal = vobj.values[i];
                } else if (vobj.type == "tvpairs"){
                    expectedVal = vobj.values[i].value;
                }
                
                // checksum: (i+1)*((int)(time*1e12) + (int)expect)
                checksum += ((i + 1) * (Math.floor(time_steps[i]*1e12) + Math.floor(expectedVal)));
                console.log("checksum term:",(i+1)*(Math.floor(time_steps[i]*1e12) + Math.floor(expectedVal)));
//                console.log("i + 1:",i+1);
                console.log("cumulative checksum:",checksum);
                    
                expectedVal = expectedVal.toString(base).split("");
                    
                var nodeVals = [];
                var valAtTime = [];
                for (var j = 0; j < nodes.length; j += 1){
                    nodeVals.push(logic(results[nodes[j]][i]));
                }
                    
                if (base == 2){
                    valAtTime = nodeVals.slice(0);
                } else if (base == 8){
                    // three binary digits equal one octal digit
                    // break into threes from the end
                    while (nodeVals.length > 0){
                        valAtTime.unshift(nodeVals.splice(-3,3));
                    }
                    for (j = 0; j < valAtTime.length; j += 1){
                        valAtTime[j] = parseInt(valAtTime[j].join(''),2).toString(8);
                        if (valAtTime[j] == "NaN") valAtTime[j] = "X";
                    }
                } else if (base == 16){
                    // four binary digits equal one hexadecimal digit
                    // break into fours from the end
                    while (nodeVals.length > 0){
                        valAtTime.unshift(nodeVals.splice(-4,4));
                    }
                    for (j = 0; j < valAtTime.length; j += 1){
                        valAtTime[j] = parseInt(valAtTime[j].join(''),2).toString(16);
                        if (valAtTime[j] == "NaN") valAtTime[j] = "X";
                    }
                }
                    
                while (expectedVal.length < valAtTime.length){
                    expectedVal.unshift("0");
                }
                    
                for (var k = 0; k < valAtTime.length; k += 1){
                    if (expectedVal[k] != valAtTime[k]){
                        mistake = true;
                        valAtTime[k] = "<span class='wrong'>"+valAtTime[k]+"</span>";
                    }
                }
                    
                if (mistake){
                    return {time:time_steps[i],
                            nodes:nodes,
                            exp:base_prefix+expectedVal.join(''),
                            given:base_prefix+valAtTime.join('')};
                }
            }
        }
        checksum += 2536038;
        console.log("expected checksum:",mCheckoffStatement.checksum.value,"actual:",checksum);
        // if there are no mistakes, return null
        return null;
    }
    
    
    function verify_memory(vobj){
        // vobj has attributes:
        //      type: "memory"
        //      mem_name: <the name of the memory instance>
        //      startaddress: <the address to start verification at>
        //      contents: <the expected contents of the memory>
        //      display_base: 'hex', 'octal', or 'binary'
        //      token: <the first token of the memory line for error throwing>
    }
    
    /*************************
    Turn into a logic value: 
    V_il = 0.6
    V_ih = 2.7
    **************************/
//    var vil = 0.6;
//    var vih = 2.7;
    function logic(number){
        var vil, vih;
        if (mOptions.vil) vil = mOptions.vil;
        else vil = 0.6;
        if (mOptions.vih) vih = mOptions.vih;
        else vih = 2.7;
        
        
        if (number < vil) return 0;
        else if (number > vih) return 1;
        else return "X";
    }
    
    function complete_checkoff(old){
        var username = old.inputContent(0);
        var password = old.inputContent(1);
        var collaborators = old.inputContent(2);
        old.dismiss();
        
        var url = mCheckoffStatement.server.name;
        var checksum = mCheckoffStatement.checksum.value;
        var assignment = mCheckoffStatement.assignment.name;
        var callback = function(success, text){
            var dialog = new ModalDialog();
            if(success) {
                dialog.setTitle("Checkoff complete");
                dialog.setContent(text);
            } else {
                dialog.setTitle("Checkoff failed");
                dialog.setContent("There was an error communicating with the server.");
            }
            dialog.addButton('Dismiss', 'dismiss');
            dialog.show();
        }
        
        $.post(url, {
            username: username,
            userpassword: password,
            sender: username, // we can't actually figure this one out
            pcheckoff:assignment,
            collaboration: collaborators,
            checksum: checksum,
            size: "FIX_ME",
            figure_of_merit: "FIX_ME",
            time: "FIX_ME",
            version: 'JSim3.0.0',
            circuits: _.map(mEditor.filenames(), function(f) {
                return '============== source: ' + f + '\n' + mEditor.content(f) + '\n==============\n';
            }).join('')
        }).done(function(data) {
            callback(true, data);
        }).fail(function() {
            callback(false);
        });
    }

    function show_checkoff_form(old){
        old.dismiss();
        var dialog = new ModalDialog();
        dialog.setTitle("Submit Lab");
        dialog.inputBox({label: "Username", callback: complete_checkoff});
        dialog.inputBox({label: "Password", type: 'password', callback: complete_checkoff});
        dialog.inputBox({label: "Collaborators", callback: complete_checkoff});
        dialog.addButton("Dismiss", "dismiss");
        dialog.addButton("Submit", function(){complete_checkoff(dialog)}, 'btn-primary');
        dialog.show();
    }
    
    /*****************
    Engineering notation: formats a number in engineering notation
        --args: -n: value to be formatted
                -nplaces: the number of decimal places to keep
                -trim: boolean, defaults to true; if true, removes trailing 0s and decimals
        --returns: a string representing the value in engineering notation
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
    
    /*************************
    Exports
    **************************/
    return {reset:reset,
//            getResults:getResults,
            setResults:setResults,
            testResults:testResults,
            addVerify:addVerify,
            setCheckoffStatement:setCheckoffStatement,
            setEditor:setEditor
//            logic:logic
           };
}());