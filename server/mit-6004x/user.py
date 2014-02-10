import hashlib,json,datetime,os.path
import webapp2,logging
from google.appengine.ext import db
from google.appengine.api import mail
from google.appengine.ext.webapp import template

from sessions import SessionHandler

import course # course info
import grades # grade services

workbook_url = "http://computationstructures.org"

################################################################################
##  database entities and helper functions
################################################################################

# user entity -- what we know about site users
# use Expando so we can have additional properties (eg, for MIT students)
class User(db.Model):
    email = db.EmailProperty(required=True)      # unique user identifier
    mit_id = db.StringProperty(required=True)     # MIT ID number
    password = db.StringProperty()   # md5 hex digest of email+password
    timestamp = db.DateTimeProperty(auto_now=True)  # time of last transaction
    last_name = db.StringProperty(required=True)
    first_name = db.StringProperty(default='')
    semester = db.StringProperty(default="all")
    section = db.StringProperty(default="unassigned")   # section name, 'unassigned'
    status = db.StringProperty()    # 'staff', 'LA', 'registered', 'dropped', 'listener'

# get User entity given email
def find_user(request,email=None):
    # canonicalize username
    if email is None:
        email = request.params.get('_user','').lower()
    if request: request._email = email   # remember user id

    q = db.GqlQuery("SELECT * from User WHERE email = :1",email)
    user = q.get()
    if request: request._user = user
    return user

# return ASCII hash for user's plain text password
# salt with user name so different users with same password don't have same hash
def hash_password(email,password):
    return hashlib.md5(email + password).hexdigest()

def validate_password(user,password):
    # convert user-supplied password into internal hashed form
    return user.password == hash_password(user.email,password)

# if user is legit, update timestamp and return True
# otherwise return False
def validate_user(handler,check_password = False):
    request = handler.request

    # is there a session in-progress?
    request._email = handler.session.get('email')

    if request._email is None:
        # no session, set one up after checking password
        if find_user(request) is None:
            # no such user
            return False

        if validate_password(request._user,request.params.get('_password','')):
            # remember user for duration of session
            handler.session['email'] = request._email
        else:
            # pasword mismatch
            return False
    else:
        # session in progress, so locate User entity
        find_user(request,request._email)

        # check password if requested even though we're in a session
        # used to ensure interlopers can't do evil things while user is away from console
        if check_password:
            if not validate_password(request._user,request.params.get('_password','')):
                return False

    # update timestamp to keep track of last user access
    request._user.put()
    return True

# return list of users
def user_list():
    q = db.GqlQuery("SELECT * from User WHERE semester IN ('all', :1)",course.subject);
    result = [(record.email, record.email.split('@')[0])
              for record in q.run(batch_size=1000)]
    result.sort(cmp=lambda x,y: cmp(x[1],y[1]))
    return result

################################################################################
##  /user/validate   -- see if user & password is legit
################################################################################

class validate(SessionHandler):
    def post(self,path):
        self.head()
        response = {}

        if not validate_user(self):
            response['_error'] = "Invalid email or password"

        self.response.write(json.dumps(response))

################################################################################
##  /user/change_password       -- set new password
################################################################################

class change_password(SessionHandler):
    def post(self,token):
        self.head()
        self.response.headers['Content-Type'] = 'text/html'

        email = self.request.get('email')
        old_password = self.request.get('old_password')
        new_password = self.request.get('new_password')
        confirm_password = self.request.get('confirm_password')

        message = ''
        if not validate_user(self):
            message = 'Not signed in.'
        elif len(email) != 0:
            # non-blank email field means this is a form submission
            u = self.request._user
            if len(new_password) == 0:
                message = 'New password cannot be blank.'
            elif new_password != confirm_password:
                message = 'New password and confirmation do not match.'
            elif not validate_password(u,old_password):
                message = 'Incorrect old password.'
            else:
                # change password
                u.password = hash_password(u.email,new_password)
                u.timestamp = datetime.datetime.utcnow()
                u.put()
                # redirect to status page
                self.response.write('<html><body><meta http-equiv="refresh" content="0;URL=%s"></body></html>' %
                                    self.request.url[:self.request.url.find('/user/change_password')])
                return

        # display a change password form
        template_file = 'templates/change_password.html'
        template_info = {
            'url': self.request.url,
            'email': self.request._user.email,
            'message': message
        }

        path = os.path.join(os.path.dirname(__file__), template_file)
        self.response.write(template.render(path,template_info))

