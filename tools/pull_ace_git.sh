#!/bin/sh

mkdir -p out

cd out

if [ ! -d ace_git ]
then
	git clone https://github.com/louis-tru/ace.git ace_git
	git remote add root https://github.com/ajaxorg/ace.git
	cd ace_git
	git checkout -b mobile2
else
  cd ace_git
fi

# update master
git checkout master
git pull origin master
git fetch root
git merge root/master
git commit -a -m 'Update root master'
git push origin master
# 

# update mobile2
git checkout mobile2
git pull origin mobile2
#

# cp -rf ../../client/third_party/ace/* ./
# find . -name .svn|xargs rm -rf
# find . -name .bin|xargs rm -rf
# find . -name .DS_Store|xargs rm -rf
# rm -rf ./build
# rm -rf ./lib/ace/snippets/mask.snippets
# rm -rf ./lib/ace/snippets/mask.js
# rm -rf Makefile
# git checkout Makefile

# git add ./*
# git commit -a -m 'Sync and commit the ace all to git'
# git push origin mobile2
