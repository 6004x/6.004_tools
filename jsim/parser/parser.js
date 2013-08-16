var Parser = (function(){
    
    /********************************
    Error object:
    *********************************/
    function CustomError(message,token){
        this.message = message;
        this.line = token.line;
        this.column = token.column;
        this.filename = token.origin_file;
    }
    
    /**********************************
    Analyzer: removes comments and line extensions
        --args: -input_string: a string representing the contents of a file
        --returns: a string representing the contents of the file with line extensions
                    processed and comments removed
    ************************************/
    function analyze(input_string){
        input_string += "\n";
        var line_ext_pattern = /\n+[\t ]*\+/g;
        // newline followed by (whitespace and) a plus
        var comment1_pattern = /\/\/.*\n/g;
        var comment2_pattern = /\/\*(.|\n)*?\*\//g;
        // double slash till the end of the line
        // slash-star till star-slash
        
        function newline_track(match){
            // replace everything that isn't a newline/record separator with a space
            var replaced1 = match.replace(/[^\n\u001e]/g," ");
            // now replace all newlines with record separators so that line numbers
            // can be tracked accurately
            return replaced1.replace(/\n/g,"\u001e");
        }
        
        // remove single-line comments by replacing them with a newline,
        // since the pattern includes the newline
        var decommented1_string = input_string.replace(comment1_pattern,
                                                        "\n");
        
        // extend lines by replacing the line_ext_pattern with a
        // record separator for each newline.
        var extended_string = decommented1_string.replace(line_ext_pattern,
                                                          newline_track);
        
        // remove multi-line comments by replacing them with a record
        // separator for each newline
        var decommented2_string = extended_string.replace(comment2_pattern,
                                                        newline_track);
        
        return decommented2_string;
    }
    
    /*****************************
    Splitter: splits a string into an array of tokens
        --args: -input_string: a string containing the processed contents of a file
                -filename: the name of the file
        --returns: an array of tokens
    *******************************/
    function split(input_string,filename){ 
        var pattern = /".*?"|0[xb][0-9a-zA-Z]+|([0-9]*\.)?[0-9]+(([eE][\-+]?[0-9]+)|([a-zA-Z]+))?|[$\.a-zA-Z_][\w\[\]\.]*|\+|\-|\*|\/|\^|\(|\)|\,|=|\n|\u001e/g;
        // 'pattern' will match, in order:
        //      anything wrapped in quotes
        //      a hex number
        //      a number (int, float, exponential or scaled) (includes octal)
        //      names:
        //          a sequence that may start with a period,
        //          then has a letter, 
        //          then any number of letters, numbers, underscores, colons,
        //          periods, commas, dollar signs, number signs, or square brackets
        //      an equals sign
        //      a newline
        //      a record separater (unicode character \u001e)
        
//        var fn_pattern = /^\w*\s*\([^\)]*\)$/;
        var names_pattern = /(^[A-Za-z][\w$:\[\]\.]*)/;
        var control_pattern = /^\..+/;
        var string_pattern = /".*?"/;
        var num_pattern = /^(([+-]?\d*\.?)|(0x)|(0b))\d+(([eE]-?\d+)|[A-Za-z]*)/;
        var op_pattern = /^[*+\-\/\^]$/;
        
        var matched_array;
        var substrings = [];
        var lineNumber = 1;
        var lastLineOffset = 0;
        while ((matched_array = pattern.exec(input_string)) !== null){
            //set the token's type
            var type;
            /*if (fn_pattern.test(matched_array[0])){
                type = 'function';
            } else*/ if (string_pattern.test(matched_array[0])){
                matched_array[0] = matched_array[0].replace(/"/g,'');
                type = 'string';
            }  else if (names_pattern.test(matched_array[0])){
                type = 'name';
            } else if (num_pattern.test(matched_array[0])){
                type = 'number';
            } else if (control_pattern.test(matched_array[0])){
                type = 'control';
            } else if (op_pattern.test(matched_array[0])){
                type = 'op';
            } else if (matched_array[0] == "="){
                type = 'equals';
            } else {
                type = null;   
            }
            
            // check for unclosed comments
            if (matched_array[0] == "/*"){
                throw new CustomError("Unclosed comment",
                                      {line:lineNumber,column:0,origin_file:filename});
            }
            
            // find column offset
            var offset = matched_array.index - lastLineOffset;
            
            // don't include record separators as tokens
            if (matched_array[0] != "\u001e"){
                var obj = {token:matched_array[0],
                           line:lineNumber,
                           column:offset,
                           type:type,
                           origin_file:filename
                          };
                if (obj.type == 'number'){
                    try{
                        obj.token = parse_number(obj.token);
                    } catch (err) {
                        throw new CustomError(err, obj);
                    }
                }
                substrings.push(obj);
            }
            
            // increment line number and calculate new line offset
            if ((matched_array[0] == "\n")||(matched_array[0] == "\u001e")){
                lineNumber += 1;
                lastLineOffset = matched_array.index + 1;
            }
        }
        return substrings;
    }
    
    /********************************
    Iterater expander: expands iterators such as A[0:5] and duplicators such as B#3
    into the proper sequences
        --args: -token_array: an array of tokens representing the contents of a file
        --returns: an array of tokens in which all iterators and duplicators have
                    been expanded
    *********************************/
    function iter_expand(token_array){
        var iterator_pattern = /\[\d+:\d+(:-?\d+)?\]/;
        var duplicator_pattern = /#\d+$/;
        // iterator syntax: [digit:digit(:optional_+/-digit)] 
        // duplicator syntax: anything#digit
        
        var expanded_array = [];
        
        while (token_array.length > 0){
            var current = token_array[0];
            var iter_match_array;
            var dupe_match_array;
            var duped_token_array = [];
            var new_token_array = [];
            var i;
            
            if (current.type == 'name'){
                if((dupe_match_array = duplicator_pattern.exec(current.token))
                   !== null){
                    var repetitions = parseInt(dupe_match_array[0].slice(1));
                    var dupe_string = current.token.slice(0,dupe_match_array.index);
                    for (i = 0; i < repetitions; i += 1){
                        duped_token_array.push({token:dupe_string,
                                                line:current.line,
                                                type:'name',
                                                column:current.column,
                                                origin_file:current.origin_file
                                                });
                    }
                    duped_token_array = iter_expand(duped_token_array);
                    expanded_array = expanded_array.concat(duped_token_array);
                    token_array.shift();
                }else
                if((iter_match_array = iterator_pattern.exec(current.token))
                   !== null){
                    var iter_string = iter_match_array[0];
                    var front_string = current.token.slice(0,iter_match_array.index);
                    var end_index = iter_match_array.index + iter_string.length;
                    var end_string = current.token.slice(end_index);
                    
                    var new_iter_strings;
                    try{
                        new_iter_strings = iter_interpret(iter_string);
                    } catch(err) {
                        throw new CustomError(err,current);
                    }
                    for (i = 0; i < new_iter_strings.length; i += 1){
                        var new_token_obj = {token:front_string+new_iter_strings[i]+
                                            end_string,
                                             line:current.line,
                                             type:'name',
                                             column:current.column,
                                             origin_file:current.origin_file
                                            };
                        new_token_array.push(new_token_obj);
                    }
                    new_token_array = iter_expand(new_token_array);
                    expanded_array = expanded_array.concat(new_token_array);
                    token_array.shift();
                    
                } else {
                    expanded_array.push(token_array.shift());
                }
            } else {
                expanded_array.push(token_array.shift());
            }
        }
        return expanded_array;
    }
    
    /****************************
    iterator interpreter: interprets and expands an iterator
        --args: -iterator_string: a string of the form "[a:b:k]"
        --returns: an array of strings of the form ["[a]","[a+k]","[a+2k]",...,"[b]"]
    ********************************/
    function iter_interpret(iterator_string){
        // get the two to three parameters from the iterator string
        var param_array = iterator_string.match(/\d+/g);
        var i = parseInt(param_array[0]);
        var j = parseInt(param_array[1]);
        var k;
        var reverse = false;
        if (param_array.length > 2){ 
            k = parseInt(param_array[2]); 
            if (i > j) { k *= -1; }
            if (k === 0){
                // if the step is indicated and invalid, throw an error
                throw "Invalid iterator";
            }
        }
        else if (i < j){ k = 1; }
        else { k = -1; }
        
        // if the step is negative, set the reverse parameter
        if (k<0){ reverse = true; }
        
        // if reversed, negate the start, stop, and step so that there is only one
        // while loop needed
        if (reverse){
            i *= -1;
            j *= -1;
            k *= -1; 
        }
        var result = [];
        var temp = i;
        while (temp <= j){
            var temp2;
            // if the loop is using negated parameters, be sure to send the real
            // number back
            if (reverse) { temp2 = -1*temp; }
            else { temp2 = temp; }
            result.push("["+temp2+"]");
            temp += k;
        }
        return result;
    }
    
    /************************************
    Parse Number: parse a string representing a number of some sort
    *************************************/
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
    
    /****************************
    Eat expression: 
    ****************************/
    function eat_expression(line, start_index){
        if (line[start_index].type != "name" && line[start_index].type != "number"){
            throw new CustomError("Ill-formed expression.",line[start_index]);
        }
        var expr = [];
        var i = start_index;
        var next_index;
        while (true){
            if (line[i+1]){
                if (line[i+1].type == "op"){
                    expr.push(line[i].token, line[i+1].token);
                    i += 2;
                } else if (line[i].token == "("){
                    expr.push(line[i].token);
                    i += 1;
                } else if (line[i+1].token == ")"){
                    if (line[i+2] && line[i+2].type == "op"){
                        expr.push(line[i].token, line[i+1].token, line[i+2].token);
                        i += 3;
                    } else {
                        expr.push(line[i].token, line[i+1].token);
                        next_index = i+2;
                        break;
                    }
                } else {
                    expr.push(line[i].token);
                    next_index = i+1;
                    break;
                }
            } else {
                expr.push(line[i].token);
                break;
            }
        }
        expr = expr.join('');
        try{
            expr = Calculator.parse(expr);
        } catch (err) {
            throw new CustomError(err,line[start_index]);
        }
        return {next_index:next_index,
                expr:{type:"expression",
                      token:expr,
                      line:line[start_index].line,
                      column:line[start_index].column,
                      origin_file:line[start_index].origin_file}
               };
    }
    
    /******************************
    filename_to_contents: takes a file path and returns the string representing its 
    content
        --args: -filename: a string representing the unique name of a file
        --returns: a string representing the contents of the file
    *******************************/
    var numPendingFiles = 0;
    var included_contents = [];
    var includeCompleted = false;
    var parseCalled = false;
    function filename_to_contents(file_token, callback){
        var filename = file_token.token;
        numPendingFiles += 1;
        FileSystem.getFile(filename, function(obj){
            // success function
            numPendingFiles -= 1;
            tokenize(obj.data,filename,callback,error_cb,false);
            
            if (numPendingFiles === 0 && includeCompleted && !parseCalled) {
                /*************** completed callback****************/
                return parse(callback);
            }
            
        }, function(){
            error_cb(new CustomError("Could not get file "+filename,file_token));
        });
    }
    
    /**************************
    Include: takes a parsed array of tokens and includes all the files
        --args: -token_array: an array of tokens
        --returns: a new array of tokens consisting of all the tokens from all files
    ***************************/
    function include(token_array, callback){
        var included_files = [token_array[0].origin_file];
        // list of filenames that have already been included 
        var new_token_array = [];
        includeCompleted = false;
        
        while (token_array.length > 0){
            var current = token_array[0];
            if (current.type != "number" && current.token.toLowerCase() == ".include"){
                var file = token_array[1];
                if (file.type != "string"){
                    throw new CustomError("Filename expected", current);
                } else {
                    var filename = file.token;
                    if (included_files.indexOf(filename) == -1) {
                        included_files.push(filename);
                        
                        filename_to_contents(file, callback);
                        token_array.shift();
                        token_array.shift();  
                    }
                }
            } else {
            new_token_array.push(token_array.shift());
            }
        }
        includeCompleted = true;
        included_contents.push(new_token_array.slice(0));
        if (numPendingFiles === 0){
            parse(callback);
        }
    }
    
    /*********************************
    Tokenize: takes a raw string, does decommenting/extending, tokenizes it, and expands
    iterators and duplicators, and includes files
        --args: -input_string: a string representing the file contents
                -filename: a string representing the unique name of the file
        --returns: an array of strings (tokens)
    *********************************/
    var error_cb;
    
    function tokenize(input_string, filename, callback, error_callback, reset){
        error_cb = error_callback;
        if (reset){
            included_contents = [];
            parseCalled = false;
            numPendingFiles = 0;
        }
        return include(iter_expand(split(analyze(input_string),filename)),callback);
    }
    
/******************************************************************************
*******************************************************************************
Parse 
*******************************************************************************
******************************************************************************/
    
    var globals;
    var plots;
    var options;
    var analyses;
    var subcircuits;
    var current_subckt;
    var used_names;
    var netlist;
    var plotdefs;
    
    /********************
    Parse: combines contents of all included files, interpets them (=turns into netlists), and runs the 
    callback
    ********************/
    function parse(callback){
        parseCalled = true;
        
        var token_array = [];
        for (var i = 0; i < included_contents.length; i += 1){
            token_array = token_array.concat(included_contents[i]);
        }
        try {
            callback(interpret(token_array));
        } catch(err){
            error_cb(err);
            return;
        }
    }
    
    /***************************
    Interpret: turns a token array into a hierarchal representation then calls the flattening functions,
                e.g., parses it
    ***************************/
    function interpret(token_array){
        globals = [];
        plots = [];
        options = {};
        analyses = [];
        used_names = [];
        plotdefs = {};
        netlist = [{type:'ground',
                    ports:['gnd'],
                    connections:['gnd'],
                    properties:{}}];
        subcircuits = {_top_level_:{name:"_top_level_",
                                    ports:[],
                                    properties:{},
                                    devices:[]
                                   } 
                      };
        current_subckt = subcircuits._top_level_;
        
        var toParse = [];
//        token_array = move_instances(token_array);
        
        // go through tokens one line at a time, and pass the line to the 
        // appropriate handler
        while (token_array.length > 0){
            var current = token_array[0];
            
            // transfer the tokens of one line to toParse
            if(current.token != "\n"){
                toParse.push(token_array.shift());
            } else if (toParse.length !== 0) { 
                if (toParse[0].type == "control"){ 
                    parse_control(toParse);
                    toParse = [];
                } else {
                    var dev = read_device(toParse);
                    if (dev instanceof Array){
                        current_subckt.devices = current_subckt.devices.concat(dev);
                    } else {
                        current_subckt.devices.push(dev);
                    }
                    token_array.shift();
                    toParse = [];
                }
            } else {
                token_array.shift();
                continue;
            }
        }
        
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// Parse expressions somewhere in here, including in analyses!
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
        
        netlist_instance("",{type:"instance",
                             ports:[],
                             connections:[],
                             properties:{name:"_top_level_",
                                         instanceOf:"_top_level_"}
                            },netlist);
        
        return {globals:globals,
                options:options,
                plots:plots,
                plotdefs:plotdefs,
                analyses:analyses,
                netlist:netlist};
    }
    
    /*****************************
    Parse Control 
        --args: -line: a list of tokens representing the line with a control statement
        --returns: none
    ******************************/
    function parse_control(line){
        switch (line[0].token.toLowerCase()){
            case ".connect":
//                throw new CustomError("Connect not implemented yet",line[0]);
                read_connect(line);
                break;
            case ".global":
                read_global(line);
                break;
            case ".options":
                read_options(line);
                break;
            case ".plot":
                read_plot(line);
                break;
            case ".plotdef":
                read_plotdef(line);
                break;
            case ".tran":
                if (current_subckt.name != "_top_level_"){
                    throw new CustomError("Analyses not allowed inside "+
                                    "subcircuit definitons", line[0]);
                }
                read_tran(line);
                break;
            case ".dc":
                if (current_subckt.name != "_top_level_"){
                    throw new CustomError("Analyses not allowed inside "+
                                    "subcircuit definitons", line[0]);
                }
                read_dc(line);
                break;
            case ".ac":
                if (current_subckt.name != "_top_level_"){
                    throw new CustomError("Analyses not allowed inside "+
                                    "subcircuit definitons", line[0]);
                }
                read_ac(line);
                break;
            case ".subckt":
                if (current_subckt.name != "_top_level_"){
                    throw new CustomError("Nested subcircuits not allowed",line[0]);
                }
                current_subckt = read_subcircuit(line);
                break;
            case ".ends":
                if (current_subckt.name == "_top_level_"){
                    throw new CustomError(".ends statement without matching .subckt",line[0]);
                }
                current_subckt = subcircuits._top_level_;
                break;
            case ".checkoff":
                read_checkoff(line);
                break;
            case ".verify":
                read_verify(line);
                break;
            case ".mverify":
                read_mverify(line);
                break;
            default:
                throw new CustomError("Invalid control statement",line[0]);
        }
    }
    
    /************************************************
    Control statement readers
    ************************************************/
    
    /*********************
    Read connect
    **********************/
    function read_connect(line){
        var obj = {type:"connect",
                   connections:[],
                   properties:{}};
        for (var i = 1; i < line.length; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected.",line[i]);
            }
            obj.connections.push(line[i].token);
        }
        netlist.push(obj);
    }
    
    /*********************
    Read global: for global nodes
    *********************/
    function read_global(line){
        line.shift();
        if (line.length === 0){
            throw new CustomError("No global nodes specified",line[0]);
        }
        for (var i = 0; i < line.length; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected",line[i]);
            } else {
                globals.push(line[i].token);
            }
        }
    }
    
    /*********************
    Read plot: which nodes to plot
    *********************/
    function read_plot(line){
        line.shift();
        var plot_list = [];
        var plot_function = [];
        var reading_fn = false;
        for (var i = 0; i < line.length; i += 1){
            if (line[i+1] && line[i+1].token == "("){
                reading_fn = true;
                plot_function.push(line[i].token);
            }
            
            if (reading_fn){
                if (line[i].token = ")") {
                    reading_fn = false;
                    plot_function.push(line[i].token);
                    plot_list.push(plot_function.join(''));
                } else if (line[i].type != "name" && !(line[i].token == "(" || line[i].token == ",")) {
                    throw new CustomError("Node name expected.",line[i]);
                } else {
                    plot_function.push(line[i].token);
                }
            } else if (line[i].type != "name"){
                throw new CustomError("Node name expected.",line[i]);
            } else {
                plot_list.push(line[i].token);
            }
            
//            if (line[i].type == "function"){
//                // get the node name in the parentheses
//                var nodes = /\((.+)\)/.exec(line[i].token)[1];
//                nodes = nodes.split(/[,\s]\s*/);
//                
//                for (var n = 0; n < nodes.length; n += 1){
//                    if (!(/(^[A-Za-z][\w$:\[\]\.]*)/.test(nodes[n]))){
//                        throw new CustomError("Node name expected",line[i]);
//                    }
//                }
//            } else if (line[i].type != "name"){
//                throw new CustomError("Node name expected",line[i]);
//            }
//            plot_list.push(line[i].token);
            
        }
        
        if (plot_list.length > 0){
            plots.push(plot_list);
        } else {
            throw new CustomError("No nodes specified.",line[0]);
        }
    }
    
    /********************
    Read plotdef: define a new graphing function, <op>(<node>)
    ********************/
    function read_plotdef(line){
        if (line[1].type != "name"){
            throw new CustomError("Invalid plot definition name",line[1]);
        }
        // just take the rest of the line and use them as symbols
        var defs = line.slice(2).map(function(item){return item.token});
        plotdefs[line[1].token] = defs;
//        console.log("plotdefs:",plotdefs);
    }
    
    /*********************
    Read options: global options
    *********************/
    function read_options(line){
        line.shift();
        var i = 0;
        while (i < line.length){
            if (line[i].type != "name"){
                throw new CustomError("Invalid option name.",line[i]);
            }
            if (line.length < 3){
                throw new CustomError("Assignment statement expected", line[0]);
            }
            if (!(line[i+1]) || line[i+1].token != "="){
                throw new CustomError("Assignment statement expected", line[0]);
            }
            if (line[2].type != "number"){
                throw new CustomError("Number expected",line[2].line,line[2].column);
            }
//            try{
//                options[line[index].token] = parse_number(line[2].token);
//            } catch (err) {
//                throw new CustomError(err,line[index+2]);
//            }
            if (!(line[i+2])) throw new CustomError("Incomplete assignment statement.",line[i+1]);
            var expr_obj = eat_expression(line, i+2);
            options[line[i].token] = expr_obj.expr;
            i = expr_obj.next_index;
        }
        console.log("options:",options);
    }
    
    /*********************
    Read tran: transient analyses
    *********************/
    function read_tran(line){
        var tran_obj = {type:'tran',parameters:{},token:line[0]};
        tran_obj.parameters.tstop = eat_expression(line, 1).expr;
//        if (line.length != 2){
//            throw new CustomError("One argument expected: .tran tstop", line[1]);
//        }
//        if (line[1].type != "number"){
//            throw new CustomError("Number expected",line[1].line,line[1].column)
//        }
//        else{
//            tran_obj.parameters.tstop = line[1];
//        } 
//        try{
//            tran_obj.parameters.tstop = parse_number(line[1].token);
//        } catch(err){
//            throw new CustomError("Number expected",line[1]);
//        }
//        tran_obj.parameters.tstop = line[1].token;
        analyses.push(tran_obj);
        console.log("analyses:",analyses);
    }
    
    /*********************
    Read DC: DC analysis
    *********************/
    function read_dc(line){
        line.shift();
        var dc_obj = {type:'dc',parameters:{sweep1:{}},token:line[0]};
//        var param_names = ["source1","start1","stop1","step1",
//                           "source2","start2","stop2","step2"];
        var param_names = ["source","start","stop","step"];
        
        var sweep = "sweep1";
        var i = 0;
        while (i < line.length){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected.",line[i]);
            } else {
                dc_obj.parameters[sweep].source = line[i].token;
            }
            i += 1;
            
            var expr_obj;
            for (var j = 1; j <= 3; j += 1){
                if (!line[i]) {
                    throw new CustomError("Ill-formed DC statement: four or eight parameters expected.",
                                          line[0]);
                }
                expr_obj = eat_expression(line, i);
                dc_obj.parameters[sweep][param_names[j]] = expr_obj.expr;
                i = expr_obj.next_index;
            }
            if (line[i]) {
                sweep = "sweep2";
                dc_obj.parameters.sweep2 = {};
            }
        }
        
//        console.log("dc_obj:",dc_obj);
//        if (line.length != 2 && line.length != 4 && line.length != 8){
//            throw new CustomError("Four or eight parameters expected: "+
//                                  "[src1, start1, stop1, step1], [src2, start2, "+
//                                  "stop2, step2]", line[0]);
//        }
//        
//        var i;
//        if (line.length >= 4) {
//            if (line[0].type != "name"){
//                throw new CustomError("Node name expected", line[0]);
//            } else {
//                dc_obj.parameters.sweep1.source = line[0].token;
//            }
//            for (i = 1; i <= 3; i += 1){
////                dc_obj.parameters.sweep1[param_names[i]] = line[i].token;
////                try {
////                    dc_obj.parameters.sweep1[param_names[i]] = parse_number(line[i].token);
////                } catch (err) {
////                    throw new CustomError("Number expected.",line[i]);
////                }
//                if (line[i].type != "number"){
//                    throw new CustomError("Number expectd.",line[i]);
//                }
//                dc_obj.parameters.sweep1[param_names[i]] = line[i].token;
//            }
//        }
//        
//        if (line.length == 8) {
//            if (line[4].type != "name"){
//                throw new CustomError("Node name expected", line[4]);
//            } else {
//                dc_obj.parameters.sweep2.source = line[4].token;
//            }
//            for (i = 1; i <= 3; i += 1){
//                dc_obj.parameters.sweep2[param_names[i]] = line[i+4].token;
////                try {
////                    dc_obj.parameters.sweep2[param_names[i]] = parse_number(line[i+4].token);
////                } catch (err) {
////                    throw new CustomError("Number expected.",line[i+4]);
////                }
//                if (line[i+4].type != "number"){
//                    throw new CustomError("Number expectd.",line[i+4]);
//                }
//                dc_obj.parameters.sweep2[param_names[i]] = line[i+4].token;
//            }
//        }
        
//        for (var i = 0; i < line.length; i += 1){
//            switch (i) {
//                case 0:
//                    if (line[i].type != "name"){
//                        throw new CustomError("Node name expected", line[i]);
//                    } else {
//                        dc_obj.parameters.sweep1.source = line[i].token;
//                    }
//            }
//            if (i == 0 || i == 4){
//                if (line[i].type != "name"){
//                    throw new CustomError("Node name expected", line[i]);
//                } else {
//                    dc_obj.parameters[param_names[i]] = line[i].token;
//                }
//            } else {
//                try{
//                    line[i].token = parse_number(line[i].token);
//                } catch (err) {
//                    throw new CustomError("Number expected", line[i]);
//                }
//            }
//        }
//        dc_obj = parse_dc(dc_obj);
        analyses.push(dc_obj);
    }
    
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
// Things below this point not guaranteed to work!
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    /*********************
    Read AC: AC analysis
    ************************/
    function read_ac(line){
        var ac_obj = {type:'ac',parameters:{},token:line[0]};
        
        if (line.length != 4){
            throw new CustomError("Three arguments expected: "+
                                  ".ac ac_source_name fstart fstop", line[0]);
        }
        
        if (line[1].type != "name"){
            throw new CustomError("Node name expected",line[1]);
        }
        ac_obj.parameters.ac_source_name = line[1].token;
        
        var param_names = [null,null,"fstart","fstop"];
        for (var i = 2; i <= 3; i += 1){
            if (line[i].type != "number"){
                throw new CustomError("Number expected.",line[i]);
            }
            ac_obj.parameters[param_names[i]] = line[i].token;
//            try {
//                ac_obj.parameters[param_names[i]] = parse_number(line[i].token);
//            } catch (err) {
//                throw new CustomError("Number expected",line[i]);
//            }
        }
        analyses.push(ac_obj);
    }
    
    /*******************************
    Read subcircuit: creates an entry in the subcircuit dictionary
        --args: -line: the token array representing the line to read
        --returns: a subcircuit object with a name, ports list, properties dict, 
                    and device list
    *********************************/
    function read_subcircuit(line){
        line.shift();
        var obj = {name:line[0].token,
                   ports:[],
                   properties:{},
                   devices:[]
                  };
        if (line[0].token == "_top_level_" || line[0].token == "$memory"){
            throw new CustomError("Reserved name",line[0]);
        }
        line.shift();
        
        while (line.length > 0){
            if (line.length > 1){
                if (line[1].token == "="){
                    if (line.length < 3){
                        throw new CustomError("Assignment statement expected", line[1]);
                    } else {
                        if (line[2].type != "number"){
                            throw new CustomError("Number expected.",line[2]);
                        }
                        obj.properties[line[0].token] = line[2].token;
//                        try{
//                            obj.properties[line[0].token] = 
//                                parse_number(line[2].token);
//                        } catch (err) {
//                            throw new CustomError("Number expected", line[2]);
//                        }
                        line = line.slice(3);
                        continue;
                    }
                }
            }
            obj.ports.push(line.shift().token);
        }
        subcircuits[obj.name] = obj;
        return obj;
    }
    
    /*******************************
    Read Device: takes a line representing a device and creates a device object
        --args: -line: the array of tokens representing the device statement
        --returns: a device object
    *******************************/
    function read_device(line){
        var device_obj;
        // type of device based on first letter of first token
        switch (line[0].token[0].toUpperCase()){
            case "R":
                device_obj = read_resistor(line);
                break;
            case "C":
                device_obj = read_capacitor(line);
                break;
            case "L":
                device_obj = read_inductor(line);
                break;
            case "P":
                device_obj = read_pfet(line);
                break;
            case "N":
                device_obj = read_nfet(line);
                break;
            case "V":
                device_obj = read_vsource(line);
                break;
            case "I":
                device_obj = read_isource(line);
                break;
            case "O":
                device_obj = read_opamp(line);
                break;
            case "W":
                var device_objs = read_W(line);
                return device_objs;
            case "X":
                device_obj = read_instance(line);
                break;
            case "G":
                device_obj = read_gate(line);
                break;
            default:
                throw new CustomError("Invalid device type", line[0]);
        }
        device_obj.line = line[0].line;
        device_obj.file = line[0].origin_file;
        return device_obj;
    }
    
    /************************
    Read checkoff: process .checkoff statements
    *************************/
    function read_checkoff(line){
        // .checkoff <server> <assignment> <checksum>
//        console.log("line:",line);
        if (line[1].type != 'string'){
            throw new CustomError("Server name expected.",line[1]);
        }
        if (line[2].type != 'string'){
            throw new CustomError("Assignment name expected.",line[2]);
        }
//        console.log('server and assignment are both names');
        var obj = {server:{name:line[1].token,
                           token:line[1]},
                   assignment:{name:line[2].token,
                               token:line[2]},
                   checksum:{value:line[3].token,
                             token:line[3]}
                  };
        Checkoff.setCheckoffStatement(obj);
    }
    
    /**************************
    Read verify: process .verify statements
    ****************************/
    function read_verify(line){
        // verify type one a: .verify Z periodic(99.9n, 100) 0 0 0 1 1 1 1 1
        // ==> check values for node Z at times 99.9ns, 199.9ns, 299.9ns, 399.9ns, ...
        // ==>                                  Z = 0,  Z = 0,   Z = 0,   Z = 1,   ...
        // verify type one b: .verify s4 s3 s2 s1 periodic(9.9n, 10n) 0x00 0x01 0x02 ...
        // ==> check multiple values at once
        // verify type three: .verify z tvpairs() 9.9ns 0x0 19.9ns 0x1 29.9ns 0x0 ...
        //                or: .verify y[3:0] tvpairs() 99.9ns 0x00 199.9ns 0x10 ...
        
        // a list of nodes whose values will be checked
        var nodes = [];
        var i = 1;
        var raw_values;
        
        // the token representing the function
        var fn;
        while (true) {
            if (i >= line.length){
                throw new CustomError("No verify function specified: 'periodic' or 'tvpairs' expected.",
                                      line[0]);
            }
            if (line[i].type != "name"){
                if (line[i].type == "function"){
                    if (i == 1){
                        throw new CustomError("No specified nodes to verify.",line[1]);
                    }
                    fn = line[i];
                    raw_values = line.slice(i+1);
                    break;
                } else {
                    throw new CustomError("Node name expected.",line[i]);
                }
            } else {
                nodes.push(line[i].token);
            }
            i += 1;
        }
        
        if (raw_values.length === 0){
            return;
        }
        
        // picks out the name of the function and its args, if any
        // fn_array[1] is the name
        // fn_array[2] is the entire contents of the parentheses
        // fn_array[3] is the first arg
        // fn_array[4] is the second arg
        var fn_pattern = /(\w+)\((([^,]+),\s*([^,]+))?\)/;
        var fn_array = fn.token.match(fn_pattern);
//        console.log("matched:",fn_array);
        
        if (!fn_array){
            throw new CustomError("Ill-formed .verify function statement",fn);
        }
        
        var fn_name = fn_array[1];
        if (fn_name != 'periodic' && fn_name != 'tvpairs'){
            throw new CustomError("Invalid verify function: 'periodic' or 'tvpairs' expected",fn);
        }
        
        // find what base the values are given in so that the same base can be used to display errors
        var display_base;
        var temp_index = fn_name == "periodic" ? 0 : 1;
        if (/^0x/i.test(raw_values[temp_index].token)) display_base = 'hex';
        else if (/^0b/i.test(raw_values[temp_index].token)) display_base = 'binary';
        else if (/^0/i.test(raw_values[temp_index].token) && !(/^0$/.test(raw_values[temp_index].token))) display_base = 'octal';
        else display_base = 'binary';
        
        // parse values
        for (i = 0; i < raw_values.length; i += 1){
            var newval = raw_values[i].token;
//            try{
//                newval = parse_number(raw_values[i].token);
//            } catch (err) {
//                throw new CustomError("Number expected.",raw_values[i]);
//            }
            raw_values[i] = newval;
        }
        
        var values;
        var tstart;
        var tstep;
        if (fn_name == "periodic"){
            
            tstart = fn_array[3];
            tstep = fn_array[4];
//            try{
//                tstart = parse_number(fn_array[3]);
//                tstep = parse_number(fn_array[4]);
//            } catch (err){
//                throw new CustomError("Number expected",fn);
//            }
            values = raw_values.slice(0);
        }
        
        if (fn_name == "tvpairs"){
            values = [];
            for (i = 0; i < raw_values.length; i += 2){
                values.push({time:raw_values[i],value:raw_values[i+1]});
            }
        }
        
        var fn_obj = {type:fn_name,
                      nodes:nodes,
                      tstart:tstart,
                      tstep:tstep,
                      token:fn, // for throwing errors later
                      values:values,
                      display_base:display_base
                     };
        Checkoff.addVerify(fn_obj);
    
    }
    
    function read_mverify(line){
        var obj = {type:"memory"};
        
        if (line[1].type != "name") throw new CustomError("Memory name expected.",line[1]);
        obj.mem_name = line[1].token;
        
        
        obj.startaddress = line[2].token;
        if (obj.startaddress < 0) throw new CustomError("Invalid memory start address.",line[2]);
//        try {
//            obj.startaddress = parse_number(line[2].token);
//            if (obj.startaddress < 0) throw "Invalid memory start address.";
//        } catch (err) {
//            throw new CustomError(err,line[2]);
//        }
        
        var contents = [];
        for (var i = 3; i < line.length; i += 1) {
            contents.push(line[i].token);
//            try{
//                contents.push(parse_number(line[i].token));
//            } catch (err) {
//                throw new CustomError("Number expected.",line[i]);
//            }
        }
        obj.contents = contents;
        
        var display_base;
        if (/^0x/i.test(line[3].token)) display_base = 'hex';
        else if (/^0b/i.test(line[3].token)) display_base = 'binary';
        else if (/^0/i.test(line[3].token) && !(/^0$/.test(line[3].token))) display_base = 'octal';
        else display_base = 'binary';
        
        obj.display_base = display_base;
        obj.token = line[0];
        
        // obj has attributes:
        //      type: "memory"
        //      mem_name: <the name of the memory instance>
        //      startaddress: <the address to start verification at>
        //      contents: <the expected contents of the memory>
        //      display_base: 'hex', 'octal', or 'binary'
        //      token: <the first token of the memory line for error throwing>
        Checkoff.addVerify(obj);
    }
    
