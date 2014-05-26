/**
 * build library utility for xcode / ios platform
 */
var exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	_ = require('underscore'),
	wrench = require('wrench'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	clang = hyperloop.compiler.clang,
	debug = false,
	settings,
	xcodepath,
	sysframeworks,
	sysframeworkDir;

/**
 * return the currently configured active xcode path
 */
function getXcodePath(callback) {
	if (xcodepath) {
		return callback(null,xcodepath);
	}
	var cmd = "/usr/bin/xcode-select -print-path";
	exec(cmd, function(err, stdout, stderr){
		err && callback(new Error(stderr));
		callback(null,(xcodepath=stdout.trim()));
	});
}

/**
 * get the system frameworks
 */
function getSystemFrameworks(callback) {
	if (sysframeworks) {
		return callback(null, sysframeworks, sysframeworkDir);
	}
	getXcodeSettings(function(err,settings){
		if (err) return callback(err);
		var r = /(.*)\.framework$/,
			frameworkDir = sysframeworkDir = path.join(settings.simSDKPath,'System','Library','Frameworks');
		fs.readdir(frameworkDir, function(err,paths) {
			if (err) return callback(err);
			sysframeworks = paths
				.map(function(v) {
					var p = path.join(frameworkDir,v);
					//console.log(v+'=>'+p)
					if (r.test(v) && fs.existsSync(p)) {
						var module_map = path.join(p, 'module.map'),
							fw = r.exec(v)[1];
						if (fs.existsSync(module_map)) {
							var map = fs.readFileSync(module_map,'utf8').toString(),
								m = /umbrella header "(.*)"/.exec(map),
								header = m && m.length && m[1],
								headerPath = header && path.join(p,'Headers',header);
							if (header && fs.existsSync(headerPath)) {
								return {
									header: headerPath,
									directory: path.dirname(headerPath),
									relative: '<'+fw+'/'+m[1]+'>',
									name: fw
								};
							}
						}
						var headerPath = path.join(p, 'Headers', fw+'.h');
						if (fs.existsSync(headerPath)) {
							return {
								header: headerPath,
								directory: path.dirname(headerPath),
								relative: '<'+fw+'/'+fw+'.h>',
								name: fw
							};
						}
					}
				})
				.filter(function(v){
					return v && v.name!=='JavaScriptCore'; //FIXME: for now we have an issue compiling JSCore
				});
			callback(null, sysframeworks, frameworkDir);
		});
	});
}

function getXcodeSettingsCached() {
	return settings;
}

/**
 * get the current Xcode settings such as paths for build tools
 */
function getXcodeSettings (callback) {
	if (settings) {
		return callback(null,settings);
	}
	getXcodePath(function(err,xcode){
		if (err) { return callback(err); }
		var devicePath = path.join(xcode,'Platforms','iPhoneOS.platform'),
			simPath = path.join(xcode,'Platforms','iPhoneSimulator.platform'),
			simSDKsDir = path.join(simPath,'Developer','SDKs'),
			deviceSDKsDir = path.join(devicePath,'Developer','SDKs'),
			usrbin = path.join(xcode,'Toolchains','XcodeDefault.xctoolchain','usr','bin'),
			clang = path.join(usrbin,'clang'),
			clang_xx = path.join(usrbin,'clang++'),
			libtool = path.join(usrbin, 'libtool'),
			lipo = path.join(usrbin, 'lipo'),
			otool = path.join(usrbin, 'otool'),
			sdks;

		try {
			sdks = fs.readdirSync(deviceSDKsDir);
		} catch (e) {
			log.error('iOS Developer directory not found at "' + xcode + '". Run:');
			log.error(' ');
			log.error('    /usr/bin/xcode-select -print-path');
			log.error(' ');
			log.error('and make sure it exists and contains your iOS SDKs. If it does not, run:');
			log.error(' ');
			log.error('    sudo /usr/bin/xcode-select -switch /path/to/Developer');
			log.error(' ');
			log.error('and try again. Here\'s some guesses:');
			return callback(JSON.stringify(['/Developer','/Library/Developer','/Applications/Xcode.app/Contents/Developer'], null, '  '));
		}
		if (sdks.length===0) {
			return callback(new Error('no SDKs found at '+deviceSDKsDir));
		}
		var versions = [];
		sdks.forEach(function(f){
			var v = f.replace('.sdk','').replace('iPhoneOS','');
			versions.push(v);
		});
		versions = versions.length > 1 ? versions.sort() : versions;
		var version = versions[versions.length-1],
			simSDKPath = path.join(simSDKsDir, 'iPhoneSimulator'+version+'.sdk'),
			deviceSDKPath = path.join(deviceSDKsDir, 'iPhoneOS'+version+'.sdk');

		callback(null,(settings = {
			xcodePath: xcode,
			version: version,
			clang: clang,
			clang_xx: clang_xx,
			libtool: libtool,
			lipo: lipo,
			otool: otool,
			simSDKPath: simSDKPath,
			deviceSDKPath: deviceSDKPath
		}));
	});
}

/**
 * create a command function wrapper
 */
function createFn (cmd) {
	return function(callback) {
		debug && log.log(cmd);
		exec(cmd,callback);
	};
}

/**
 * utility to check the results of a async task and
 * throw Error or print to console on output / debug
 */
function checkResults(err,results,callback) {
	if (err) return callback(new Error(err)) && false;
	var stderr = [],
		stdout = [];
	results.forEach(function(result){
		result[0] && stdout.push(String(result[0]));
		result[1] && stderr.push(String(result[1]));
	});
	if (stderr.length) return callback(new Error(stderr.join('\n'))) && false;
	if (stdout.length) log.log(stdout.join('\n'));
	return true;
}

/**
 * build a static library
 */
function staticlib(config, callback) {

	var settings = getXcodeSettingsCached();
		arch = config.arch,
		linkflags = config.linkflags || [],
		sdks = getSDKs(settings),
		sdkObj = sdks[arch],
		libname = path.join(config.outdir, arch, config.libname.replace(/\.a$/,'-'+arch+'.a'));

	var config = {
		linker: settings.libtool,
		objfiles: config.objfiles,
		linkflags: linkflags,
		libname: libname,
		outdir: path.dirname(libname)
	};

	clang.library(config, callback);
}

function getDefaultCompilerArgs(config) {
	return [
		config.no_arc ? '-fno-objc-arc' : '-fobjc-arc'		
	];
}

function getSDKs (settings) {
	return {
		'i386': {path: settings.simSDKPath, name:'ios-simulator'},
		'arm64': {path: settings.deviceSDKPath, name:'iphoneos'},
		'armv7': {path: settings.deviceSDKPath, name:'iphoneos'},
		'armv7s': {path: settings.deviceSDKPath, name:'iphoneos'}
	};
}

/**
 * compile
 */
function compile(config, callback) {

	var arch = config.arch,
		settings = getXcodeSettingsCached(),
		minVersion = config.minVersion || settings.version,
		sdks = getSDKs(settings),
		sdkObj = sdks[arch],
		minOSString = '-m'+sdkObj.name+'-version-min='+minVersion,
		cflags = (config.cflags||[]).concat(getDefaultCompilerArgs(config)).concat(['-arch '+arch, minOSString,'-isysroot ' + sdkObj.path]);

	config.debug && log.debug('setting minimum iOS version to', minVersion);

	var args = {
		clang: settings.clang,
		outdir: path.join(config.outdir,arch),
		cflags: cflags,
		srcfiles: config.srcfiles,
		debug: config.debug
	};

	// run our parallel clang compile
	clang.compile(args, callback);
}

/**
 * perform a one-step compile of a set of sources and then link them
 * into a universal shared library
 */
function compileAndMakeStaticLib(options, callback) {
	compile(options, function(err) {
		if (err) { return callback(err); }
		options.objfiles = options.srcfiles.map(function(entry){return entry.objfile});
		staticlib(options, callback);
	});
}

function lipo (libfile, details, settings, callback) {
	var archs = Object.keys(details),
		libs = archs.map(function(arch){ return '-arch '+arch+' '+details[arch] }),
		lipoCmd = settings.lipo + ' -create ' + libs.join(' ') + ' -output ' + libfile;
	log.debug(lipoCmd);
	exec(lipoCmd, function(err, stdout, stderr) {
		debug && (stdout=String(stdout).trim()) && log.log(stdout);
		if ((stderr=String(stderr).trim()) && stderr) { return callback(stderr); }
		callback(err, libfile);
	});
}

function pch (header, outfile, sdk, options, settings, callback) {
	//TODO: move this into clang.js
	var sdks = getSDKs(settings),
		version = options.minVersion || settings.version,
		sysRoot = sdks[sdk].path,
		minOSString = '-m'+sdks[sdk].name+'-version-min='+version,
		args = getDefaultCompilerArgs(options).concat(options.cflags).concat([minOSString,'-x objective-c++','-arch ' + sdk, '-isysroot ' + sysRoot,'-std=c++11','-x objective-c++-header']),
		cmd = settings.clang + ' ' + args.join(' ') + ' ' + header+' -o '+outfile;
	log.debug(cmd);
	exec(cmd, function(err, stdout, stderr) {
		if (err) return callback(new Error(err));
		debug && (stdout=String(stdout).trim()) && log.log(stdout);
		if ((stderr=String(stderr).trim()) && stderr) return new Error(err);
		callback(null, outfile);
	});
}

function xcodebuild(dir, args, callback) {
	var p = spawn('xcodebuild',args, {cwd:dir,env:process.env}),
		stdout = '',
		stderr = '';
	p.stdout.on('data',function(buf){
		stdout+=buf.toString();
	});
	p.stderr.on('data',function(buf){
		buf = buf.toString();
		// ignore these types of messages
		if (/Using pre-existing current store/.test(buf)) {
			return;
		}
		stderr+=buf;
	});
	p.on('close', function(exitCode){
		p = null;
		!stderr && log.debug(stdout)
		if (stderr && exitCode!=0) {
			return callback(stdout + '\n' + stderr);
		}
		callback(null, stdout);
	});
}


exports.getXcodePath = getXcodePath;
exports.getXcodeSettings = getXcodeSettings;
exports.getXcodeSettingsCached = getXcodeSettingsCached;
exports.getSystemFrameworks = getSystemFrameworks;
exports.getDefaultCompilerArgs = getDefaultCompilerArgs;
exports.compile = compile;
exports.staticlib = staticlib;
exports.xcodebuild = xcodebuild;
exports.lipo = lipo;
exports.pch = pch;
exports.compileAndMakeStaticLib = compileAndMakeStaticLib;

exports.__defineGetter__('debug', function(){
	return debug;
});
exports.__defineSetter__('debug',function(v){
	debug = v;
});

if (module.id === ".") {
	try {
		getSystemFrameworks(function(err,frameworks){
			console.log(frameworks)
		});
	}
	catch(E){
		log.error(E);
	}
}
