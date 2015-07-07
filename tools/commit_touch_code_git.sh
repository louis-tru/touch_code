#!/bin/sh

mkdir -p out

cd out

if [ ! -d touch_code_git ]
then
	git clone https://github.com/louis-tru/touch_code.git touch_code_git
fi

cd touch_code_git

git checkout master
git pull

cp -rf ../../client ./
cp -rf ../../server ./
cp -rf ../../node_modules ./
cp -rf ../../tools ./
cp -rf ../../Makefile ./
cp -rf ../../LICENSE ./
cp -rf ../../ChangeLog ./

find . -name .svn|xargs rm -rf
find . -name .bin|xargs rm -rf
find . -name .DS_Store|xargs rm -rf
rm -rf ./client/.file.map
rm -rf ./client/third_party/ace/build
rm -rf ./client/third_party/ace/lib/ace/snippets/mask.snippets
rm -rf ./client/third_party/ace/lib/ace/snippets/mask.js

git add ./*
git commit -a -m 'Sync and commit the touch_code all to git'
git push origin master
