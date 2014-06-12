/*
 * Launcher
 */
var hyperloop = require('../../lib/dev').require('hyperloop-common'),
	log = hyperloop.log,
	Command = hyperloop.Command,
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	ioslib = require('ioslib');

module.exports = new Command(
	'launch',
	'Launch the application in either the iOS simulator or on an iOS device',
	[
	],
	function(state,done) {
		try {
			var options = state.options,
				tasks = [],
				arch = /(i386|simulator)/.test(state.arch || options.arch || 'i386') ? 'i386' : 'armv7',
				fn = path.join(options.dest,'lib'+options.name+'.a');

			if (!fs.existsSync(fn)) {
				tasks.push(function(next){
					hyperloop.execCommand('package',state,next);
				});
			}

			var target = options.target || /(i386|simulator)/.test(arch) ? 'simulator' : null,
				targetObj = ioslib[target],
				platform = /(i386|simulator)/.test(arch) ? 'simulator' : 'os',
				label = platform==='simulator' ? platform : 'device',
				safeName = options.safeName,
				builddir = path.resolve(options.dest),
				launch_timeout = options.launch_timeout,
				device_id = state.device_id || options.device_id,
				build_dir = path.join(builddir, 'build', 'Release-iphone' + platform, safeName + '.app');

			if (!targetObj) {
				return done("target: "+target+" not supported");
			}

			tasks.push(function(next){
				log.info('|------- '+((label+' log started').magenta.bold)+' -------|');

				function logger(label,message){
					log[label] && log[label](message);
				}

				var launchOptions = {
					build_dir: build_dir,
					logger: logger,
					callback: next,
					hide: options.hide,
					auto_exit: options.auto_exit
				};
				targetObj.launch(launchOptions);
			});

			async.waterfall(tasks,function(err){
				log.info('|------- '+((label+' log finished').magenta.bold)+' -------|');
				done(err);
			});

		} 
		catch (E) {
			done(E);
		}
	}
);
