/*
 * Packager
 */
var packager = require('../../lib/packager');
	log = require('hyperloop-common').log,
	hyperloop = require('hyperloop-common'),
	Command = hyperloop.Command,
	async = require('async'),
	path = require('path'),
	fs = require('fs');


module.exports = new Command(
	'package',
	'Package the iOS application for distribution or execution',
	[
	],
	function(state,done) {
		try {
			var options = state.options;
			var args = state.args;
			if (!options.main) {
				options.main = 'app';
			}

			var tasks = [],
				libname = path.join(options.dest,'lib'+options.name+'.a');

			// if the library doesn't exist, go ahead and compile
			if (!fs.existsSync(libname)) {
				// invoke a subcommand before we package
				var subcommand = hyperloop.getCommand('compile');
				tasks.push(function(next){
					subcommand.execute(state,next);
				});
			}

			tasks.push(function (next) {
				packager.validate(state.options, state.args, required, next);
			});

			tasks.push(function (next) {
				prepare(state, next);
			});

			async.series(tasks,function(err){
				if (err) { return done(err); }
				switch (options.packageType) {
					case 'module': {
						return packager.packageModule(options,args,done);
					}
					case 'app':
					default: {
						return packager.packageApp(options,args,done);
					}
				}
			});
		} catch (E) {
			done(E);
		}
	}
);

function prepare(state,done) {
	try {
		var options = state.options;
		if (options.ticurrent) {
			packager.configureTiCurrent(options,done);
		}
		else {
			done();
		}
	} catch (E) {
		done(E);
	}
}

/*
 * Check to make sure that the `name` key is present in `options` and if not
 * exit with the error message `help`
 */
function required(options, name, help) {
	if (!options[name]) {
	   throw new Error('Missing required options ' + ('--' + name).magenta.bold + ' which should ' + help);
	}
}
