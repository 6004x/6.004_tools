var parser = (function(){
    
/**********************************
Analyzer (string level): removes comments and line extensions
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
            var replaced1 = match.replace(/[^\n\u001e]/g,"");
            // now replace all newlines with record separators
            return replaced1.replace(/\n/g,"\u001e");
        }
        
        // extend lines by replacing the line_ext_pattern with a
        // record separator for each newline.
        var extended_string = input_string.replace(line_ext_pattern, newline_track);
//        console.log("extended string:",extended_string);
        
        // remove single-line comments by replacing them with a newline,
        // since the pattern includes the newline
        var decommented_string = extended_string.replace(comment1_pattern,
                                                        newline_track);
        
        // remove multi-line comments by replacing them with a record
        // separator for each newline
        decommented_string = decommented_string.replace(comment2_pattern,
                                                        newline_track);
        
        return decommented_string;
    }
    
/*****************************
Splitter: splits a string into an array of tokens
*******************************/
    function split(input_string){
        var pattern = /".*"|0x[0-9a-fA-F]+|-?\d*\.?\d+(([eE]-?\d+)|[a-zA-Z]*)|\.?[A-Za-z][\w:\.,$#\[\]]*|=|\n|\u001e/g; 
        
        var names_pattern = /[A-Za-z][\w,$:\[\]\.]*/;
        var int_pattern = /\d+/;
        var exp_pattern = /-?\d*\.?\d+[eE]-?\d+/;
        var num_pattern = /-?\d*\.?\d+([A-Za-z]*|[eE]-?\d+)/;
        
        // 'pattern' matches, in order:
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
        while ((matched_array = pattern.exec(input_string)) !== null){
            var type;
            if (names_pattern.test(matched_array[0])){
                type = 'name';
            } else if (int_pattern.test(matched_array[0])){
                type = 'int';
            } else if (exp_pattern.test(matched_array[0])){
                type = 'exp';
            } else {
                type = null;   
            }
            if (!(matched_array[0]=="\u001e")){
                substrings.push({token:matched_array[0],
                                 line:lineNumber,
                                 type:type
                                });
            }
            if ((matched_array[0] == "\n")||(matched_array[0] == "\u001e")){
                lineNumber += 1;
            }
        }
//        console.log(substrings);
        return substrings;
    }
    
/********************************
Match token: if the first token in the given array is t, return true;
otherwise, return false
**********************************/
    function match_token(t,token_array){
        if (token_array.length > 0 && token_array[0].token==t){
            return true;
        }
        return false;
    }
    
/*********************************
Line extender: look for + signs directly following newlines and remove both
*********************************/
//    function line_extend(token_array){
////        console.log("initial array:",token_array);
//        
//        var extended_array = [];
//        
//        while(token_array.length > 0){
//            if (match_token("\n",token_array) && match_token("+",token_array.slice(1))){
//                token_array.shift();
//                token_array.shift();
//            } else {
//                extended_array.push(token_array.shift());
//            }
//        }
//        
////        console.log("extended array:",extended_array);
//        return extended_array;
//    }
    
/*****************************
Uncommenter: given an array of raw substrings, remove the comments
*****************************/
//    function decomment(token_array){
////        console.log("decomment's token array:",token_array);
//        var nocomment_array = [];
//        
//        while(token_array.length > 0){
//            // comment type 1: double slash till end of line
//            if (match_token("//",token_array)){
//                while(!match_token("\n",token_array)){ 
//                      token_array.shift(); 
//                }
//            // comment type 2: C-style multiline comment /* ... */
//            } else if (match_token("/*",token_array)) {
//                while(!match_token("*/",token_array)&&!(token_array.length==1)){
//                    token_array.shift(); 
//                }
//                if (token_array[0].token != "*/"){
//                    throw "Unclosed comment at line "+token_array[0].line+".";
//                }
//                token_array.shift();
//            // comment type 3: * at the beginning of a line
////            } else if (match_token("\n",token_array) && 
////                       match_token("*",token_array.slice(1))){
////                token_array.shift();
////                while(!match_token("\n",token_array)){ 
////                      token_array.shift(); 
////                }    
//            } else {
//                // if the current token is not part of a comment, simply transfer it
//                // to the new array
//                nocomment_array.push(token_array.shift());
//            } 
//        }
////        console.log("uncommented array:",nocomment_array);
//        return nocomment_array;
//    }
    
/********************************
Iterater expander: expands iterators such as A[0:5] into the proper sequence
                    and duplicators such as B#3
*********************************/
    var iterator_pattern = /\[\d+:\d+(:-?\d+)?\]/;
    var duplicator_pattern = /#\d+$/;
    // iterator syntax: [digit:digit(:optional_+/-digit)] 
    // duplicator syntax: anything#digit

    function iter_expand(token_array){
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
                                             type:'name'
                                            });
                    }
                    duped_token_array = iter_expand(duped_token_array);
                    expanded_array = expanded_array.concat(duped_token_array);
                    token_array.shift();
                }else
                if((iter_match_array=iterator_pattern.exec(current.token))!==null){
                    var iter_string = iter_match_array[0];
                    console.log("iter string:",iter_string);
                    var front_string = current.token.slice(0,iter_match_array.index);
                    var end_index = iter_match_array.index + iter_string.length;
                    var end_string = current.token.slice(end_index);
                    
                    var new_iter_strings = iter_interpret(iter_string);
                    for (var i=0; i < new_iter_strings.length; i+=1){
                        var new_token_obj = {token:front_string+new_iter_strings[i]+
                                            end_string,
                                             line:current.line,
                                             type:'name'}
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
iterator interpreter: given a string of the form '[a:b:k]', returns an array of
strings of the form '[a]', '[a+k]', '[a+2k]', ..., '[b]'
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
    
    return {split:split,
//            decomment:decomment,
//            line_extend:line_extend,
            iter_interpret:iter_interpret,
            iter_expand:iter_expand,
            analyze:analyze
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
var decomment_text = "foo\n//comment1\n+still_comment1\nbar/*comment2*/\n/*comment3\n\nstill_comment3*/";

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
function test9(){ console.log(parser.split(parser.analyze(decomment_text))); }
function test10(){ return parser.analyze(decomment_text); }
