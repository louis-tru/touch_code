
NODE ?= node

.PHONY: all build_js build_ace build_svn \
	gen_node_xcodeproj run_debug commit_touch_code_git pull_ace_git
 
.SECONDEXPANSION:

help:
	@echo 
	@echo make help
	@echo make build_ace
	@echo make build_js
	@echo make build_svn
	@echo make gen_node_xcodeproj
	@echo make run_debug
	@echo make commit_touch_code_git
	@echo make pull_ace_git
	@echo

all: build_ace build_js build_svn gen_node_xcodeproj

build_ace:
	cd ./client/third_party/ace; \
	rm -rf build; \
	make build
	# if [ ! -d ace-min ]; then mkdir ace-min ; fi
	mkdir -p ./client/ace-min
	rm -rf ./client/ace-min/*.js
	rm -rf ./client/ace-min/snippets/*.js
	cp -rf ./client/third_party/ace/build/src-min/* ./client/ace-min/
	$(NODE) ./tools/update_build_touch_code_ace.js

build_js:
	@$(NODE) server/tesla/tesla.js pub_touch.js

build_svn:
	cd ./third_party/subversion-1.8.13/apr; ./build-ios.sh
	cd ./third_party/subversion-1.8.13/apr-util; ./build-ios.sh
	cd ./third_party/subversion-1.8.13/serf; ./build-ios.sh
	cd ./third_party/subversion-1.8.13; ./build-ios.sh

gen_node_xcodeproj:
	cd third_party/node.x; make

run_debug:
	@echo http://127.0.0.1:8081/touch_debug 
	@$(NODE) server/tesla/tesla.js touch.js --debug

commit_touch_code_git:
	sh ./tools/commit_touch_code_git.sh
	
pull_ace_git:
	sh ./tools/pull_ace_git.sh
