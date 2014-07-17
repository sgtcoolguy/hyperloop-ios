/**
 * iOS library generation
 */

var fs = require('fs'),
	path = require('path'),
	semver = require('semver'),
	wrench = require('wrench'),
	_ = require('underscore'),
	metabase = require('./metabase'),
	xcode = require('ioslib').xcode,
	buildlib = require('./buildlib'),
	hyperloop = require('./dev').require('hyperloop-common'),
	util = hyperloop.util,
	log = hyperloop.log,
	library = hyperloop.compiler.library,
	typelib = hyperloop.compiler.type;

exports.loadMetabase = loadMetabase;
exports.getArchitectures = getArchitectures;
exports.compileLibrary = compileLibrary;
exports.prepareLibrary = prepareLibrary;
exports.generateLibrary = generateLibrary;
exports.generateApp = generateApp;
exports.prepareArchitecture = prepareArchitecture;
exports.prepareClass = prepareClass;
exports.prepareClasses = prepareClasses;
exports.prepareFunction = prepareFunction;
exports.prepareMethod = prepareMethod;
exports.prepareProperty = prepareProperty;
exports.prepareType = prepareType;
exports.generateMethod = generateMethod;
exports.generateFunction = generateFunction;
exports.generateGetterProperty = generateGetterProperty;
exports.generateSetterProperty = generateSetterProperty;
exports.generateNewInstance = generateNewInstance;
exports.isMethodInstance = isMethodInstance;
exports.isPropertyInstance = isPropertyInstance;
exports.getClassFilename = getClassFilename;
exports.getFunctionsFilename = getFunctionsFilename;
exports.getTypesFilename = getTypesFilename;
exports.getFileExtension = getFileExtension;
exports.getObjectFileExtension = getObjectFileExtension;
exports.getLibraryFileName = getLibraryFileName;
exports.getDefaultLibraryName = getDefaultLibraryName;
exports.prepareHeader = prepareHeader;
exports.prepareFooter = prepareFooter;
exports.validateOptions = validateOptions;
exports.getMethodSignature = getMethodSignature;
exports.generateCustomClass = generateCustomClass;

// classes that we explicitly blacklist
const CLASS_BLACKLIST = [
	'Protocol',
	'NSProxy',
	'NSSocketPort',
	'NSRunLoop',
	'MIDINetworkSession'
];

/**
 * called to load the metabase (and generate if needed)
 */
function loadMetabase(options, arch, sdks, settings, callback, generate) {
	// semver requires 0.0.0 versioning
	var version = settings.version;

	if (version.split('.').length===2) {
		version+='.0';
	}

	// we require a minimum of iOS 7 to build
	if (!options.ticurrent && !semver.satisfies(version,'>=7.0.0')) {
		return callback("iOS SDK must be >= "+"7.0".green+", you are currently using: "+settings.version.red+" and your active Xcode is set to "+settings.xcodePath.green);
	}

	// set the minVersion for iOS compile if not set
	if (!options.minVersion) {
		options.minVersion = options.ticurrent ? '6.0' : version;
	}

	var opts = _.clone(options);
	opts.arch = arch;
	opts.isysroot = sdks[arch].path;

	xcode.systemFrameworks(function(err,frameworks){

		var dir = options.dest,
			astFile = path.join(dir, 'metabase-'+arch+'.json.gz'),
			headerfile = path.join(dir, 'libraries.h'),
			header = generate && (options.header||'') + frameworks.map(function(e){return '#include "'+path.resolve(e.header)+'"'}).join('\n');

		if (generate) {
			log.debug('writing header file to',headerfile);
			fs.writeFileSync(headerfile, header, 'utf8');
		}

		opts.cacheFile = astFile;
		opts.skipSystemFrameworks = true;
		opts.productDir = dir;

		// if not a force re-compile and we already have generated it, use it
		if (!opts.force && 
			fs.existsSync(astFile)) {
			var zlib = require('zlib'),
				ast = fs.readFileSync(astFile);
			log.debug('attempting to load previously generated metabase from',astFile.cyan);
			return zlib.gunzip(ast, function(err,ast) {
				ast = !err && JSON.parse(ast.toString());
				callback(err, ast, astFile);
			});
		}
		
		metabase.loadMetabase(headerfile, opts, function(err, ast){
			callback(null, ast, astFile);
		});
	});
}

/**
 * return suitable architectures for compiling
 */
function getArchitectures (options, callback) {
	xcode.settings(function(err,settings){
		var archs = ['i386','armv7s','armv7','arm64'],
			sdks = {
				'i386': {path: settings.simSDKPath, name:'ios-simulator'},
				'armv7s': {path: settings.deviceSDKPath, name:'iphoneos'},
				'armv7': {path: settings.deviceSDKPath, name:'iphoneos'},
				'arm64': {path: settings.deviceSDKPath, name:'iphoneos'}
			};
		if (options.arch) {
			var _arch = (options.arch || '').split(/[\s,]/);
			archs = _.compact(archs).map(function(a){return a.trim()}).filter(function(v) { return ~_arch.indexOf(v) });
			if (archs.length===0) {
				return callback("at least one architecture must be specified using --arch");
			}
			for (var c=0;c<archs.length;c++) {
				if (!(archs[c] in sdks)) {
					return callback("architecture "+archs[c].green+" not valid");
				}
			}
		}
		else if (options.simulator_only) {
			archs = ['i386'];
		}
		callback(err, archs, sdks, settings);
	});		
}

