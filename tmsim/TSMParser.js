/*
  TMSIM includes the code neccessary to parse in a String into a 
  TSM instance, and it's corresponding tests. 
*/
function TSMparser(){
    //declaring regular expressions for the varrious possible syntaxes in TMSIM
    var quotedRegExp = /\"([^\n\"]|\\\"|\\\/)+\"/;
    var multiLineRegExp = /\/\*(.|\n)*\*\//;
    var commentRegExp = /\/\/(.)*\n/;
    var variableRegExp = /[^\s\/\\\"\']+/
	var selectedRegExp = /\[(\"[^\n]+\"|[^\s\/"']+)+\]/
	var commentRegExp = /\/\/|\/\*|\*\/|\n/
	var keywordRegExp = /^(action|symbols|states|tape|result|result1|checkoff)\b/
	var regexp = new RegExp('('+multiLineRegExp.source+'|'+keywordRegExp+'|'+commentRegExp.source+'|'+quotedRegExp.source +'|'+ variableRegExp.source+'|'+selectedRegExp.source +')', 'g');
	// var oldRegexp=/(\"[^\n]+\"|\[\w+\]|\w+\b|\*\w+\b\*|^[^\s\/"']+|\n|-|\/\/|\/\*|\*\/)/g
	
	//our TSM instance, we compile it with parse, 
	// instantiate it with flattenMachine, and run it with getResults 
	

	/*
	takes in a string in the TMSIM language, and returns a parsed dictionary
	which flattenMachine will flatten into a TSM instance. 
	*/
	function parse(stream){
		var exceptions = [];
		var tokens=stream.match(regexp);
		var parseDict={
			symbols:[],
			states:[],
			tape:[],
			result:[],
			result1:[],
			checkoff:[],
			action:[],
		};
		var parseState='none';
		var oldParseState = 'none';
		var lineCount=1;
		var count = {
			action:0,
			symbols:0,
			states:0,
			tape:0,
			result:0,
			result1:0,
			checkoff:0,
		};


		for(var i =0; i<tokens.length; i++) {

			//syntax for the TMSIM language:
			// keywords: action, symbols, states, tape, result, result1, checkoff
			// action has 5 arguments, state, readSymbol to speicy a transition, 
			//		and the transition which consists of new_state, write, and move
			// all of these must be predefined as either a symbol, a state, or a valid move
			//
			// symbols defines all the symbols that a user will use, can have many arguments
			// states defines all the states that a user will use, can have many args
			// both of these are limited by being any non space character except ", \, and /
			// unless they are surrounded by "", which can have spaces and escaped characters
			// 
			// tape delineates a test tape, has one arg, name, and the second arg is the tape, 
			// which conforms to have to have valid symbols
			var token = tokens[i];
			var type = getType(token);

			if (type == 'multi_comment_start'){
				parseState = 'none';
				lineCount+=token.match(/\n/g).length;
				continue;
			} else if (type == 'line_comment'){
				oldParseState = parseState;
				parseState = 'line_comment';
				continue;
			}
			if(parseState == 'none'){
				//expecting a keyword or comment
				if(type == 'keyword'){
					parseState = token;
				}
				else if (type != 'newline'){
					var message="expecting a keyword or comment, " + token + " is not a keyword";
					
					exceptions.push({
						message: message,
						lineNumber : lineCount,
					})
					continue;
				} else if (type == 'newline'){
					lineCount++;
				}
				continue;
			}

			//first check for comments and get ready to ignore
			if (type == 'newline'){
				// console.log(parseState +' on newline')
				var currParseState = parseState;
				if(parseState == 'line_comment')
					currParseState = oldParseState;
				lineCount++;
				if (getType(currParseState) == 'keyword'){
					
					count[currParseState]++;

					//  else {
					// 	console.log(token + ' is not a keyword, no idea how you got here');
					// 	console.log(' at line '+lineCount);
					// }
					parseState = 'none';
					continue;
				} else if (parseState == 'line_comment') {
					parseState = 'none';
					continue;
				} else if (parseState == 'multi_line_comment'){
					// console.log('continuing multi line comment');
					continue;
				}
			} else if (type == 'multi_comment_end'){
				if (parseState != 'multi_line_comment'){
					var message = ('you ended a comment that you didn\'t start');
					
					exceptions.push({
						message : message,
						lineNumber : lineCount,
					})
					continue;
				}
			} else if (type == 'variable'){
				//if the token is a variable, it must correspond to an action
				if (parseState == 'line_comment' ){
					//console.log('continuing on line_comment ' + token);
					continue;
				} else if (parseState == 'multi_line_comment'){
					// console.log('continuing multi_line_comment ');
					continue;
				} else if (getType(parseState)=='keyword'){
					if(parseDict[parseState].length == count[parseState]){
						parseDict[parseState].push({
							lineNumber:lineCount,
							args: [],
						});
					}
					parseDict[parseState][count[parseState]].args.push(token)
					
				} else {
					var message = (token + ' does not go here, we are looking for ' + parseState);
					
					exceptions.push({
						message : message,
						lineNumber : lineCount,
					})
					continue;
				}
			} else if (type == 'keyword'){
				// TODO: we don't need newline here... but might as well
                                             // the user started a new command on the same line as another command
                                             // how should we handle this, throw an error?
                                             // this probably means the user is using a keyword as a state name
                                             // which is not allowed. 
                                             if (getType(parseState) == 'keyword'){
                                                 // console.log(parseState + ' on keyword')
                                                 var message = ('two commands on the same line');
                                                 count[currParseState]++;
                                                 exceptions.push({
                                                         message : message,
                                                             lineNumber : lineCount,
                                                             })
                                                 parseState = token;
                                                 continue;
                                             } else if (parseState == 'line_comment') {
                                                 continue;
                                             } else if (parseState == 'multi_line_comment'){
                                                 continue;
                                             }
                                             }
                                 }
		
        if(exceptions.length > 0){
            throw exceptions;
        }
    return parseDict;
		
}
function flattenMachine(dict){
    var tsm = new TSM();

    // corresponding lists of test tapes and results, and checkoff requirements
    var list_of_tapes={};
    var list_of_results={};
    var list_of_results1={};
    var checkoff = undefined;

    var keys = Object.keys(dict);
    //console.log(keys);
    var exceptions = [];
    var validSymbols=['-'];
    var validStates=['*halt*', '*error*'];
    var validMoves=['l', 'r', '-'];
    var actions=[];
    var tsmDict={};
    var parseFunctions = {
        action:function(args, lineNumber){
            if(args.length == 5){
                var state = args[0];
                var read_symbol = args[1];

                var transition = new Object();
                transition.new_state = args[2];
                transition.write = args[3];
                transition.move = args[4];
                transition.lineNumber = lineNumber;
                //two actions for the same state
                if(tsmDict[state].transition[read_symbol]){
                    message = 'you have two actions for state '+state+' at symbol ' + read_symbol;
                    exceptions.push({
                            message:message, lineNumber:lineNumber,
                                })
                        }
                if(_.contains(validStates,state)
                   &&_.contains(validStates, transition.new_state)
                   &&_.contains(validSymbols, read_symbol)
                   &&_.contains(validSymbols, transition.write)
                   &&_.contains(validMoves, transition.move)){
                    //'valid action');
                    tsmDict[state].transition[read_symbol]=transition;
                } else {
                    var message = '';
                    if(!_.contains(validStates,state))
                        message = 'your state argument, '+state+', is invalid, you should declare your states with the states command';
                    else if (!_.contains(validStates, transition.new_state))
                        message = 'your new_state argument,'+transition.new_state+', is invalid, you should declare your states with the states command';
                    else if (!_.contains(validSymbols, read_symbol))
                        message = 'your read_symbol, '+read_symbol+', is invalid, declare it with the states command';
                    else if(!_.contains(validSymbols, transition.write))
                        message = 'your write_symbol, '+transition.write+', is invalid, declare it with the states command';
                    else if(!_.contains(validMoves, transition.move))
                        message = 'your move symbol, '+transition.move+', is invalid, declare it with the states command';
						
                    exceptions.push({
                            message:message,
                                lineNumber:lineNumber
                                });
                }
            } else {
                var message=args+'is not 5 characters, not a valid action';
					
                exceptions.push({
                        message:message,
                            lineNumber:lineNumber
                            });
            }
        },
        symbols:function(args, lineNumber){
            for(var k = 0; k < args.length; k++){
                var symbol = args[k];
                validSymbols.push(symbol);
            }
        },
        states:function(args, lineNumber){
            for(var k = 0; k < args.length; k++){
                var state = args[k];
                validStates.push(state);
                tsmDict[state]={};
                tsmDict[state].name = state;
                tsmDict[state].transition = {};
            }
        },
        tape:function(args, lineNumber){
            var tapeName = args[0];
            var tapeContents = args.slice(1);
            list_of_tapes[tapeName]=initiateList(tapeContents, tapeName, lineNumber);
            // list_of_tapes[tapeName].printLL();
        },
        result:function(args, lineNumber){
            var tapeName = args[0];
            var tapeContents = args.slice(1);
            try{
                list_of_results[tapeName]=initiateList(tapeContents, tapeName, lineNumber);
            } catch (e){
                exceptions.push({
                        message:e,
                        lineNumber:lineNumber
                    });
                list_of_results[tapeName]=[];

            } 

        },
        result1:function(args, lineNumber){
            if (args.length > 2){
                exceptions.push({
                        message:('result1 can only have two arguments'),
                        lineNumber:lineNumber
                    });
                return;
            }
            var tapeName = args[0];
            var tapeResult=  args[1];
            list_of_results1[tapeName]=tapeResult;
        },
        checkoff:function(args, lineNumber){
            if (checkoff !== undefined) {
                exceptions.push({
                        message:('more than one checkoff statement'),
                        lineNumber:lineNumber
                    });
                return;
            }
            if (args.length != 3) {
                exceptions.push({
                        message:('checkoff should have three arguments'),
                        lineNumber:lineNumber
                    });
                return;
            }
            checkoff = {
                server: args[0],
                assignment: args[1],
                checksum: parseInt(args[2])
            };
        }
    };
    for (var i = 0; i < keys.length; i++){
        var key = keys[i];
        var list_of_commands  = dict[key]; //list of commands of that key
        for(var j = 0; j < list_of_commands.length; j++){
            var args = list_of_commands[j].args;
            var lineNumber = list_of_commands[j].lineNumber;
            if(parseFunctions[key])
                parseFunctions[key](args, lineNumber);
            else {
                var message = (key+' is not a valid keyword');
                exceptions.push({
                        message:message,
                            lineNumber:lineNumber
                            });
            }
        }
    }

    tsm.setup(tsmDict, validSymbols);
    if(exceptions.length > 0)
        throw exceptions;
    return {tsm:tsm,
            lists: {
              list_of_tapes:list_of_tapes,
              list_of_results:list_of_results,
              list_of_results1:list_of_results1,
            },
            checkoff : checkoff,
            };
}

// function getResults(){
// 	var results = '';
// 	for(key in list_of_tapes){
// 		results +=key+': ';
// 		var list = list_of_tapes[key].cloneTape();
// 		results += list.toString()+'\n';
			
// 		tsm.start(list);
// 		results+='results: '+list.toString()+'\n';
// 		if (list_of_results[key]){
// 			results+='desired: '+(list_of_results[key])+'\t';
// 			results+='equal?: '+String(list.equals(list_of_results[key]))+'\n';
// 		} 
// 		if (list_of_results1[key]){
// 			results+='desired current value: '+(list_of_results1[key]);
// 			results+=', result1: '+String(list.peek()==(list_of_results1[key]))+'\n';
// 		}
// 		results+='\n\n';
// 	}
// 	return results;
// }
//HELPER FUNCTIONS
	
function keyCompare(a,b){
    if(stringContains(b,'action'))
        return -1;
    else if(stringContains(a, 'action'))
        return 1;
    return -1;
}
function getType(token){
		
    if (token.match(/^\/\//))
        return 'line_comment';
    else if (token.match(/^\/\*/))
        return 'multi_comment_start';
    else if(token.match(keywordRegExp))
        return 'keyword';
    else if (token.match(/^\*\//))
        return 'multi_comment_end';
    else if (token.match(/^\n/))
        return 'newline';
    else if (token.match(variableRegExp)||token.match(quotedRegExp))
        return 'variable';
    else{
        var message = token+' is not a valid keyword';
        exceptions.push({
                message:message,
                    lineNumber:lineCount,
                    })
            }
}
function initiateList(tokens, tapeName, lineNumber){
    var tapeContents = [];
    var selected = false;
    var selectedIndex = 0;
    for (var j = 0; j < tokens.length; j++){
        var token = tokens[j];
        if(token.match(selectedRegExp)){
            //this is the one that we want to start the tsm on 
			
            if(!selected){
                //then we haven't selected one yet, good
                selectedIndex=j;
                tapeContents.push(token.slice(1, token.length-1));
                selected = true;
            } else {
					
                throw 'you have 2 selected variables at the tape, you can only have one';
					 
            }

        } else {
            tapeContents.push(token)
                }
    }
    return (new TapeList()).init(tapeName, tapeContents, selectedIndex);
}

return {parse:parse, flattenMachine:flattenMachine}
};


function stringContains(string, value){
    return string.indexOf(value) > -1;
}

