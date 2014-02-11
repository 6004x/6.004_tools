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
    var mSources = [];
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
    function setResults(data, options, sources){
        mResults = data;
        mOptions = options;
        mSources = sources;
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
            // no Submit button for local test jigs
            if (mCheckoffStatement.checksum.value != 0)
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
        } else if (mistake.msg == 'Verify memory error') {
            failedModal = new ModalDialog();
            failedModal.setTitle("Checkoff Failed!");
            failedModal.setContent("<p><div class='text-error'>Memory verification error:</div></p>\
<p><table class='table'><tr><td>Memory:</td><td>"+mistake.nodes+"</tr>\
<tr><td>Location:</td><td>"+mistake.time+"</td></tr>\
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

    // the Java String.hashCode function.
    function hash_string(str) {
        var hash = 0;
        for(var i = 0, len = str.length; i < len; i++) {
            // the "<< 0" converts answer to 32-bit int
            hash = (31 * hash + str.charCodeAt(i)) << 0;
        }
        return hash;
    }

    // Run Verify: runs the stored verify statements
    function runVerify(){
        var checksum = 2536038;

        // start by collecting all the verification info from all the .verify statements

        var history = {}; // simulation history for each checked node
        var checks = [];  // list of checks: {time, nodes, expected} 
        $.each(mVerify_statements,function (vindex,vobj) {
            if (vobj.type == "memory"){
                // the "<< 0" converts answer to 32-bit int
                checksum = (checksum + verify_memory(vobj)) << 0;  // may throw VerifyError...
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
                    h.yvalues = h.yvalues.map(function(v){ return (v < vil) ? 0 : ((v >= vih) ? 1 : 2); });
                }
                history[node] = h;
            });

            // add the checks performed by this .verify to our master list
            $.each(vobj.values,function (index,v) {
                checks.push({time: v.time, nodes: vobj.nodes, expected: v.value});
                // the "<< 0" converts answer to 32-bit int
                checksum = (checksum + (index+1)*(Math.floor(v.time*1e12) + v.value)) << 0;
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

        // report bogus checksum
        var mChecksum = mCheckoffStatement.checksum.value;
        if (mChecksum != 0 && checksum != mChecksum)
            throw new VerifyError("<font size=5>Verification error...</font><p><p>It appears that the checkoff information has been modified in some way.  Please verify that you are using the official checkoff file; contact the course staff if you can't resolve the problem.<p>"+checksum);
    };
    
    // vobj has attributes:
    //      type: "memory"
    //      mem_name: <the name of the memory instance>
    //      startaddress: <the address to start verification at>
    //      contents: <the expected contents of the memory>
    //      display_base: 'hex', 'octal', or 'binary'
    //      token: <the first token of the memory line for error throwing>
    function verify_memory(vobj){
        var mem = mResults.get_memory(vobj.mem_name);
        var checksum = 0;

        if (mem === undefined) {
            throw new VerifyError('Cannot get contents of memory '+vobj.mem_name);
        }

        var start = vobj.startaddress;
        for (var i = 0; i < vobj.contents.length; i += 1) {
            var got = mem[start+i];
            if (vobj.contents[i] != got) {
                throw new VerifyError('Verify memory error',start+i,vobj.mem_name,
                                      vobj.contents[i].toString(vobj.display_base),
                                      got ? got.toString(vobj.display_base) : 'undefined');
            }
            checksum += (i+1)*(start + i + got);
        }

        return checksum;
    }
    
    function complete_checkoff(old){
        var username = old.inputContent(0);
        var password = old.inputContent(1);
        var collaborators = old.inputContent(2);
        var advice = old.find('.advice').map(function(index,field){ return $(field).val(); });
        var astrings = [];
        $.each(advice,function(index,a){ astrings.push(a); });

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
            size: mResults.size,
            counts: JSON.stringify(mResults.counts || {}),
            figure_of_merit: 1e-10/((mResults.size*1e-12) * mResults.time),
            time: mResults.time,
            version: 'JSim3.1.1',
            advice: JSON.stringify(astrings),
            circuits: _.map(mSources, function (source) {
                // don't send along shared files
                if (source.file.indexOf('/shared') == 0) return '';
                return '============== source: ' + source.file + '\n' + source.content + '\n==============\n';
            }).join('')

        }).done(function(data) {
            callback(true, data);
        }).fail(function() {
            callback(false);
        });
    }

    function submit_task(dialog,assignment) {
        if (assignment == 'Lab #2') {
            var expected = {png:"/ssldocs/lab2_1.png", gates:24, fets:114};
            var best = {png:"/ssldocs/lab2_8.png", gates:21, fets:96};
            var worse = [{png:"/ssldocs/lab2_2.png", gates:42, fets:150},
                         {png:"/ssldocs/lab2_3.png", gates:27, fets:126},
                         {png:"/ssldocs/lab2_4.png", gates:33, fets:132},
                         {png:"/ssldocs/lab2_6.png", gates:36, fets:144},
                         {png:"/ssldocs/lab2_9.png", gates:36, fets:132}];
            var example = FileSystem.getUserName().charCodeAt(0) % worse.length;

            var fets = mResults.counts.nfet + mResults.counts.pfet;
            var result = $('<div style="font: 14px Geogia,serif;"></div>');
            result.append('Your design has a total of <b>'+fets+'</b> mosfets.  For comparison, the graph below shows '+
                          'the number of designs submitted in a previous semester (y-axis) vs. their mosfet count (x-axis).')
            result.append('<br><br><img src="/ssldocs/lab2_15.jpg">');

            result.append('<br><br>Below we will ask you to compare your design with a few other designs submitted previously.');
            result.append('  First, for reference, here\'s your JSim code:');
            result.append('<br><br><textarea style="font: 12px/1.25 monospace; width:95%;" rows="10" readonly=1>'+mSources[0].content+'</textarea><br>');
            
            if (fets > expected.fets) {
                result.append('<br><br><img src="'+expected.png+'" style="margin-left: 5px; width:50%; float: right;"></center>');
                result.append('<b>Comparison #1:</b> <br><br>If we used the design shown at the right for the FA module,');
                result.append(' a 3-bit adder would require only <b>'+expected.fets+'</b> mosfets, smaller than your');
                result.append(' design by '+(fets-expected.fets)+' mosfets.');
                result.append('<br><br>Imagine you\'re an LA in a future semester of 6.004 and a student');
                result.append(' submits a solution like yours.  What advice would you give them');
                result.append(' on how to make their solution as good as the one in');
                result.append(' the figure to the right?');
                result.append('<br style="clear:right;"><br><textarea class="advice" style="font: 12px/1.25 monospace; width:95%;" rows="10">... enter your advice here</textarea>');
                result.append('<input type=hidden class="advice" name="example" value="example=expected">');
            } else {
                result.append('<br><br><img src="'+worse[example].png+'" style="margin-left: 5px; width:50%; float: right;"></center>');
                result.append('<b>Comparison #1:</b> <br><br>If we used the design shown at the right for the FA module,');
                result.append(' a 3-bit adder would require <b>'+worse[example].fets+'</b> mosfets, larger than your');
                result.append(' design by '+(worse[example].fets-fets)+' mosfets.');
                result.append('<br><br>Imagine you\'re an LA in a future semester of 6.004 and a student');
                result.append(' submits a solution like the shown on the right.  What advice would you give them');
                result.append(' on how to make their solution as good as yours?');
                result.append('<br style="clear:right;"><br><textarea class="advice" style="font: 12px/1.25 monospace; width:95%;" rows="10">... enter your advice here</textarea>');
                result.append('<input type=hidden class="advice" name="example" value="example='+example+'">');
            }


            if (fets > best.fets) {
                result.append('<br><br><img src="'+best.png+'" style="margin-left: 5px; width:50%; float: right;"></center>');
                result.append('<b>Comparison #2:</b> <br><br>If we used the design shown at the right for the FA module,');
                result.append(' a 3-bit adder would require only <b>'+best.fets+'</b> mosfets, smaller than your');
                result.append(' design by '+(fets-best.fets)+' mosfets.');
                result.append('<br><br>Imagine you\'re an LA in a future semester of 6.004 and a student');
                result.append(' submits a solution like yours.  What advice would you give them');
                result.append(' on how to make their solution as good as the one in');
                result.append(' the figure to the right?');
                result.append('<br style="clear:right;"><br><textarea class="advice" style="font: 12px/1.25 monospace; width:95%;" rows="10">... enter your advice here</textarea>');
            }

            result.append('<br><hr><br>To complete your submission, please enter your Athena name, your 6.004')
            result.append('online password and list any collaborators.');

            dialog.setContent(result);
            dialog.noFocus();
            dialog.setWidth('750px');
        }
    }

    function show_checkoff_form(old){
        old.dismiss();
        var dialog = new ModalDialog();
        dialog.setTitle("Submit Lab");
        submit_task(dialog,mCheckoffStatement.assignment.name);
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
