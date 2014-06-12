/**
 * ios platform compiler
 */
var fs = require('fs'),
	path = require('path'),
	Uglify = require('uglify-js'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	util = hyperloop.util,
	jsgen = hyperloop.compiler.jsgen,
	typelib = hyperloop.compiler.type,
	library = require('./library'),
	_ = require('underscore');

exports.initialize = initialize;
exports.finish = finish;
exports.beforeCompile = beforeCompile;
exports.afterCompile = afterCompile;
exports.isValidSymbol = isValidSymbol;
exports.getFileExtension = library.getFileExtension;
exports.validateSymbols = validateSymbols;
exports.getFunctionSymbol = getFunctionSymbol;
exports.getInstanceMethodSymbol = getInstanceMethodSymbol;
exports.getStaticMethodSymbol = getStaticMethodSymbol;
exports.getSetterSymbol = getSetterSymbol;
exports.getGetterSymbol = getGetterSymbol;
exports.defineClass = defineClass;
exports.defineMethod = defineMethod;
exports.defineConstructor = defineConstructor;
exports.findProperty = findProperty;
exports.findFunction = findFunction;

function initialize(options, build_options, arch, sdks, settings, callback) {
	library.loadMetabase(options, arch, sdks, settings, function(err, ast, libfile, astFile){
		typelib.metabase = ast;
		typelib.platform = options.platform_dir;
		return callback(err, {metabase:ast, libfile:libfile});
	},true);
}

function finish(options, build_opts, arch, state, uncompiledFiles, compiledFiles, callback) {
	callback();
}

function beforeCompile(state, arch, filename, jsfilename, relativeFilename, source) {
	state.symbols = {};
}

function afterCompile(state, arch, filename, jsfilename, relativeFilename, source, sourceAST) {
}

function getFunctionSymbol(state, name, symbolname, node, nodefail) {
	var fn = state.metabase.symbols[name];
	return {type:'function',symbolname:symbolname,argcount:node.args.length,function:fn,returnType:fn.returnType,location:node.start};
}

function getInstanceMethodSymbol(state, cls, method, varname, symbolname, node, nodefail) {
	var m = findMethod(state.metabase, cls, method, node.args, true, node, nodefail);
	if (!m) {
		nodefail(node, "couldn't find method: "+method.yellow+" for class: "+cls.yellow);
	}
	return {type:'method',metatype:'instance',symbolname:symbolname,instance:varname,class:cls,name:method,location:node.start,argcount:node.args.length,method:m,returnType:m.returnType};
}

function getStaticMethodSymbol(state, cls, method, symbolname, node, nodefail) {
	var m = findMethod(state.metabase, cls, method, node.args, false, node, nodefail);
	if (!m) {
		nodefail(node, "couldn't find method: "+method.yellow+" for class: "+cls.yellow);
	}
	return {type:'method',metatype:'static',symbolname:symbolname,instance:null,class:cls,name:method,location:node.start,argcount:node.args.length,method:m,returnType:m.returnType};
}

function getSetterSymbol(state, cls, name, instanceName, symbolname, node, nodefail) {
	var property = findProperty(state.metabase, cls, name);
	return {type:'statement',metatype:'setter',symbolname:symbolname,class:cls,name:name,instance:instanceName,location:node.start,property:property}
}

function getGetterSymbol(state, cls, name, instanceName, symbolname, node, nodefail) {
	var property = findProperty(state.metabase, cls, name);
	return {type:'statement',metatype:'getter',instance:instanceName,symbolname:symbolname,class:cls,name:name,location:node.start,argcount:1,property:property,returnType:property.type};
}

function isValidSymbol(state, name) {
	if (!name) throw new Error("name required");
	if (!state.metabase) throw new Error("state.metabase required");
	var sym = state.metabase.classes[name] ||
			  state.metabase.protocols[name] ||
			  state.metabase.symbols[name] || 
			  state.metabase.types[name];
	return !!sym;
}

function findFunction (metabase, fnname) {
	return metabase.symbols[fnname];
}

function findField(metabase, typename, field) {
	var cls = metabase.types[typename];
	if (cls && cls.fields) {
		var f = _.find(cls.fields, function(value,key) {
			return value.name == field;
		});
		return f;
	}
}

function findProperty (metabase, classname, property) {
	var cls = metabase.classes[classname] || metabase.protocols[classname];
	var p;
	if (cls) {
		p = cls.properties && cls.properties[property];
		if (p) {
			return p;
		}
		var superClass = cls.superClass;
		if (superClass) {
			return findProperty(metabase, superClass, property);
		}
	}
	return findField(metabase, classname, property);
}

/*
 * get method with given name.
 * this doesn't count on any arguments and signatures and could return multple symbols
 */
function findMethods(metabase, cls, method) {
	var entry = metabase.classes[cls] || metabase.protocols[cls],
		methods = entry.methods;

	// search for super classes
	if (!methods[method]) {
		entry = metabase.classes[entry.superClass] || metabase.protocols[entry.superClass];
		while(entry) {
			entry.methods && Object.keys(entry.methods).forEach(function(name){
				if (!(name in methods)) {
					methods[name] = entry.methods[name];
				}
			});
			entry = metabase.classes[entry.superClass] || metabase.protocols[entry.superClass];
		}
	}	

	return methods[method];
}

function findMethod (metabase, cls, method, args, isInstance, node, nodefail) {
	var entry = metabase.classes[cls] || metabase.protocols[cls],
		methods = entry.methods,
		argcount = args.length;

	// search for super classes
	if (!methods[method]) {
		entry = metabase.classes[entry.superClass] || metabase.protocols[entry.superClass];
		while(entry) {
			entry.methods && Object.keys(entry.methods).forEach(function(name){
				if (!(name in methods)) {
					methods[name] = entry.methods[name];
				}
			});
			entry = metabase.classes[entry.superClass] || metabase.protocols[entry.superClass];
		}
	}

	// match up arg count
	var result = _.filter(methods[method], function(m){
		return m.args.length == argcount && isInstance == m.instance;
	});

	if (result && result.length == 1) {
		return result[0];
	} else {
		// try to resolve with selector. for example, initWithObjects:count:
		var index = method.indexOf('_');
		if (index > 0) {
			var methodname = method.substring(0,index);
			var selector = method.replace(/_/g,':') + ':';
			result = _.filter(methods[methodname], function(e){return e.selector===selector});
		}
	}

	if (result && result.length === 0) {
		return  undefined;
	}

	if (result && result.length > 1) {
		var msg = "can't disambiguate arguments for method "+method.yellow,
			help = '  The following method signatures are available:\n\n'.yellow,
			guide = '';
		result.forEach(function(m) {
			guide += '\tHyperloop.method('+util.sanitizeSymbolName(cls).toLowerCase()+', ';
			guide += '\''+method+'(';
			var argt = [];
			m.args.forEach(function(arg) {
				argt.push(arg.type);
			});
			guide += argt.join(',');
			guide += ')\')\n';
		});
		help += guide.red.bold;
		nodefail(node, msg, help);
	}
	return result[0];
}

function validateSymbols(state, arch, symbols, nodefail) {
	var metabase = state.metabase;
	Object.keys(symbols).forEach(function(key){
		var entry = symbols[key];
		switch (entry.type) {
			case 'function': {
				var fn = entry.function;
				if (!fn) {
					nodefail(entry.location, "couldn't find function named: "+entry.NSLog_function.yellow);
				}
				if (entry.function.formatter) {
					if (entry.argcount<=1) {
						nodefail(entry.location, "wrong number of arguments passed to "+fn.name.yellow+". expected a format as the first argument of type: "+fn.formatter.type.yellow+" and 1 or more subsequent arguments");
					}
				}
				else {
					if (fn.arguments.length!==entry.argcount) {
						nodefail(entry.location, "wrong number of arguments passed to "+fn.name.yellow+". expected "+fn.arguments.length+" but received "+entry.argcount);
					}
				}
				break;
			}
			case 'constructor': {
				//TODO
				break;
			}
			case 'statement': {
				var sym = metabase.classes[entry.class] || metabase.protocols[entry.class] || metabase.types[entry.class];
				if (!sym) {
					nodefail(entry.location, "couldn't find class named: "+entry.class.yellow);
				}
				var property = findProperty(metabase, entry.class, entry.name);
				if (!property) {
					nodefail(entry, "couldn't find property named: "+entry.name.yellow+" for class: "+entry.class);
				}
				switch (entry.metatype) {
					case 'setter': {
						if (property.attributes && property.attributes.indexOf('readwrite')==-1) {
							nodefail(entry.location, "property named: "+entry.name.yellow+" for class: "+entry.class+" is readonly and cannot be set");
						}
						break;
					}
					case 'getter': {
						break;
					}
				}
				break;
			}
			case 'method': {
				var methods = [entry.method]; //FIXME
				if (!methods || methods.length===0) {
					nodefail(entry.location, "couldn't find method named: "+entry.name.yellow+" for class: "+entry.class);
				}
				if (methods.length===1) {
					if (methods[0].instance &&
						entry.metatype==='static') {
						log.info(methods)
						nodefail(entry.location, "method named: "+entry.name.yellow+" is an instance method and you are trying to invoke it as a static method");
					}
				}
				else {
					//TODO: implement
					nodefail(entry.location, "method has multiple implementations, you need to disambiguate");
				}
				var method = methods[0],
					args = method.args;
				if (method.formatter) {
					if (entry.argcount<=1) {
						nodefail(entry.location, "wrong number of arguments passed to "+entry.name.yellow+". expected a format as the first argument of type: "+method.formatter.type.yellow+" and 1 or more subsequent arguments");
					}
				}
				else if (args.length!==entry.argcount) {
					nodefail(entry.location, "wrong number of arguments passed to "+entry.name.yellow);
				}
				break;
			}
		}
	});
}

/**
 * called to define a class
 */
function defineClass(options, state,arch,node,dict,fail) {
	fail(node,"defineClass");
}

/**
 * called to define a overloaded method
 */
function defineMethod(options,state,arch,node,dict,fail) {
	var varname = dict.method[0].value,
		callstr = dict.method[1].value,
		start = node.start.pos,
		distance = -Number.MAX_VALUE,
		vardef;

	// look up the type for the definition
	Object.keys(state.node_map).forEach(function(key) {
		var def = JSON.parse(key);
		// check the distance from the definition, pick up negative nearest one
		if (def.type === 'name' && def.value === varname) {
			var d = def.endpos - start;
			if (d > distance) {
				distance = d;
				vardef = state.node_map[key];
			}
		}
	});

	if (!vardef || !vardef['class']) {
		throw new Error('failed to lookup definition of '+varname);
	}

	// look up matching method
	var classname = vardef['class'],
		method = callstr.split(':')[0],
		entry = state.metabase.classes[classname] || state.metabase.protocols[classname],
		methods = findMethods(state.metabase, classname, method);

	if (!methods) {
		throw new Error("couldn't find method: "+method+" for class: "+classname);
	}

	// look up matching method with signature
	var signature = callstr.substr(method.length+1).replace(/\:$/,''),
		methodname = method,
		fn = jsgen.generateMethodName(classname, methodname),
		methodObj = _.find(methods, function(m) {return m.selector==callstr;});

	fn = signature.length > 0 ? fn+'_'+signature : fn;

	if (!methodObj) {
		throw new Error("couldn't find method: "+methodname+" for class: "+classname);
	}

	// register method symbol
	var key = state.obfuscate ? jsgen.obfuscate(fn) : fn;

	state.symbols[key] = {type:'method',metatype:'instance',symbolname:fn,instance:varname,returnType:methodObj.returnType,
					class:classname,name:methodname+'_'+signature,location:node.start,argcount:methodObj.args.length,
					method:_.clone(methodObj)};

	// we need to place the instance name as the first parameter in the argument list
	dict.call.unshift({type:'variable',value:varname});

	// return the name and args to use
	return {
		args: dict.call,
		name: key
	};
}

/**
 * called to define a overloaded constructor
 */
function defineConstructor(options,state,arch,node,dict,fail) {
	var varname = dict.ctor[0].value,
		callstr = dict.ctor[1].value,
		start = node.start.pos,
		classname = varname,
		method = callstr.split(':')[0],
		// look up matching method
		entry = state.metabase.classes[classname] || state.metabase.protocols[classname],
		methods = findMethods(state.metabase, classname, method);

	if (!methods) {
		throw new Error("couldn't find method: "+method+" for class: "+classname);
	}

	var signature = method.replace(/\:$/,''),
		methodname = method,
		fn = jsgen.generateNewConstructorName(classname, methodname),
		methodObj = _.find(methods, function(m) {return m.selector==callstr;}),
		argcount = callstr.split(':').length - 1;

	fn = signature.length > 0 ? fn+'_'+signature : fn;

	if (!methodObj) {
		throw new Error("couldn't find method: "+methodname+" for class: "+classname);
	}

	var key = state.obfuscate ? jsgen.obfuscate(fn) : fn;
	var node_start = JSON.stringify(node.start);

	state.symbols[key] = {type:'constructor',metatype:'constructor',method:methodObj,name:method,symbolname:fn,class:classname,location:node.start,argcount:argcount,selector:callstr,returnType:classname};
	state.node_map[node_start] = state.symbols[key];

	// save constructor information to make it easy to search later on
	state.constructors = state.constructors || {};
	state.constructors[classname] = state.constructors[classname] || {};
	state.constructors[classname][key] = state.symbols[key];

	// return the name and args to use
	return {
		start: JSON.parse(node_start),
		args: dict.call,
		name: key
	};
}