/** 
 * called once before doing any generation to allow the platform
 * adapter to do any setup before getting started
 */
function prepareLibrary(options, callback) {
	getArchitectures(options,callback);
}

function prepareArchitecture(options, arch, sdks, settings, callback) {
	loadMetabase(options, arch, sdks, settings, callback, true);
}

function defaultFrameworks () {
	return ['Framework','JavaScriptCore'];
}

/**
 * called after all files have been processed
 */
function compileLibrary (opts, arch, metabase, callback) {

	var options = _.clone(opts);

	if (options.srcfiles.length) {

		options.arch = arch;
		options.no_arc = true;
		options.cflags = (options.cflags||[])
							.concat([
								'-Wno-auto-var-id', // skip auto assignment to id which is OK
								'-Wno-int-to-void-pointer-cast', //FIXME - need to fix for LP64
								'-Wno-deprecated-declarations',	// for supporting deprecated methods, turn off this warning
								'-DHL_IOS=1',
								'-DHL_ARCHITECTURE='+arch,
								'-I"'+options.srcdir+'"',
								'-I"'+options.dest+'"'
							]);
		options.outdir = path.join(options.dest,'build');
		options.linkflags = (options.linkflags||[]).concat(options.frameworks||defaultFrameworks()).map(function(f){return '-framework '+f});

		if (options.outdir && !fs.existsSync(options.outdir)) {
			wrench.mkdirSyncRecursive(options.outdir);
		}

		xcode.settings(function(err,settings) {
			// compile the static library
			buildlib.compileAndMakeStaticLib(options, function(err,libfile){
				callback(err, libfile);
			});
		});
	}
	else {
		callback("no source files provided");
	}
}

function generateLibrary (options, arch_results, settings, callback) {
	var libfile = path.join(options.dest, options.libname || getDefaultLibraryName());
	buildlib.lipo(libfile, arch_results, settings, callback);
}

function generateApp (options, arch_results, settings, callback) {
	var libfile = path.join(options.dest, options.libname || getDefaultAppName());
	buildlib.lipo(libfile, arch_results, settings, callback);
}

/*
 * make sure to import all basic frameworks
 */
function processFrameworksOption(options) {
	if (!options.frameworks) {
		options.frameworks = [];
	}
	if (typeof(options.frameworks) == 'string') {
		options.frameworks = [options.frameworks];
	}
	// we record these so we can link with the right frameworks
	['JavaScriptCore','Foundation'].forEach(function(f) {
		if (options.frameworks.indexOf(f) < 0) {
			options.frameworks.push(f);
		}
	});	
}

function prepareImportOption(options) {
	if (!options.imports) {
		options.imports = [];
	}
	if (typeof(options.imports) == 'string') {
		options.imports = [options.imports];
	}	
}

/**
 * called prepare generation of class source code. this method is called
 * once for each file before it is generated.
 */
function prepareClass(options, metabase, state, classname, code) {
	log.debug('generating class:',classname.green.bold);

	if (classname==='id') {
		return true;
	}
	var entry = metabase.classes[classname] || metabase.protocols[classname] || metabase.types[classname],
		isInterface = entry && entry.metatype==='interface';

	if (!entry) {

		var t = typelib.resolveType(classname);
		if (!t.isNativeStruct()) {
			throw new Error("Couldn't find class named: "+classname);
		}
	}

	//FIXME we need to move this before we are ready to compile
	if (entry && !available(entry,options.minVersion)) {
		throw new Error(classname+" is not available for this version of ios");
	}

	var includes = [],
		frameworks = [];

	// externs
	state.externs = [];  //FIXME: refactor this and the includes to be generic

	while(entry) {
		if (isInterface) {
			entry.protocols && entry.protocols.forEach(function(name){
				var pc = metabase.classes[name];
				if (pc) {
					if (pc.extra_includes) {
						includes = includes.concat(pc.extra_includes);
					}
					if (pc.framework && frameworks.indexOf(pc.framework)==-1) {
						frameworks.push(pc.framework);
					}
				}
			});
		}
		if (entry.extra_includes) {
			includes = includes.concat(entry.extra_includes);
		}
		if (entry.framework && frameworks.indexOf(entry.framework)==-1) {
			frameworks.push(entry.framework);
		}
		entry = metabase.classes[entry.superClass];
	}

	// we record these so we can link with the right frameworks
	processFrameworksOption(options);

	// we record this so we can generate the right imports
	state.imports = {
		'Foundation': '<Foundation/Foundation.h>'
	};

	includes.forEach(function(inc) { addHeaderToImports(state, inc) });

	// add any frameworks we found
	frameworks.forEach(function(f){ 
		options.frameworks.indexOf(f)===-1 && (options.frameworks.push(f));
		state.imports[f] = metabase.system_frameworks_map[f];
	});

}

/**
 * called prepare generation of function source code. this method is called
 * once for each file before it is generated.
 */
