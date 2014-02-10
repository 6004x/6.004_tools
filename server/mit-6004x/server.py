# if running locally using App Engine Launcher, use "--enable_sendmail yes" flag

import json,datetime,os.path
import webapp2,logging
from google.appengine.ext import db
from google.appengine.ext.webapp import template

from sessions import SessionHandler # set up a session
import user   # user services
import state  # state services
import grades # grade services

workbook_url = "http://computationstructures.org"

################################################################################
##  /echo/...   -- echo request as a JSON object
################################################################################

class echo(SessionHandler):
    def post(self,path):
        self.head()

        # echo URL
        response = {'URL': path}

        # echo parameters
        for name,value in self.request.params.items():
            response[name] = value

        # echo cookies
        for name,value in self.request.cookies.items():
            response[name] = value

        self.response.write(json.dumps(response))

################################################################################
##  / -- top-level records page
################################################################################

class records(SessionHandler):
    def post(self,path):
        self.head()
        self.response.headers['Content-Type'] = 'text/html'

        if not user.validate_user(self):
            message = ''
            if len(self.request.get('_user')) > 0:
                message = 'Invalid username or password'
            # give a user a form to sign in
            path = os.path.join(os.path.dirname(__file__), 'templates/login.html')
            self.response.write(template.render(path,{'url': self.request.url,'message':message}))
            return

        u = self.request._user
        template_file = 'templates/records.html'
        template_info = {
            'url': self.request.url,
            'name': u.first_name + ' ' + u.last_name,
            'email': u.email,
            'scores': grades.scores(u.email),
        }

        if u.status == 'staff':
            template_file = 'templates/records_staff.html'
            template_info['user_list'] = user.user_list()

        path = os.path.join(os.path.dirname(__file__), template_file)
        self.response.write(template.render(path,template_info))

################################################################################
##  application setup
################################################################################

config = {
 'webapp2_extras.sessions': {'secret_key': '2d1de316acdac189acd04fb1c80f632e'},
}

application = webapp2.WSGIApplication([
    ('/echo(.*)', echo),

    # state management
    ('/file/(.*)', state.file_state),
    ('/state(.*)', state.page_state),

    # account services
    ('/user/validate(.*)', user.validate),   # used by ajax scripts
    ('/user/change_password(.*)', user.change_password),
    ('/user/add_user(.*)', user.add_user),
    ('/user/edit_user(.*)', user.edit_user),

    # grade services
    ('/grades/submit_score(.*)', grades.submit_score),

    # default
    ('/(.*)',records)
], debug=True, config=config)

logging.info('mit-6004x server started...')
