var parser = (function(){
    
    function split(input_string){
        var pattern = /\/\/|\/\*|\*\/|\*|\+|".*"|0x[0-9a-fA-F]+|0[0-7]+|-?\d*\.?\d+(([eE]-?\d+)|[a-zA-Z]+)?|\.?[A-Za-z][\w:\.,$\[\]]*|[A-Za-z][0-9] |=|\n/g; 
        
        // matches, in order:
        //      an astarisk
        //      two forward slashes
        //      a forward slash followed by a star
        //      a star  followed by a forward slash
        //      a (plain) star
        //      a plus sign
        //      anything wrapped in quotes
        //      an optional minus sign, zero or more digits, an optional decimal point, one or more digits, and either an optional exponent term consisting of an e or E, optional negative sign, and one or more digits; or a scale factor
        //      an optional period, followed by a letter, then any number of letters, digits, underscores, colons, dollar signs, square brackets, commas, or periods
        //      a single letter followed by a single number
        //      a newline
        
        // comments = \/\/|\/\*|\*\/|\*
        // nums_noscale = -?\d*\.?\d+([eE]-?\d+?
        // nums_scale = -?\d*\.?\d+[TtGg(MEG)(meg)KkMmUu(MIL)(mil)NnPpF]
        // names = [A-Za-z]?[A-Za-z][\w:,$\[\]]*
        // shortnames = [A-Za-z][0-9] **note the space at the end**
        // newlines = \n/g
        
        var matched_array;
        var substrings = [];
        var lineNumber = 1;
        while ((matched_array = pattern.exec(input_string)) !== null){
            substrings.push({token:matched_array[0],
                             line:lineNumber
                            });
            if (matched_array[0] == "\n"){
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
    function line_extend(token_array){
//        console.log("initial array:",token_array);
        
        var extended_array = [];
        
        while(token_array.length > 0){
            if (match_token("\n",token_array) && match_token("+",token_array.slice(1))){
                token_array.shift();
                token_array.shift();
            } else {
                extended_array.push(token_array.shift());
            }
        }
        
//        console.log("extended array:",extended_array);
        return extended_array;
    }
    
/*****************************
given an array of raw substrings, remove the comments
*****************************/
    function decomment(token_array){
//        console.log("decomment's token array:",token_array);
        var nocomment_array = [];
        
        while(token_array.length > 0){
            // comment type 1: double slash till end of line
            if (match_token("//",token_array)){
                while(!match_token("\n",token_array)){ 
                      token_array.shift(); 
                }
            // comment type 2: C-style multiline comment /* ... */
            } else if (match_token("/*",token_array)) {
                while(!match_token("*/",token_array)&&!(token_array.length==1)){
                    token_array.shift(); 
                }
                if (token_array[0].token != "*/"){
                    throw "Unclosed comment at line "+token_array[0].line+".";
                }
                token_array.shift();
            } else {
                // if the current token is not part of a comment, simply transfer it
                // to the new array
                nocomment_array.push(token_array.shift());
            } 
        }
//        console.log("uncommented array:",nocomment_array);
        return nocomment_array;
    }
    
/********************************
analyzer: combines decommenting and line extending

NO GOOD: LINE EXTENDING HAS TO HAPPEN FIRST !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
********************************/
//    
//    function analyze(token_array){
//        token_array.push({token:"\n"});
//        var new_array = [];   
//        
//        while(token_array.length > 0){
//            if (match_token("\n",token_array) &&
//                        match_token("+",token_array.slice(1))){
//                token_array.shift();
//                token_array.shift();
//            }
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
//            } else {
//                // if the current token is not part of a comment, simply transfer it
//                // to the new array
//                new_array.push(token_array.shift());
//            } 
//        }
//    }
    
    
    
    return {split:split,
            decomment:decomment,
            line_extend:line_extend,
              }
}());

/**************************
testing
***************************/
var raw_text = ''
+ '*hi\n'
+ '+ this is still a comment\n'
+ '.include "foo.txt"'
+ 'R1 a b 3k foo=7 //resistor\n'
+ 'Cthis:is_a,long$name[] a b 1\n'
+ 'Ra[0:2] a b 100\n'
+ 'R1abc a b /* random comment */ 10k\n'
+ '.plot foo.bar.baz.bim\n'
+ '//&%#blarg@!~`'
+ '0xDEADBEEF  0x12345678 10u 8ks';

var test2_text = ".plot foo //comment\n+still_a_comment\nR1 0 /* random comment2 */ 1 10\n/* test */";

var test3_text = "R1 0 1 10\nR2 1 2 \n+ 50";

function test1(){parser.split(raw_text);}
function test2(){parser.decomment(parser.line_extend(parser.split(test2_text)));}
function test3(){parser.line_extend(parser.split(test3_text));}