function prepareFunction(options, metabase, state, fnname, code) {
	log.debug('generating function:',fnname.green.bold);

	var entry = metabase.symbols[fnname];

	if (!available(entry,options.minVersion)) {
		throw new Error("function named: "+fnname+" not available for this version of ios");
	}

	// we record these so we can link with the right frameworks
	processFrameworksOption(options);

	// we record this so we can generate the right imports
	!state.imports && (state.imports = {
		'Foundation': '<Foundation/Foundation.h>'
	});

	!state.externs && (state.externs = []);

	var f = entry.framework;
	f && options.frameworks.indexOf(f)===-1 && (options.frameworks.push(f));
	state.imports[f] = metabase.system_frameworks_map[f];

	return entry;
}

/**
 * called prepare generation of type source code. this method is called
 * once for each file before it is generated.
 */
function prepareType(options, metabase, state, type) {
	log.debug('generating type:',type.green.bold);

	var entry = metabase.types[type];

	if (!entry) {
		return;
	}

	if (entry.alias) {
		entry = metabase.types[entry.alias]
	}

	if (!available(entry,options.minVersion)) {
		throw new Error("type named: "+type+" not available for this version of ios");
	}

	if (entry.vector) {
		throw new Error("vector type named: "+type+" not supported");
	}

	if (type=='vImage_CGAffineTransform') {
		throw new Error("type named: "+type+" not supported");
	}

	// we record these so we can link with the right frameworks
	!options.frameworks && (options.frameworks = ['JavaScriptCore','Foundation']);

	// we record this so we can generate the right imports
	!state.imports && (state.imports = {
		'Foundation': '<Foundation/Foundation.h>'
	});

	// FIXME: some types like NSTextAlignment actually depends on UIKit,
	// but it's not recorded in metabase. let's add it by default for now.
	state.imports.UIKit = '<UIKit/UIKit.h>';

	!state.externs && (state.externs = []);

	var f = entry.framework;
	f && options.frameworks.indexOf(f)===-1 && (options.frameworks.push(f));
	state.imports[f] = metabase.system_frameworks_map[f];

	var i = entry.import;
	i && !(i in state.imports) && (state.imports[entry.import] = '<'+entry.import+'>');

	return entry;
}

/**
 * format and then add header to imports 
 */
function addHeaderToImports(state, inc) {
	if (inc in state.imports) {
		return;	
	}
	inc = '<'+inc+'>'
	if (Object.keys(state.imports).map(function(k) {return state.imports[k] }).indexOf(inc)==-1) {
		state.imports[inc]=inc;
	}
}

/**
 * add an extern
 */
function addExtern(state, extern) {
	extern = /^EXPORTAPI/.test(extern) ? extern : ('EXPORTAPI '+extern);
	if (state.externs.indexOf(extern)==-1) {
		state.externs.push(extern);
	}
}

/**
 * record a framework (if not already added)
 */
function addFramework(options, metabase, state, entry) {
	//console.error('adding '+entry.framework);
	if (entry.framework && !(entry.framework in state.imports)) {
		state.imports[entry.framework] = metabase.system_frameworks_map[entry.framework];
	}
	if (entry.framework && options.frameworks.indexOf(entry.framework)==-1){
		options.frameworks.push(entry.framework);	
	} 
	if (entry.extra_includes) {
		entry.extra_includes.forEach(function (inc){
			addHeaderToImports(state,inc);
		});
	}
	if (entry.header) {
		addHeaderToImports(state,entry.header);
	}
}

/**
 * check if version is supported
 */
function satisfies (check, version) {
	if (!check || check==='0') return false;
	check = makeVersion(check);
	version = makeVersion(version);
	return semver.gte(version,check);
}

/**
 * iOS versions can be in the form X.X but semver requires X.X.X
 */
function makeVersion (version) {
	if (!version) throw new Error('version is null');
	if (version.split('.').length===2) {
		version+='.0';
	}
	return version;
}

/**
 * return true if this metadata type is available on this platform, version
 */
function available(obj, version) {
	if (!obj) throw new Error('object cannot be null');
	var availability = obj.availability;
	if (availability && (availability.message==='Unavailable' || availability.platform!=='ios')) {
		return false;
	}
	if (obj.unavailable) {
		return false;
	}
	if (availability && satisfies(availability.deprecated,version)) {
		return false;
	}
	return true;
}

/**
 * called to prepare a class method to be compiled. this method is called once 
 * for each class and each method in each class that will be generated.
 */
function prepareMethod(options, metabase, state, classname, methodname, methods, code) {
	addFramework(options,metabase,state,methods[0]);
}

/**
 * called to prepare a class property to be compiled. this method is called once
 * for each class and each property in each class that will be generated.
 */
function prepareProperty(options, metabase, state, classname, propertyname, property, code) {
	addFramework(options,metabase,state,property);
}

/*
 * generate code for method arguments like "arg$1, arg$1, arg$3"
 * TODO: review this, this could be moved into common
 */