################################################################################
##  /user/add_user -- add new user
################################################################################

class add_user(SessionHandler):
    def post(self,token):
        self.head()
        self.response.headers['Content-Type'] = 'text/html'

        email = self.request.get('email').strip()
        last_name = self.request.get('last_name').strip()
        first_name = self.request.get('first_name').strip()
        mit_id = self.request.get('mit_id').strip()
        section = self.request.get('section').strip()
        status = self.request.get('status').strip()

        message = ''
        if not validate_user(self) or self.request._user.status != 'staff':
            message = 'Only staff members can add users.'
        elif len(email) != 0:
            user = find_user(None,email=email)
            if not user is None:
                message = 'User already exists.'
            elif len(last_name) == 0:
                message = 'Last name cannot be blank.'
            elif len(mit_id) != 9 or mit_id[0] != '9' or not mit_id.isdigit():
                message = 'MIT ID must be 9 digits, starting with a "9".'
            else:
                user = User(email = email.lower(),
                            password = hash_password(email,mit_id),
                            timestamp = datetime.datetime.utcnow(),
                            mit_id = mit_id,
                            last_name = last_name,
                            first_name = first_name,
                            semester = course.subject,
                            section = section,
                            status = status)
                user.put()
                # redirect to status page
                self.response.write('<html><body><meta http-equiv="refresh" content="0;URL=%s"></body></html>' %
                                    self.request.url[:self.request.url.find('/user/add_user')])
                return


        # display a change password form
        template_file = 'templates/add_user.html'
        template_info = {
            'url': self.request.url,
            'message': message,
            'sections': course.sections,
        }

        path = os.path.join(os.path.dirname(__file__), template_file)
        self.response.write(template.render(path,template_info))

################################################################################
##  /user/edit_user -- edit user info
################################################################################

class edit_user(SessionHandler):
    def post(self,token):
        self.head()
        self.response.headers['Content-Type'] = 'text/html'

        if not validate_user(self) or self.request._user.status != 'staff':
            self.response.write('Only staff members can edit users.')
            return

        email = self.request.get('email').strip()
        last_name = self.request.get('last_name').strip()
        first_name = self.request.get('first_name').strip()
        mit_id = self.request.get('mit_id').strip()
        section = self.request.get('section').strip()
        status = self.request.get('status').strip()
        reset_password = self.request.get('reset_password').strip()

        message = ''
        user = find_user(None,email=email)
        if len(last_name) != 0:
            if user is None:
                message = "User %s doesn't exist." % email
            elif len(last_name) == 0:
                message = 'Last name cannot be blank.'
            elif len(mit_id) != 9 or mit_id[0] != '9' or not mit_id.isdigit():
                message = 'MIT ID must be 9 digits, starting with a "9".'
            else:
                user.last_name = last_name
                user.first_name = first_name
                user.mit_id = mit_id
                user.section = section
                user.status = status
                if reset_password:
                    user.password = hash_password(email,mit_id),
                user.put()
 
        # display a form for editing user info
        template_file = 'templates/edit_user.html'
        template_info = {
            'url': self.request.url,
            'status_url': self.request.url[:self.request.url.find('/user/edit_user')],
            'message': message,
            'sections': course.sections,
            'user': user,
            'scores': grades.scores(email),
            'assignments': course.assignments,
            'actions': grades.get_scores(email),
        }

        path = os.path.join(os.path.dirname(__file__), template_file)
        self.response.write(template.render(path,template_info))

################################################################################
##  create admin account
################################################################################

admin_account = db.GqlQuery("SELECT * from User WHERE email = 'admin'").get()
if admin_account is None:
    # set up a new User entity for testing
    admin_account = User(email = 'admin',
                         password = '5f91f3e3b6966d040ac87de770c42db7',
                         timestamp = datetime.datetime.utcnow(),
                         mit_id = "987654321",
                         last_name = "Administrator",
                         first_name = "",
                         semester = "all",
                         status = "staff")

    admin_account.put()
