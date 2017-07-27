BSim = {};

$(function() {
    //////////////////////////////////////////////////    
    //  HTML for BSim UI (editor and simulator panes)
    //////////////////////////////////////////////////    

    var body = '\
    <div class="xblock-6004" style="width: 100%; height: 99%; margin:5px;">\
      <div class="masthead">\
        <ul class="pull-left nav nav-pills split-controls">\
          <li class="active" id="maximise_editor"><a>Editor</a></li>\
          <li id="split_pane"><a>Split</a></li>\
          <li id="maximise_simulation"><a>Simulation</a></li>\
        </ul>\
        <div id="header-alert-holder"></div>\
        <ul class="pull-right nav nav-pills global-controls"></ul>\
      </div>\
      <div id="split-container">\
        <div id="filetree"></div>\
        <div id="editor-pane">\
          <div id="editor"></div>\
        </div>\
        <div id="simulation-pane">\
          <div id="programmer-view">\
            <div class="program-controls"></div>\
            <div class="content">\
              Registers <span class="segmentation">[<span class="segreg">base:</span> <span class="segreg base">xxx</span>, <span class="segreg">bounds:</span> <span class="segreg bounds">yyy</span>]</span>\
              <div class="regfile"></div>\
              Disassembly [cycle: <span id="cycle_count">0</span>]\
              <div class="disassembly"></div>\
              <div class="memory-holder">\
                Memory\
                <div class="memory" data-height="398"></div>\
                <div class="memory-key">\
                  <ul>\
                    <li><span class="read"></span> Recent reads</li>\
                  </ul>\
                </div>\
              </div>\
              <div class="stack-holder">\
                Stack\
                <div class="stack" data-height="398"></div>\
                <div class="memory-key">\
                  <ul>\
                    <li><span class="write"></span> Recent writes</li>\
                  </ul>\
                </div>\
              </div>\
              Console\
              <div class="tty"></div>\
              <div id="checkoff-failure"></div>\
            </div>\
          </div>\
          <div id="schematic-view" style="display: none;">\
            <div class="program-controls"></div>\
            <div style="position: relative" id="schematic-holder">\
              <svg height="600" width="940" class="schematic">\
                <g class="mux pcsel permanent" transform="translate(10, 25)">\
                  <g class="mux-selector">\
                    <text style="text-anchor: end;" x="50" y="11">PCSEL=<tspan id="pcsel-value">3</tspan></text>\
                    <polyline points="50,7 60,7" />\
                    <polyline points="53,3 60,7 53,11" />\
                  </g>\
                  <polygon points="60,0 180,0 175,15 65,15" />\
                </g>\
                <g class="pcsel4 path" transform="translate(15)">\
                  <text x="65" y="10" class="path-target">8</text>\
                  <polyline points="65,10 65,25" />\
                  <polyline points="61,18 65,25 69,18" />\
                  <text x="65" y="37" class="path-target">4</text>\
                </g>\
                <g class="pcsel3 path" transform="translate(40)">\
                  <text x="65" y="10" class="path-target">4</text>\
                  <polyline points="65,10 65,25" />\
                  <polyline points="61,18 65,25 69,18" />\
                  <text x="65" y="37" class="path-target">3</text>\
                </g>\
                <g class="pcsel2 path" transform="translate(65)">\
                  <text x="65" y="10" class="path-target">JT</text>\
                  <polyline points="65,10 65,25" />\
                  <polyline points="61,18 65,25 69,18" />\
                  <text x="65" y="37" class="path-target">2</text>\
                </g>\
                <g class="pcsel1 path" transform="translate(90)">\
                  <polyline points="140,86 140,1 65,1 65,25" />\
                  <polyline points="140,91 140,148" />\
                  <polyline points="140,152 140,195" />\
                  <polyline points="61,18 65,25 69,18" />\
                  <text x="65" y="37" class="path-target">1</text>\
                </g>\
                <g class="pcsel0 path" transform="translate(115)">\
                  <polyline points="100,86 100,10 65,10 65,25" />\
                  <polyline points="100,91, 100,150" />\
                  <polyline points="61,18 65,25 69,18" />\
                  <text x="65" y="37" class="path-target">0</text>\
                </g>\
                <g class="pc permanent" transform="translate(90, 40)">\
                  <polyline points="45,0 45,15" />\
                  <polyline points="41,8 45,15 49,8" />\
                  <rect x="-5" y="15" width="100" height="20" class="border" />\
                  <foreignObject x="-5" y="15" width="100" height="20">\
                    <p style="text-align: center;"><span class="pc-label">PC:</span><span class="pc-value">00000000</span></p>\
                  </foreignObject>\
                  <text x="50" y="12" class="path-value pcsel-out-value">80000010</text>\
                </g>\
                <g class="instructions permanent" transform="translate(135,55)">\
                  <!-- HTML is absolutely positioned over this. -->\
                  <polyline points="0,33 115,33" />\
                  <polyline points="108,29 115,33 108,37" />\
                  <rect x="115" y="0" height="66" width="320" class="border" />\
                  <polyline points="235,66 235,86" />\
                  <text x="238" y="80" class="path-value instruction-value">73FF0003</text>\
                  <polyline points="235,86 435,86 445,96 445,133" />\
                  <polyline points="441,126 445,133 449,126" />\
                  <text x="435" y="100" style="text-anchor: end;">RA:[20:16]</text>\
                  <text x="450" y="133" style="text-anchor: start;" class="path-value raa-value">1F</text>\
                </g>\
                <g class="path asel1 pcsel1 bsel1 wasel0" transform="translate(135,55)">\
                  <polyline points="235,86 235,140" />\
                </g>\
                <g class="path asel1 bsel1 wasel0" transform="translate(135,55)">\
                  <polyline points="235,140 235,150" />\
                </g>\
                <g class="mux ra2sel1 ra2sel0 ra2sel" transform="translate(710, 160)">\
                  <g class="mux-selector">\
                    <text style="text-anchor: end;" x="0" y="11">RA2SEL=<tspan id="ra2sel-value">-</tspan></text>\
                    <polyline points="0,7 10,7" />\
                    <polyline points="4,3 10,7 4,11" />\
                  </g>\
                  <polygon points="10,0 70,0 65,15 15,15" />\
                  <polyline points="40,15 40,30" />\
                  <polyline points="36,23 40,30 44,23" />\
                  <text x="45" y="28" class="path-value rab-value" style="text-anchor: start;">1F</text>\
                </g>\
                <g class="path ra2sel0" transform="translate(570,141)">\
                  <text x="150" y="12" style="text-anchor: end;">RB:[15:11]</text>\
                  <polyline points="150,0 160,10 160,17" />\
                  <polyline points="156,10 160,17 164,10" />\
                  <text x="160" y="31">0</text>\
                </g>\
                <g class="path ra2sel1" transform="translate(570,141)">\
                  <text x="204" y="12" style="text-anchor: start;">RC:[25:21]</text>\
                  <polyline points="150,0 190,0 200,10 200,17" />\
                  <polyline points="196,10 200,17 204,10" />\
                  <text x="200" y="31">1</text>\
                </g>\
                <g class="path ra2sel0 ra2sel1" transform="translate(570,141)">\
                  <polyline points="0,0 150,0" />\
                </g>\
                <g class="mux wasel werf1" transform="translate(435,200)">\
                  <polygon points="0,0 20,10 20,50 0,60" />\
                  <g class="mux-selector">\
                    <text x="10" y="77" style="text-anchor: middle;">WASEL=<tspan id="wasel-value">1</tspan></text>\
                    <polyline points="10,56 10,66" />\
                    <polyline points="6,63 10,56 14,63" />\
                  </g>\
                  <polyline points="20,30 45,30" />\
                  <polyline points="37,26 45,30 37,34" />\
                  <text x="21" y="28" class="path-value raw-value">1F</text>\
                </g>\
                <g class="path wasel0" transform="translate(370,205)">\
                  <polyline points="0,0 10,10 65,10" />\
                  <polyline points="58,6 65,10 58,14" />\
                  <text x="8" y="6" style="text-anchor: start;">[25:21]</text>\
                  <text x="72" y="15">0</text>\
                </g>\
                <g class="path wasel1" transform="translate(410,237)">\
                  <text x="15" y="12" style="text-anchor: end;">XP</text>\
                  <polyline points="15,8 25,8" />\
                  <polyline points="18,4 25,8 18,12" />\
                  <text x="32" y="12">1</text>\
                </g>\
                <g class="address-adder asel1 pcsel1 process" transform="translate(250, 150)">\
                  <polyline points="-35,0 55,0 55,37 36,37" />\
                  <polyline points="43,33 36,37 43,41" />\
                  <polyline points="-21,45 0,45" />\
                  <polyline points="36,54 110,54 120,44" />\
                  <polyline points="43,50 36,54 43,58" />\
                  <text x="80" y="50">[15:0]*4</text>\
                  <rect x="0" y="30" width="36" height="30" />\
                  <text x="18" y="51" class="process-label">+</text>\
                  <text class="path-value address-adder-value" x="-25" y="48" style="text-anchor: end;">hello</text>\
                </g>\
                <g class="plus4 process permanent" transform="translate(117, 75)">\
                  <polyline class="permanent" points="18,0 18,30" />\
                  <polyline class="permanent" points="14,23 18,30 22,23" />\
                  <rect x="0" y="30" width="36" height="30" />\
                  <text x="18" y="51" class="process-label">+4</text>\
                  <text x="23" y="73" class="path-value pc-plus4-value">80000004</text>\
                </g>\
                <g class="path pcsel0 pcsel1 asel1 wdsel0" transform="translate(135,150)">\
                  <polyline points="0,-14 0,0" />\
                </g>\
                <g class="path pcsel0 pcsel1 asel1" transform="translate(135,150)">\
                  <polyline points="0,0 80,0" />\
                </g>\
                <g class="mux wdsel werf1" transform="translate(585,561)">\
                  <g class="mux-selector">\
                    <text style="text-anchor: end;" x="0" y="11">WDSEL=<tspan id="wdsel-value">0</tspan></text>\
                    <polyline points="0,7 10,7" />\
                    <polyline points="4,3 10,7 4,11" />\
                  </g>\
                  <polygon points="10,0 90,0 85,15 15,15" />\
                </g>\
                <g class="wdsel0 path" transform="translate(135,235)">\
                  <polyline points="0,-86 0,310 470,310 470,325" />\
                  <polyline points="466,318 470,325 474,318" />\
                  <text x="468" y="306" class="path-value pc-plus4-value" style="text-anchor: end;">80000004</text>\
                  <text x="470" y="338" class="path-target">0</text>\
                </g>\
                <g class="regfile permanent" transform="translate(481,190)">\
                  <rect x="0" y="0" width="358" height="178" />\
                  <foreignObject x="0" y="0" width="358" height="178">\
                    <div class="regfile"></div>\
                  </foreignObject>\
                  <!-- WERF input -->\
                  <g class="mux-selector">\
                    <polyline points="359,100 370,100" />\
                    <polyline points="366,96 359,100 366,104" />\
                    <text x="371" y="104" style="text-anchor: start;">WERF=<tspan id="werf-value">1</tspan></text>\
                  </g>\
                </g>\
                <g class="alu wdsel1 wdsel2 wr1" transform="translate(545,480)">\
                  <polygon points="0,0 80,0 90,10 100,0 180,0 160,30 20,30" />\
                  <text x="90" y="25">ALU</text>\
                  <text x="85" y="42" class="path-value alu-out-value" style="text-anchor: end;">hello</text>\
                  <polyline points="90,30 90,40" />\
                  <g class="mux-selector">\
                    <text x="7" y="20" style="text-anchor: end;">ALUFN="<tspan id="alufn-value"></tspan>"</text>\
                  </g>\
                </g>\
                <!-- Regfile output B -->\
                <g class="mux wdsel1 wdsel2 wr1 bsel" transform="translate(685, 430)">\
                  <g class="mux-selector">\
                    <text style="text-anchor: end;" x="0" y="11">BSEL=<tspan id="bsel-value">1</tspan></text>\
                    <polyline points="0,7 10,7" />\
                    <polyline points="4,3 10,7 4,11" />\
                  </g>\
                  <polygon points="10,0 70,0 65,15 15,15" />\
                  <polyline points="40,15 40,30 0,30 0,50" />\
                  <polyline points="-4,43 0,50 4,43" />\
                  <text x="5" y="47" class="path-value alub-value" style="text-anchor: start;">hello</text>\
                  <text x="0" y="62">B</text>\
                </g>\
                <g class="path bsel1" transform="translate(135,55)">\
                  <polyline points="235,150 235,352 442,352" />\
                  <polyline points="448,352 570,352 570,374" />\
                  <polyline points="566,367 570,374 574,367" />\
                  <text x="570" y="387">1</text>\
                  <text x="565" y="347" class="path-value bsel1-value" style="text-anchor: end;">hello</text>\
                  <text x="240" y="348" style="text-anchor: start;">C:[15:0]</text>\
                </g>\
                <g class="path bsel0 wr1" transform="translate(745, 369)">\
                  <polyline points="0,0 0,38" />\
                  <text class="path-value rdb-value" x="2" y="12" style="text-anchor: start;">hello</text>\
                </g>\
                <g class="path bsel0" transform="translate(745, 369)">\
                  <polyline points="0,38 0,60" />\
                  <polyline points="-4,53 0,60 4,53" />\
                  <text x="0" y="73">0</text>\
                </g>\
                <g class="path wr1" transform="translate(745, 369)">\
                  <polyline points="0,38 90,38 90,90" />\
                  <polyline points="86,83 90,90 94,83" />\
                  <text x="85" y="88" style="text-anchor: end;">MWD</text>\
                </g>\
                <!-- Regfile output A -->\
                <g class="mux wdsel1 wdsel2 wr1 asel" transform="translate(520, 430)">\
                  <g class="mux-selector">\
                    <text style="text-anchor: end;" x="0" y="11">ASEL=<tspan id="asel-value">0</tspan></text>\
                    <polyline points="0,7 10,7" />\
                    <polyline points="4,3 10,7 4,11" />\
                  </g>\
                  <polygon points="10,0 70,0 65,15 15,15" />\
                  <polyline points="40,15 40,30 65,30 65,50" />\
                  <polyline points="61,43 65,50 69,43" />\
                  <text x="60" y="47" class="path-value alua-value" style="text-anchor: end;">hello</text>\
                  <text x="65" y="62">A</text>\
                </g>\
                <g class="path pcsel2 z asel0" transform="translate(580, 369)">\
                  <polyline points="0,0 0,8" />\
                  <text class="path-value rda-value" x="2" y="12" style="text-anchor: start;">hello</text>\
                </g>\
                <g class="path pcsel2" transform="translate(580, 369)">\
                  <polyline points="0,7 -45,7" />\
                  <polyline points="-38,3 -45,7 -38,11" />\
                  <text x="-47" y="11" style="text-anchor: end;">JT</text>\
                </g>\
                <g class="path z asel0" transform="translate(580, 369)">\
                  <polyline points="0,8 0,21" />\
                </g>\
                <g class="path z process" transform="translate(580, 370)">\
                  <polyline points="0,19 -10,19" />\
                  <polyline points="-3,15 -10,19 -3,23" />\
                  <rect x="-35" y="12" height="15" width="25" />\
                  <text x="-22.5" y="24">0?</text>\
                  <g class="mux-selector">\
                    <polyline points="-35,19 -45,19" />\
                    <polyline points="-38,15 -45,19 -38,23" />\
                    <text x="-47" y="23" style="text-anchor: end;">Z=<tspan id="z-value">0</tspan></text>\
                  </g>\
                </g>\
                <g class="path asel0" transform="translate(580,369)">\
                  <polyline points="0,21 0,60" />\
                  <text x="0" y="73">0</text>\
                </g>\
                <g class="asel1 path" transform="translate(130,45)">\
                  <polyline points="100,150 100,375 410,375 410,384" />\
                  <polyline points="406,377 410,384 414,377" />\
                  <text x="410" y="397">1</text>\
                </g>\
                <g class="alu wdsel1" transform="translate(545,480)">\
                  <polyline points="90,40 90,80" />\
                  <polyline points="86,73 90,80 94,73" />\
                  <text x="90" y="93">1</text>\
                </g>\
                <g class="alu wdsel2 wr1" transform="translate(545,480)">\
                  <polyline points="90,40 215,40" />\
                  <polyline points="208,36 215,40 208,44" />\
                  <text x="214" y="35" style="text-anchor: end;">MA</text>\
                </g>\
                <g class="memory-group permanent" transform="translate(760,460)">\
                  <!-- HTML is absolutely positioned over this. -->\
                  <rect x="0" y="0" width="140" height="110" />\
                  <!-- WR -->\
                  <g class="mux-selector">\
                    <polyline points="110,-20 110,0" />\
                    <polyline points="106,-7 110,0 114,-7" />\
                    <text x="110" y="-21">WR=<tspan id="wr-value">1</tspan></text>\
                  </g>\
                </g>\
                <g class="path wdsel2" transform="translate(760,460)">\
                  <text x="-1" y="97" style="text-anchor: end;">MRD</text>\
                  <polyline points="0,85 -95,85 -95,100" />\
                  <polyline points="-99,93 -95,100 -91,93" />\
                  <text x="-95" y="113">2</text>\
                </g>\
                <g class="path werf1" transform="translate(585,561)">\
                  <polyline points="50,15 50,30 350,30 350,-300 254,-300" />\
                  <polyline points="261,-304 254,-300 261,-296" />\
                  <text x="255" y="-305" class="path-value rdw-value">80000CF4</text>\
                </g>\
              </svg>\
              <!-- These had to be moved out here because SVG <foreignObject> is very broken in WebKit -->\
              <!-- Memory -->\
              <div style="position: absolute; top: 460px; left: 760px; width: 140px; height: 110px; overflow: hidden;">\
                <div class="memory" data-height="110"></div>\
              </div>\
              <!-- Instructions -->\
              <div style="position: absolute; top: 55px; left: 250px; width: 320px; height: 66px; overflow: hidden;">\
                <div class="disassembly" data-height="66" data-width="320"></div>\
              </div>\
            </div>\
          </div>\
        </div>\
      </div>';

    //////////////////////////////////////////////////
    // finish UI setup
    //////////////////////////////////////////////////

    // set up body
    $('body').css('height','100%');
    $('.bsim').css('height','100%');
    var initial_data = $('.bsim').html();
    $('.bsim').empty();
    $('.bsim').html(body);

    var split = new SplitPane('#split-container', ['#editor-pane', '#simulation-pane']);

    $('.global-controls').append('<span style="margin-right:10px;">'+$('title').text()+'</span>');

    // initial configuration
    split.setPaneWidth(0, split.window_width());
    split.setPaneWidth(1, 0);

    // Set up the split buttons.
    $('#maximise_editor').click(function() {
        split.setPaneWidth(0, split.window_width());
        split.setPaneWidth(1, 0);
    });
    $('#split_pane').click(function() {
        var width = split.window_width();
        split.setPaneWidth(0, width/2);
        split.setPaneWidth(1, width/2);
    });
    $('#maximise_simulation').click(function() {
        split.setPaneWidth(0, 0);
        split.setPaneWidth(1, split.window_width());
    });

    split.on('resize', function(widths) {
        if(widths[1] === 0) {
            $('#maximise_editor').addClass('active').siblings().removeClass('active');
        } else if(widths[0] === 0) {
            $('#maximise_simulation').addClass('active').siblings().removeClass('active');
        } else {
            $('#split_pane').addClass('active').siblings().removeClass('active');
        }
        if(widths[0] === 0) {
            editor.blur();
        }
    });

    // Make an editor
    var editor = new Editor('#editor', 'uasm', true);
    editor.openTab('Untitled', 'Now is the time...', true);
    $('.editor-file-control').hide();     // hide file buttons
    $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)

    var do_assemble = function() {
        var filename = editor.currentTab();
        var content = editor.content('assemble');
        var metadata = editor.metadata();
        var assembler = new BetaAssembler(editor);
        editor.clearErrors();

        if (editor.save_to_server) editor.save_to_server();

        assembler.assemble(filename, content, metadata, function(success, result) {
            if(!success) {
                PassiveAlert("Assembly failed.", "error");
                _.each(result, function(error) {
                    if(!_.contains(editor.filenames(), error.file)) {
                        editor.openFile(error.file, true, function(editor_filename, content) {
                            editor.markErrorLine(editor_filename, error.message, error.line - 1, error.column);
                        });
                    } else {
                        editor.markErrorLine(error.file, error.message, error.line - 1, error.column);
                    }
                });
            } else {
                PassiveAlert("Assembled successfully", "success");
                beta.setSources(result.sources);
                beta.loadBytes(result.image,result.source_map);
                beta.setBreakpoints(result.breakpoints);
                beta.setLabels(result.labels);
                _.each(result.options, function(value, key) {
                    beta.setOption(key, value);
                });
                beta.getMemory().setProtectedRegions(result.protection);
                if(result.checkoff) {
                    if(result.checkoff.kind == 'tty') {
                        beta.setVerifier(new BSim.TextVerifier(beta, result.checkoff));
                    } else if(result.checkoff.kind == 'memory') {
                        beta.setVerifier(new BSim.MemoryVerifier(beta, result.checkoff));
                    }
                } else {
                    beta.setVerifier(null);
                }
                if(split.currentState()[1] === 0) {
                    $('#maximise_simulation').click();
                }
            }
        });
    };

    // Add some buttons to it
    editor.addButtonGroup([new ToolbarButton('Assemble', do_assemble, 'Runs your program!')]);

    function window_height() {
        return $('.xblock-6004').innerHeight();
    };

    var set_height = function() {
        editor.setHeight(window_height() - $('.btn-toolbar').height() - $('.nav-tabs').height()); // Set height to window height minus title.
    };
    set_height();
    $(window).resize(set_height); // Update the height whenever the browser window changes size.
    split.on('resize', _.throttle(editor.redraw, 50));

    // Stuff for the simulator
    var do_resize = function(holder, view, difference) {
        if(holder.parents('#programmer-view').length) {
            var cinfo = $('.cache-information');
            $(window).on('resize cache-resize',function() {
                var height = window_height() - difference;
                if (cinfo.is(':visible')) height -= cinfo.outerHeight();
                view.resize(height);
                holder.css({height: height});
            });
        }
    };

    var beta = new BSim.Beta(80); // This starting number is basically irrelevant

    $('.regfile').each(function() {
        new BSim.RegfileView(this, beta);
    });

    $('.tty').each(function() {
        new BSim.TTY(this, beta);
    });

    $('.disassembly').each(function() {
        var view = new BSim.DisassembledView(this, beta);
        do_resize($(this), view, 470);
    });

    $('.memory').each(function() {
        var view = new BSim.MemoryView(this, beta);
        do_resize($(this), view, 272);
    });

    $('.stack').each(function() {
        var view = new BSim.StackView(this, beta);
        do_resize($(this), view, 272);
    });

    new BSim.Beta.ErrorHandler(beta);
    var schematic = new BSim.SchematicView($('svg.schematic'), beta);
    split.on('resize', BSim.SchematicView.Scale);
    $(window).resize(BSim.SchematicView.Scale);

    $('.program-controls').each(function() {
        controls = new BSim.Controls(this, beta, editor, schematic);
    });

    // Work around weird sizing bug.
    _.delay(function() {
        $(window).resize();
    }, 10);

    // For debugging
    window.beta = beta;
    window.editor = editor;

    //////////////////////////////////////////////////    
    //  workbook interface
    //////////////////////////////////////////////////    

    var configuration = {};  // all state saved by server
    var controls;

    function update_tests() {
        try {
            var checkoff = controls.get_checkoff();
            if (checkoff !== undefined) {
                // key is checksum
                $.each(checkoff,function(cksum,result) {
                    configuration.tests = {'test': result=='passed' ? cksum : result};
                });
            }
        } catch(e) {
            // do nothing...
        }
    }

    function setup_tab(name,contents,select,read_only) {
        // if initial contents looks like a URL, load it!
        var load = contents.lastIndexOf('url:',0) === 0;
        var doc = editor.openTab(name,load ? 'Loading '+contents : contents,select,null,read_only);
        if (load) {
            $.ajax(contents.substr(4),{
                dataType: 'text',
                error: function(jqXHR,textStatus,errorThrown) {
                    editor.load_initial_contents(doc,'Oops, error loading '+contents);
                },
                success: function(data,jqXHR,textStatus,errorThrown) {
                    editor.load_initial_contents(doc,data);
                }
            });
        }
    }


    // see if URL has specified buffers to load
    if (window.location.search) {
        var args = {};
        $.each(window.location.search.substr(1).split('&'),function(index,arg) {
            arg = arg.split('=');
            args[arg[0]] = arg[1];
        });

        editor.closeAllTabs();
        var first = true;
        $.each(args,function(bname,url) {
            var read_only = false;
            if (bname[0] == '*') {
                read_only = true;
                bname = bname.substr(1);
            }
            setup_tab(bname,'url:'+url,first,read_only);
            first = false;
        });
    }

    // accept initialization message from host, remember where
    // to send update messages when local state changes
    $(window).on('message',function (event) {
        event = event.originalEvent;
        if (event.origin != window.location.origin) return;

        var host = event.source;
        // {value: {buffer_name: "contents",...}, check: , message: , id: }
        var answer = JSON.parse(event.data);

        // change save_to_server to communicate with host
        if (answer.id) {
            //editor.AUTOSAVE_TRIGGER_EVENTS = 1; // Number of events to trigger an autosave.
            editor.save_to_server = function (callback) {
                // update answer object
                var state = {
                    tests: configuration.tests,
                    required_tests: configuration.required_tests,
                    state: editor.get_all_documents(true)
                };

                answer.value = JSON.stringify(state);
                answer.message = undefined;
                answer.check = undefined;
                
                // if there are tests, see if they've been run
                update_tests();
                var completed_tests = state['tests'];
                if (completed_tests) {
                    // make sure all required tests passed
                    answer.check = 'right';
                    var cksum = configuration.tests.test;  // simulation cksum
                    $.each(state.required_tests || [],function (index,test) {
                        if (test != cksum) {
                            answer.message = 'Test failed';
                            answer.check = 'wrong';
                        }
                    });
                }

                // send it to our host
                host.postMessage(JSON.stringify(answer),window.location.origin);
                
                // done...
                if (callback) callback();
            };
        }

        if (answer.value) {
            // configuration includes state, initial_state, required-tests, tests
            // state and initial_state are objects mapping buffer_name -> contents
            configuration = JSON.parse(answer.value);

            // open editor tabs for each saved buffer
            editor.closeAllTabs();
            var first = true;

            $.each(configuration.initial_state || {},function (name,contents) {
                setup_tab(name,contents,false,true);
            });
            $.each(configuration.state || {},function (name,contents) {
                setup_tab(name,contents,first,false);
                first = false;
            });

            $('.editor-file-control').hide();     // hide file buttons
            $('#editor .nav-tabs .close').hide();  // hide close button on tab(s)
        }
    });

    if (window.parent !== window) {
        // make iframe resizable if we can.  This may fail if we don't have
        // access to our parent...
        try {
            // look through all our parent's iframes
            $('iframe',window.parent.document).each(function () {
                // is this iframe us?
                if (this.contentWindow == window) {
                    // yes! so add css to enable resizing
                    $(this).css({resize:'both', overflow:'auto'});
                }
            });
        } catch (e) {
        }
    }
});
