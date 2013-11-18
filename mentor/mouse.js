Mentoring.MouseRelay = function(session) {
    var mSession = session;
    var mChannel = session.getChannel();

    var mMouseMessagePending = false;
    var mMousePos = {};
    var mMouseSequence = 0;

    var mMouseElement = null;

    var init = function() {
        console.log('mouse handler: ' + mSession.isMentor());
        // if(mSession.isMentor()) {
            mChannel.on('upgrade', handle_upgrade);
            mChannel.on('downgrade', handle_downgrade);
            mSession.on('ready', handle_ready);
        // } else {
            create_mouse_element();
            mSession.on('mouse', handle_mouse);
        // }
    };

    var handle_ready = function() {
        console.log('mouse ready');
        $(document).mousemove(function(e) {
            mMousePos.x = e.pageX;
            mMousePos.y = e.pageY;
            transmit_mouse_pos();
        });
    };

    var handle_upgrade = function() {
        update_mouse_interval(50);
    };

    var handle_downgrade = function() {
        update_mouse_interval(300);
    };

    var transmit_mouse_pos;
    var update_mouse_interval = function(interval) {
        transmit_mouse_pos = _.throttle(function() {
            if(mMouseMessagePending) return;
            mMouseMessagePending = true;
            mChannel.sendMessage({kind: 'mouse', x: mMousePos.x, y: mMousePos.y, seq: mMouseSequence++}, function() { mMouseMessagePending = false; });
        }, interval);
        console.log("Throttling mouse updates to " + interval + "ms.");
    };
    update_mouse_interval(300);


    var handle_mouse = function(message) {
        if(message.seq < mMouseSequence) {
            console.log("Out-of-order mouse update discarded.");
            return;
        }
        mMouseSequence = message.seq;
        mMouseElement.css({
            top: message.y,
            left: message.x
        });
    };

    var create_mouse_element = function() {
        mMouseElement = $('<div id="remote-mouse-pointer">').appendTo('body');
    };

    init();
};