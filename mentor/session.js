var Mentoring = Mentoring || {};
Mentoring.Session = function(id, token, is_mentor) {
    var self = this;
    var mSessionID = id;
    var mToken = token;
    var mIsMentor = !!is_mentor;
    var mDirectConnection = false;
    var mChannel = null;

    _.extend(this, Backbone.Events);

    var init = function() {
        mChannel = new Mentoring.CommChannel(mSessionID, mToken, mIsMentor);
        window.mChannel = mChannel;
        mChannel.on('message', handle_message);
    };

    var handle_message = function(channel, message) {
        var kind = message.kind;
        console.log('Received ' + kind + ' message.');
        console.log(message);
        if(_.has(mHandlers, kind)) {
            mHandlers[kind](message);
        } else {
            self.trigger(kind, message);
        }
    };

    this.getChannel = function() {
        return mChannel;
    };

    this.isMentor = function() {
        return mIsMentor;
    };

    this.startAudio = function(callback) {
        mChannel.startAudio(callback);
    };

    this.beginNegotiation = function() {
        // Hack: Google channel setup isn't instantaneous, so we will
        // receive this before they start working.
        // Delay for a second before beginning negotiations to
        // ensure the other end actually gets the message.
        _.delay(function() {
            mChannel.sendMessage({
                kind: 'negotiate',
                height: window.innerHeight,
                width: window.innerWidth
            });
            mChannel.attemptUpgrade();
            console.log("Attempting channel upgrade to WebRTC.");
        }, 1000);
        self.trigger('negotiating');
        console.log("Initiating negotiation.");
    };

    var mHandlers = {
        negotiate: function(message) {
            var final_height = Math.min(message.height, window.innerHeight);
            var final_width = Math.min(message.width, window.innerWidth);
            // Inform the other end
            mChannel.sendMessage({
                kind: 'negotiate_response',
                width: final_width,
                height: final_height
            });
            // Fix ourselves.
            var outer_height = final_height + (window.outerHeight - window.innerHeight);
            var outer_width = final_width + (window.outerWidth - window.innerWidth);
            window.resizeTo(outer_width, outer_height);
            self.trigger('ready');
        },
        negotiate_response: function(message) {
            // Fix ourselves.
            var outer_height = message.height + (window.outerHeight - window.innerHeight);
            var outer_width = message.width + (window.outerWidth - window.innerWidth);
            window.resizeTo(outer_width, outer_height);
            self.trigger('ready');
        },
        servicing_request: function(message) {
            self.beginNegotiation();
        }
    };

    init();
};

Mentoring.Session.RequestHelp = function(username, success, failure) {
    gapi.client.helpQueue.createRequest({name: username, message: '', lab: 5}).execute(function(result) {
        if(result.error) {
            if(failure) {
                failure(result.error);
            }
            return;
        }
        var session = new Mentoring.Session(result.id, result.token, false);
        session.startAudio();
        if(success) success(session);
    });
};

Mentoring.Session.ProvideHelp = function(username, session_id, success, failure) {
    console.log("Servicing request " + session_id);
    gapi.client.helpQueue.serviceRequest({id: session_id, mentor_name: username}).execute(function(result) {
        if(result.error) {
            if(failure) failure(result.error);
            return;
        }
        var session = new Mentoring.Session(session_id, result.token, true);
        session.startAudio();
        success(session);
    });
};

Mentoring.Initialise = function() {
    gapi.client.load('helpQueue', 'v0', function() {
        if(Mentoring.OnInit) {
            Mentoring.Initialised = true;
            Mentoring.OnInit();
        }
    }, 'https://robust-arcadia.appspot.com/_ah/api');
};
Mentoring.Initialised = false;

// This one needs to be global to make Google happy.
window.initMentoringAPI = function() {
    Mentoring.Initialise();
};