function generateMethodArguments(options,metabase,state,method,typelib,instance,code,cleanup,indent) {
	var selector = '',
		start = instance ? 1 : 0;

	method.arguments.forEach(function(m,i){
		var type = m.type,
			value = util.sanitizeSymbolName(m.name)+'$'+i,
			typeobj = typelib.resolveType(type), 
			cast = typeobj.isInstanceType() ? classname+' *' : typeobj.toCast();

		// if the variable is named one of our internal variable names, let's mangle it
		if (/^(ctx|function|thisObject|argumentCount|arguments|exception|new|delete|template)$/.test(value)) {
			value = '_'+value;
		}

		var argname = typeobj.getRealCast(value);

		if (i == 0) {
			selector+=argname;
		} else {
			selector+=', '+argname;
		}
		
		var preamble = [],
			declare = [],
			body = typeobj.getAssignmentCast(typeobj.toNativeBody('arguments['+(i+start)+']',preamble,cleanup,declare));
		preamble.length && preamble.forEach(function(c){code.push(indent+c)});
		declare.length && declare.forEach(function(d){addExtern(state,d)});
		code.push(indent+typeobj.getAssignmentName()+' '+value+' = '+body+';');
	});

	if (method.requiresSentinel) {
		selector+=',nil';
	}

	// formatter is a terminator string such as [NSString stringWithFormat:]
	if (method.formatter) {
		var c = method.arguments.length+start,
			selappend=',';
		//TODO: refactor this into a generic util
		for (var x=c;x<c+10;x++) {
			code.push('id arg'+x+'=nil;');
			selappend+='arg'+x+',';
		}
		selappend+='nil';
		selector = selector.trim()+selappend;
		code.push('for (size_t c='+c+';c<argumentCount;c++)');
		code.push('{');
		code.push(indent+'auto argValue = arguments[c];');
		code.push(indent+'id arg = nil;');
		code.push(indent+'if (JSValueIsString(ctx,argValue) || JSValueIsObject(ctx,argValue))');
		code.push(indent+'{');
		code.push(indent+indent+'char *buf = HyperloopJSValueToStringCopy(ctx,argValue,exception);');
		code.push(indent+indent+'arg = [NSString stringWithFormat:@"%s",buf];');
		code.push(indent+indent+'delete [] buf;');
		code.push(indent+'}');
		code.push(indent+'else if (JSValueIsUndefined(ctx,argValue) || JSValueIsNull(ctx,argValue)){}');
		code.push(indent+'else if (JSValueIsBoolean(ctx,argValue))');
		code.push(indent+'{');
		code.push(indent+indent+'arg = [NSNumber numberWithBool:JSValueToBoolean(ctx,argValue)];');
		code.push(indent+'}');
		code.push(indent+'else if (JSValueIsNumber(ctx,argValue))');
		code.push(indent+'{');
		code.push(indent+indent+'arg = [NSNumber numberWithDouble:JSValueToNumber(ctx,argValue,exception)];');
		code.push(indent+'}');
		code.push(indent+'switch(c)');
		code.push(indent+'{');
		for (var x=c;x<c+10;x++) {
			code.push(indent+indent+'case '+x+': arg'+x+'=arg; break;');
		}
		code.push(indent+'}');
		code.push('}');
	}

	return selector;
}

function generateMethodSelector(options,metabase,state,indent,typelib,code,cleanup,method,instance) {
	var parts = method.selector.split(':'),
		selector = '',
		start = instance ? 1 : 0,
		argnames = {},
		isFunctionPointer = false,
		callbackFunctionIndex = 0;

	method.args.forEach(function(m,i){
		var type = m.subtype || m.type,
			value = parts[i] || m.name+'$'+i,
			typeobj = typelib.resolveType(type), 
			cast = typeobj.isInstanceType() ? classname+' *' : typeobj.toCast(),
			index = (i+start);

		if (typeobj.isNativeFunctionPointer()) {
			isFunctionPointer = true;
			callbackFunctionIndex = i+start;
			code.push(indent+'if (!JSValueIsObject(ctx, arguments['+index+']) || !JSObjectIsFunction(ctx, JSValueToObject(ctx,arguments['+index+'],exception)))');
			code.push(indent+'{');
			code.push(indent+'\t*exception = HyperloopMakeException(ctx,"Callback arguments['+index+'] should be a JS function");');
			code.push(indent+'\treturn JSValueMakeUndefined(ctx);');
			code.push(indent+'}');
		}

		// if the variable is named one of our internal variable names, let's mangle it
		if (/^(ctx|function|thisObject|argumentCount|arguments|exception|new|delete|template)$/.test(value)) {
			value = '_'+value;
		}

		// some selectors are repeated so we need to ensure we have unique variable names
		if (value in argnames) {
			value = value + '$'+i;
		}

		argnames[value]=1;

		var argname = typeobj.getRealCast(value);

		if (i>0) {
			selector+=parts[i]+':'+argname+' ';
		}
		else {
			selector+=':'+argname+' ';
		}

		if (i == method.args.length-1 && isFunctionPointer) {
			code.push(indent+'JSValueProtect(ctx, arguments['+callbackFunctionIndex+']); // always protect callback function');
			code.push(indent+typeobj.getAssignmentName()+' '+value+' = (void*)&arguments['+callbackFunctionIndex+'];');
		} else {
			var preamble = [],
				declare = [],
				body = typeobj.getAssignmentCast(typeobj.toNativeBody('arguments['+index+']',preamble,cleanup,declare));
			preamble.length && preamble.forEach(function(c){code.push(indent+c)});
			declare.length && declare.forEach(function(d){addExtern(state,d)});
			code.push(indent+typeobj.getAssignmentName()+' '+value+' = '+body+';');
		}
	});

	if (method.requiresSentinel) {
		selector+=',nil';
	}

	// formatter is a terminator string such as [NSString stringWithFormat:]
	if (method.formatter) {
		var c = method.args.length+start,
			selappend=',';
		//TODO: refactor this into a generic util
		for (var x=c;x<c+10;x++) {
			code.push('id arg'+x+'=nil;');
			selappend+='arg'+x+',';
		}
		selappend+='nil';
		selector = selector.trim()+selappend;
		code.push('for (size_t c='+c+';c<argumentCount;c++)');
		code.push('{');
		code.push(indent+'auto argValue = arguments[c];');
		code.push(indent+'id arg = nil;');
		code.push(indent+'if (JSValueIsString(ctx,argValue) || JSValueIsObject(ctx,argValue))');
		code.push(indent+'{');
		code.push(indent+indent+'char *buf = HyperloopJSValueToStringCopy(ctx,argValue,exception);');
		code.push(indent+indent+'arg = [NSString stringWithFormat:@"%s",buf];');
		code.push(indent+indent+'delete [] buf;');
		code.push(indent+'}');
		code.push(indent+'else if (JSValueIsUndefined(ctx,argValue) || JSValueIsNull(ctx,argValue)){}');
		code.push(indent+'else if (JSValueIsBoolean(ctx,argValue))');
		code.push(indent+'{');
		code.push(indent+indent+'arg = [NSNumber numberWithBool:JSValueToBoolean(ctx,argValue)];');
		code.push(indent+'}');
		code.push(indent+'else if (JSValueIsNumber(ctx,argValue))');
		code.push(indent+'{');
		code.push(indent+indent+'arg = [NSNumber numberWithDouble:JSValueToNumber(ctx,argValue,exception)];');
		code.push(indent+'}');
		code.push(indent+'switch(c)');
		code.push(indent+'{');
		for (var x=c;x<c+10;x++) {
			code.push(indent+indent+'case '+x+': arg'+x+'=arg; break;');
		}
		code.push(indent+'}');
		code.push('}');
	}

	return selector;
}


