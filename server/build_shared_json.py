import os,os.path,json

matches = []
top_level = 'shared'
for root, dirnames, filenames in os.walk(top_level):
  for filename in filenames:
    if filename[-1] == '~': continue  # ignore backup files
    # don't include name of top-level directory
    matches.append(os.path.join(root, filename)[len(top_level)+1:])

f = open('shared.json','w')
json.dump({'list': matches},f)
f.close()
