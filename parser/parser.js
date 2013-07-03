var parser = (function(){
    
/********************************
Error object:
*********************************/
    function Error(message,line,column){
        this.message = message;
        this.line = line;
        this.column = column;
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
            // replace everything that isn't a newline with a blank string
            var replaced1 = match.replace(/[^\n\u001e]/g," ");
            // now replace all newlines with record separators
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
//        console.log("extended string:",extended_string);
        
        
        
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
//        var pattern = /".*"|0x[0-9a-fA-F]+|-?\d*\.?\d+(([eE]-?\d+)|[a-zA-Z]*)|\.?[A-Za-z][\w:\.,$#\[\]]*|=|\n|\u001e/g; 
        var pattern = /".*"|-?[\w:\.$#\[\]]+|=|\/\*|\n|\u001e/g;
        
        var names_pattern = /(^[A-Za-z][\w$:\[\]\.]*)/;
        var control_pattern = /^\..+/;
        var int_pattern = /\d+/;
        var exp_pattern = /-?\d*\.?\d+[eE]-?\d+/;
        var float_pattern = /-?\d*\.\d+/;
        var scaled_pattern = /-?\d*\.?\d+[A-Za-z]+/;
        var hex_pattern = /^0x[0-9a-fA-F]+/;
        var octal_pattern = /^0[0-7]+/;
        var binary_pattern = /^0b[01]+/;
        var file_pattern = /".*"/;
        var num_pattern = /^(([+-]?\d*\.?)|(0x)|(0b))\d+(([eE]-?\d+)|[A-Za-z]*)/;
//        var num_pattern = /[+-]?\d*\.?\d+([A-Za-z]*|[eE]-?\d+)/;
        
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
        //      a record separater
        
        var matched_array;
        var substrings = [];
        var lineNumber = 1;
        var lastLineOffset = 0;
        while ((matched_array = pattern.exec(input_string)) !== null){
            
            //set the token's type
            var type;
            if (file_pattern.test(matched_array[0])){
                matched_array[0] = matched_array[0].replace(/"/g,'');
                type = 'string';
            } else if (names_pattern.test(matched_array[0])){
                type = 'name';
            } else if (num_pattern.test(matched_array[0])){
                type = 'number';
            } else if (control_pattern.test(matched_array[0])){
                type = 'control';
//            } else if (exp_pattern.test(matched_array[0])){
//                type = 'exp';
//            } else if (hex_pattern.test(matched_array[0])){
//                type = 'hex';
//            } else if (octal_pattern.test(matched_array[0])){
//                type = 'octal';
//            } else if (binary_pattern.test(matched_array[0])){
//                type= 'binary';
//            } else if (scaled_pattern.test(matched_array[0])){
//                type = 'scaled';
//            } else if (float_pattern.test(matched_array[0])){
//                type = 'float';
//            } else if (int_pattern.test(matched_array[0])){
//                type = 'int';
            } else if (matched_array[0]== "="){
                type = 'equals'
            } else {
                type = null;   
            }
            
            // check for unclosed comments
            if (matched_array[0]=="/*"){
                throw new Error("Unclosed comment",lineNumber);
            }
            
            // find column offset
            var offset = matched_array.index - lastLineOffset;
            
            if (matched_array[0]!="\u001e"){
                substrings.push({token:matched_array[0],
                                 line:lineNumber,
                                 column:offset,
                                 type:type,
                                 origin_file:filename
                                });
            }
            if ((matched_array[0] == "\n")||(matched_array[0] == "\u001e")){
                lineNumber += 1;
            }
            if (matched_array[0] == "\n"){
                lastLineOffset = matched_array.index + 1;
            }
        }
//        console.log(substrings);
        return substrings;
    }
    
/********************************
Match token: if the first token in the given array is t, return true;
otherwise, return false
    --args: -t: a token to be matched
            -token_array: the array of tokens t comes from
    --returns: true if the first token in the array matches t, false otherwise
**********************************/
    function match_token(t,token_array){
        if (token_array.length > 0 && token_array[0].token==t){
            return true;
        }
        return false;
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
            current = token_array[0];
//            console.log("current token obj:",current);
            var iter_match_array;
            var dupe_match_array;
            var duped_token_array = [];
            var new_token_array = [];
            
            if (current.type=='name'){
                if((dupe_match_array=duplicator_pattern.exec(current.token))!==null){
                    var repetitions = parseInt(dupe_match_array[0].slice(1));
                    var dupe_string = current.token.slice(0,dupe_match_array.index);
                    for (var i=0; i<repetitions; i+=1){
                        duped_token_array.push({token:dupe_string,
                                                line:current.line,
                                                type:'name',
                                                column:current.column
                                                });
                    }
                    duped_token_array = iter_expand(duped_token_array);
                    expanded_array = expanded_array.concat(duped_token_array);
                    token_array.shift();
                }else
                if((iter_match_array=iterator_pattern.exec(current.token))!==null){
                    var iter_string = iter_match_array[0];
//                    console.log("iter string:",iter_string);
                    var front_string = current.token.slice(0,iter_match_array.index);
                    var end_index = iter_match_array.index + iter_string.length;
                    var end_string = current.token.slice(end_index);
                    
                    var new_iter_strings;
                    try{
                        new_iter_strings = iter_interpret(iter_string);
                    } catch(err) {
                        throw new Error(err,current.line,current.column);
                    }
                    for (var i=0; i < new_iter_strings.length; i+=1){
                        var new_token_obj = {token:front_string+new_iter_strings[i]+
                                            end_string,
                                             line:current.line,
                                             type:'name',
                                             column:current.column
                                            }
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
//        console.log("expanded array:",expanded_array);
        return expanded_array;
    }
    
/****************************
iterator interpreter: interprets and expands an iterator
    --args: -iterator_string: a string of the form "[a:b:k]"
    --returns: an array of strings of the form ["[a]","[a+k]","[a+2k]",...,"[b]"]
********************************/
    function iter_interpret(iterator_string){
        // get the two to three numbers from the string
        var param_array = iterator_string.match(/\d+/g);
        var a = parseInt(param_array[0]);
        var b = parseInt(param_array[1]);
        var k;
        var reverse = false;
        if (param_array.length>2){ 
            k = parseInt(param_array[2]); 
            // if the step is indicated and the step is invalid, throw an error
            if (a>b) { k *= -1; }
            if (k===0){
                throw "Invalid iterator";
            }
        }
        else if (a<b){ k = 1; }
        else { k = -1; }
        
        // if the step is negative, set the reverse parameter
        if (k<0){ reverse = true; }
        
//        console.log("a:",a,", b:",b," k:",k);
        // if reversed, negate the start, stop, and step so that there is only one
        // while loop needed
        if (reverse){
            a *= -1;
            b *= -1;
            k *= -1; 
        }
        var result = [];
        var temp = a;
        while (temp <= b){
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
    
/********************************
Parse scaled: interpret a scaled number
    --args: -sc_num: a token representing a scaled number
    --returns: an object containing value (the value of the number),
                type ("number"), and line (the line number of the token)
*********************************/
//    function parse_scaled(sc_num){
//        var scale_factor;
//        var pattern = /(-?\d*\.?\d+)([^\d]+)/;
//        var scale_pattern = /^((MEG)|(meg)|(MIL)|(mil)|[TtGgKkMmUuNnPpFf])/;
//        
//        var matched = sc_num.token.match(pattern);
//        var value = matched[1]; // the first parenthesized expr, numbers
//        var suffix = matched[2]; // the second parenthesized expr, scale factor
//        
//        value = parseFloat(value);
//        var matched_scale = suffix.match(scale_pattern);
//        if (!(matched_scale === null)){ 
//            matched_scale = matched_scale[0]; 
//        }
//        console.log("value:",value,"scale:",matched_scale);
//        switch(matched_scale){
//            case "MEG": case "meg": // mega
//                scale_factor = 1e6;
//                break;
//            case "MIL": case "mil": // --
//                scale_factor = 25.4e-6;
//                break;
//            case "T": case "t": // tera
//                scale_factor = 1e12;
//                break;
//            case "G": case "g": // giga
//                scale_factor = 1e9;
//                break;
//            case "K": case "k": // kilo
//                scale_factor = 1e3;
//                break;
//            case "M": case "m": // milli
//                scale_factor = 1e-3;
//                break;
//            case "U": case "u": // micro
//                scale_factor = 1e-6;
//                break;
//            case "N": case "n": // nano
//                scale_factor = 1e-9;
//                break;
//            case "P": case "p": // pico
//                scale_factor = 1e-12;
//                break;
//            case "F": case "f": // femto
//                scale_factor = 1e-15;
//                break;
//            default:
//                scale_factor = 1;
//        }
//        return {value:value*scale_factor,
//                type:"number",
//                line:sc_num.line};
//    }
    
/************************************
Parse Number: taken from cktsim.js by Chris Terman, with permission. Slightly 
                modified.
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
    
/*********************************
Tokenize: takes a raw string, does decommenting/extending, tokenizes it, and expands
iterators and duplicators, and includes files
    --args: -input_string: a string representing the file contents
            -filename: a string representing the unique name of the file
    --returns: an array of strings (tokens)
*********************************/
    function tokenize(input_string,filename){
         return include(iter_expand(split(analyze(input_string),filename)));
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
    
    function parse(input_string,filename){
        var token_array = tokenize(input_string,filename);
        globals = [];
        plots = [];
        options = {};
        analyses = [];
        subcircuits = {_top_level_:{name:"_top_level_",
                                    ports:[],
                                    properties:{},
                                    devices:[]
                                   }
                      };
        current_subckt = subcircuits["_top_level_"];
        
        var toParse = [];
        
        // go through tokens one line at a time, and pass the line to the 
        // appropriate handler
        while (token_array.length > 0){
            var current = token_array[0];
            
            // transfer the tokens of one line to toParse
            if(current.token != "\n"){
                toParse.push(token_array.shift());
            } else if (toParse.length != 0) { 
                if (toParse[0].type=="control"){ 
                    parse_control(toParse);
                    toParse = [];
                } else {
                    current_subckt.devices.push(read_device(toParse));
                    token_array.shift();
                    toParse = [];
                }
            } else {
                token_array.shift();
                continue;
            }
        }
        return {globals:globals,options:options,plots:plots,
                analyses:analyses,subckts:subcircuits};
    }
    
/*****************************
Parse Control 
    --args: -line: a list of tokens representing the line with a control statement
    --returns: none
******************************/
    function parse_control(line){
        switch (line[0].token.toLowerCase()){
            case ".connect":
                throw new Error("Connect not implemented yet",
                                line[0].row,line[0].column);
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
            case ".tran":
                if (current_subckt.name != "_top_level_"){
                    throw new Error("Analyses not allowed inside "+
                                    "subcircuit definitons",
                                    line[0].line,line[0].column);
                }
                read_tran(line);
                break;
            case ".dc":
                if (current_subckt.name != "_top_level_"){
                    throw new Error("Analyses not allowed inside "+
                                    "subcircuit definitons",
                                    line[0].line,line[0].column);
                }
                read_dc(line);
                break;
            case ".subckt":
                if (current_subckt.name != "_top_level_"){
                    throw new Error("Nested subcircuits not allowed",
                                    line[0].line,line[0].column);
                }
                current_subckt = read_subcircuit(line);
                break;
            case ".ends":
                if (current_subckt.name == "_top_level_"){
                    throw new Error(".ends statement without matching .subckt",
                                    line[0].line,line[0].column);
                }
                current_subckt = subcircuits["_top_level_"];
                break;
            default:
                throw new Error("Invalid control statement",
                                line[0].line,line[0].column);
                break;
        }
    }
    
/************************
Control statement readers
************************/
    
    /*********************
    Read global: for global nodes
    *********************/
    function read_global(line){
        line.shift();
        if (line.length === 0){
            throw new Error("No global nodes specified",
                            line[0].line,line[0].column);
        }
        for (var i=0; i<line.length; i+=1){
            if (line[i].type != "name"){
                throw new Error("Node name expected",line[i].line,line[i].column);
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
        var plot_list=[];
        for (var i=0; i<line.length; i+=1){
            if (line[i].type != "name"){
                throw new Error("Node name expected",line[i].line,line[i].column);
            } else{
                plot_list.push(line[i].token);
            }
        }
        if (plot_list.length > 0){
            plots.push(plot_list);
        } else {
            throw new Error("Node name expected",
                            line[0].line,line[0].column);
        }
    }
    
    /*********************
    Read options: global options
    *********************/
    function read_options(line){
        line.shift();
        while (line.length > 0){
            if (line.length < 3){
                throw new Error("Assignment expected",
                                line[0].line,line[0].column);
            }
            if (line[1].token != "="){
                throw new Error("Assignment expected",
                                line[0].line,line[0].column);
            }
            if (line[2].type != "number"){
                throw new Error("Number expected",line[2].line,line[2].column);
            }
            options[line[0].token] = line[2].token;
            line=line.slice(3);
        }
    }
    
    /*********************
    Read tran: transient analyses
    *********************/
    function read_tran(line){
        var tran_obj = {type:'tran',parameters:{}};
        for (var i=1;i<line.length;i+=1){
            if (i==line.length-1){
                if (line[i].type != "number"){
                    throw new Error("Number expected",line[i].line,line[i].column)
                }
                else{
                    tran_obj.parameters["tstop"]=line[i];
                } 
            } else {
                if (line[i].type != "number"){
                    throw new Error("Number expected",line[i].line,line[i].column)
                }
                else{
                    tran_obj.parameters["tstep"+i]=line[i];
                } 
            }
        }
        tran_obj = parse_tran(tran_obj);
        analyses.push(tran_obj);
    }
    
    /********************
    Parse tran: make sure a given transient analysis is valid
    *********************/
    function parse_tran(tran_obj){
        var temp_ps = {}
        var num_ps = 0;
        for (var param in tran_obj.parameters){
            temp_ps[param] = parse_number(tran_obj.parameters[param].token);
            num_ps += 1;
        }
        for (var i=0; i<num_ps; i+=1){
            if (i==num_ps-1){
                if (temp_ps["tstep"+i] >= temp_ps["tstop"]){
                    throw new Error("Time steps must be listed in increasing order",
                                    tran_obj.parameters["tstep"+i].line,
                                    tran_obj.parameters["tstep"+i].column);
                }
            } else if (temp_ps["tstep"+i] >= temp_ps["tstep"+(i+1)]) {
                throw new Error("Time steps must be listed in increasing order",
                                tran_obj.parameters["tstep"+i].line,
                                tran_obj.parameters["tstep"+i].column);
            }
        }
        
        tran_obj.parameters = temp_ps;
        return tran_obj;
    }
    
    /*********************
    Read DC: DC analyses
    *********************/
    function read_dc(line){
        line.shift();
        var dc_obj = {type:'dc',parameters:{}};
        var param_names = ["source1","start1","stop1","step1",
                           "source2","start2","stop2","step2"];
        if (line.length != 4 && line.length != 8){
            throw new Error("Ill-formed .dc statement",
                           line[0].line,line[0].column);
        }
        
        for (var i=0; i<line.length;i+=1){
            if (i==0 || i==4){
                if (line[i].type != "name"){
                    throw new Error("Node name expected",
                                    line[i].line, line[i].column);
                } else {
                    dc_obj.parameters[param_names[i]]=line[i];
                }
            } else {
                if (line[i].type != "number"){
                    throw new Error("Number expected",line[i].line,line[i].column);
                } else {
                    dc_obj.parameters[param_names[i]]=line[i];
                }
            }
        }
        dc_obj = parse_dc(dc_obj);
        analyses.push(dc_obj);
    }
    
    /**********************
    Parse DC: makes sure all parameters are valid
    **********************/
    function parse_dc(dc_obj){
        var temp_ps = {};
        for (var param in dc_obj.parameters){
            temp_ps[param] = dc_obj.parameters[param].token;
            if (param != "source1" && param != "source2"){
                temp_ps[param] = parse_number(temp_ps[param]);
            }
        }
        
        for (var i=1; i<=2; i+=1){
            if (temp_ps["start"+i] >= temp_ps["stop"+i]){
                throw new Error("Stop time must be greater than start time",
                                dc_obj.parameters["start"+i].line,
                                dc_obj.parameters["start"+i].column);
            }
            if (temp_ps["step"+i] <= 0) {
                throw new Error("Step interval must be a non-zero, positive number",
                                dc_obj.parameters["step"+i].line,
                                dc_obj.parameters["step"+i].line);
            }
        }
        dc_obj.parameters = temp_ps;
        return dc_obj;
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
                  }
        line.shift();
        
        while (line.length > 0){
            if (line.length > 1){
                if (line[1].token == "="){
                    if (line.length < 3){
                        throw new Error("Assignment expected",
                                        line[1].line,line[1].column);
                    } else {
                        obj.properties[line[0].token]=line[2];
                        line = line.slice(3);
                        continue;
                    }
                }
            }
            obj.ports.push(line.shift().token);
        }
        subcircuits[obj.name]=obj;
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
        switch (line[0].token[0]){
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
            case "X":
                device_obj = read_instance(line);
                break;
            default:
                throw new Error("Invalid device type",line[0].line,line[0].column);
        }
        return device_obj;
    }
    
/*********************************
Device readers: each takes a line of tokens and returns a device object,
                parameters _not_ checked for correctness
*********************************/
    
    /*************************
    General linear device: (resistors, capacitors, inductors)
        --ports: n_plus, n_minus
        --properties: name, value
    **************************/
    
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
    
    function read_linear(line,type){
        var obj = {type:type,
                   ports:["n_plus","n_minus"],
                   connections:[],
                   properties:{}
                  };
//        if (line.length != 4){
//            throw new Error("Ill-formed device statement",
//                            line[0].line,line[0].column);
//        }
        
        obj.properties.name = line[0].token;
//        for (var i=1;i<=2;i+=1){
//            if (line[i].type != 'name'){
//                throw new Error("Node name expected", 
//                                line[i].line, line[i].column)
//            }
//        }
//        obj.connections.push(line[1].token);
//        obj.connections.push(line[2].token);
        for (var i=0;i<line.length-1;i+=1){
            obj.conenctions.push(line[i]);
        }
        
        var end = line.length;
        if (line[end-1].type != "number"){
            throw new Error("Number expected",line[end-1].line,line[end-1].column);
        }
        obj.properties.value = line[3];
        
        return obj;
    }
    
    /*************************
    Mosfets: (pfets, nfets)
        --ports: D, G, S
        --properties: name, [scaled] length, [scaled] width
    **************************/
    
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
    
    function read_fet(line,type){
        var obj = {type:type,
                   ports:["D","G","S"],
                   connections:[],
                   properties:{name:line[0].token,L:1}
                  }
//        if ((line.length !=10) && (line.length !=7)){
//            throw new Error("Ill-formed device declaration",
//                            line[0].line,line[0].column);
//        }
        
//        for (var i=1; i<=3; i+=1){
//            if (line[i].type != "name"){
//                throw new Error("Node name expected",
//                                line[i].line,line[i].column);
//            }
//        }
//        obj.connections.push(line[1].token);
//        obj.connections.push(line[2].token);
//        obj.connections.push(line[3].token);
        
        var end = line.length;
        var knex_end=line.length-3;
        if (line[end-2].token != "="){
            throw new Error("Assignment expected",
                            line[end-2].line,line[end-2].column);
        }
        if (line[end-1].type != "number"){
            throw new Error("Number expected",line[end-1].line,line[end-1].column);
        }
        obj.properties[line[end-3].token.toUpperCase()]=line[end-1];
        
//        if (line.length==10){
//            if (line[8].token != "="){
//                throw new Error("Assignment expected",line[8].line,line[8].column);
//            }
//            if (line[9].type != "number"){
//                throw new Error("Number expected",line[9].line,line[9].column);
//            }
//            obj.properties[line[7].token.toUpperCase()]=line[9];
//        }
        if (line[end-5] !== undefined){
            if (line[end-5].token == "="){
                if (line[end-4].type != "number"){
                    throw new Error("Number expected",
                                    line[end-4].line,line[end-4].column);
                }
                obj.properties[line[end-6].token.toUpperCae()]=line[end-4];
                knex_end -= 3;
            }
        }
        
        if (obj.properties.W === undefined){
            throw new Error("Mosfet width must be specified",
                            line[0].line,line[0].column);
        }
        
        for (var i=0;i<knex_end;i+=1){
            obj.connections.push(line[i]);
        }
        
        return obj;
    }
    
    /*************************
    Sources: (voltage source, current source)
        --ports: n_plus, n_minus
        --properties: name, value
    ***************************/
    
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
    
    function read_source(line,type){
        var obj = {type:type,
                   ports:["n_plus","n_minus"],
                   connections:[],
                   properties:{name:line[0].token}
                  }
        for (var i=1; i<=2; i+=1){
            if (line[i].type!= "name"){
                throw new Error("Node name expected",
                                line[i].line,line[i].column);
            }
        }
        
        obj.connections.push(line[1].token);
        obj.connections.push(line[2].token);
        
        var val_ar = []
        for (var i=3; i<line.length; i+=1){
            val_ar.push(line[i].token);
        }
        obj.properties.value = line[3];
        obj.properties.value.token = val_ar.join(" ");
        return obj;
    }
    
    /*****************************
    Instance: instance of user-specified subcircuit
    *******************************/
    function read_instance(line){
        var props = [];
        if (line.length >= 4){
            try{
                while (line[line.length-2].token=="="){
                    props.push(line.slice(-3));
                    line = line.slice(0,-3);
                }
            } catch (err) {}
        }
//        console.log("props:",props);

        var inst = line[line.length-1];
        if (!(inst.token in subcircuits)){
            throw new Error("Can't find definition for subcircuit "+inst.token,
                            inst.line,inst.column);
        }
        
        var obj = {type:"instance",
                   connections:[],
                   ports:subcircuits[inst.token].ports,
                   properties:{instanceOf:inst.token, name:line[0].token}
                  }
        line.shift();
        
        for (var i=0; i<line.length-1; i+= 1){
            if (line[i].type != "name"){
                throw new Error("Node name expected",
                                line[i].line,line[i].column);
            }
            obj.connections.push(line[i].token);
        }
        for (var i=0; i<props.length; i+=1){
            if (props[i][2].type != "number"){
                throw new Error("Number expected",
                                props[2].line,props[2].column)
            }
            obj.properties[props[i][0].token]=props[i][2];
        }
        
        return obj;
    }
    
/*************************
Device parsers
**************************/
    
    
/******************************
filename_to_contents: takes a file path and returns the string representing its 
content
    --args: -filename: a string representing the unique name of a file
    --returns: a string representing the contents of the file
*******************************/
    function filename_to_contents(filename){
        if (pseudo_files[filename]===undefined){
            throw "File does not exist";
        } else {
            return pseudo_files[filename];
        }
    }
    
/**************************
Include: takes a parsed array of tokens and includes all the files
    --args: -token_array: an array of tokens
    --returns: a new array of tokens consisting of all the tokens from all files
***************************/
    
    function include(token_array){
        var included_files = [token_array[0].origin_file]; // ??????????????????
        // list of filenames that have already been included 
        var new_token_array = [];
        
        while (token_array.length > 0){
            var current = token_array[0];
            if (current.token.toLowerCase() == ".include"){
                var file = token_array[1];
                console.log("file:",file);
                if (!(file.type == "string")){
                    throw new Error("Filename expected",current.line,current.column);
                } else {
                    var filename = file.token;
                    if (included_files.indexOf(filename)==-1) {
                        included_files.push(filename);
                        
                        var contents;
                        try{
                            contents = filename_to_contents(filename);
                        } catch(err) {
                            throw new Error(err,current.line,current.column);
                        }
                        contents = tokenize(contents,filename);
                        token_array.shift();
                        token_array.shift();
                        if (contents !== undefined){
                            token_array = contents.concat(token_array);
                        }
                        
                    }
                }
            }
            new_token_array.push(token_array.shift());
        }
        return new_token_array;
    }
       
/***************************
Exports
****************************/
    return {parse:parse,
            analyze:analyze,
            split:split,
            tokenize:tokenize,
//            parse1:parse1,
            include:include,
//            parse_scaled:parse_scaled,
            parse_number:parse_number,
//            parse_device:parse_device
              }
}());

/**************************
testing
***************************/
var raw_text = ''
+ '//hi\n'
+ '+ this is still a comment\n'
+ '.include "foo.txt"\n'
+ 'R1 a b 3k foo=7 //resistor\n'
+ 'Cthis:is_a,long$name[] a b 1\n'
+ 'Ra[0:2] a b 100\n'
+ 'R1abc a b /* random comment */ 10k\n'
+ '.plot foo.bar.baz.bim\n'
+ '//&%#blarg@!~`'
+ '0xDEADBEEF  0x12345678 10u 8ks';
var test2_text = "comment1 \n+ comment2\n foobar 17 *comment3";
var test3_text = "R1 0 1 10\nR2 1 2 \n+ 50";
var test4_text = "name name2 a1 aa1 123 + \n foo.bar.biz.bam A0[3:0]\n"
var iter_test_array = ["[4:0]","[4:0:2]","[0:4]","[0:4:2]",
                       "[0:4:0]","[1:4:2]","[0:4:3]"];
var line_ext_text = "hi \n foo\n\n+ bar";
var decomment_text = "foo\n//comment1\n+NOT_comment1\nbar/*comment2*/\n/*comment3\n\nstill_comment3*/";
var include_text = '.include "foo"\n.include "bar"\nR1 a b 10 //this is a comment\nC1 a b 1';
var control_text = ".global vdd\n.options a=1 b=2\n.subckt foo a z\nR1 a z 10k\n"
+".ends\nCcap a z 5\n.tran 10ns\n.plot a z 0\n\n\nPpfet z a 0 W=2\n"
+"Nnfet 0 a z W=4 L=3";

var subckt_test_text = ".subckt foo a z\nR1 a z 10k\n.ends\n"+
                       "Xtest a b foo prop1=1 prop2=1\n";

function test1(){parser.split(raw_text);}
function test2(){parser.decomment(parser.line_extend(parser.split(test2_text)));}
function test3(){parser.line_extend(parser.split(test3_text));}
function test4(){parser.split(test4_text);}
function test5(){
    for (var i=0; i<iter_test_array.length;i+=1){
        console.log("test:",iter_test_array[i]);
        try{
            console.log(parser.iter_interpret(iter_test_array[i]));
        } catch(err) { console.log("error:",err); }
    }
}
function test6(){ parser.iter_expand(parser.split("Rtest a[0:1][2:3][4:5] ")); }
function test7(){ return parser.iter_expand(parser.split("A[0:2] B#3 C[0:1]#2")); }
function test8(){ return parser.decomment(parser.split("*hi \n foo \n bar *comment\n")); }
function test9(){ console.log(JSON.stringify(parser.split(parser.analyze(include_text)))); }
function test10(){ return parser.analyze(decomment_text); }
function test11(){ console.log(parser.parse(
    "2 2k 2ms 2.2 2e2 2.2e2 .2e2 0x2 0b01 02")); }

var pseudo_files = {"foo":"foo bar \nbaz /*comment\ncomment2*/ bim",
                    "bar":"/* this file starts with\na multiline comment.*/\n"+
                            "10 10k 10.1 1e2 1.1e2 0x10 0b10 010"
                   };
function test12() { console.log(parser.include(parser.parse('.include "foo"\n.include "bar"\nR1 a b 10 //this is a comment\nC1 a b 1',"master_file"))); }
function test13(){ console.log(parser.parse(include_text,"master_file")); }
function test14(){ console.log(parser.tokenize("//comment\nR1 a b 1\n/* comment */ "+
                                               "A[0:1:0]"
                                              )); }

function test15(letter){ console.log(parser.parse_device(parser.tokenize(letter+"test 0 1 1").slice(0,4))); }
function test16(string){ console.log(JSON.stringify(parser.parse_device(
    parser.tokenize(string).slice(0,-1)))); }
function test17(){ parser.parse("Rrtest a b 10k\nCctest c d 5\n"+
                               "Lltest e f 3\nMmtest 0 x z 0 nenh sw=2 sl=2"); }

function psSubcktTest(){ return parser.parse(subckt_test_text); }


function psDevTest(){ return parser.parse(
"Rtest a z 10k\n"+
"Ctest a z 5\n"+
"Ltest a z 2\n"+
"Ptest d g s w=2\n"+
"Ntest d g s w=2"

); }

function psCtlTest(){ return parser.parse(
    ".plot a b\n"+
    ".plot c d\n"+
    ".tran 10ns\n"+
    ".tran 1 2 3 4 5\n"+
    ".dc foo 0 5 0.5\n"+
    ".dc bar 5 6 0.1\n"+
    ".global gnd vdd\n"+
    ".options A=1 B=2"
    
); }







