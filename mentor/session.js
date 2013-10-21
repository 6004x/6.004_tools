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
    };

    this.startAudio = function(callback) {
        mChannel.startAudio(callback);
    };
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

Mentoring.Session.ProvideHelp = function(username, session, success, failure) {
    gapi.client.helpQueue.serviceRequest({id: session, mentor_name: username}).execute(function(result) {
        if(result.error) {
            if(failure) failure(result.error);
            return;
        }
        var session = new Mentoring.Session(session, result.token, true);
        session.startAudio();
        return session;
    });
}

Mentoring.Initialise = function() {
    gapi.client.load('helpQueue', 'v0', function() {});
};
