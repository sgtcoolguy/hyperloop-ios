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
	xcode = require('ioslib').xcode,
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	clang = hyperloop.compiler.clang,
	debug = false;

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

	xcode.settings(function(err,settings){
		if (err) { return callback(err); }
		var arch = config.arch,
			linkflags = config.linkflags || [],
			sdks = getSDKs(settings),
			sdkObj = sdks[arch],
			libname = path.join(config.outdir, arch, config.libname.replace(/\.a$/,'-'+arch+'.a'));

		var args = {
			linker: settings.libtool,
			objfiles: config.objfiles,
			linkflags: linkflags,
			libname: libname,
			outdir: path.dirname(libname)
		};

		clang.library(args, callback);
	});

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

	xcode.settings(function(err,settings){
		if (err) { return callback(err); }
		var arch = config.arch,
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
	});
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
	var p = spawn('/usr/bin/xcodebuild',args, {cwd:dir,env:process.env}),
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

