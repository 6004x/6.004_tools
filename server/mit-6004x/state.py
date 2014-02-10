import datetime,json,sys,io,zipfile,os.path
from StringIO import StringIO
import webapp2,logging
from google.appengine.ext import db
from google.appengine.ext.webapp import template

from sessions import SessionHandler
import user   # user services
from answer_key import answer_key

# state entity -- json state for pages, text for user files
# has user as parent entity
class State(db.Model):
    email = db.EmailProperty(required=True)   # unique user identifier
    stype = db.StringProperty(required=True)  # 'page', 'file', 'autosave', 'backup'
    path = db.StringProperty(required=True)   # page URL or filename
    state = db.TextProperty(default='{}')     # json for pages, text for files
    timestamp = db.DateTimeProperty()         # time of last save

################################################################################
##  answer checking
################################################################################

# returns 'right', 'wrong' or 'not graded'
# makes appropriate annotation of user's answer
def check_answer(id,handler,answers):
    # did user answer this question?
    if answers.has_key(id):
        answer = answers[id]   # user's answer
        # get value supplied by user
        value = answer.get('value')
        if value is None:
            answer['message'] = 'System error: answer value missing.'
            return 'not graded'
        # do we have a handler for this id?
        if handler is None:
            answer['message'] = "Missing checker for question "+id
            return 'not graded'
        # grade the answer
        try:
            grade,message = handler(value)
        except:
            grade = 'not graded'
            message = 'Oops, internal error: '+sys.exc_info()[0]
        # annotate answer with response
        if not message is None:
            answer['message'] = message
        if grade != 'not graded':
            answer['check'] = grade
            return grade
    return 'not graded'

def check_answers(path,state):
    # convert json string into data structure
    jstate = json.loads(state)

    # are there answers to check?
    if isinstance(jstate,dict) and jstate.has_key('answers'):
        # see if we have answer key
        if answer_key.has_key(path):
            # run through each answer in key, checking user's answer
            answers = jstate['answers']
            handlers = answer_key[path]
            summary = {}  # how many of each grade
            for id in handlers.keys():
                grade = check_answer(id,handlers.get(id),answers)
                summary[grade] = summary.get(grade,0) + 1
            # remember how user did on this document
            jstate['check'] = summary
        else:
            jstate['message'] = "Sorry, server doesn't have answer key for this document."

        # back to json representation
        state = json.dumps(jstate)

    # return updated state
    return state

################################################################################
##  /state/path   -- load/save state associated with path
##
##  - per-user/per-path state is JSON string representing a dictionary with keys
##      "answers": {problem_id: {"value": string, "grade": grade_string, "message": string}, ...}
##      "check": {grade_string: count, ...}
##      "message": status string to be displayed at top of page
##    grade string is one of 'not graded', 'right', 'wrong'
##
##  - post requests that have a "state" attribute  will run that JSON
##    through the checker, which adds "grade" and "message" annotations, along
##    with the top-level "check" summary of results, then updates the database
##
##  - all requests return current (updated) JSON state object
##
################################################################################

class page_state(SessionHandler):
    def post(self,path):
        self.head()
        if not user.validate_user(self):
            self.response.write(json.dumps({"_error": "Invalid email or password"}));
        else:
            # get user's state associated with path
            q = db.GqlQuery("SELECT * from State WHERE stype = 'page' and email = :1 and path = :2",
                            self.request._email,path)
            state_entity = q.get()

            # if new state is supplied, update/insert user's state entry for this path
            new_state = self.request.params.get('state',None)
            if not new_state is None:
                # check the answers, annotate state
                new_state = check_answers(path,new_state)

                if state_entity is None:
                    state_entity = State(parent = self.request._user,   # user is parent of State entity
                                         email = self.request._email,
                                         stype = 'page',
                                         path = path)
                state_entity.state = new_state
                state_entity.timestamp = datetime.datetime.utcnow()
                state_entity.put()
                #logging.debug('user:%s, path:%s, new_state:%s'% (self.request._email,path,new_state))

            # response with saved state
            self.response.write('{}' if state_entity is None else state_entity.state);