/**
 * generate a function body. call for each function that should be generated.
 */
function generateFunction(options, metabase, state, indent, fnname, fn) {
	var code = [],
		typeobj = typelib.resolveType(fn.returnType),
		varname = 'var_'+util.sanitizeSymbolName(typeobj.toName()).toLowerCase(),
		cleanup = [],
		methodBlock = '',
		returnBlock = 'return JSValueMakeUndefined(ctx);';

	var selector = generateMethodArguments(options,metabase,state,fn,typelib,false,code,cleanup,'');

	if (typeobj.isNativeStruct() || typeobj.isNativeUnion()) {
		code.push(typeobj.toName()+' '+varname+' = '+fnname+'('+selector+');');
	} else if (typeobj.isNativeVoid()) {
		methodBlock = fnname+'('+selector+');';
	} else {
		methodBlock = typeobj.toCast()+' '+varname+' = '+fnname+'('+selector+');';
	}

	if (!typeobj.isNativeVoid()) {
		var rpreamble = [],
			declare = [],
			resultCode = typeobj.toJSBody(varname, rpreamble, cleanup, declare);
		returnBlock = 'return ' + resultCode + ';';
		rpreamble.length && (methodBlock+='\n'+indent+rpreamble.join('\n'+indent));
		declare.length && (declare.filter(function(c) {return !/instancetype/.test(c);}).forEach(function(d) { addExtern (state, d); }));
	}

	code.push(methodBlock);
	cleanup.forEach(function(c){ code.push(c); });
	code.push(returnBlock);

	return code.map(function(l) { return indent + l } ).join('\n');
}

/**
 * return a unique name to distinguish between overloaded methods
 */
function getMethodSignature(options, metabase, state, classname, methodname, method) {
	return util.sanitizeSymbolName(method.selector);
}

/**
 * generate a method body. call for each method that should be generated for a class
 */
function generateMethod(options, metabase, state, indent, varname, classname, method, methodname) {
	var code = [],
		cleanup = [];

	var selector = generateMethodSelector(options,metabase,state,indent,typelib,code,cleanup,method,method.instance);

	var methodBlock = '['+varname+' '+method.name+''+selector.trim()+']',
		returnBlock = 'return JSValueMakeUndefined(ctx);',
		methodType = typelib.resolveType(method.returnSubtype);

	if (methodType.isNativeVoid() && !methodType.isPointer()) {
		methodBlock = indent + methodBlock + ';';
	}
	else {
		methodBlock = indent + methodType.getAssignmentName()+' result = '+methodType.getAssignmentCast(methodBlock)+';';
		var rpreamble = [],
			declare = [],
			classObj = typelib.resolveType(classname),
			resultCode = (methodType.isInstanceType() ? classObj : methodType).toJSBody('result', rpreamble, cleanup, declare);
		returnBlock = 'return ' + resultCode + ';';
		rpreamble.length && (methodBlock+='\n'+indent+rpreamble.join('\n'+indent));
		declare.length && (declare.filter(function(c) {return !/instancetype/.test(c);}).forEach(function(d) { addExtern (state, d); }));
	}

	code.push(indent+'@try {');
	code.push(indent+methodBlock);
	code.push(indent+'} @catch (NSException *e) {');
	code.push(indent+'\t*exception = HyperloopMakeException(ctx,[[e reason] UTF8String]);');
	code.push(indent+'\treturn JSValueMakeUndefined(ctx);');
	code.push(indent+'}');
	cleanup.forEach(function(c){ code.push(indent+c); });
	code.push(indent+returnBlock);

	return code.join('\n');
}

