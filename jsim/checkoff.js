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
        
        console.log("CURRENT RESULTS:",$('#results').data("current"));
        runVerify();
//        var passedModal = new ModalDialog();
//        passedModal.setTitle("Checkoff Succeeded!");
//        passedModal.setText("(But nothing actually happened.)");
//        passedModal.addButton("Dismiss",'dismiss');
//        passedModal.show();
    }
    
    
    /*************************
    
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
        console.log("run verify called");
        for (var v = 0; v < mVerify_statements.length; v += 1){
            var vobj = mVerify_statements[v];
            console.log("vobj: ",vobj);
            
            var times = mResults._time_;
            var time_indices = [];
            var nodes = vobj.nodes.slice(0);
            var results = {};
            
            for (var i = 0; i < nodes.length; i += 1){
                results[nodes[i]] = [];
            }
            console.log("empty results obj:",results);
            
            var index;
            if (vobj.type == "periodic"){
                index = findTimeIndex(vobj.tstart,0)
                time_indices.push(index);
                for (node in results){
                    results[node].push(Parser.logic(mResults[node][index]));
                }
                for (var i = 1; i < vobj.values.length; i += 1){
                    index = findTimeIndex(vobj.tstart + vobj.tstep * i, time_indices[i-1])
                    time_indices.push(index);
                    for (node in results){
                        results[node].push(Parser.logic(mResults[node][index]));
                    }
                }
                console.log("time indices: ",time_indices);
                console.log("filled results obj:",results);
            }
        }
    }
    
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