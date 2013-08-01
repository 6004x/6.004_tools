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
        console.log('adding verify: ',obj);
    }
    
    /**************************
    Add a checkoff statement -- called by the parser
    **************************/
    function setCheckoffStatement(checkoff_obj){
        mCheckoff_statement = checkoff_obj;
        console.log("checkoff statement:",mCheckoff_statement);
    }
    
    /**************************
    Get the results of the last simulation
    **************************/
    function getResults(){
        mResults = $('#results').data("current"); 
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
        if (mResults === null){
//            console.log("No results! Did you run the simulation?");
            var failedModal = new FailedModal('No results to verify. Did you run the \
simulation?');
            failedModal.show();
            return;
        }
        
        if (mCheckoff_statement === null){
            var failedModal = new FailedModal("No checkoff requested. Did you include the appropriate \
'labXcheckoff.jsim' file?");
            failedModal.show();
            return;
        }
        
//        console.log("CURRENT RESULTS:",$('#results').data("current"));
        var mistake = runVerify();
        console.log("mistake:",mistake);
        if (!mistake){
            var passedModal = new ModalDialog();
            passedModal.setTitle("Checkoff Succeeded!");
            passedModal.setText("Verification succeeded! This is where it would be submitted to the \
checkoff server or something if that was implemented yet.");
            passedModal.addButton("Dismiss",'dismiss');
            passedModal.show();
        } else {
            console.log("time:",mistake.time);
            var failedModal = new ModalDialog()
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
//        console.log("run verify called");
        for (var v = 0; v < mVerify_statements.length; v += 1){
            var vobj = mVerify_statements[v];
//            console.log("vobj: ",vobj);
            
            var times = mResults._time_;
            var time_indices = [];
            var time_steps = [];
            var nodes = vobj.nodes.slice(0);
            var results = {};
            
            for (var i = 0; i < nodes.length; i += 1){
                results[nodes[i]] = [];
            }
//            console.log("empty results obj:",results);
            
            var index;
            if (vobj.type == "periodic"){
                time_steps.push(vobj.tstart);
                index = findTimeIndex(vobj.tstart,0)
                time_indices.push(index);
                for (node in results){
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
//                console.log("time indices: ",time_indices);
//                console.log("filled results obj:",results);
                
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
                if (vobj.display_base == 'decimal') {
                    base = 10;
                    base_prefix = ''
                }
                
                var mistake = false;
                for (var i = 0; i < vobj.values.length; i += 1){
                    var expectedVal = vobj.values[i].toString(base).split("");
                    
                    var nodeVals = []
                    var valAtTime = [];
                    for (var j = 0; j < nodes.length; j += 1){
//                        console.log("node:",nodes[j],"val:",results[nodes[j]][i])
                        nodeVals.push(logic(results[nodes[j]][i]));
                    }
//                    console.log("valAtTime:",valAtTime,"joined:",valAtTime.join(''));
////                    console.log("parsed:",parseInt(valAtTime.join(''),2));
//                    valAtTime = parseInt(valAtTime.join(''),2)
//                    if (isNaN(valAtTime)) valAtTime = 'X';
//                    else valAtTime = valAtTime.toString(base).split('');
                    
                    if (base == 2){
                        valAtTime = nodeVals.slice(0);
                    } else if (base == 8){
                        // break into threes from the end
                        while (nodeVals.length > 0){
                            valAtTime.push(nodeVals.splice(-3,3))
                        }
                        for (var j = 0; j < valAtTime.length; j += 1){
                            valAtTime[j] = parseInt(valAtTime[j].join(''),2).toString(8);
                            if (isNaN(valAtTime[j])) valAtTime[j] = "X";
                        }
                    } else if (base == 16){
                        // break into fours from the end
                        while (nodeVals.length > 0){
                            valAtTime.push(nodeVals.splice(-4,4))
                        }
                        for (var j = 0; j < valAtTime.length; j += 1){
                            valAtTime[j] = parseInt(valAtTime[j].join(''),2).toString(16);
                            if (isNaN(valAtTime[j])) valAtTime[j] = "X";
                        }
                    }
                    
                    while (expectedVal.length < valAtTime.length){
                        expectedVal.unshift("0");
                    }
//                    while (valAtTime.length < nodes.length){
//                        valAtTime.unshift("0");
//                    }
                    
//                    console.log('val at time',i+':',valAtTime);
//                    console.log('expected:',expectedVal);
                    
                    for (var k = 0; k < valAtTime.length; k += 1){
                        if (expectedVal[k] != valAtTime[k]){
                            mistake = true;
                            valAtTime[k] = "<span class='wrong'>"+valAtTime[k]+"</span>";
                        }
                    }
//                    var givenVal = parseInt(valAtTime,2);
                    console.log("val2:",valAtTime);
                    
                    if (mistake){
                        return {time:time_steps[i],
                                nodes:nodes,
                                exp:base_prefix+expectedVal.join(''),
                                given:base_prefix+valAtTime.join('')};
                    }
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
    
//    function multi_logic(numbers){
//        for (var i = 0; i < numbers.length; i += 1){
////            console.log('logic numbers[i]:',logic(numbers[i]));
//            numbers[i] = logic(numbers[i]);
//        }
//        var joined = numbers.join("");
//        return {val:parse_number("0b"+joined),symbols:"0b"+joined}
////        console.log("numbers:",joined);
////        console.log("parsed:",parseInt(joined,2));
//    }
    
    /*************************
    Exports
    **************************/
    return {reset:reset,
            getResults:getResults,
            testResults:testResults,
            addVerify:addVerify,
            setCheckoffStatement:setCheckoffStatement
           };
}());