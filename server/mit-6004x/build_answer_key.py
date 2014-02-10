import fnmatch,os,re,json

# find all html files
matches = []
for root, dirnames, filenames in os.walk('..'):
    # eliminate directories starting with underscore
    i = 0
    while i < len(dirnames):
        if dirnames[i].startswith('_'):
            del dirnames[i]
        else:
            i += 1
    # now match html files at this level
    for filename in fnmatch.filter(filenames, '*.html'):
        matches.append(os.path.join(root, filename))

answer_key = {}
functions = {}
fcount = 0;

# search for answer tags
for fname in matches:
    f = open(fname)
    html = f.read()
    f.close()
    filename = fname[2:]   # strip off ".." at front

    for div in re.finditer(r"""<div\s*?class="answer.*?</div>""",html,flags=re.S):
        text = html[div.start():div.end()]
        id = re.search(r"""id=\"([a-zA-Z0-9_\-]*?)\"""",text,flags=re.S)
        if id is None:
            print fname
            print "   Answer has no id at position",div.start()
            continue
        else: id = id.group(1)

        info = re.search(r"""\{\% comment \%\}(.*?)\{\% endcomment \%\}""",text,flags=re.S)
        if info is None:
            print fname
            print "   Answer has no check expression at position",div.start()
            continue
        else: info = info.group(1)

        if not answer_key.has_key(filename):
            answer_key[filename] = {}
        if answer_key[filename].has_key(id):
            print fname
            print "  Duplicate answer ID",id
            continue

        if info.find('\n') == -1:
            answer_key[filename][id] = info.strip()
        else:
            fcount += 1
            answer_key[filename][id] = 'check%d(answer)' % fcount
            functions['check%d' % fcount] = info[1:-1]

f = open('answer_key.py','w')
# write out function definitions
f.write('import math\n\n')
f.write('from checker_utils import *\n\n')
for fname,body in functions.items():
    f.write('def %s(answer):\n' % fname)
    for line in body.split('\n'):
        f.write('    '+line+'\n')
    f.write('\n')
f.write('answer_key = {\n')
for fname,answers in answer_key.items():
    f.write('  "%s": {\n' % fname)
    for id in answers.keys():
        f.write('    "%s": (lambda (answer): %s),\n' % (id,answers[id]))
    f.write('  },\n')
f.write('}\n')
f.close()
