[![Build Status](https://secure.travis-ci.org/wdavidw/node-ssh2-exec.png)][travis]

Node.js ssh2-exec
=================

The Node.js `ssh2-exec` package extends the [`ssh2`][ssh2] module to provide transparent usage between 
the `child_process.exec` and `ssh2.prototype.exec` functions.

Installation
------------

This is OSS and licensed under the [new BSD license][license].

```bash
npm install ssh2-exec
```

Usage
-----

Requiring the module export a single function. Its signature is:

`exec(sshOrNull, command, [options], [callback])`

Or

`exec(options, [callback])`

Like in the native NodeJS API, the callback is not required in case you wish to 
work with the returned child stream. The "sshOrNull" and "command" arguments are
also facultative because they could be provided respectively as the "ssh" and 
"cmd" property of the options object.

Valid `options` properties are:   

-   `ssh`   SSH connection if the command must run remotely   
-   `cmd`   Command to run unless provided as first argument   
-   `cwd`   Current working directory   
-   `end`   Close the SSH connection on exit, default to true if an ssh connection instance is provided.   
-   `env`   An environment to use for the execution of the command.   
-   `pty`   Set to true to allocate a pseudo-tty with defaults, or an object containing specific pseudo-tty settings. Apply only to SSH remote commands.   
-   `cwd`   Apply only to local commands.   
-   `uid`   Apply only to local commands.   
-   `gid`   Apply only to local commands.   

See the [ssh2] and [ssh2-connect] modules on how to create a new SSH connection. 

Examples
--------

A command, a configuration object and a callback:

```js
connect = require('ssh2-connect');
exec = require('ssh2-exec');
connect({host: localhost}, function(err, ssh){
  exec('ls -la', {ssh: ssh}, (err, stdout, stderr){
    console.log(stdout);
  });
});
```

A configuration object with a ssh2 connection and working a the return child object:

```js
connect = require('ssh2-connect');
exec = require('ssh2-exec');
connect({host: localhost}, function(err, ssh){
  child = exec({cmd: 'ls -la', ssh: ssh}, function(err, stdout, stderr){
    console.log(stdout);
  });
  child.stdout.on('data', function(data){
    console.log(stdout);
  });
  child.on('exit', function(code){
    console.log('Exit', code);
  });
})
```

Development
-----------

Tests are executed with mocha. To install it, simple run `npm install`, it will install
mocha and its dependencies in your project "node_modules" directory.

To run the tests:
```bash
npm test
```

The tests run against the CoffeeScript source files.

To generate the JavaScript files:
```bash
make build
```

The test suite is run online with [Travis][travis] against Node.js version 0.6, 0.7, 0.8 and 0.9.

Contributors
------------

*   David Worms: <https://github.com/wdavidw>

[travis]: http://travis-ci.org/wdavidw/node-ssh2-exec
[ssh2]: https://github.com/mscdex/ssh2
[ssh2-connect]: https://github.com/wdavidw/node-ssh2-connect
[license]: https://github.com/wdavidw/node-ssh2-exec/blob/master/LICENSE.md
