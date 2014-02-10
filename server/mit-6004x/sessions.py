import webapp2

from webapp2_extras import sessions

class SessionHandler(webapp2.RequestHandler):
    def dispatch(self):
        # Get a session store for this request.
        self.session_store = sessions.get_store(request=self.request)

        try:
            # Dispatch the request.
            webapp2.RequestHandler.dispatch(self)
        finally:
            # Save all sessions.
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        # Returns a session using the default cookie key.
        return self.session_store.get_session()

    # by default set up JSON response
    def head(self):
        self.response.headers['Access-Control-Allow-Origin'] = self.request.headers.get('Origin','*')
        self.response.headers['Access-Control-Allow-Credentials'] = 'true'
        self.response.headers['Content-Type'] = 'text/json'

    # GET requests turn in POSTs
    def get(self,path):
        self.post(path)
