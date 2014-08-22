#! /usr/bin/python
# -*- mode: python -*-

# cgi-bin file server for 6.004 tools

import sys,os,os.path,shutil,cgi,cgitb,json
import zipfile,io,time,glob

# staff get privileges to look at any user's files
staff_list = [ 'cjt', 'ward', 'dnl', 'silvina', 'elg', 'haiiro', 'ciara', 'gkurian', 'phurst' ]

# where to find user files for the term
students = '/afs/csail.mit.edu/proj/courses/6.004/CurrentTerm/records/course/students/'

# appended to file names for backups and autosaves
backup_suffix = '_backup_'
autosave_suffix = '_autosave_'

# helper function: return contents of file
def read_file(fname):
    f = open(fname,'r')
    result = f.read()
    f.close()
    return result

# helper function: make any necessary subdirectories
def ensure_dirs(fname):
    dirname = os.path.dirname(fname)
    if not os.path.exists(dirname):
        os.makedirs(dirname)

# helper function: write contents to file, creating necessary subdirectories
def write_file(fname,contents):
    ensure_dirs(fname)

    # write new file contents
    f = open(fname,'w')
    f.write(contents)
    f.close()

# helper function: write contents to file, dealing with backup and autosave
def write_file_with_backup(fname,contents):
    # save old contents as backup
    if os.path.exists(fname):
        os.rename(fname,fname + backup_suffix)

    # remove autosave if any
    if os.path.exists(fname + autosave_suffix):
        os.remove(fname + autosave_suffix)

    write_file(fname,contents)