/**
 * generate the getter property value
 */
function generateGetterProperty(options, metabase, state, library, classname, propertyname, property, varname, cast, indent) {
	//TODO: review this code and refactor more into common
	var code = [],
		value = 'is_'+propertyname.toLowerCase(),
		method = property.getter || propertyname,
		classObj = typelib.resolveType(classname),
		typeobj = typelib.resolveType(property.subtype),
		preamble = [],
		cleanup = [],
		declare = [],
		result = typeobj.toJSBody(value,preamble,cleanup,declare);

	if (classObj.isNativeStruct() || classObj.isNativeUnion()) {
		code.push(typeobj.getAssignmentName()+' ' + value + ' = '+typeobj.getAssignmentCast(varname+'->'+method)+';');
	} else {
		code.push(typeobj.getAssignmentName()+' ' + value + ' = '+typeobj.getAssignmentCast('['+varname+' '+method+']')+';');
	}
	preamble.length && preamble.forEach(function(c){ code.push(c) });
	code.push('result = '+result + ';');
	cleanup.length && cleanup.forEach(function(c){ code.push(c) });
	declare.length && declare.forEach(function(d){ addExtern(state,d) });

	return code.map(function(l) { return indent + l } ).join('\n');
}

/**
 * generate the setter property
 */
function generateSetterProperty(options, metabase, state, library, classname, propertyname, property, varname, cast, indent) {
	//TODO: review this code and refactor more into common
	var code = [],
		setter = !!property.setter,
		classObj = typelib.resolveType(classname),
		typeobj = typelib.resolveType(property.subtype),
		preamble = [],
		cleanup = [],
		declare = [],
		result = typeobj.getRealCast(typeobj.toNativeBody('value',preamble,cleanup,declare));

	preamble.length && preamble.forEach(function(c){ code.push(c) });
	if (classObj.isNativeStruct() || classObj.isNativeUnion()) {
			code.push(varname+'->'+propertyname+' = '+result+';');
	} else {
		if (setter) {
			code.push('['+varname+' '+propertyname+' : '+result+'];');
		}
		else {
			code.push(varname+'.'+propertyname+' = '+result+';');
		}
	}
	cleanup.length && cleanup.forEach(function(c){ code.push(c) });
	code.push('result = JSValueMakeBoolean(ctx,true);');

	declare.length && declare.forEach(function(d){ addExtern(state,d) });

	return code.map(function(l) { return indent + l } ).join('\n');
}

/**
 * return true if the method is an instance method (vs. a static method)
 */
function isMethodInstance (options, metabase, state, method) {
	return method.instance;
}

/**
 * return true if the property is an instance property (vs. a static property)
 */
function isPropertyInstance (options, metabase, state, property) {
	return true;
}

/**
 * return the file extension appropriate for the platform. if header is true,
 * return the header file extension, otherwise the implementation file extension
 */
function getFileExtension (header) {
	return header ? '.h' : '.mm';
}

/**
 * return the object file extension
 */
function getObjectFileExtension() {
	return '.o';
}

/**
 * return the library file name formatted in a platform specific format
 */
function getLibraryFileName(name) {
	return 'lib'+name+'.a';
}

/**
 * return the default library name
 */
function getDefaultLibraryName() {
	return getLibraryFileName('hyperloop');
}

/**
 * return the default application name
 */
function getDefaultAppName() {
	return getLibraryFileName('App');
}

/**
 * return a suitable filename for a given class
 */
function getClassFilename(options, metabase, state, classname) {
	return 'HL_' + classname + getFileExtension(false);
}

/**
 * return the suitable filename
 */
function getFunctionsFilename(options, metabase, state) {
	return 'HL_Functions' + getFileExtension(false);
}

/**
 * return the suitable filename
 */
function getTypesFilename(options, metabase, state) {
	return 'HL_Types' + getFileExtension(false);
}

/**
 * called to generate any code at the header of the class. this method
 * is called once per file
 */
function prepareHeader(options, metabase, state, classname, code) {
	state.imports && Object.keys(state.imports).forEach(function(name){
		var imp = state.imports[name],
			quote = imp && imp.charAt(0)!='<' && imp.charAt(0)!='"',
			line = quote ? ('"'+imp+'"') : imp;
		line && code.push('#import '+line);
	});
	
	if (state.externs && state.externs.length) {
		code.push('');
		code.push('// externs');
		code.push(state.externs.join('\n'));
	}

	code.push('');
}

/**
 * called to generate any code at the footer of the class. this method
 * is called once per file
 */
function prepareFooter(options, metabase, state, classname, code) {
}

/**
 * generate code for new instance
 */
