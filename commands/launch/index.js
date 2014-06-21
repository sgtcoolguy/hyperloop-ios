/*
 * Launcher
 */
var hyperloop = require('../../lib/dev').require('hyperloop-common'),
	log = hyperloop.log,
	Command = hyperloop.Command,
	util = hyperloop.util,
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
				!options.logger && log.info('|------- '+((label+' log started').magenta.bold)+' -------|');

				function logger(label,message){
					log[label] && log[label](message);
				}

				var launchOptions = {
					build_dir: build_dir,
					logger: options.logger || logger,
					callback: next,
					hide: options.hide,
					auto_exit: options.auto_exit
				};
				targetObj.launch(launchOptions);
			});

			async.waterfall(tasks,function(err,detail){
				!options.logger && log.info('|------- '+((label+' log finished').magenta.bold)+' -------|');
				if (err && err === 'launch crashed') {
					var index = detail.report.crashing_thread_index,
						thread = detail.report.threads[index],
						thread_name = thread.thread_name,
						exception_type = detail.report.exception_type,
						binary = detail.report.binary_images,
						backtrace = thread.backtrace.map(function(e, index){
							var img = binary[e.binary_image_index].bundle_id;
							return util.rpad(4,String(index)) +
									util.rpad(25,img) +
									'0x'+util.rpad(8-String(e.address).length,'','0')+e.address +
									' '+e.symbol;
						});
					log.error('Launch crashed with error: '+exception_type)
					log.error('Thread '+index+' Crashed:: '+thread_name+'\n'+backtrace.join('\n'));
				}
				done(err);
			});

		} 
		catch (E) {
			done(E);
		}
	}
);
