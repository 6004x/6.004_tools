var Mentoring = Mentoring || {};
Mentoring.CommChannel = function(session_id, token, is_mentor) {
    var ICE_SERVER = 'stun:stun.l.google.com:19302';

    var self = this;
    var mSessionID = session_id;
    var mGoogleToken = token;
    var mIsMentor = !!is_mentor;
    var mGoogleChannel = null;
    var mPeerConnection = null;
    var mDataChannel = null;
    var mIceCandidateQueue = [];
    var mMediaStream = null;
    var mRTCNegotiationCompleted = false;
    var mRemoteAudioElement = null;
    var HelpQueue = gapi.client.helpQueue;

    _.extend(this, Backbone.Events);

    var init = function() {
        // Don't try setting this up if RTCPeerConnection isn't available.
        // webrtc.js ensures it's always defined, even if it's null, so this is safe.
        if(RTCPeerConnection) {
            mPeerConnection = new RTCPeerConnection(
                {iceServers: [createIceServer(ICE_SERVER)]},
                {optional: [{DtlsSrtpKeyAgreement: true}]} // Theoretical magic for Chrome/Firefox interop
            );
            mPeerConnection.onicecandidate = handle_ice_candidate;
            mPeerConnection.ondatachannel = handle_rtc_channel_created;
            mPeerConnection.onaddstream = handle_new_media_stream;
        }
        mGoogleChannel = new goog.appengine.Channel(mGoogleToken);
        mGoogleChannel.open({
            onmessage: handle_google_message,
            onerror: handle_google_error,
            onopen: handle_google_open,
            onclose: handle_google_close
        });
        self.on('error', function(e) { console.log(e); });
    };

    var handle_google_open = function() {
        _.delay(function() {
            self.trigger('open', self);
        }, 500);
    };

    var handle_google_error = function(e) {
        self.trigger('error', self, e);
    };

    var handle_google_close = function() {
        self.trigger('close', self);
    };

    var handle_google_message = function(message) {
        var json = JSON.parse(message.data);
        if(json.kind == 'rtc') {
            handle_rtc_signalling(json);
        } else {
            self.trigger('message', self, json);
        }
    };

    var send_google_message = function(message, callback) {
        var json = JSON.stringify(message);
        console.log('Sending: ' + json);
        callback = callback || _.identity;
        console.log({
            message: json,
            session: mSessionID,
            target: (mIsMentor ? 1 : 2)
        });
        HelpQueue.relay({
            message: json,
            session: mSessionID,
            target: (mIsMentor ? 1 : 2)
        }).execute(callback);
    };

    var send_rtc_message = function(message) {
        var json = JSON.stringify(message);
        mDataChannel.send(json);
    };

    var send_message = function(message, callback) {
        callback = callback || function(){};
        if(rtc_channel_ready()) {
            send_rtc_message(message);
            callback();
        } else {
            send_google_message(message, callback);
        }
    };

    var handle_rtc_signalling = function(message) {
        if(message.rtcKind == 'compatibility-check') {
            send_google_message(
                {kind: 'rtc',
                rtcKind: 'compatibility-response',
                compatible: !!RTCPeerConnection
            });
        } else if(message.rtcKind == 'compatibility-response') {
            if(message.compatible && RTCPeerConnection) {
                init_rtc();
            }
        } else if(message.rtcKind == 'offer') {
            var offer = new RTCSessionDescription(message.desc);
            mPeerConnection.setRemoteDescription(offer, function() {
                mPeerConnection.createAnswer(function(answer) {
                    mPeerConnection.setLocalDescription(answer);
                    mRTCNegotiationCompleted = true;
                    send_google_message({kind: 'rtc', rtcKind: 'answer', desc: answer});
                    handle_queued_candidates();
                }, webrtc_failure);
            }, webrtc_failure);
        } else if(message.rtcKind == 'answer') {
            var answer = new RTCSessionDescription(message.desc);
            mPeerConnection.setRemoteDescription(answer, function() {
                mRTCNegotiationCompleted = true;
                handle_queued_candidates();
            }, webrtc_failure);
        } else if(message.rtcKind == 'candidate') {
            queue_candidate(message.candidate);
        }
    };

    var prepare_data_channel = function(channel) {
        channel.onopen = handle_rtc_channel_state_change;
        channel.onclose = handle_rtc_channel_state_change;
        channel.onmessage = handle_rtc_channel_message;
    };

    // This is only called on one end; the other end's setup is triggered automatically.
    var init_rtc = function() {
        mDataChannel = mPeerConnection.createDataChannel('rtc-channel', {reliable: true});
        prepare_data_channel(mDataChannel);
        create_offer();
    };

    var create_offer = function() {
        mPeerConnection.createOffer(function(desc) {
            mPeerConnection.setLocalDescription(desc);
            send_google_message({kind: 'rtc', rtcKind: 'offer', desc: desc});
        }, webrtc_failure);
    };

    var webrtc_failure = function(e) {
        self.trigger('error', e);
    };

    var handle_ice_candidate = function(event) {
        if(event.candidate) {
            send_google_message({kind: 'rtc', rtcKind: 'candidate', candidate: event.candidate});
        }
    };

    var handle_queued_candidates = function() {
        if(!mIceCandidateQueue) return;
        _.each(mIceCandidateQueue, function(candidate) {
            console.log("Processing queued candidate.");
            mPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        });
        mIceCandidateQueue = null;
    };

    var queue_candidate = function(candidate) {
        if(mIceCandidateQueue) {
            console.log("Queuing early candidate.");
            mIceCandidateQueue.push(candidate);
        } else {
            mPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    var handle_rtc_channel_created = function(event) {
        console.log("RTC channel created");
        mDataChannel = event.channel;
        prepare_data_channel(mDataChannel);
    };

    var handle_rtc_channel_state_change = function(event) {
        if(event.type == "open") {
            self.trigger('upgrade', self);
            console.log("Upgraded to WebRTC");
        } else if(event.type == "close") {
            self.trigger('downgrade', self);
            console.log("Downgraded from WebRTC");
        }
    };

    var handle_rtc_channel_message = function(message) {
        self.trigger('message', self, JSON.parse(message.data));
    };

    var rtc_channel_ready = function() {
        return (mDataChannel && mDataChannel.readyState == "open");
    };

    var handle_new_media_stream = function(event) {
        console.log("new stream");
        console.log(event);
        if(event.stream) {
            window.audioStream = event.stream;
            if(!mRemoteAudioElement) {
                mRemoteAudioElement = $('<audio autoplay>').appendTo('body');
            }
            mRemoteAudioElement[0].src = URL.createObjectURL(event.stream);
        }
    };

    // Some public things.
    this.sendMessage = send_message;

    this.attemptUpgrade = function() {
        // Now try to negotiate an upgrade to WebRTC.
        if(RTCPeerConnection)
            send_google_message({kind: 'rtc', rtcKind: 'compatibility-check'});
    };

    this.requestMic = function(success, failure) {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if(!navigator.getUserMedia) return false;
        navigator.getUserMedia({video: false, audio: true}, function(stream) {
            mMediaStream = stream;
            if(success) success();
        }, failure || function() {});
        return true;
    };

    this.startAudio = function() {
        var start_audio = function() {
            console.log("adding stream");
            mPeerConnection.addStream(mMediaStream);
            if(mRTCNegotiationCompleted) {
                console.log("re-negotiating.");
                create_offer();
            }
        };
        if(mMediaStream) {
            start_audio();
        } else {
            self.requestMic(start_audio);
        }
    };

    init();
};
