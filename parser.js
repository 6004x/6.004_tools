var parser = (function(){
    
    function split(input_string){
        var pattern = /\/\/|\/\*|\*\/|\*|\+|".*"|0x[0-9a-fA-F]+|0[0-7]+|-?\d*\.?\d+(([eE]-?\d+)|[a-zA-Z]+)?|\.?[A-Za-z][\w:\.,$\[\]]*|=|\n/g; 
        
        var names_pattern = /[A-Za-z][\w,$:\[\]\.]*/;
        
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
        //      a newline
        
        // comments = \/\/|\/\*|\*\/|\*
        // nums_noscale = -?\d*\.?\d+([eE]-?\d+?
        // nums_scale = -?\d*\.?\d+[TtGg(MEG)(meg)KkMmUu(MIL)(mil)NnPpF]
        // names = \.?[A-Za-z][\w:\.,$\[\]]*
        // newlines = \n/g
        
        var matched_array;
        var substrings = [];
        var lineNumber = 1;
        while ((matched_array = pattern.exec(input_string)) !== null){
            var type;
            if (names_pattern.test(matched_array[0])){
                type = 'name';
            } else {
                type = null;   
            }
            substrings.push({token:matched_array[0],
                             line:lineNumber,
                             type:type
                            });
            if (matched_array[0] == "\n"){
                lineNumber += 1;
            }
        }
        console.log(substrings);
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
Uncommenter: given an array of raw substrings, remove the comments
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
Iterater expander: expands iterators such as A[0:5] into the proper sequence
*********************************/
    var iterator_pattern = /\[\d+:\d+(:-?\d+)?\]/;
    // iterator syntax: [digit:digit(:optional_+/-digit)]   

    function iter_expand(token_array){
        var expanded_array = [];
        
        while (token_array.length > 0){
            current = token_array[0];
            console.log("current token obj:",current);
            var iter_match_array;
            var new_token_array = [];
            
            if (current.type=='name'){
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
        console.log("expanded array:",expanded_array);
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
            decomment:decomment,
            line_extend:line_extend,
            iter_interpret:iter_interpret,
            iter_expand:iter_expand
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
var test4_text = "name name2 a1 aa1 123 + \n foo.bar.biz.bam A0[3:0]\n"
var iter_test_array = ["[4:0]","[4:0:2]","[0:4]","[0:4:2]",
                       "[0:4:0]","[1:4:2]","[0:4:3]"];

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
