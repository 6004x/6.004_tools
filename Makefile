deploy:
	grunt
	rsync -avz -e ssh built/* 6004.mit.edu:coursewarex/
	cd server; python build_shared_json.py
	rsync -avz -e ssh server/shared.json server/shared 6004.mit.edu:coursewarex/

debug:
	rsync -avz -e ssh jsim bsim editor fileSystem libs 6004.mit.edu:coursewarex/debug/
