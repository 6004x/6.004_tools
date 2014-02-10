import datetime,json,sys,os.path
import webapp2,logging
from google.appengine.ext import db
from google.appengine.ext.webapp import template

from sessions import SessionHandler

import user   # user services
import course # info about assignments

tfmt = '%Y-%m-%d %H:%M %Z'

# score entry -- a cumulative record of all scoring
# later entries can override earlier entries
# action/value/notes:
#   'quiz'/points/json list of problem scores
#   'check-in'/points earned/json dict of design metrics
#   'check-off'/None/None
#   'excuse'/'yes' or 'no'/text of excuse
#   'note'/None/text of note
class Score(db.Model):
    subject = db.StringProperty(default=course.subject)  # subject for which we're collecting this grade
    email = db.EmailProperty(required=True)   # who the entry is for
    timestamp = db.DateTimeProperty(auto_now=True) # use now() when writing a record
    submitter = db.EmailProperty()   # None if result of autograding
    assignment = db.StringProperty()  # which assignment, if applicable
    action = db.StringProperty()
    value = db.StringProperty()
    notes = db.StringProperty()

# retrieve list of student scores sorted by increasing submission time
def get_scores(email):
    result = []
    q = db.GqlQuery("SELECT * from Score WHERE email = :1 ORDER BY timestamp ASC",email)
    result = []
    for record in q.run(batch_size=1000):
        # make timestamp an offset-aware datetime
        record.timestamp = record.timestamp.replace(tzinfo=course.UTC)
        result.append(record)
    return result

# return list of user's scores on course assignments
def scores(email):
    student_scores = get_scores(email)

    # build list of score records
    result = []
    for a in course.assignments:
        # create score record
        score = {
            'name': a.name,
            'description': a.description,
            'due': '' if a.atype == 'quiz' else course.from_utc(a.date_due).strftime(tfmt),
            'status': '',
            'points': a.points,
            'score': '--'
        }

        # now update record with student results, processing score records
        # by increasing timestamp so that most recent score record is the
        # last one processed
        ontime_points = 0
        late_points = 0
        checkoff = None
        last_submission = None
        excused = False
        for s in student_scores:
            if s.assignment != a.name: continue
            if s.action == 'quiz':
                ontime_points = float(s.value)
            elif s.action == 'check-in':
                if s.timestamp > a.date_due:
                    late_points = float(s.value)
                else:
                    ontime_points = float(s.value)
            elif s.action == 'check-off':
                checkoff = s.timestamp
            elif s.action == 'excuse':
                excused = (s.value == 'yes')
            else:
                continue
            last_submission = course.from_utc(s.timestamp);
        
        # now compute the earned score and reported status
        status = ''
        if not last_submission is None:
            earned_points = ontime_points
            penalty = 0
            status = last_submission.strftime(tfmt)

            # process any late submission
            if late_points > 0:
                # only receive half-credit for late points
                earned_points += late_points
                penalty = (late_points - ontime_points)/2.0
                status = 'Late ' + last_submission.strftime(tfmt)

            # see if a checkoff is required
            if not a.date_checkoff is None:
                if checkoff is None:
                    earned_points = None  # need checkoff to earn points
                    status = 'Need checkoff meeting'
                elif checkoff > a.date_checkoff:
                    # half-credit if checkoff is late
                    penalty += (earned_points - penalty)/2.0
                    status = 'Late checkoff meeting ' +  last_submission.strftime(tfmt)

            # update record if there are earned points
            if not earned_points is None:
                if excused:
                    status = 'excused'
                    penalty = 0
                # limit maximum penalty
                penalty = min(5,penalty)
                score['status'] = status
                score['score'] = '%g' % (earned_points - penalty)

        # add record to list
        result.append(score);
    return result

################################################################################
##  /grades/submit_score -- add a score
################################################################################

class submit_score(SessionHandler):
    def post(self,token):
        self.head()
        self.response.headers['Content-Type'] = 'text/html'

        if not user.validate_user(self) or self.request._user.status != 'staff':
            self.response.write('Only staff members can submit scores.')
            return

        email = self.request.get('email').strip()
        assignment = self.request.get('assignment').strip()
        action = self.request.get('action').strip()
        value = self.request.get('value').strip()
        notes = self.request.get('notes').strip()
        logging.info('email: '+email)

        message = ''
        u = user.find_user(None,email=email)
        if len(action) != 0:
            if u is None:
                message = "User %s doesn't exist." % email
            else:
                score = Score(subject = course.subject,
                              email = email,
                              submitter = self.request._email,
                              assignment = assignment,
                              action = action,
                              value = value,
                              notes = notes)
                score.put()

        # display a form for editing user info
        template_file = 'templates/submit_score.html'
        template_info = {
            'url': self.request.url.split('?')[0],   # strip argument(s), if any
            'status_url': self.request.url[:self.request.url.find('/grades/submit_score')],
            'message': message,
            'user': u,
            'assignments': course.assignments,
            'actions': get_scores(email),
        }

        path = os.path.join(os.path.dirname(__file__), template_file)
        self.response.write(template.render(path,template_info))

