#!/usr/bin/env python
import sys,os,cgi

# debugging
import cgitb; cgitb.enable()

# send header
print "Content-type: text/plain\n"

keys = os.environ.keys()
keys.sort()
for key in keys:
    print key,': ',os.environ[key]