/******************************************************************
*******************************************************************
Device readers: each takes a line of tokens and returns a device object,
                parameters _not_ checked for correctness
*******************************************************************
******************************************************************/
    
    /*********************************************
    General linear device: (resistors, capacitors, inductors)
        --ports: n1, n2
        --properties: name, value
    **********************************************/
    
    /**************************
    Resistor
    **************************/
    function read_resistor(line){
        return read_linear(line,"resistor");
    }
    
    /********************
    Capacitor
    ***********************/
    function read_capacitor(line){
        return read_linear(line,"capacitor");
    }
    
    /*********************
    Inductor 
    **********************/
    function read_inductor(line){
        return read_linear(line,"inductor");
    }
    
    /************************
    General (called by the three above)
    ************************/
    function read_linear(line,type){
        var obj = {type:type,
                   ports:["n1","n2"],
                   connections:[],
                   properties:{name:line[0].token}
                  };
        
        line.shift();
        for (var i = 0; i < line.length-1; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected", line[i]);
            }
            obj.connections.push(line[i].token);
        }
        
        var end = line.length;
        obj.properties.value = line[end-1].token;
//        try{
//            obj.properties.value = parse_number(line[end-1].token);
//        } catch (err) {
//            throw new CustomError("Number expected", line[end-1]);
//        }
//        if (line[end-1].type != "number"){
//            throw new CustomError("Number expected",line[end-1].line,line[end-1].column);
//        }
//        obj.properties.value = line[3];
        
        return obj;
    }
    
    /*******************************************
    Mosfets: (pfets, nfets)
        --ports: D, G, S
        --properties: name, [scaled] length, [scaled] width
    *******************************************/
    
    /********************
    PFET
    *********************/
    function read_pfet(line){
        return read_fet(line,"pfet");
    }
    
    /********************
    NFET
    *********************/
    function read_nfet(line){
        return read_fet(line,"nfet");
    }
    
    /*********************
    General FET
    **********************/
    function read_fet(line,type){
        var obj = {type:type,
                   ports:["D","G","S"],
                   connections:[],
                   properties:{name:line[0].token,L:1,W:8}
                  };
        line.shift();
        var end = line.length;
        var knex_end = line.length;
        
        // the last argument may be an assignment (W or L)
        if (line[end-2].token == "="){
            if (line[end-3].token.toUpperCase() != "L" &&
                line[end-3].token.toUpperCase() != "W"){
                throw new CustomError("Mosfet has no property "+
                                      line[end-3].token,line[end-3]);
            }
            knex_end -= 3;
        
            
            obj.properties[line[end-3].token.toUpperCase()] = line[end-1].token;
//            try{
//                obj.properties[line[end-3].token.toUpperCase()] = 
//                    parse_number(line[end-1].token);
//            } catch (err) {
//                throw new CustomError("Number expected", line[end-1]);
//            }
        
            if (line[end-5] !== undefined){
                if (line[end-5].token == "="){
    //                if (line[end-4].type != "number"){
    //                    throw new CustomError("Number expected",
    //                                    line[end-4].line,line[end-4].column);
    //                }
                    if (line[end-6].token.toUpperCase() != "L" &&
                        line[end-6].token.toUpperCase() != "W"){
                        throw new CustomError("Mosfet has no property "+
                                              line[end-6].token,line[end-6]);
                    }
                    
                    obj.properties[line[end-6].token.toUpperCase()] = line[end-4].token;
//                    try{
//                        obj.properties[line[end-6].token.toUpperCase()] = 
//                            parse_number(line[end-4].token);
//                    } catch (err) {
//                        throw new CustomError("Number expected", line[end-4]);
//                    }
                    knex_end -= 3;
                }
            }
        }
        
        for (var i = 0; i < knex_end; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected", line[i]);
            }
            obj.connections.push(line[i].token);
        }
        
        return obj;
    }
    
    /********************************************
    Sources: (voltage source, current source)
        --ports: nplus, nminus
        --properties: name, value
    ********************************************/
    
    /****************************
    Voltage source
    *****************************/
    function read_vsource(line){
        return read_source(line,"voltage source");
    }
    
    /****************************
    Current source
    ***************************/
    function read_isource(line){
        return read_source(line,"current source");
    }
    
    /**********************
    General source
    ***********************/
    function read_source(line,type){
        // id n+ n- val
        var obj = {type:type,
                   ports:["nplus","nminus"],
                   connections:[],
                   properties:{name:line[0].token}
                  };
        for (var i = 1; i <= 2; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected", line[i]);
            }
        }
        
        obj.connections.push(line[1].token);
        obj.connections.push(line[2].token);
        
        if (line[3].type == "number"){
            
            obj.properties.value = String(line[3].token);
//            try{
//                obj.properties.value = String(parse_number(line[3].token));
//            } catch (err) {
//                throw new CustomError("Number Expected",line[3].line,line[3].column);
//            }
        } else if (line[3].type == "function"){
            var fn_pttn = /(\w+)\((.+)\)/;
            var fn_matched = line[3].token.match(fn_pttn);
            var fn_name = fn_matched[1];
            var fn_args = fn_matched[2];
            fn_args = fn_args.split(/[,\s]\s*/);
            
//            console.log("args:",fn_args);
            
            var final_fn_args = [];
            for (i = 0; i < fn_args.length; i += 1){
                
                final_fn_args.push(fn_args[i]);
//                try{
//                    final_fn_args.push(parse_number(fn_args[i]));
//                } catch (err) {
//                    throw new CustomError("Number expected",line[3]);
//                }
            }
            
            obj.properties.value = fn_name+"("+final_fn_args.join(",")+")";
//            console.log("object:",obj);
        }