################################################################################
##  /file/path   -- provide a server-side file system for the lab tools
##
##  Files have names, contents and a stype (file, autosave, backup)
##  Filenames are just strings, but user may interpret them as hierarchical  
##
##  all get/post requests must have an "action" attribute:
##
##  'load': return {"file": contents, "autosave": contents, "backup": contents}
##          or {"_error": string}
##
##  'save': save current 'file' contents as 'backup'
##          remove 'autosave' record
##          'contents' attribute stored to 'file' record
##          returns {} or {"_error": string}
##
##  'autosave': 'contents' attribute stored to 'autosave' record
##          returns {} or {"_error": string}
##
##  'delete': remove 'file', 'autosave' and 'backup' records
##          returns {} or {"_error": string}
##
##  'rename': use 'path' attribute to update 'file', 'autosave' and 'backup' records
##          returns {} or {"_error": string}
##
##  'list': returns {"list": [filename, ...]} or {"_error": string}
##          
################################################################################

class file_state(SessionHandler):
    # find existing entity
    def find_record(self,path,stype):
        q = db.GqlQuery("SELECT * from State WHERE email = :1 and path = :2 and stype = :3",
                        self.request._email,path,stype)
        return q.get()

    # return existing entity or create a new one
    def get_record(self,path,stype):
        record = self.find_record(path,stype)
        if record is None:
            record = State(parent = self.request._user,   # user is parent of State entity
                           email = self.request._email,
                           stype = stype,
                           path = path)
        return record

    # update record
    def put_record(self,record,state,timestamp=None):
        record.state = state
        if timestamp is None:
            record.timestamp = datetime.datetime.utcnow()
        else:
            record.timestamp = timestamp
        record.put()

    # save a new version of a file, preserving previous version, if any
    # as backup and deleting any autosave version
    def save_file(self,path,contents,timestamp=None):
        file = self.get_record(path,'file')  # create if necessary
        if file.timestamp:
            # save old contents as 'backup', preserve timestamp
            backup = self.get_record(path,'backup')
            backup.timestamp = file.timestamp
            backup.state = file.state
            backup.put()

            # delete autosave, if any
            autosave = self.find_record(path,'autosave')
            if autosave: db.delete(autosave)
        self.put_record(file,contents,timestamp=timestamp)

    def post(self,path):
        self.head()
        if not user.validate_user(self):
            self.response.write(json.dumps({"_error": "Invalid email or password"}));
        else:
            # dispatch on action
            action = self.request.params.get('action',None)

            # autosave -- save contents in 'autosave' record
            if action == 'autosave':
                contents = self.request.params.get('contents',None)
                if contents is None:
                    self.response.write(json.dumps({"_error": "No contents specified in autosave request"}))
                else:
                    self.put_record(self.get_record(path,'autosave'),contents)
                    self.response.write('{}');

            # load -- return contents of 'file', 'autosave' and 'backup' records
            elif action == 'load':
                #logging.debug("%s, %s" % (self.request._user,path))
                file = self.find_record(path,'file')
                if file is None:
                    self.response.write(json.dumps({"_error": "File not found on load: "+path}));
                else:
                    # return dict holding 'file', 'autosave' and 'backup' contents
                    result = {'file': file.state}
                    file = self.find_record(path,'autosave')
                    if file: result['autosave'] = file.state
                    file = self.find_record(path,'backup')
                    if file: result['backup'] = file.state
                    self.response.write(json.dumps(result))

            # save -- save contents in 'save' record, putting old contents in 'backup'
            # delete 'autosave' record, if any
            elif action == 'save':
                contents = self.request.params.get('contents',None)
                if contents is None:
                    self.response.write(json.dumps({"_error": "No contents specified in save request"}))
                else:
                    self.save_file(path,contents)
                    self.response.write('{}')

            # folder -- create new folder
            elif action == 'folder':
                self.save_file(path,'')
                self.response.write('{}')

            # list -- list of user's files
            elif action == 'list':
                q = db.GqlQuery("SELECT path from State WHERE email = :1 and stype = 'file'",
                                self.request._email)
                flist = [s.path for s in q.run(batch_size=1000)]
                self.response.write(json.dumps({"list": flist}))

            # delete -- remove all records with specified path prefix
            elif action == 'delete':
                # look up all the user's files
                q = db.GqlQuery("SELECT * from State WHERE email = :1 and stype = 'file'",
                                self.request._email)
                # run through user's files looking for path prefix
                found = False
                for file in q.run(batch_size=1000):
                    if file.path.startswith(path):
                        victim = file.path
                        db.delete(file)
                        found = True

                        # delete 'backup' and 'autosave' records, if any
                        file = self.find_record(victim,'backup')
                        if file: db.delete(file)
                        file = self.find_record(victim,'autosave')
                        if file: db.delete(file)
                if not found:
                    self.response.write(json.dumps({"_error": "File not found on delete: "+path}))
                else:
                    self.response.write('{}')

            # rename -- change path on 'file', 'autosave' and 'backup' records
            elif action == 'rename':
                file = self.find_record(path,'file')
                if file:
                    newpath = self.request.params.get('path',None)
                    if newpath is None:
                        self.response.write(json.dumps({"_error": "No path specified on rename"}))
                    else:
                        newfile = self.find_record(newpath,'file')
                        if newfile:
                            self.response.write(json.dumps({"_error": "File already exists: "+newpath}))
                        else:
                            # rename file by changing the path field, don't update timestamp
                            file.path = newpath
                            file.put()
                            # rename backup and autosave records too
                            file = self.find_record(path,'backup')
                            if file:
                                file.path = newpath
                                file.put()
                            file = self.find_record(path,'autosave')
                            if file:
                                file.path = newpath
                                file.put()
                            self.response.write('{}')
                else:
                    self.response.write(json.dumps({"_error": "File not found on rename: "+path}))

            # zip -- return a zip file containing all the user's files
            elif action == 'zip':
                result = io.BytesIO()
                zip = zipfile.ZipFile(result,'a')   # append new archive to empty file

                # each each user file to the archive
                q = db.GqlQuery("SELECT * from State WHERE email = :1 and stype = 'file'",
                                self.request._email)
                for file in q.run(batch_size=1000):
                    # set up correct info for archive member
                    info = zipfile.ZipInfo(filename=file.path)
                    info.date_time = (file.timestamp.year,
                                      file.timestamp.month,
                                      file.timestamp.day,
                                      file.timestamp.hour,
                                      file.timestamp.minute,
                                      file.timestamp.second)
                    info.create_system = 0   # fix for Linux zip files read in windows
                    zip.writestr(info,bytes(file.state))

                zip.close()

                self.response.headers['Content-Type'] = 'application/x-zip-compressed'
                self.response.headers['Content-Disposition'] = 'attachment; filename=computation_structures.zip'
                self.response.write(result.getvalue())

            # upload -- upload a file
            elif action == 'upload':
                if len(self.request.get('upload')) > 0:
                    userfile = self.request.POST.multi['userfile']
                    if os.path.splitext(userfile.filename)[1] == '.zip':
                        # user uploaded a .zip file
                        zip = zipfile.ZipFile(StringIO(userfile.file.read()))
                        for info in zip.infolist():
                            timestamp = datetime.datetime(*info.date_time)
                            self.save_file(info.filename,zip.read(info),timestamp=timestamp)
                    else:
                        # user uploaded a single file
                        path = os.path.basename(userfile.filename)
                        self.save_file(path,userfile.file.read())

                # give a user a form to submit their file
                path = os.path.join(os.path.dirname(__file__), 'templates/upload.html')
                self.response.headers['Content-Type'] = 'text/html'
                self.response.write(template.render(path,{'url': self.request.url}))

            else:
                self.response.write(json.dumps({"_error": "Unrecognized file action: "+str(action)}))
