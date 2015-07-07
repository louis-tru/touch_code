#!/usr/bin/env node

var fs = require('fs');

var html = fs.readFileSync('./client/teide/touch/html/touch.htm').toString('utf-8');

html = html.replace(/ace-min\/ace.js\?v(\d+)/, 'ace-min/ace.js?v' + new Date().valueOf());

fs.writeFileSync('./client/teide/touch/html/touch.htm', html);