//        } else 
//        if (line[3].type != "function" && line[3].type != "number"){
//            throw new CustomError("Number or function expected", line[3]);
//        } else {
//            obj.properties.value = line[3].token;   
//        }
        return obj;
    }
    
    /*****************************
    Opamp: 
        --ports: nplus, nminus, output
        --properties: name, A
    *******************************/
    function read_opamp(line){
        var obj = {type:'opamp',
                   ports:["nplus","nminus","output"],
                   connections:[],
                   properties:{name:line[0].token}
                  };
        
        obj.properties.A = line[line.length-1].token;
//        try{
//            obj.properties.A = parse_number(line[line.length-1].token);
//        } catch (err) {
//            throw new CustomError("Number expected.",line[line.length-1]);
//        }
        
        for (var i = 1; i < line.length - 1; i += 1){
            if (line[i].type != 'name'){
                throw new CustomError("Node name expected.",line[i]);
            }
            obj.connections.push(line[i].token);
        }
        return obj;
    }
    
    /*****************************
    W device: driving mulitple nodes at once
    Syntax: Wid nodes... nrz(vlow,vhigh,tperiod,tdelay,trise,tfall) data...
    *****************************/
    function read_W(line){
        var fn, raw_data;
        var nodes = [];
        var i = 1;
        while (true) {
            if (i >= line.length){
                throw new CustomError("No nrz function specified.",line[0]);
            }
            if (line[i].type != "name"){
                if (line[i].type == "function"){
                    if (i == 1){
                        throw new CustomError("No specified nodes to drive.",line[1]);
                    }
                    fn = line[i];
                    raw_data = line.slice(i+1);
                    break;
                } else {
                    throw new CustomError("Node name expected.",line[i]);
                }
            } else {
                nodes.push(line[i].token);
            }
            i += 1;
        }
        
        var fn_pttn = /(\w+)\((.+)\)/;
        var fn_matched = fn.token.match(fn_pttn);
        var fn_name = fn_matched[1];
        var fn_args = fn_matched[2];
        fn_args = fn_args.split(/[,\s]\s*/);
        
        if (fn_name == "nrz"){
            if (fn_args.length != 6) throw new CustomError("nrz function expects six arguments.",fn);
            var param_names = ["vlow","vhigh","tperiod","tdelay","trise","tfall"];
            var args = {};
            for (i = 0; i < fn_args.length; i += 1){
                
//                fn_args[i] = fn_args[i];
//                try{
//                    fn_args[i] = parse_number(fn_args[i]);
//                } catch (err){
//                    throw new CustomError("Number expected.",fn);
//                }
                args[param_names[i]] = fn_args[i];
            }
            
            var data = raw_data.map(function(thing){return thing.token;});
//            for (i = 0; i < raw_data.length; i += 1){
//                try{
//                    data.push(parse_number(raw_data[i].token));
//                } catch (err) {
//                    throw new CustomError("Number expected.",raw_data[i]);
//                }
//            }
            return parse_W(nodes,args,data,line[0]);
        } else {
            throw new CustomError("Unrecognized W function",fn);
        }
    }
    
    /*************************
    Parse W: Turns the parameters of a W device into voltage sources
        --args: -nodes: the list of nodes to be driven
                -args: the parameters of the nrz function
                    (vhigh, vlow, tperiod, tdelay, trise, tfall)
                -data: the given logic values the set of nodes should take
        --returns: 
    *************************/
    function parse_W(nodes,args,data,token){
        var time_steps = [];
        var values = [];
        var results = [];
        
        for (var i = 0; i < data.length; i += 1){
            time_steps.push(args.tdelay + (args.tperiod * i));
            // turn each value into an array of each digit of its binary representation
            // values[t] is an array represting values for all nodes at time t
            values[i] = data[i].toString(2).split(""); 
            while (values[i].length < nodes.length){
                values[i].unshift("0");
            }
        }
        var drive_vals = {};
        for (var n = 0; n < nodes.length; n += 1){
            var node = nodes[n];
            drive_vals[node] = [];
            for (var t = 0; t < time_steps.length; t += 1){
                drive_vals[node].push(values[t][n]);
            }
            
            var pwl_args = [0,0];
            for (t = 0; t < time_steps.length; t += 1){
                var prev_val = pwl_args[pwl_args.length-1];
                var current_val;
                if (drive_vals[node][t] == "0") {
                    current_val = args.vlow;
                } else {
                    current_val = args.vhigh;
                }
                
                var margin = (prev_val < current_val) ? args.trise : args.tfall;
                pwl_args.push(time_steps[t], prev_val,
                              time_steps[t] + margin, current_val);
            }
            
            var vobj = {type:"voltage source",
                        ports:["nplus","nminus"],
                        connections:[nodes[n],"gnd"],
                        properties:{name:token.token+"_"+nodes[n],
                                    value:"pwl("+pwl_args.join()+")"},
                        line:token.line,
                        file:token.origin_file
                       };
            results.push(vobj);
        }
        return results;
    }
    
    /*****************************
    Instance: instance of user-specified subcircuit
    *******************************/
    function read_instance(line){
        var props = [];
        if (line.length >= 4){
            try{
                while (line[line.length-2].token == "="){
                    props.push(line.slice(-3));
                    line = line.slice(0,-3);
                }
            } catch (err) {}
        }

        var inst = line[1];
//        if (!(inst.token in subcircuits)){
//            throw new CustomError("Can't find definition for subcircuit "+inst.token, inst);
//        }
        
        if (inst.token == "$memory"){
            var mem = read_memory(line, props);
            return mem;
        }
        
        var obj = {type:"instance",
                   connections:[],
                   ports:[],//subcircuits[inst.token].ports,
                   properties:{instanceOf:inst.token, name:line[0].token}
                  };
        line.shift();
//        
//        var parent_props = subcircuits[inst.token].properties;
//        for (var item in parent_props){
//            if (item != "name"){
//                obj.properties[item] = parent_props[item];
//            }
//        }
        
        for (var i = 1; i < line.length; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected", line[i]);
            }
            obj.connections.push(line[i].token);
        }
        for (i = 0; i < props.length; i += 1){
//            if (props[i][2].type != "number"){
//                throw new CustomError("Number expected",
//                                props[2].line,props[2].column)
//            }
            if (!(props[i][0].token in obj.properties)){
                throw new CustomError("Subcircuit "+inst.token+" has no property "+
                                      props[i][0].token, props[i][0]);
            }
            obj.properties[props[i][0].token] = props[i][2].token;
//            try{
//                obj.properties[props[i][0].token] = parse_number(props[i][2].token);
//            } catch (err) {
//                throw new CustomError("Number expected", props[i][2]);
//            }
        }
        return obj;
    }
    
    /***********************
    Memory: special case for memory devices
    ************************/
    function read_memory(line, prop_tokens){
        var obj = {type:"memory",
                   ports:[],
                   connections:[],
                   properties:{name:line[0].token}
                  };
        
        // parse property values
        for (var p = 0; p < prop_tokens.length; p += 1){
            var prop = prop_tokens[p];
            
            if (prop[0].type != "name") {
                throw new CustomError("Property name expected",prop[0]);
            }
            
            switch (prop[0].token.toLowerCase()){
                case "width":
                    var w = prop[2].token;
//                    try {
//                        w = parse_number(prop[2].token);
//                    } catch (err) {
//                        throw new CustomError("Number expected.",prop[2]);
//                    }
                    
                    if (w < 1 || w > 32) {
                        throw new CustomError("Memory width must be between 1 and 32, inclusive.",prop[2]);
                    }
                    obj.properties.width = w;
                    break;
                case "nlocations":
                    var nloc;
                    try {
                        nloc = parse_number(prop[2].token);
                    } catch (err) {
                        throw new CustomError("Number expected.",prop[2]);
                    }
                    
                    if (nloc < 1 || nloc > Math.pow(2,20)) {
                        throw new CustomError("Number of locations must be between 1 and 2^20.",prop[2]);
                    }
                    obj.properties.nlocations = nloc;
                    break;
                case "file":
                    obj.properties.contents = [];
                    var filename = prop[2].token;
                    FileSystem.getFile(filename, 
                        function(file_obj){
                            // success callback
                            set_memory_contents(obj, file_obj.data, prop[0]);
                        }, 
                        function(){
                            // error callback
                            error_cb(new CustomError("Could not get file "+filename, prop[2]));
                        });
                    break;
                case "contents":
                    obj.properties.contents = [];
                    set_memory_contents(obj, prop[2].token.match(/\((.+)\)/)[1], prop[0]);
                    break;
                default:
                    throw new CustomError("Invalid property name.",prop[0]);
            }
        }
        
        if (obj.properties.width === undefined) throw new CustomError("Memory width must be specified.",
                                                                      line[0]);
        if (obj.properties.nlocations === undefined) throw new CustomError("Number of memory locations\
must be specified.",line[0]);
        if (obj.properties.contents === undefined) throw new CustomError("Memory contents must be specified.",
                                                                      line[0]);
        
        // parse ports
        var naddr = Math.ceil(Math.log(obj.properties.nlocations)/Math.LN2);
//        console.log("number of addresses:",naddr);
        var wi = obj.properties.width;
        
        var ports = line.slice(2);
        var port_size = 3 + naddr + wi; // number of parameters in the port specifications:
        // oe clk wen a(naddr-1) ... a(0) d(w-1) ... d(0)
//        console.log("ports:",ports,"port size:",port_size);
        if (ports.length % port_size !== 0){
            throw new CustomError("Invalid memory port specification. Each port should have "+port_size+
                                  " parameters: oe clk wen a(#addresses-1) ... a(0) d(width-1) ... d(0)",
                                  ports[0]);
        }
        
        function check_shift(tokens){
            var t = tokens.shift();
            if (t.type != "name") throw new CustomError("Node name expected.",t);
            return t.token;
        }
        
        obj.properties.ports = [];
        while (ports.length > 0){
            var new_port = {};
            new_port.oe = check_shift(ports);
            new_port.clk = check_shift(ports);
            new_port.wen = check_shift(ports);
            var address_inputs = [];
            for (var a = 0; a < naddr; a += 1){
                address_inputs.push(check_shift(ports));
            }
            new_port.address_inputs = address_inputs;
            var data_inputs = [];
            for (var d = 0; d < wi; d += 1){
                data_inputs.push(check_shift(ports));
            }
            new_port.data_inputs = data_inputs;
            obj.properties.ports.push(new_port);
        }
        
        return obj;
    }
    
    function set_memory_contents(mem_obj, data, err_token){
        // mem_obj is a device object for a memory instance. Data should be a string of a list of numbers
        var values = data.split(/\s+/);
//        var contents = [];
//        for (var v = 0; v < values.length; v += 1){
//            contents.push(values[v])
//            try{
//                contents.push(parse_number(values[v]));
//            } catch (err) {
//                throw new CustomError("Number expected.",err_token);
//            }
//        }
        mem_obj.properties.contents = values.slice(0);//contents.slice(0);
        console.log("obj:",mem_obj);
    }
    
    /***********************
    Gate: built-in gate device
    ************************/
    function read_gate(line){
        var props = [];
        if (line.length >= 4){
            try{
                while (line[line.length-2].token == "="){
                    props.push(line.slice(-3));
                    line = line.slice(0,-3);
                }
            } catch (err) {}
        }
//        var type = line[1];
        
        var obj = {type:line[1].token,
                   connections:[],
                   ports:[],
                   properties:{name:line[0].token}
                  };
        line.shift();
        
        for (var i = 1; i < line.length; i += 1){
            if (line[i].type != "name"){
                throw new CustomError("Node name expected", line[i]);
            }
            obj.connections.push(line[i].token);
            obj.ports.push(line[i].token);
        }
        for (i = 0; i < props.length; i += 1){
            obj.properties[props[i][0].token] = props[i][2].token;
//            if (props[i][2].type != "number"){
//                throw new CustomError("Number expected",
//                                props[2].line,props[2].column)
//            }
//            try{
//                obj.properties[props[i][0].token] = parse_number(props[i][2].token);
//            } catch (err) {
//                throw new CustomError("Number expected", props[i][2]);
//            }
        }
        return obj;
    }
       
    
