var TMSIM = function(editor,container){
    //Default values, and external storage
    var TAPE_HEIGHT = 50;
    var DIV_HEIGHT = 50;
    var TAPE_WIDTH = 30;
    var TOTAL_HEIGHT =  300; 
    var ANIMATION_SPEED = 10;
    var old_speed = 300;

    var mContainer = $(container);
    
    //max of either the default tape width or the max length of the longest symbol
    

    // the tsm and tape that the simulator will display
    var mTSM;
    var mTAPE_WIDTH = TAPE_WIDTH;
    var mCurrentTape;
    var mTapeList;
    var mResultList ;
    var mResult1List ;
    //corresponding file name 
    var mFileName;
    var mFileContents;
    var mCheckoff;

    //for self calls
    var self = this;
    //variables of state and persistent storage. 
    var undoStack = [];
    var slider_speed = old_speed;
    var pauseSimulation = false;
    var simulation_done = false;
    var steps = 0;
    var preventAnimate = false;


    //readjusts the variable elements in the TSMSIM area to a new instance of tsm and tapes
    //or if you pass in no variables it resets the current simulation to default values. 
    this.restartTSM = function(file, container, tsm, testLists, checkoff){
        mFileName = file.name || mFileName;
        mFileContents = file.data;
        mContainer = $(container) || mContainer;
        mTSM = tsm || mTSM;
        mTapeList =  testLists.list_of_tapes ? testLists.list_of_tapes : mTapeList;
        mResultList = testLists.list_of_results ? testLists.list_of_results : mResultList;
        mResult1List = testLists.list_of_results1 ? testLists.list_of_results1 : mResult1List;
        mCheckoff = checkoff;

        mTAPE_WIDTH = (mTSM.longestSymbolLength * 10 > TAPE_WIDTH) ? mTSM.longestSymbolLength * 10 : TAPE_WIDTH;

        $('.machine_label'); //.css('width', 2*TAPE_WIDTH)
        pauseSimulation = true;
        mTSM.restart();
        self.initTapeButtons();
        self.toggleTape();
    };

    //will display the list of tapes to the pills in the botttom of display
    //takes in the holder of the buttons, optional it will use the default otherwise. 
    this.initTapeButtons = function(testRadioButtons){
        testRadioButtons = testRadioButtons || mContainer.find('.test_radio_buttons');
        testRadioButtons.html('<li style="margin-right:8px;padding-top:8px;">Select test:</li>');
        //console.log(testRadioButtons);
        //console.log(mTapeList);
        var first = true;
        //attach each test button to the nav-pills div
        var i = 0;
        for (var tapeName in mTapeList){
            //clone the tape as to not destroy the original
            var tape = mTapeList[tapeName].cloneTape();

            // create the radio button, count them by their id #tape+i
            var radioButton = $('<li>').addClass('test_radio')
                    .append('<a>'+tapeName+'</a>')
                    .attr('id', 'tape'+i)
                    .data('sanitized_name', tapeName.replace(/(\s|\/|\\)/g, '_'))
                    .data('tape-name', tapeName);
            // by default, the first tape is the one selected, and active
            if (first){
                radioButton.addClass('active');
                first = false;
                //and declare thhe first tape as shown.
                mCurrentTape = tape;
            }
            radioButton.on('click', function(e){
                // toggle tape of the div, uses the dom element data
                // to gather the name of the list. 
                self.toggleTape($(this));
            });

            testRadioButtons.append(radioButton);
            i++;
        }

        if (mCheckoff) {
            var checkoff_button = $('<li class="test_radio"><button title="Checkoff">Checkoff</button></li>');
            checkoff_button.find('button')
                .addClass('btn checkoff_button tape_button')
                .on('click', function(){
                    if(!$(this).hasClass('disabled')){
                        self.checkoff();
                    }
                });
            testRadioButtons.append(checkoff_button);
        }

    };


    this.initialise=function(){
        //console.log('initalise TMSIM');
        //make the radio buttons for the different tests
        var testRadioButtons = $('<ul>').addClass('test_radio_buttons pull-center nav nav-pills');

        // div to show the number of steps when playing/stepping
        var stepsDiv = $('<div>').addClass('steps_div').append('Steps: <span class="steps_count"></span>');

        //add the visual tape wrapper
        var tapeWrapper = $('<div>').addClass('tape_wrapper');
        tapeWrapper.css({
            height : DIV_HEIGHT,
            overflow : 'hidden',
            'background-color' : 'lightblue'
        });
        //this div will hold all the segments and move along with the segments
        var tapeDiv = $('<div>').addClass('tape_div');
        tapeDiv.css({
            position : 'relative',
            height : DIV_HEIGHT
        });
        tapeWrapper.append(tapeDiv);

        //make the state machine indicator, could be more elegant...
        var machineDiv = $('<div>').addClass('pull-center machine_div').css({
            'position':'relative',
            top:-10
        });
        machineDiv.append($('<div>').addClass('arrow-up'));
        //label will have spot for current state and direction
        var labelDiv = $('<div>').addClass('machine_label')
                .css({
                    //height:DIV_HEIGHT,
                    //width:2*mTAPE_WIDTH,
                    //border:'solid 1px black',
                    //background:'lightblue', 
                })
                .html('State: <span class = "curr_state"></span>'); //<br/><span class = "move_dir"></>');
        machineDiv.append(labelDiv);
        //transition div, shows the previous and current transition
        /*
         var transitionsDiv = $('<div>').addClass('transitions');
         var transitionDiv = $('<div>').addClass('transition_div').html(
         '( <span class = "curr_state"></span>, \
         <span class = "read_symbol"></span> ) &rarr;\
         ( <span class = "new_state"></span>,  \
         <span class = "write_symbol"></span>,  \
         <span class = "move_dir"></span> )'
         );
         var oldTransitionDiv = $('<div>').addClass('old_transition_div muted').html(
         '( <span class = "old_curr_state"></span>, \
         <span class = "old_read_symbol"></span> ) &rarr;\
         ( <span class = "old_new_state"></span>,  \
         <span class = "old_write_symbol"></span>,  \
         <span class = "old_move_dir"></span> )'
         );
         transitionsDiv.append(transitionDiv, oldTransitionDiv);
         machineDiv.append(transitionsDiv);
         */

        //appending control buttons
        var actionDiv = $('<div>').addClass('pull-center btn-toolbar action_button_div');
        var actionButtonDiv = $('<div>').addClass('btn-group');
        
        var playButton = $('<button>').addClass('btn play_button tape_button')
                .attr('title', 'Run')
                .append('<i class = "icon-play">');
        var pauseButton = $('<button>').addClass('btn pause_button tape_button')
                .attr('title', 'Pause')
                .append('<i class = "icon-pause">');
        var stepButton = $('<button>').addClass('btn step_button tape_button')
                .attr('title', 'Step Forward')
                .append('<i class = "icon-step-forward">');
        var prevStepButton = $('<button>').addClass('btn prev_step_button tape_button')
                .attr('title', 'Step Backward')
                .append('<i class = "icon-step-backward">');
        var resetButton = $('<button>').addClass('btn reset_button tape_button')
                .attr('title', 'Reset')
                .append('<i class = "icon-fast-backward">');
        
        $('.tape_button').each(function(i, button){
            $(button).attr({
                'data-toggle':"tooltip",
                'data-trigger':'hover',
                'data-container':'body'
            });
        });
        var lastClick = (new Date()).getTime();
        var tempSpeed = slider_speed;
        stepButton.on('click', function(){
            //console.log('step forward');
            if(!$(this).hasClass('disabled')){
                //fastclicking on the step button will ignore animation. 
                // but still step thruogh the machine
                var d = new Date();
                var t = d.getTime();
                if(t - lastClick < 1000) {
                    //console.log(t-lastClick);
                    mContainer.find('.tape_div').finish();
                    //mContainer.find('.transition_div').finish();
                    preventAnimate = true;
                } else {
                    preventAnimate = false;
                }
                lastClick = t;
                stepButton.addClass('disabled');
                self.listToTape();
                self.stepAction(function(arg){
                    self.listToTape();
                    stepButton.removeClass('disabled');
                });
            }
        });
        prevStepButton.on('click', function(){
            if(!$(this).hasClass('disabled')){
                var undoAction = undoStack.pop();
                mTSM.setCurrentState(undoAction.stepObject.old_state.name);
                mCurrentTape = undoAction.tape;
                var peekStepObject = mTSM.stepPeek(mCurrentTape);
                //console.log(peekStepObject);
                updateGUI(peekStepObject, mCurrentTape.peek());
                self.listToTape();
                if(undoStack.length === 0)
                    $(this).addClass('disabled');
            }       
        });
        playButton.on('click', function(){
            if(!$(this).hasClass('disabled')){
                playButton.addClass('disabled');
                stepButton.addClass('disabled');
                prevStepButton.addClass('disabled');
                self.play(function(){
                    //console.log('play callback');
                });
            }
        });
        resetButton.on('click', function(){
            if(!$(this).hasClass('disabled')){
                self.pause();
                playButton.removeClass('disabled');
                stepButton.removeClass('disabled');
                pauseButton.removeClass('disabled');
                prevStepButton.removeClass('disabled');
                self.toggleTape();
            }
        });
        pauseButton.on('click', function(){
            if(!$(this).hasClass('disabled')){
                self.pause();
                playButton.removeClass('disabled');
                stepButton.removeClass('disabled');
                prevStepButton.removeClass('disabled');
            }
        });

        var nextButton = $('<button>').addClass('btn btn-warning next_button tape_button')
                .attr('title', 'Next Tape')
                .append('<i class = "icon-arrow-right">')
                .css('visibility', 'hidden');

        nextButton.on('click', function(){
            if(!$(this).hasClass('disabled')){
                var nextTape = mContainer.find('.test_radio_buttons .active').attr('id');
                //console.log(nextTape);
                var nextNum = parseInt(nextTape.slice(4)) +1;
                if(mContainer.find('.test_radio_buttons #tape'+nextNum).length > 0)
                    self.toggleTape(mContainer.find('.test_radio_buttons #tape'+nextNum));
                else {
                    //console.log('no next tape');
                }
            }
        });

        //speed radio button indicators
        var speedDiv = $('<div><label class="radio inline">Run speed:</label></div>').addClass('speed_div');
        var label1 = $('<label>').addClass('speed_options radio inline radio-inline').append('Slow');
        var label2 = $('<label>').addClass('speed_options radio inline radio-inline').append('Medium');
        var label3 = $('<label>').addClass('speed_options radio inline radio-inline').append('Fast');
        var label4 = $('<label>').addClass('speed_options radio inline radio-inline').append('Instant');
        var radio1 = $('<input>').attr({
            type : 'radio',
            id : 'inlineRadio1',
            value : '300',
            name : 'speed_options'
        }).addClass('speed_options');
        var radio2 = $('<input>').attr({
            type : 'radio',
            id : 'inlineRadio2',
            value : '100',
            name : 'speed_options'
        }).addClass('speed_options');
        var radio3 = $('<input>').attr({
            type : 'radio',
            id : 'inlineRadio3',
            value : '0',
            name : 'speed_options'
        }).addClass('speed_options');
        var radio4 = $('<input>').attr({
            type : 'radio',
            id : 'inlineRadio4',
            value : '-100000',
            name : 'speed_options'
        }).addClass('speed_options');
        switch(old_speed){
        case 300 : radio1.attr('checked', ''); break;
        case 100 : radio2.attr('checked', ''); break;
        case 0 : radio3.attr('checked', ''); break;
        case -100000 : radio4.attr('checked', ''); break;
        default : radio1.attr('checked', '');
        }
        label1.append(radio1);
        label2.append(radio2);
        label3.append(radio3);
        label4.append(radio4);
        speedDiv.append(label1);
        speedDiv.append(label2);
        speedDiv.append(label3);
        speedDiv.append(label4);
        //update the speed when a radio button is clicked
        speedDiv.on('click', function (e) {
            //console.log('radio click');
            var speed = $('.speed_options:checked').attr('value');
            slider_speed = parseInt(speed);
            if(slider_speed <= 0)
                preventAnimate = true;
            else
                preventAnimate = false;
            old_speed = slider_speed;
        });

        actionButtonDiv.append(resetButton, prevStepButton, playButton, pauseButton, stepButton);
        actionDiv.append(actionButtonDiv, nextButton, speedDiv);

        /*
         var feedbackDiv = $('<div>').addClass('feedback_div').css({
         'position' : 'relative',
         'margin' : '5px',
         })
         var legendDiv = $('<div>').addClass('legend_div').css({
         'position' : 'absolute',
         'right': 0,
         'margin' : '5px',
         'font-family' : 'sans-serif',
         'font-size' : 'smaller',
         })
         var greenDiv = $('<div>').append('<span class = "curr_state">RED</span> marks the current state');
         var redDiv = $('<div>').append('<span class = "read_symbol">GREEN</span> marks the current read symbol');
         var blueDiv = $('<div>').append('<span class = "current_write">BLUE</span> marks the previous written symbol');
         legendDiv.append(greenDiv, redDiv, blueDiv)
         */

        mContainer.append(actionDiv, tapeWrapper, stepsDiv, machineDiv, testRadioButtons);
        
    };
    var oldHighlightObject;
    function markLine(lineNumber){
        if(oldHighlightObject)
            oldHighlightObject.clear();
        oldHighlightObject = editor.addLineClass(mFileName, lineNumber, 'highlight-line');
        editor.showLine(mFileName, lineNumber+1);  // make sure we can see it!
    }
    function updateGUI(stepObject, readObject){
        //mContainer.find('.transition_div .curr_state').text(stepObject.old_state.name);
        //mContainer.find('.transition_div .read_symbol').text(readObject);
        //mContainer.find('.transition_div .new_state').text(stepObject.transition.new_state);
        //mContainer.find('.transition_div .write_symbol').text(stepObject.transition.write).removeClass('current_write');
        //mContainer.find('.transition_div .move_dir').text(stepObject.transition.move);
        //mContainer.find('.machine_label .move_dir').text(stepObject.transition.move);
    }

    function mark_state() {
        try{
            if(!(mTSM.getCurrentState() === '*halt*' || mTSM.getCurrentState() === '*error*')){
                var nextStepObject = mTSM.stepPeek(mCurrentTape);
                var next_state_transition = nextStepObject.transition;
                markLine( next_state_transition.lineNumber - 1 );
            }
        } catch (e) {
        }
    }

    this.stepAction = function(callbackParam){
        var callback = callbackParam || _.identity;
        try{
            var readObject = mCurrentTape.peek();
            var stepObject = mTSM.step(mCurrentTape);
            var undoAction = {};
            undoAction.stepObject = stepObject;
            undoAction.tape = mCurrentTape.cloneTape();
            undoStack.push(undoAction);
            $('.prev_step_button').removeClass('disabled');
            var state_transition = stepObject.transition;
            mCurrentTape.traverse(state_transition.write, state_transition.move);
            
            steps++;
            
            updateGUI(stepObject, readObject);
            
            mContainer.find('.tape_div .current_segment').text(stepObject.transition.write).addClass('current_write');
            mContainer.find('.tape_div .prev_segment').removeClass('prev_segment');
            mContainer.find('.tape_div .read_segment').removeClass('read_segment');
            mContainer.find('.tape_div .current_segment').addClass('current_write');

            function updateTransitionDiv(){
                mContainer.find('.curr_state').text(stepObject.transition.new_state);
                if (slider_speed >= 0 && !preventAnimate) {
                    mark_state();
                    $('.steps_count').text(steps);
                }

                if(stepObject.transition.new_state === '*halt*'){
                    //console.log('halt');
                    halt(_.identity);
                }
                self.listToTape();
                callback(stepObject.new_state);     
            }

            //timeout needed for pause button to interrupt, i don't know why though.
            setTimeout(function(){
                self.animateTape(stepObject.transition.move, function(){
                    updateTransitionDiv();
                });
            }, slider_speed*2);
        } catch (e) {
            $('.feedback_div').html('state '+ mTSM.getCurrentState().name + ' has no action for symbol ' + mCurrentTape.peek());
        }
    };

    this.checkoff = function(){
        var count = 0;
        var checksum = 0;
        var save_slider_speed = slider_speed;
        slider_speed = -100000;

        nextTest();

        // The checkoffs use the result of this non-standard hash function.
        // It's the Java String.hashCode function.
        function checkoffHashCode(str) {
            var ret = 0;
            var len = str.length;
            for(var i = 0; i < len; i++) {
                ret = (31 * ret + str.charCodeAt(i)) << 0;
            }
            return ret + 2536038;
        };

        function complete_checkoff(old) {
            //var username = old.inputContent(0);
            //var password = old.inputContent(1);
            var collaborators = old.inputContent(0);
            old.dismiss();

            var url = mCheckoff.server.substring(1,mCheckoff.server.length - 1);
            var checksum = mCheckoff.checksum;
            var assignment = mCheckoff.assignment.substring(1,mCheckoff.assignment.length - 1);
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
            
            var args = {
                _requester: sessionStorage.getItem('user') || '???',
                checkoff:assignment,
                collaboration: collaborators,
                checksum: checksum,
                size: mTSM.nStates(),  // number of states
                version: 'TMSIM2.0.1',
                circuits: '============== source: ' + mFileName + '\n' + mFileContents + '\n==============\n'
            };

            $.post(url, args).done(function(data) {
                callback(true, data);
            }).fail(function() {
                callback(false);
            });
        }

        function nextTest(){
            var tapeButton = $('#tape'+count);
            if(count < Object.keys(mTapeList).length){
                self.toggleTape(tapeButton);

                // add the initial tape config and expected result to hash
                var name = mCurrentTape.name;
                var result = mResultList[name] ? mResultList[name] : mResult1List[name];
                checksum = (checksum + checkoffHashCode(mCurrentTape.toString())) << 0;
                if (result) checksum = (checksum + 31 * checkoffHashCode(result)) << 0;

                self.play(function(passed){
                    count++;
                    if(passed){
                        // on to next test
                        setTimeout(function(){ nextTest(); }, 0);
                    }
                    else {
                        // just stop on failing test
                        slider_speed = save_slider_speed;
                    }
                });
            } else {
                slider_speed = save_slider_speed;
                // all tests passed complete checkoff
                if (mCheckoff.checksum != checksum) {
                    var failedModal = new ModalDialog();
                    var msg = "<font size=5>Verification error...</font><p><p>It appears that the checkoff information has been modified in some way.  Please verify that you are using the official checkoff tests; contact the course staff if you can't resolve the problem.<p>"+checksum;
                    failedModal.setTitle("Checkoff Failed!");
                    failedModal.setContent("<div class='text-error'>"+msg+"</div>");
                    failedModal.addButton("Dismiss",'dismiss');
                    failedModal.show();
                } else {
                    var dialog = new ModalDialog();
                    dialog.setTitle("Submit Lab");
                    //dialog.inputBox({label: "Username", callback: complete_checkoff});
                    //dialog.inputBox({label: "Password", type: 'password', callback: complete_checkoff});
                    dialog.inputBox({label: "Collaborators", callback: complete_checkoff});
                    dialog.addButton("Dismiss", "dismiss");
                    dialog.addButton("Submit", function(){complete_checkoff(dialog)}, 'btn-primary');
                    dialog.show();
                }
            }
        }
    };

    //callback executed when test is halted
    this.play = function(callback){

        pauseSimulation = false;
        var new_state = mTSM.getCurrentState();
        nextStep(new_state.name);
        function nextStep(new_state_name){
            if(pauseSimulation){
                //console.log('pauseSimulationed');
            }
            else if(new_state_name != '*halt*' && new_state_name != '*error*'){
                if(slider_speed >= 0){
                    setTimeout(function(){
                        self.stepAction(nextStep);
                    }, slider_speed);
                } else {
                    var i = -slider_speed;
                    while( i > 0){
                        try{
                            var stepObject = mTSM.step(mCurrentTape);
                            var state_transition = stepObject.transition;
                            mCurrentTape.traverse(state_transition.write, state_transition.move);
                            steps++;
                            
                            if(stepObject.transition.new_state == '*halt*' || stepObject.transition.new_state == '*error*'){
                                //console.log('return '+ stepObject.transition.new_state);
                                halt(callback);
                                self.listToTape();
                                simulation_done = true;
                                break;
                            }
                            i--;
                        } catch (e) {
                            //console.log(e.stack);
                            //$('.feedback_div').html(e.stack);
                        }
                    }
                    if(!simulation_done) {  
                        self.stepAction(nextStep);
                    }
                }
            }
            else {
                //console.log('return '+new_state_name);
                halt(callback);
                self.listToTape();
                simulation_done = true;
            }
            
        }   
    };

    this.pause = function(){
        //console.log('pause');
        pauseSimulation = true;
    };
    function halt(callback){
        mContainer.find('.play_button').addClass('disabled');
        mContainer.find('.step_button').addClass('disabled');
        mContainer.find('.pause_button').addClass('disabled');
        $('.steps_count').text(steps);
        if(mCurrentTape){
            self.listToTape();
            
            var name = mCurrentTape.name;
            var result = mResultList[name] ? mResultList[name] : mResult1List[name];
            
            if(result){
                //console.log(result);
                var feedback  = '';
                var color = '';
                var passedTest = false;
                if(result instanceof TapeList){
                    passedTest = result.equals(mCurrentTape);
                }
                else{
                    passedTest = result === mCurrentTape.peek();
                }
                //console.log(passedTest);
                //console.log(result.toString());
                //console.log(mCurrentTape.toString());
                feedback = passedTest ? 'pass' : "fail, expected '"+result+"'";
                color = passedTest ? 'green' : 'red';
                /*mContainer.find*/$('.feedback_div').text("Results for tape '"+name+"': "+feedback).css('color', color);
                var testNumber = parseInt(mContainer.find('.test_radio_buttons .active').attr('id').slice(4));
                //check if there is another test after this one, if so, then show the next button
                //shows only if it passes
                if(passedTest && mContainer.find('.test_radio_buttons #tape' + (testNumber+ 1)).length > 0)
                    mContainer.find('.next_button').css('visibility', 'visible');
                callback(passedTest);
            }
        }

    }
    
    this.toggleTape = function(tapeButton){
        tapeButton = tapeButton||$('.test_radio_buttons .active');
        var name = tapeButton.data('tape-name');
        mCurrentTape = mTapeList[name].cloneTape();
        mTSM.restart();
        pauseSimulation = true;
        simulation_done = false;
        steps = 0;
        $('.steps_count').text(steps);
        undoStack = [];
        //console.log('toggle tape ' + mCurrentTape.toString());
        self.listToTape();
        mContainer.find('.test_radio_buttons .active').toggleClass('active');
        tapeButton.toggleClass('active');
        mContainer.find('.curr_state').text(mTSM.getCurrentState().name);
        mark_state();

        mContainer.find('.next_button').css('visibility', 'hidden');
        $('.tape_button').removeClass('disabled');
        $('.feedback_div').html('');
    };
    var currentNumberOfSegments = 0;

    function initTape(){
        //console.log('initTape');
        var tapeDiv = $('.tape_div');
        tapeDiv.html('');
        tapeDiv.css('left',0);
        var numberOfSegments = Math.floor(mContainer.width()/mTAPE_WIDTH) + 6; //3 segment on ech side for backup
        currentNumberOfSegments = numberOfSegments;
        for (var i = -Math.floor(numberOfSegments/2); i < Math.floor(numberOfSegments/2); i++){
            var leftPos = (mContainer.width() - mTAPE_WIDTH)/2 + (i)*mTAPE_WIDTH;
            var tape_segment = $('<div>').addClass('tape_segment')
                    .css({
                        'left' : leftPos,
                        'width' : mTAPE_WIDTH - 2,
                        'height' : TAPE_HEIGHT - 4
                    });
            tapeDiv.append(tape_segment);
        }

    }
    this.listToTape = function(tapeList){
        var tapeDiv = $('.tape_div');
        var tape = tapeList || mCurrentTape;
        if(!tape)
            return;
        // tapeDiv.html('');
        tapeDiv.css('left', 0);
        
        var listToArray = tape.toArray(); 
        var currentIndex = listToArray.currentIndex;
        var previousIndex = listToArray.previousIndex;
        var array = listToArray.array;

        var numberOfSegments = Math.floor(mContainer.width() / mTAPE_WIDTH) + 6; //3 segment on ech side for backup
        if(numberOfSegments !== currentNumberOfSegments)
            initTape();
        var startIndex = currentIndex - Math.floor((numberOfSegments / 2));
        var endIndex = currentIndex + Math.floor((numberOfSegments / 2));

        for (var i = startIndex, k = 0; i < endIndex; i++, k++){
            var leftPos = (mContainer.width() - mTAPE_WIDTH) / 2 + (i - currentIndex) * mTAPE_WIDTH;
            var tape_segment = $('.tape_segment').eq(k);
            if(i < 0 || i >= array.length){
                tape_segment.text('-');
            } else if(i < array.length) {
                //in tape, so we can add the tape_segment data
                tape_segment.text(array[i]);
                tape_segment.removeClass('read_segment write_segment prev_segment current_segment current_write');
                if(i == currentIndex)
                    tape_segment.addClass('current_segment read_segment');
                else if (i == previousIndex)
                    tape_segment.addClass('prev_segment');
                else if(i - 1 == currentIndex )
                    tape_segment.addClass('right_segment');
                else if(i + 1 == currentIndex )
                    tape_segment.addClass('left_segment');
                
            }
        }
    };
    this.animateTape = function(dir, callback){
        var tapeDiv = mContainer.find('.tape_div');
        var currentPos = tapeDiv.css('left');
        var moveDir = 0;
        if(dir === 'r')
            moveDir = mTAPE_WIDTH;
        else if (dir === 'l')
            moveDir = -mTAPE_WIDTH;
        else
            moveDir = 0;
        if(slider_speed >= 0 && !preventAnimate){
            tapeDiv.animate({
                left: parseInt(currentPos)+moveDir
            }, slider_speed,  function(){
                $('.current_segment').addClass('prev_segment');
                callback();
            });
        }
        else {
            callback();
        }
    };

    // this.toggleTape = toggleTape;

    self.initialise();
};
