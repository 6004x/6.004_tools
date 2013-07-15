function TMSIM(){

	var tsm = new TSM();
	var quotedRegExp = /\"[^\n]+\"/;
	var multiLineRegExp = /\/\*(.|\n)*\*\//;
	var commentRegExp = /\/\/(.)*\n/;
	var variableRegExp = /[^\s\/\\\"\']+/
	var selectedRegExp = /\[(\"[^\n]+\"|[^\s\/"']+)+\]/
	var commentRegExp = /\/\/|\/\*|\*\/|\n/
	var regexp = new RegExp('('+multiLineRegExp.source+'|'+commentRegExp.source+'|'+quotedRegExp.source +'|'+ variableRegExp.source+'|'+selectedRegExp.source +')', 'g');
	var oldRegexp=/(\"[^\n]+\"|\[\w+\]|\w+\b|\*\w+\b\*|^[^\s\/"']+|\n|-|\/\/|\/\*|\*\/)/g
	

	var list_of_results={};
	var list_of_results1={};
	var list_of_tapes={};

	function parse(stream){
		//console.log(stream);
		var tokens=stream.match(regexp);
		console.log(tokens);
		var parseDict={};
		var parseState='none';
		var oldParseState = 'none';
		var lineCount=1;
		var actionCount=0;
		var symbolsCount=0;
		var statesCount=0;
		var tapeCount=0;
		var resultCount=0;
		var resultoneCount=0;
		var checkoffCount=0;
		for(var i =0; i<tokens.length; i++) {
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
				else if (type!='newline'){
					console.log("expecting a keyword or comment, " + token + ' is not a keyword');
					console.log('at line '+lineCount);
					break;
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
					currParseState = oldParseState
				lineCount++;
				if (getType(currParseState) == 'keyword'){
					
					if (currParseState == 'action'){
						actionCount++;
					} else if (currParseState == 'symbols'){
						symbolsCount++;
					} else if (currParseState == 'states'){
						statesCount++;
					} else if (currParseState == 'tape'){
						tapeCount++;
					} else if (currParseState == 'result'){
						resultCount++;
					} else if (currParseState == 'result1'){
						resultoneCount++;
					} else if (currParseState == 'checkoff'){
						checkoffCount++;
					} else {
						console.log(token + ' is not a keyword, no idea how you got here');
						console.log(' at line '+lineCount);
					}
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
					console.log('you ended a comment that you didn\'t start')
					console.log(' at line '+lineCount);
					break;
				}
			} else if (type == 'variable'){
				//if the token is a variable, it must correspond to an action
				
				if (parseState == 'action'){
					if(!parseDict[parseState+String(actionCount)]){
						parseDict[parseState+String(actionCount)] = {};	
						parseDict[parseState+String(actionCount)].args = [];	
						parseDict[parseState+String(actionCount)].lineNumber = lineCount;
					}	
					parseDict[parseState+String(actionCount)].args.push(token);
				} else if (parseState == 'symbols'){
					if(!parseDict[parseState+String(symbolsCount)]){
						parseDict[parseState+String(symbolsCount)] = {};
						parseDict[parseState+String(symbolsCount)].args = [];
						parseDict[parseState+String(symbolsCount)].lineNumber = lineCount;
					}
					parseDict[parseState+String(symbolsCount)].args.push(token);
				} else if (parseState == 'states'){
					if(!parseDict[parseState+String(statesCount)]){
						parseDict[parseState+String(statesCount)] = {};
						parseDict[parseState+String(statesCount)].args = [];
						parseDict[parseState+String(statesCount)].lineNumber = lineCount;
					}
					parseDict[parseState+String(statesCount)].args.push(token);
				} else if (parseState == 'tape'){
					if(!parseDict[parseState+String(tapeCount)]){
						parseDict[parseState+String(tapeCount)] = {};
						parseDict[parseState+String(tapeCount)].args = [];
						parseDict[parseState+String(tapeCount)].lineNumber = lineCount;
					}
					parseDict[parseState+String(tapeCount)].args.push(token);
				} else if (parseState == 'result'){
					if(!parseDict[parseState+String(resultCount)]){
						parseDict[parseState+String(resultCount)] = {};
						parseDict[parseState+String(resultCount)].args = [];
						parseDict[parseState+String(resultCount)].lineNumber = lineCount;
					}
					parseDict[parseState+String(resultCount)].args.push(token);
				} else if (parseState == 'result1'){
					if(!parseDict[parseState+String(resultoneCount)]){
						parseDict[parseState+String(resultoneCount)] = {};
						parseDict[parseState+String(resultoneCount)].args = [];
						parseDict[parseState+String(resultoneCount)].lineNumber = lineCount;
					}
					parseDict[parseState+String(resultoneCount)].args.push(token);
				} else if (parseState == 'checkoff'){
					if(!parseDict[parseState+String(checkoffCount)]){
						parseDict[parseState+String(checkoffCount)] = {};
						parseDict[parseState+String(checkoffCount)].args = [];
						parseDict[parseState+String(checkoffCount)].lineNumber = lineCount;
					}
					parseDict[parseState+String(checkoffCount)].args.push(token);
				} else if (parseState == 'line_comment' ){
					//console.log('continuing on line_comment ' + token);
					continue;
				} else if (parseState == 'multi_line_comment'){
					// console.log('continuing multi_line_comment ');
					continue;
				}
				else {
					console.log(token+' does not go here, we are looking for ' + parseState);
					console.log('at line '+lineCount);
					break;
				}
			} else if (type == 'keyword'){
				//we don't need newline here... but might as well
				if (getType(parseState) == 'keyword'){
					// console.log(parseState + ' on keyword')
					if (parseState == 'action'){
						actionCount++;
					} else if (parseState == 'symbols'){
						symbolsCount++;
					} else if (parseState == 'states'){
						statesCount++;
					} else if (parseState == 'tape'){
						tapeCount++;
					} else if (parseState == 'result'){
						resultCount++;
					} else if (parseState == 'result1'){
						resultoneCount++;	
					} else if (parseState == 'checkoff'){
						checkoffCount++;
					} else {
						console.log(parseState + ' is not a keyword, no idea how you got here');
						console.log(' at line '+lineCount);
					}
					parseState = token;
					continue;
				} else if (parseState == 'line_comment') {
					continue;
				} else if (parseState == 'multi_line_comment'){
					continue;
				}
			}
		}

		return parseDict;
		
	}
	function developMachine(dict){
		var keys = Object.keys(dict);
		console.log(keys);
		var sortedKeys=keys.sort(keyCompare);
		console.log(sortedKeys);

		var validSymbols=['-'];
		var validStates=['*halt*', '*error*'];
		var validMoves=['l', 'r', '-'];
		var actions=[];
		var tsmDict={};

		for (var i = 0; i < sortedKeys.length; i++){
			var key = sortedKeys[i];
			var args  = dict[key].args; //arguments coming after the list
			var lineNumber = dict[key].lineNumber
			if(stringContains(key, 'action')){
				// args must have an array of 5 objects
				if(args.length==5){
					var state = args[0];
					var read_symbol = args[1];
					var transition = new Object();
					transition.new_state = args[2];
					transition.write = args[3];
					transition.move = args[4];
					if(_.contains(validStates,state)
						&&_.contains(validStates, transition.new_state)
						&&_.contains(validSymbols, read_symbol)
						&&_.contains(validSymbols, transition.write)
						&&_.contains(validMoves, transition.move)){
						//'valid action');
						tsmDict[state].transition[read_symbol]=transition;
					} else {
						console.log(validStates);
						console.log(validSymbols);
						console.log(args);
						console.log(' does not have a valid argument (state or symbol not initialized)');
						console.log('at line '+ lineNumber);
							break;
					}
				} else {
					console.log(args);
					console.log('is not 5 characters, not a valid action');
					console.log('at line '+ lineNumber);
					break;
				}
			} else if (stringContains(key, 'symbols')) {
				for(var j = 0; j < args.length; j++){
					var symbol = args[j];
					validSymbols.push(symbol);
				}
				console.log(validSymbols);
				console.log('symbols have been initialized');
			} else if (stringContains(key, 'states')) {
				for(var j = 0; j < args.length; j++){
					var state = args[j];
					validStates.push(state);
					tsmDict[state]={};
					tsmDict[state].name = state;
					tsmDict[state].transition = {};
				}
				console.log(validStates)
				console.log('states has been instantiated');
			} else if (stringContains(key, 'tape')) {
				console.log('tape');
				
				var tapeName = args[0];
				var tapeContents = args.slice(1);
				list_of_tapes[tapeName]=initiateList(tapeContents, tapeName, lineNumber);
				list_of_tapes[tapeName].printLL();
			} else if (stringContains(key, 'result1')) {
				console.log('result1 at line ' +lineNumber);
				console.log(args);
				var tapeName = args[0];
				var tapeResult=  args[1];
				console.log(args);
				if (args[2]){
					console.log('your result1 at '+lineNumber+' can only have one argument');
					break;
				}
				list_of_results1[tapeName]=tapeResult;
			} else if (stringContains(key, 'result')) {
				console.log('result');
				
				var tapeName = args[0];
				var tapeContents = args.slice(1);
				list_of_results[tapeName]=initiateList(tapeContents, tapeName, lineNumber);
				list_of_tapes[tapeName].printLL();
			} else if (stringContains(key, 'checkoff')) {
				console.log('checkoff');
				console.log(args);
			} else {
				console.log(key+' is not a valid keyword');
				console.log('at line '+ lineNumber);
			}
		}
		tsm.setup(tsmDict);
		var results = '';
		for(key in list_of_tapes){
			results +=key+': ';
			var list = list_of_tapes[key];
			results +=String(list.toArray())+'\n';
			
			tsm.replaceTape(list);
			tsm.start();
			console.log(list.peek());
			results+='results: '+String(list.toArray())+'\n';
			if (list_of_results[key]){
				console.log(list_of_results[key]);
				results+='result: '+String(list.equals(list_of_results[key]))
			} else if (list_of_results1[key]){
				console.log(list_of_results1[key]);
				results+='result1: '+String(list.peek()==(list_of_results1[key]))
			}
			results+='\n\n';
		}
		console.log(list_of_tapes);
		console.log(list_of_results);
		console.log(list_of_results1);
		return results;
	}

	//HELPER FUNCTIONS
	function keyCompare(a,b){
		if(stringContains(b,'action'))
			return -1;
		else if(stringContains(a, 'action'))
			return 1;
		return -1;
	}
	function getType(token){
		
		if (token.match(/\/\//))
			return 'line_comment';
		else if (token.match(/\/\*/))
			return 'multi_comment_start';
		else if(token.match(/(action|symbols|states|tape|result|result1|checkoff)\b/))
			return 'keyword';
		else if (token.match(/\*\//))
			return 'multi_comment_end';
		else if (token.match(/\n/))
			return 'newline';
		else if (token.match(variableRegExp)||token.match(quotedRegExp))
			return 'variable';
		else{
			console.log(token+' is not a valid keyword');
			console.log(' at line '+lineCount);
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
					//then we haven;t selected one yet, good
					selectedIndex=j;
					tapeContents.push(token.slice(1, token.length-1));
					selected = true;
				} else {
					console.log('tape '+tapeName+' at '+lineNumber);
					console.log('you have 2 selected variables at the tape, you can only have one')
					break;
				}

			} else {
				tapeContents.push(token)
			}
		}
		return (new LinkedList()).init(tapeContents, selectedIndex);
	}

	return {parse:parse, developMachine:developMachine}
};

// var dict = TMSIM.parse('states A B C .  action  A   -      B  1 r\naction  A   1      C  1 l')
// console.log(dict);


function stringContains(string, value){
	return string.indexOf(value) > -1;
}