/**********************************************
**********************************************
Flattening
**********************************************
**********************************************/
    
    /************************
    Netlist Device
    ************************/
    function netlist_device(prefix, dev_obj, parent_obj, JSON_netlist){
        var item;
        if (dev_obj.type == "instance"){
            if (!(dev_obj.properties.instanceOf in subcircuits)){
                throw new CustomError("Can't find definition for subcircuit "+
                                      dev_obj.properties.instanceOf + ".", 
                                      {line:dev_obj.line,column:0,origin_file:dev_obj.file});
            }
            
            dev_obj.ports = subcircuits[dev_obj.properties.instanceOf].ports;
            
            var parent_props = subcircuits[dev_obj.properties.instanceOf].properties;
            for (item in parent_props){
                if (!(item in dev_obj.properties)){
                    dev_obj.properties[item] = parent_props[item];
                }
            }
        }
        
        
        
        var nports = dev_obj.ports.length;
        var nknex = dev_obj.connections.length;
        if (nknex % nports !== 0 && dev_obj.type != "memory"){
            throw new CustomError("Expected a multiple of "+nports+" connections",
                                  {line:dev_obj.line,column:0,origin_file:dev_obj.file});
        }
        var ndevices = nknex/nports;
        var local_props = {};
        for (item in dev_obj.properties){
            local_props[item] = dev_obj.properties[item];
            // this is where expressions would be evaluated, with parent properties
            // giving values of expression symbols.
        }
        
        /***** helper function *******/
        function addAffixes(name,index){
            if (prefix !== ""){
                name = prefix + "." + name;
            }
            if (ndevices != 1){
                name = name + "#" + index;
            }
            return name;
        }
        
        // the ith device will take the ith element from each bucket as its ports
        var buckets = [];
        var temp_knex = dev_obj.connections.slice(0);
        while (temp_knex.length > 0){
            buckets.push(temp_knex.splice(0,ndevices));
        }
        
        var new_obj;
        var local_connections;
        for (var dev_index = 0; dev_index < ndevices; dev_index += 1){
            new_obj = {};
            local_connections = [];
            for (var j = 0; j < buckets.length; j += 1){
                // j is the port number
                var signal = buckets[j][dev_index];
                
                if (globals.indexOf(signal) != -1){
                    local_connections.push(signal);
                } else if (parent_obj.ports.indexOf(signal) != -1) {
                    var si = parent_obj.ports.indexOf(signal);
                    local_connections.push(parent_obj.connections[si]);
                } else {
                    local_connections.push(addAffixes(signal,dev_index));
                } 
            }
            
            new_obj.properties = {};
            for (item in local_props){
                new_obj.properties[item] = local_props[item];
            }
            new_obj.properties.name = addAffixes(new_obj.properties.name,
                                                 dev_index);
            new_obj.type = dev_obj.type;
            
            // check for duplicate device names
            if (used_names.indexOf(new_obj.properties.name) != -1){
                throw new CustomError("Duplicate device name: "+new_obj.properties.name,
                                      {line:dev_obj.line,column:0,origin_file:dev_obj.file});
            } 
            
            used_names.push(new_obj.properties.name);
                
            if (dev_obj.type != "instance"){ 
                new_obj.connections = {};
                // map ports to connections
                for (var p = 0; p < nports; p += 1){
                    new_obj.connections[dev_obj.ports[p]] = local_connections[p];
                }
                JSON_netlist.push(new_obj);
            } else {
                // recursive call
                new_obj.connections = local_connections.slice(0);
                new_obj.ports = dev_obj.ports.slice(0);
//                new_obj.ports = subcircuits[dev_obj.properties.instanceOf].ports;
                netlist_instance(new_obj.properties.name, new_obj,
                                 JSON_netlist);                  
            }
        }
    }
    
    function netlist_instance(prefix, inst_obj, JSON_netlist){
        var subckt_def = subcircuits[inst_obj.properties.instanceOf];
        for (var i = 0; i < subckt_def.devices.length; i += 1){
            netlist_device(prefix, subckt_def.devices[i], inst_obj, JSON_netlist);
        }
    }
    
    
    
//    function moveInstTest(input_string){
//        var tokens = split(analyze(input_string),"test_file");
//        console.log("old tokens:",tokens);
//        move_instances(tokens);
//    }
       
/***************************
Exports
****************************/
    return {parse:tokenize,
            CustomError:CustomError,
//            parse_number:parse_number
//            move_instances:move_instances
//            moveInstTest:moveInstTest
           };
}());
