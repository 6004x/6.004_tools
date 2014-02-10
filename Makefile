# Default target: gives brief help
what:
	@echo "Make what?  Plausible args include"
	@echo "  make clean: get rid of temp files"
	@echo "  make grunt: minify to built/ directory"
	@echo "  make debug: copy tools/files to 6004.mit.edu/courseware/debug"
	@echo "  make deploy_6004: copy minified tools/files to 6004.mit.edu"
	@echo "  make osx_link: add 6.004x link to mac os x webserver document root"

clean:
	- find . -type f -name "*~" -exec rm -rf {} \;
	- find . -type f -name "*.pyc" -exec rm -rf {} \;
	- rm -rf built

grunt:
	grunt

deploy_6004:
	grunt
	rsync -avz -e ssh built/* 6004.mit.edu:coursewarex/
	rsync -avz -e ssh server/shared.json server/shared 6004.mit.edu:coursewarex/

debug:
	rsync -avz -e ssh jsim bsim editor fileSystem libs 6004.mit.edu:coursewarex/debug/

osx_link:
	sudo ln -s `pwd` /Library/WebServer/Documents/6.004x