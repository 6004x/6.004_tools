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
        
        var mistake;
        try {
            runVerify();  // will throw VerifyError
        } catch (e) {
            if (e instanceof VerifyError) mistake = e;
            else throw e;
        }

        if (mistake === undefined){
            var passedModal = new ModalDialog();
            passedModal.setTitle("Checkoff Succeeded!");
            passedModal.setText("Verification succeeded!");
            passedModal.addButton("Dismiss",'dismiss');
            passedModal.addButton("Submit", 
                                  function(){show_checkoff_form(passedModal)},
                                  'btn-primary');
            passedModal.show();
        } else if (mistake.msg == 'Verify error') {
            failedModal = new ModalDialog();
            failedModal.setTitle("Checkoff Failed!");
            failedModal.setContent("<p><div class='text-error'>Node value verification error:</div></p>\
<p><table class='table'><tr><td>Node(s):</td><td>"+mistake.nodes+"</tr>\
<tr><td>Time:</td><td>"+engineering_notation(mistake.time,3)+"s</td></tr>\
<tr><td>Expected:</td><td>"+mistake.exp+"</td></tr>\
<tr><td>Actual:</td><td>"+mistake.given+"</td></tr></table></p>");
            failedModal.addButton("Dismiss",'dismiss');
            failedModal.show();
        } else {
            failedModal = new FailedModal(mistake.msg);
            failedModal.show();
        }
    }
    
    // find largest index in array such that array[index] <= val
    // return 0 if all array elements are >= val
    // assumes array contents are in increasing order
    // uses a binary search
    function search(array, val) {
        var start = 0;
        var end = array.length-1;
        var index;
        while (start < end) {
            index = (start + end) >> 1;   // "middle" index
            if (index == start) index = end;
            if (array[index] <= val) start = index;
            else end = index - 1;
        }
        return start;
    }

    // our very own Error object
    function VerifyError(msg,time,nodes,exp,given) {
        this.msg = msg;
        this.time = time;
        this.nodes = nodes;
        this.exp = exp;
        this.given = given;
    }

    // Run Verify: runs the stored verify statements
    function runVerify(){
        var checksum = 2536038;

        // start by collecting all the verification info from all the .verify statements

        var history = {}; // simulation history for each checked node
        var checks = [];  // list of checks: {time, nodes, expected} 
        $.each(mVerify_statements,function (vindex,vobj) {
            if (vobj.type == "memory"){
                verify_memory(vobj);  // may throw VerifyError...
                return;
            }

            // collect the history for all the nodes to be verified
            $.each(vobj.nodes,function (index,node) {
                var h = mResults.history(node);
                if (h === undefined) throw new VerifyError('No results for node '+node);
                if (mResults.result_type() == 'analog') {
                    // convert results to digital domain (0, 1, X)
                    var vil = mOptions.vil || 0.2;
                    var vih = mOptions.vih || 0.8;
                    h.yvalues = h.values.map(function(v){ return (v < vil) ? 0 : ((v >= vih) ? 1 : 2); });
                }
                history[node] = h;
            });

            // add the checks performed by this .verify to our master list
            $.each(vobj.values,function (index,v) {
                checks.push({time: v.time, nodes: vobj.nodes, expected: v.value});
                // do something about computing checksum?
            });
        });

        // sort the checks by time, so we'll do earlier checks across all nodes
        // before checking any later values
        checks.sort(function(a,b) { return a.time - b.time; });

        // run through all checks, now ordered by increasing time
        $.each(checks,function(index,check) {
            // get node values at check.time
            var values = check.nodes.map(function (node) {
                var h = history[node];
                if (h === undefined) return undefined;
                var index = search(h.xvalues,check.time);
                return h.yvalues[index];    // only 0, 1 or X (=2)
            });

            // compare values and expect flagging any errors
            var error = false;
            var last = values.length - 1;
            var e = check.expected;
            for (var i = 0; i < values.length; i += 1) {
                // check starting with LSB since that makes it easy
                // to effectively pad check.expected with high-order 0's
                if (values[last - i] != (e & 1)) {
                    error = true;
                    break;
                }
                e >>= 1;
            }

            if (error) {
                // report detected error, showing expected and actual bit-by-bit
                var exp = [];
                var given = [];
                for (var j = 0; j < values.length; j += 1) {
                    var v = "01X"[values[j]];
                    var e = "01"[(check.expected >> (last - j)) & 1];
                    exp.push(e);
                    // color code errors for easy spotting
                    if (v != e) given.push('<span class="wrong">'+v+'</span>');
                    else given.push(v);
                }
                throw new VerifyError('Verify error',check.time,Parser.iterator_notation(check.nodes),
                                      exp.join(''),given.join(''));
            }
        });

        // report bogus checksum here?
    };
    
    function verify_memory(vobj){
        // vobj has attributes:
        //      type: "memory"
        //      mem_name: <the name of the memory instance>
        //      startaddress: <the address to start verification at>
        //      contents: <the expected contents of the memory>
        //      display_base: 'hex', 'octal', or 'binary'
        //      token: <the first token of the memory line for error throwing>
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
        };
        
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
