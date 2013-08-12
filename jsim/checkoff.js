var Checkoff = (function(){
    var mVerify_statements = [];
    var mCheckoff_statement = null;
    var mResults = null;
    
    /**************************
    Reset: clear the stored results and verify and checkoff statements
    **************************/
    function reset(){
        mVerify_statements = [];
        mCheckoff_statement = null;
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
        mCheckoff_statement = checkoff_obj;
//        console.log("checkoff statement:",mCheckoff_statement);
    }
    
    /**************************
    Get the results of the last simulation
    **************************/
    function getResults(){
        mResults = $('#results').data("current"); 
    }
    
    /************************
    Set results to the given results
    *************************/
    function setResults(data){
        mResults = results;
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
        getResults();
        
        if (mCheckoff_statement === null){
            var failedModal = new FailedModal("No checkoff requested. Did you include the appropriate \
'labXcheckoff.jsim' file?");
            failedModal.show();
            return;
        }
        
        var mistake = runVerify();
        console.log("mistake:",mistake);
        if (!mistake){
            var passedModal = new ModalDialog();
            passedModal.setTitle("Checkoff Succeeded!");
            passedModal.setText("Verification succeeded!");
            passedModal.addButton("Dismiss",'dismiss');
            passedModal.show();
        } else {
            if (mistake.verifyError){
                var failedModal = new FailedModal(mistake.msg);
                failedModal.show();
            } else {
                var failedModal = new ModalDialog();
                failedModal.setTitle("Checkoff Failed!");
                failedModal.setContent("<p><div class='text-error'>Node value verification error:</div></p>\
    <p><table class='table'><tr><td>Node(s):</td><td>"+mistake.nodes+"</tr>\
    <tr><td>Time:</td><td>"+Simulator.engineering_notation(mistake.time,2)+"s</td></tr>\
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
        for (var v = 0; v < mVerify_statements.length; v += 1){
            var vobj = mVerify_statements[v];
            
            var times = mResults._time_;
            var time_indices = [];
            var time_steps = [];
            var nodes = vobj.nodes.slice(0);
            var results = {};
            
            for (var i = 0; i < nodes.length; i += 1){
                results[nodes[i]] = [];
            }
            
            if (vobj.type == "periodic"){
                time_steps.push(vobj.tstart);
                var index = findTimeIndex(vobj.tstart,0)
                time_indices.push(index);
                for (node in results){
                    if (!(node in mResults)){
                        return {verifyError:true,
                                msg:"Verify error: No results for node "+node+
                                ". (This indicates an error in the checkoff file)."};
                    }
                    results[node].push(mResults[node][index]);
                }
                for (var i = 1; i < vobj.values.length; i += 1){
                    time_steps.push(vobj.tstart + vobj.tstep * i);
                    index = findTimeIndex(vobj.tstart + vobj.tstep * i, time_indices[i-1])
                    time_indices.push(index);
                    for (node in results){
                        results[node].push(mResults[node][index]);
                    }
                }
            }
            if (vobj.type == "tvpairs"){
                for (var i = 0; i < vobj.values.length; i += 1){
                    time_steps.push(vobj.values[i].time);
                    
                    var temp_index = (i == 0) ? 0 : time_indices[i-1];
                    var index = findTimeIndex(vobj.values[i].time,temp_index)
                    time_indices.push(index);
                    for (node in results){
                        results[node].push(mResults[node][index]);
                    }
                }
            }
                
            var base;
            var base_prefix;
            if (vobj.display_base == 'hex') {
                base = 16;
                base_prefix = '0x'
            }
            if (vobj.display_base == 'octal') {
                base = 8;
                base_prefix = '0'
            }
            if (vobj.display_base == 'binary') {
                base = 2;
                base_prefix = '0b'
            }
                
            var mistake = false;
            for (var i = 0; i < vobj.values.length; i += 1){
                var expectedVal = (vobj.type == "periodic") ? vobj.values[i] : vobj.values[i].value;
                
                expectedVal = expectedVal.toString(base).split("");
                    
                var nodeVals = []
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
                        valAtTime.unshift(nodeVals.splice(-3,3))
                    }
                    for (var j = 0; j < valAtTime.length; j += 1){
                        valAtTime[j] = parseInt(valAtTime[j].join(''),2).toString(8);
                        if (valAtTime[j] == "NaN") valAtTime[j] = "X";
                    }
                } else if (base == 16){
                    // four binary digits equal one hexadecimal digit
                    // break into fours from the end
                    while (nodeVals.length > 0){
                        valAtTime.unshift(nodeVals.splice(-4,4))
                    }
                    for (var j = 0; j < valAtTime.length; j += 1){
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
        return null;
    }
    
    
    /*************************
    Turn into a logic value: 
    V_il = 0.6
    V_ih = 2.7
    **************************/
    var vil = 0.6;
    var vih = 2.7;
    function logic(number){
        if (number < vil) return 0;
        else if (number > vih) return 1;
        else return "X";
    }
    
    /*************************
    Exports
    **************************/
    return {reset:reset,
            getResults:getResults,
            setResults:setResults,
            testResults:testResults,
            addVerify:addVerify,
            setCheckoffStatement:setCheckoffStatement,
//            logic:logic
           };
}());