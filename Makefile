# Default target: gives brief help
what:
	@echo "Make what?  Plausible args include"
	@echo "  make clean: get rid of temp files"
	@echo "  make grunt: minify to built/ directory"
	@echo "  make deploy_6004: copy minified tools to 6004.mit.edu"
	@echo "  make deploy_debug: copy tools to 6004.mit.edu/courseware/debug"
	@echo "  make deploy_shared: copy shared files to 6004.mit.edu/courseware/debug"
	@echo "  make osx_link: add 6.004x link to mac os x webserver document root"

clean:
	- find . -type f -name "*~" -exec rm -rf {} \;
	- find . -type f -name "*.pyc" -exec rm -rf {} \;
	- find . -type f -name ".DS_Store" -exec rm -rf {} \;
	- rm -rf built

grunt:
	grunt

deploy_6004:
	grunt
	rsync -av --delete -e ssh built/* 6004.mit.edu:coursewarex/

deploy_debug:
	rsync -av --delete -e ssh jsim bsim editor fileSystem libs 6004.mit.edu:coursewarex/debug/

deploy_shared:
	rsync -av --delete -e ssh server/shared.json server/shared 6004.mit.edu:coursewarex/

deploy_github:
	grunt
	rsync -av -e ssh built/* ../6004x.github.io/tools/
	rsync -av -e ssh server/shared.json server/shared ../6004x.github.io/labs/

osx_link:
	sudo ln -s `pwd` /Library/WebServer/Documents/6.004x