function generateNewInstance(state, metabase, indent, classname, cast, varname, methodnode) {
	var code = [],
		typeobj = typelib.resolveType(classname),
		cleanup = [],
		method = methodnode.method;

	if (method.selector) {
		var selector = generateMethodSelector(state.options,state.metabase,state,'',typelib,code,cleanup,method,false);

		var methodBlock = '[[['+classname+' alloc] '+method.name+''+selector.trim()+'] autorelease]',
			methodType = typelib.resolveType(method.returnSubtype);

		methodBlock = cast+' '+varname+' = '+methodType.getAssignmentCast(methodBlock)+';';
		var rpreamble = [],
			declare = [],
			resultCode = (methodType.isInstanceType() ? typeobj : methodType).toJSBody('result', rpreamble, cleanup, declare);
		rpreamble.length && (methodBlock+='\n'+indent+rpreamble.join('\n'+indent));
		declare.length && (declare.filter(function(c) {return !/instancetype/.test(c);}).forEach(function(d) { addExtern (state, d); }));

		code.push(methodBlock);
		cleanup.forEach(function(c){ code.push(indent+c); });
	} else {
		code.push(cast+' '+varname+' = [['+classname+' new] autorelease];');
	}

	return code.map(function(l) { return indent + l } ).join('\n');
}

function prepareClasses(options, state, metabase, library, symboltable) {
	// these classes are minimally required for all Java projects
	var required = ['NSObject'];
	required.forEach(function(cls){
		if (!symboltable.classmap) {
			symboltable.classmap = {};
		}
		if (!(cls in symboltable.classmap)) {
			symboltable.classmap[cls] = {
				static_methods: {},
				instance_methods: {},
				getters:{},
				setters:{},
				constructors:{}
			};
		}
	});
}

function validateOptions(options, next) {
	var packager = require('./packager');
	if (options.ticurrent || packager.looksLikeTiCurrentModule(options)) {
		packager.configureTiCurrent(options, next);
	}
	else {
		next();
	}
}

function generateCheckNSException(code, indent) {
	code.push(indent+'if (!JSValueIsNull(ctx, _exception)) {');
	code.push(indent+'\t@throw [NSException exceptionWithName:@"HyperloopException"');
	code.push(indent+'\treason:HyperloopJSValueToNSString(ctx, _exception, NULL)');
	code.push(indent+'\tuserInfo:nil];');
	code.push(indent+'}');
}

