/*
 * Launcher
 */
var log = require('hyperloop-common').log,
	hyperloop = require('hyperloop-common'),
	Command = hyperloop.Command,
	buildlib = require('../../lib/buildlib'),
	launcher = require('../../lib/launcher'),
	path = require('path'),
	async = require('async');

module.exports = new Command(
	'launch',
	'Launch the application in either the iOS simulator or on an iOS device',
	[
	],
	function(state,done) {
		try {
			var options = state.options,
				tasks = [],
				fn = path.join(options.dest,'lib'+options.name+'.a');

			if (!fs.existsSync(fn)) {
				var subcommand = hyperloop.getCommand('package');
				tasks.push(function(next){
					subcommand.execute(state,next);
				});
			}

			tasks.push(function(next){
				var arch = /(i386|simulator)/.test(options.arch || 'i386') ? 'i386' : 'armv7',
					platform = /(i386|simulator)/.test(arch) ? 'simulator' : 'os',
					safeName = options.safeName,
					builddir = path.resolve(options.dest),
					launch_timeout = options.launch_timeout,
					appdir = path.join(builddir, 'build', 'Release-iphone' + platform, safeName + '.app');

				if (options.packageType === 'module') {
					return next('launch command is not supported for modules, yet.');
				}
				buildlib.getXcodeSettings(function(err, settings) {
					if (err) {
						return done(err);
					}
					if (platform === 'simulator') {
						launcher.executeSimulator(options.name, appdir, settings, next, options.logger, options.hidden, options.unit, launch_timeout);
					}
					else {
						launcher.executeDevice(options.name, appdir, settings, next, options.logger, options.hidden, options.device_id, options.quiet, options.unit, launch_timeout);
					}
				});
			});

			async.series(tasks,function(err){
				done(err);
			});

		} 
		catch (E) {
			done(E);
		}
	}
);