def application(environ, start_response):
    """
    # simple request printout
    status = '200 OK'
    #response = 'Hi<p>'+'<br>'.join(["%s" % lib for lib in shared_libs.keys()])
    #response = '<br>'.join(["%s: %s" % (k,v) for k,v in environ.items()])
    #args = cgi.FieldStorage(fp=environ['wsgi.input'],environ=environ,keep_blank_values=True)
    #response = '<br>'.join(["%s: %s" % (k,args[k].value) for k in args.keys()])
    response_headers = [('Content-type', 'text/html'),
                        ('Content-Length', str(len(response)))]
    start_response(status, response_headers)
    return [response]
    """

    status = '200 OK'
    response = {}
    response_headers = [('Access-Control-Allow-Origin','6004.mit.edu'),
                        ('Access-Control-Allow-Credentials','true'),
                        ('Content-type', 'application/json')]

    once = True;
    while (once):       # just to have something to break out of
        once = False;

        # all done when handling HEAD, OPTIONS request
        if not environ.get('REQUEST_METHOD','???') in ('POST', 'GET'):
            break

        # use email from MIT certificate, otherwise complain
        requester = environ.get('SSL_CLIENT_S_DN_Email','???')
        if requester == '???':
            response = {'_error': 'Unable to process request because your MIT certificate was invalid or was not sent by your browser.'}
            break
        else:
            requester = requester.lower()
        requester_name = environ.get('SSL_CLIENT_S_DN_CN','???')

        args = cgi.FieldStorage(fp=environ['wsgi.input'],environ=environ,keep_blank_values=True)
        user = requester
        username = requester_name

        # allow staff to ask for anyone's files
        staff = False
        if requester.split('@')[0] in staff_list:
            staff = True
            user = args.getvalue('user',requester)

        response['_user'] = user  # let requester know user's id

        # locate user's directory, create if necessary
        user_dir = os.path.join(students,user.split('@')[0])
        if not os.path.exists(user_dir):
            try:
                os.mkdir(user_dir)
            except:
                status = '500 Cannot create user directory: %s' % sys.exc_info()[0]
                break

        # find user's files, creating a 'files' directory if it doesn't exist
        user_dir = os.path.join(students,user.split('@')[0])
        if not os.path.exists(user_dir):
            response['_error'] = 'Invalid user'
            break
        user_dir = os.path.join(user_dir,'files')
        if not os.path.exists(user_dir):
            os.mkdir(user_dir,0666)

        # parse path, ignore leading slash
        command = environ.get('PATH_INFO','/')[1:].split('/')

        if command[0] == 'user':
            ###################################################################################
            ## ensure user is a valid 6.004 user
            ## url: ?_path=/user/validate
            ## returns: {'_user': email}
            ###################################################################################
            if len(command)==2 and command[1] == 'validate':
                # all users with MIT certificates are valid
                response['_user'] = user   # let server know who the user is
                response['_username'] = username
            else:
                response['_error'] = "Invalid user request: '"+'/'.join(command)+"'"

        elif command[0] == 'file':
            path = '/'.join(command[1:]).replace('..','')  # defend against .. in pathname
            action = args.getvalue('action','')

            ###################################################################################
            ## list all of user's files
            ## url: ?_path=/file&action=list
            ## returns: {"list": [filename, ...]}
            ###################################################################################
            if action == 'list':
                matches = []
                top_level = user_dir
                for root, dirnames, filenames in os.walk(top_level):
                    for filename in filenames:
                        if filename.endswith(backup_suffix): continue  # ignore backup files
                        if filename.endswith(autosave_suffix): continue  # ignore autosave files
                        # don't include name of top-level directory
                        matches.append(os.path.join(root, filename)[len(top_level)+1:])
                    # include directory names too, marked with trailing slash
                    for dirname in dirnames:
                        matches.append(os.path.join(root, dirname)[len(top_level)+1:]+'/')
                matches.sort()
                response['list'] = matches

                # for staff: also return list of all the users
                if staff:
                    ulist = [os.path.basename(s) for s in glob.glob(students+'*')]
                    ulist.sort()
                    response['users'] = ulist

            ###################################################################################
            ## load file, backup and autosave
            ## url: ?_path=/file/<filename>&action=load
            ## returns: {"file": contents, "autosave": contents, "backup": contents}
            ###################################################################################
            elif action == 'load':
                fname = os.path.join(user_dir,path)
                if not os.path.exists(fname):
                    response['_error'] = "File not found on load: "+path
                else:
                    response['file'] = read_file(fname)

                    # load backup if present
                    backup = fname + backup_suffix
                    if os.path.exists(backup):
                        response['backup'] = read_file(backup)

                    # load autosave if present
                    autosave = fname + autosave_suffix
                    if os.path.exists(autosave):
                        response['autosave'] = read_file(autosave)

            ###################################################################################
            ## write file, saving backup, removing autosave
            ## url: ?_path=/file/<filename>&action=save&contents=<file contents>
            ## returns: {}
            ###################################################################################
            elif action == 'save':
                contents = args.getvalue('contents','')
                write_file_with_backup(os.path.join(user_dir,path),contents)

            ###################################################################################
            ## create a new folder
            ## url: ?_path=/file/<foldername>&action=folder
            ## returns: {}
            ###################################################################################
            elif action == 'folder':
                fname = os.path.join(user_dir,path)
                if os.path.exists(fname):
                    # okay if folder already exists, otherwise complain
                    if not os.path.isdir(fname):
                        response['_error'] = "Folder conflicts with existing file:" + fname
                else:
                    # let helper function do the heavy lifting
                    ensure_dirs(os.path.join(fname,'dummy'))

            ###################################################################################
            ## write autosave file
            ## url: ?_path=/file/<filename>&action=autosave&contents=<file contents>
            ## returns: {}
            ###################################################################################
            elif action == 'autosave':
                contents = args.getvalue('contents',None)
                if contents is None:
                    response['_error'] = "No contents specified in autosave request"
                else:
                    write_file(os.path.join(user_dir,path + autosave_suffix),contents)

            ###################################################################################
            ## delete file/directory with specified path
            ## url: ?_path=/file/<path>&action=delete
            ## returns: {}
            ###################################################################################
            elif action == 'delete':
                fname = os.path.join(user_dir,path)
                if not os.path.exists(fname):
                    response['_error'] = "File not found on delete: "+path
                elif os.path.isdir(fname):
                    shutil.rmtree(fname)
                else: os.remove(fname)

            ###################################################################################
            ## rename file (along with backup and autosave)
            ## url: ?_path=/file/<oldname>&action=rename&path=<newname>
            ## returns: {}
            ###################################################################################
            elif action == 'rename':  # rename path to specified name
                fname = os.path.join(user_dir,path)
                newname = args.getvalue('path','').replace('..','')
                if not os.path.exists(fname):
                    response['_error'] = "File not found on rename: "+path
                elif newname == '':
                    response['_error'] = "No path specifed on rename"
                elif os.path.exists(os.path.join(user_dir,newname)):
                    response['_error'] = "File already exists in rename: "+newname
                else:
                    newname = os.path.join(user_dir,newname)
                    ensure_dirs(newname)
                    os.rename(fname,newname)
                    # rename backup and autosave too
                    if os.path.exists(fname + backup_suffix):
                        os.rename(fname + backup_suffix,newname + backup_suffix)
                    if os.path.exists(fname + autosave_suffix):
                        os.rename(fname + autosave_suffix,newname + autosave_suffix)

            ###################################################################################
            ## download zip archive of user's files
            ## url: ?_path=/file&action=zip
            ###################################################################################
            elif action == 'zip':
                result = io.BytesIO()
                zip = zipfile.ZipFile(result,'a')   # append new archive to empty file

                # include each user file in the archive, skip backups and autosaves
                for root, dirnames, filenames in os.walk(user_dir):
                    for filename in filenames:
                        if filename.endswith(backup_suffix): continue
                        if filename.endswith(autosave_suffix): continue
                        fname = os.path.join(root, filename)  # full path to file
                        # set up correct info for archive member
                        info = zipfile.ZipInfo(filename=fname[len(user_dir)+1:])
                        mtime = time.localtime(os.stat(fname).st_mtime)
                        info.date_time = (mtime.tm_year,
                                          mtime.tm_mon,
                                          mtime.tm_mday,
                                          mtime.tm_hour,
                                          mtime.tm_min,
                                          mtime.tm_sec)
                        info.create_system = 0   # fix for Linux zip files read in windows
                        zip.writestr(info,bytes(read_file(fname)))

                zip.close()

                # return archive as an attachment
                response = result.getvalue()
                response_headers = [('Content-type', 'application/x-zip-compressed'),
                                    ('Content-Disposition','attachment; filename=computation_structures.zip')]

                break

            else:
                response['_error'] = "Invalid file action: '"+action+"'"

        else:
            response['_error'] = "Invalid request: '"+'/'.join(command)+"'"

    # send response to user
    if isinstance(response,dict):
        response = json.dumps(response)
    response_headers.append(('Content-Length', str(len(response))))
    start_response(status, response_headers)
    return [response]