function generateCustomClass(options, state, metabase, classname, filename) {
	var file = path.join(options.srcdir, filename.replace(getFileExtension(),'_Impl'+getFileExtension())),
		classinfo = state.custom_classes[classname],
		classType = typelib.resolveType(classname),
		headername = classinfo.extra_includes[0],
		headerfile = path.join(options.headerdir, headername),
		indent = '\t',
		code = [],
		interface_code = [],
		interface_methods = [],
		implementation_code = [],
		function_code = [],
		imports = [],
		actionNames = [],
		declares = [],
		externs = [];


	code.push(util.HEADER);
	code.push('');

	function generateImport(cln) {
		var cls = metabase.classes[cln] || metabase.protocols[cln];
		if (cls) {
			if (cls.framework) {
				var imp = metabase.system_frameworks_map[cls.framework];
				imp && ~~imports.indexOf(imp) && imports.push(imp);
			}
			if (cls.extra_includes) {
				cls.extra_includes.forEach(function(imp){
					imp = '<'+imp+'>';
					imp && ~~imports.indexOf(imp) && imports.push(imp);
				});
			}
		}
	}

	generateImport(classinfo.superClass);

	var fullClassname = classname+' : '+classinfo.superClass;

	classinfo.protocols && classinfo.protocols.forEach(function(imp,index){
		generateImport(imp)
		if (index == 0) {
			fullClassname+=' <';
		}
		fullClassname+=imp;
		if (index + 1 < classinfo.protocols.length) {
			fullClassname+=',';
		}
		else if (index + 1 === classinfo.protocols.length) {
			fullClassname+='>';
		}
	});

	options.frameworks && options.frameworks.forEach(function(f) {
		var imp = metabase.system_frameworks_map[f];
		if (imp && imports.indexOf(imp) < 0) {
			imports.push(imp);
		}
	});
	prepareImportOption(options);
	options.imports.forEach(function(imp){
		code.push('#import <'+imp+'.h>');
	});
	imports.forEach(function(imp){
		code.push('#import '+imp);
	});
	code.push('');

	interface_code.push('@interface '+fullClassname);
	interface_code.push('');

	implementation_code.push('@implementation '+classname);
	implementation_code.push('');

	var superType = typelib.resolveType(classinfo.superClass),
		superClassToJSValue = superType.toJSValueName(),
		classToJSValue = classType.toJSValueName();


	function addExtern(ext) {
		ext = /^EXPORTAPI/.test(ext) ? ext : ('EXPORTAPI '+ext);
		~~externs.indexOf(ext) && externs.push(ext);
	}

	addExtern('EXPORTAPI JSObjectRef '+classToJSValue+'(JSContextRef, '+classType+', JSValueRef *);');
	addExtern('EXPORTAPI JSObjectRef '+superClassToJSValue+'(JSContextRef, '+superType+', JSValueRef *);');

	classinfo.methods && Object.keys(classinfo.methods).forEach(function(name,methodIndex){
		var methods = classinfo.methods[name];
		methods.forEach(function(method){
			var returnType = typelib.resolveType(method.returnType),
				selector = method.selector && method.selector.split(':').slice(1),
				args = method.args,
				argTypes = [];

			for (var c=0;c<method.args.length;c++) {
				var arg = method.args[c],
					argType = arg.type;
				argTypes[c] = typelib.resolveType(argType);
			}

			var methodSelector = (method.instance ? '-' : '+')+'('+returnType+')'+name+(args.length?':':''),
				argNames = [],
				preamble = [], 
				cleanup = [];

			for (var c=0;c<args.length;c++) {
				var arg = args[c],
					argType = typelib.resolveType(arg.subtype||arg.type),
					argName = selector[c] || arg.name;
				if (c > 0) {
					methodSelector+=' ' + argName+':('+argType+')'+argName;
				}
				else {
					methodSelector+='('+argType+')'+argName;
				}
				argNames[c] = argName;
			}

			var actionName = '__'+name+'_Action_'+util.sanitizeSymbolName(argNames.join('_'));
			actionNames.push(actionName);
			
			interface_methods.push(methodSelector+';');
			interface_methods.push('');

			implementation_code.push(methodSelector);
			implementation_code.push('{');
			implementation_code.push(indent+'auto ctx = HyperloopGlobalContext();');
			implementation_code.push(indent+'JSValueRef _exception = NULL;');
			implementation_code.push(indent+'JSValueRef *exception = &_exception;');
			implementation_code.push(indent+'auto instance = JSValueToObject(ctx, '+classToJSValue+'(ctx, self, 0), 0);');
			implementation_code.push(indent+'auto superProperty = JSStringCreateWithUTF8CString("super");')
			implementation_code.push(indent+'auto superObj = '+superClassToJSValue+'(ctx, self, exception);')
			implementation_code.push(indent+'JSObjectSetProperty(ctx, instance, superProperty, superObj, kJSPropertyAttributeReadOnly|kJSPropertyAttributeDontEnum|kJSPropertyAttributeDontDelete, exception);')
			implementation_code.push(indent+'JSStringRelease(superProperty);');
			implementation_code.push(indent+'JSValueRef args['+argNames.length+'];');
			var argcode = [];
			argTypes.forEach(function(type,index){
				var typecode = type.toJSBody(argNames[index],preamble,cleanup,declares);
				argcode.push('args['+index+'] = '+typecode+';');
			});
			preamble.forEach(function(c){
				implementation_code.push(indent+c);
			});
			argcode.forEach(function(c){
				implementation_code.push(indent+c);
			});
			if (returnType.isNativeVoid()) {
				implementation_code.push(indent+'JSObjectCallAsFunction(ctx, JSValueToObject(ctx, '+actionName+', 0), instance, '+argNames.length+', args, exception);');
				generateCheckNSException(implementation_code, indent);
				cleanup.forEach(function(c){
					implementation_code.push(indent+c);
				});
			}
			else {
				implementation_code.push(indent+'JSValueRef result$ = JSObjectCallAsFunction(ctx, JSValueToObject(ctx, '+actionName+', 0), instance, '+argNames.length+', args, exception);');
				generateCheckNSException(implementation_code, indent);
				preamble = [];
				cleanup = [];		
				var resultCode = returnType.toNativeBody('result$',preamble,cleanup,declares);
				preamble.forEach(function(c){
					implementation_code.push(indent+c);
				});
				var returnVarname = 'returnResult$';
				implementation_code.push(indent+'auto '+returnVarname+' = '+resultCode+';');
				cleanup.forEach(function(c){
					implementation_code.push(indent+c);
				});
				implementation_code.push(indent+'return '+returnVarname+';');
			}
			implementation_code.push('}');
			implementation_code.push('');

			function_code.push(util.multilineComment('called to map the JS function `'+name+'` callback to this class'))
			function_code.push('EXPORTAPI JSValueRef '+method.action+'(JSContextRef ctx, JSObjectRef function, JSObjectRef object, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception)');
			function_code.push('{');
			function_code.push(indent+actionName+' = arguments[0];');
			function_code.push(indent+'JSValueProtect(ctx,'+actionName+');');
			function_code.push(indent+'return JSValueMakeUndefined(ctx);');
			function_code.push('}');
		});
	});

	code = code.concat(interface_code);
	code = code.concat(interface_methods);
	code.push('@end');
	code.push('');

	library.writeSourceFile(options,this,headerfile,code,true);

	code = [];

	code.push(util.HEADER);
	code.push('');
	code.push('#import <hyperloop.h>');
	prepareImportOption(options);
	options.imports.forEach(function(imp){
		code.push('#import <'+imp+'.h>');
	});
	code.push('#import <'+headername+'>');
	code.push('');

	declares.forEach(function(ext){
		addExtern(ext);
	});

	externs.forEach(function(ext){
		code.push(ext);
	});

	code.push('');

	actionNames.forEach(function(name){
		code.push('static JSValueRef '+name+';');
	})
	code.push('');

	code = code.concat(implementation_code)
	code.push('@end');

	code.push('');
	code = code.concat(function_code);
	code.push('');

	library.writeSourceFile(options,this,file,code,true);
}
