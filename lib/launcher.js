/**
 * iOS Launching
 */
var path = require('path'),
	fs = require('fs'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	buildlib = require('./buildlib'),
	util = hyperloop.util,
	connectedDevices,
	version = '2',
	checksum = '5ac52585a28d7bdd3005a049ba046e1366056998', // calculated sha1 on file buffer
	url = 'http://timobile.appcelerator.com.s3.amazonaws.com/ios-sim/ios-sim-' + version + '.zip';

/**
 * stop a running ios simulator
 */ 
function killSimulator (callback) {
	exec("osascript -e 'tell app \"iPhone Simulator\" to quit'", callback);
}

/**
 * install and launch the ios device
 */
function executeDevice(name, build_dir, settings, callback, callback_logger, hide, device_id, quiet, unit, launch_timeout) {
	var ios_deploy = path.join(__dirname,'..','..','node_modules','ios-deploy');
	if (!fs.existsSync(ios_deploy)) {
		if (!process.stdout.isTTY) {
			return callback("please run `npm install ios-deploy` to install the required library for iOS device routines");
		}
		function install() {
			var dir = process.cwd(),
				todir = path.join(__dirname,'..','..'),
				cmd = '/usr/bin/osascript "' + path.join(__dirname,'ios_deploy.scpt') + '"';
			process.chdir(todir);
			log.info('Installing .... Please enter your machine credentials when prompted.');
			exec(cmd, function(err,stdout,stderr){
				if (err) { return callback(stderr || stdout || err); }
				log.info('Installed!');
				process.chdir(dir);
				var license = path.join(ios_deploy,'LICENSE');
				if (fs.existsSync(license)) {
					log.info('ios-deploy license available in',license);
					log.info(fs.readFileSync(license,'utf8').toString().yellow.bold);
				}
				else {
					return callback("Couldn't install ios-deploy library. Manually install with `sudo npm install ios-deploy -g`");
				}
				run();
			});
		}
		if (quiet) {
			// skip the prompting
			return callback("please run `npm install ios-deploy` to install the required library for iOS device routines");
		}
		else {
			var prompt = require('prompt');
			prompt.start();
			prompt.message='';
			prompt.delimiter='';
			console.log('\nThe node library `ios-deploy` is required to install on iOS devices.\n'.red);
			var property = {
			  name: 'yesno',
			  message: 'Download and install (yes or no)?',
			  validator: /y[es]*|n[o]?/i,
			  warning: 'Must respond yes or no',
			  default: 'yes'
			};
			prompt.get(property, function(err,result){
				if (!/^y/.test(result.yesno)) {
					log.info("Exiting without continuing...");
					return callback();
				}
				else {
					install();
				}
			});
		}
	}	
	else {
		run();
	}

	function run () {
		var i = path.join(ios_deploy,'ios-deploy'),
			args = ['--debug', '--verbose','--uninstall', '--noninteractive', '--bundle', build_dir, '--id', device_id],
			name = path.basename(build_dir).replace(/\.app$/,''),
			logRE = new RegExp(name+'\\[\\w+\\:\\w+\\]\\s+(.*)'),
			timer = launch_timeout ? setInterval(checkTimeout,launch_timeout) : null,
			lastLog;

		function checkTimeout() {
			if (Date.now()-lastLog >= launch_timeout) {
				killIOSDeploy(callback);
			}
		}

		function killIOSDeploy(next) {
			log.debug('killIOSDeploy');
			timer && clearInterval(timer);
			exec('/usr/bin/killall ios-deploy',next);
		}

		log.debug(i,args.join(' '));
		var child = spawn(i, args);
		process.on('SIGINT', function(){
			killIOSDeploy();
			process.exit();
		});
		log.info('------- '+('device log begins'.magenta.bold)+' -------');
		var sigkill = false;
		function logger(label, buf) {
			lastLog = Date.now();
			buf && buf.split(/\n/).forEach(function(line){
				var m = line && logRE.exec(line);
				m && log[label](m[1]);
			});
		}
		child.stdout.on('data',function(buf){
			buf = String(buf);
			if (buf.indexOf('stop reason = signal SIGKILL')!==-1 || 
				buf.indexOf('-> 0x39a4da50:  pop    {r4, r5, r6, r8}')!==-1) {
				sigkill = true;
			}
			else {
				logger('debug',buf);
			}
		});
		child.stderr.on('data',function(buf){
			logger('error',String(buf));
		});
		child.on('error',function(buf){
			logger('error',String(buf));
		});
		child.on('exit',function(exitCode){
			var msg;
			switch (exitCode) {
				case 253: {
					//exitcode_error
					msg = "The application exited with an error";
					break;
				}
				case 254: {
					//exitcode_app_crash
					if (sigkill) {
						log.info("The application was killed by the user");
					}
					else {
						msg = "The application crashed";
					}
					break;
				}
				default: {
					msg = 'The application exited with exitCode '+exitCode;
					log.info(msg);
					break;
				}
			}
			timer && clearInterval(timer);
			callback && callback(exitCode==0?null:msg);
		});
	}
}

/**
 * launch the ios simulator
 */
function executeSimulator(name, build_dir, settings, callback, callback_logger, hide, unit, launch_timeout) {
	
	var homeDir = util.writableHomeDirectory(),
		timer = launch_timeout ? setInterval(checkTimeout,launch_timeout) : null,
		lastLog,
		_finished = false;

	if (unit && hide === undefined) {
		hide = true;
	}

	function finished() {
		if (!_finished) {
			_finished = true;
			if (callback) {
				var args = arguments,
					cb = callback;
				process.nextTick(function(){
					cb.apply(cb,args);
				});
				callback = null;
			}
			if (timer) {
				clearInterval(timer);
				timer = null;
			}
		}
	}

	// stop signal if we ctrl-c from the console
	process.on('SIGINT', function() {
		killSimulator();
		process.exit();
	});

	function checkTimeout() {
		if (Date.now()-lastLog >= launch_timeout) {
			finished("launch timed out");
			killSimulator();
			clearInterval(timer);
			timer=null;
		}
	}

	// make sure we kill the simulator before we launch it
	killSimulator(function(){
		util.downloadResourceIfNecessary('ios-sim', version, url, checksum, homeDir, function(err) {
			var ios_sim = path.join(homeDir, 'ios-sim', 'ios-sim'),
				args = ['launch', build_dir, '--sdk', settings.version, '--retina'];

			log.debug('launch ios-sim with args:', args.join(' ').grey);
			
			var simulator = spawn(ios_sim, args),
				logOut = new RegExp('^\\[(INFO|DEBUG|WARN|TRACE|ERROR|FATAL)\\]\\s+(\\d+-\\d+-\\d+\\s\\d+:\\d+:\\d+\\.\\d+)\\s+'+name+'\\[\\w+:\\w+\\]\\s(.*)'),
				TI_MOCHA_UNIT = unit && /TI_MOCHA_UNIT=(.*)/,
				AUTO_EXIT = unit && /TI_EXIT/; //hook to cause simulator to exit if this is in the log

			function splitLogs(line, err) {
				lastLog = Date.now();
				if (err) {
					if (/AssertMacros: queueEntry/.test(line)) {
						return;
					}
					if (/Terminating in response to SpringBoard/.test(line)) {
						return finished();
					}
				}
				var lastLabel = 'info';
				line.split(/\n/).forEach(function(content) {
					if (AUTO_EXIT && AUTO_EXIT.test(content)) {
						return killSimulator(function(){
							timer && clearInterval(timer);
							finished();
						});
					}			
					if (TI_MOCHA_UNIT && TI_MOCHA_UNIT.test(content)) {
						var results = TI_MOCHA_UNIT.exec(content)[1];
						results && log.info(results);
						return killSimulator(function(){
							timer && clearInterval(timer);
							finished(null, JSON.parse(results));
						});
					}
					var match = logOut.exec(content);
					if (match) {
						var label = lastLabel = match[1],
							msg = match[3];
						switch (label) {
							case 'INFO':
							{
								if (callback_logger && callback_logger.info) {
									return msg && callback_logger.info(msg);
								}
								return log.info(msg);
							}
							case 'TRACE':
							{
								if (callback_logger && callback_logger.trace) {
									return msg && callback_logger.trace(msg);
								}
								return log.trace(msg);
							}
							case 'DEBUG':
							{
								if (callback_logger && callback_logger.debug) {
									return msg && callback_logger.debug(msg);
								}
								return log.debug(msg);
							}
							case 'WARN': {
								if (callback_logger && callback_logger.warn) {
									return msg && callback_logger.warn(msg);
								}
								return log.warn(msg);
							}
							case 'FATAL':
							case 'ERROR':
							{
								if (callback_logger && callback_logger.error) {
									return msg && callback_logger.error(msg);
								}
								return log.error(msg);
							}
						}
					}
					else if (content) {
						var p = lastLabel.toLowerCase();
						if (callback_logger && callback_logger[p]) {
							return content && callback_logger[p](content);
						}
						log[p](content);
					}
				});

			}

			function logger(data, err) {
				var buf = String(data).trim();
				buf && splitLogs(buf, err);
			}
		
			log.info('------- '+('simulator log begins'.magenta.bold)+' -------');

			simulator.stderr.on('data', function(data) {
				logger(data, true);
			});

			simulator.stdout.on('data', logger);

			simulator.on('close', function() {
				timer && clearInterval(timer);
				finished();
			});

			if (!hide) {
				// bring forward the simulator window
				var scpt = path.join(__dirname, 'iphone_sim_activate.scpt'),
					asa = path.join(settings.xcodePath, 'Platforms', 'iPhoneSimulator.platform', 'Developer', 'Applications', 'iPhone Simulator.app'),
					cmd = 'osascript "' + path.resolve(scpt) + '" "' + asa + '"';
				exec(cmd);
			}
		});
	});
}

/**
 * detect and return device id or null if no device is connected
 */
function detectConnectedDevices (callback) {
	if (connectedDevices) { return callback(null, connectedDevices); }

	var cmd = "/usr/sbin/system_profiler SPUSBDataType | sed -n -e '/iPad/,/Serial/p' -e '/iPhone/,/Serial/p' | grep \"Serial Number:\" | awk -F \": \" '{print $2}'";
	exec(cmd, function(err,stdout,stderr){
		if (err) {
			return callback(stderr);
		}
		var uuids = connectedDevices = stdout.trim().split('\n');
		callback(null, uuids.length ? uuids : null);
	});
}

exports.executeSimulator = executeSimulator;
exports.executeDevice = executeDevice;
exports.detectConnectedDevices = detectConnectedDevices;
