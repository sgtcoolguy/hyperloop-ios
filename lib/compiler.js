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
	_ = require('lodash');

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
	if (state.custom_classes) {
		var files = [];
		var classes = Object.keys(state.custom_classes).forEach(function(c) {
			var fn = library.getClassFilename(options,state.metabase,state,c);
			files.push(fn);
			// generate source
			library.generateCustomClass(options, state, state.metabase, c, fn);
		});
		callback();
	} 
	else {
		callback();
	}
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

function methodFail(node, method, cls, nodefail) {
	var msg = node.args.length===0 ? 'no argument' :
		((node.args.length+' arg')+((node.args.length>1) ? 's':''));
	nodefail(node, "couldn't find method: "+method.yellow+" for class: "+cls.yellow+" and "+msg.yellow);
}

function getInstanceMethodSymbol(state, cls, method, varname, symbolname, node, nodefail) {
	var m = findMethod(state.metabase, cls, method, node.args, true, node, nodefail);
	if (!m) {
		methodFail(node, method, cls, nodefail);
	}
	return {type:'method',metatype:'instance',symbolname:symbolname,instance:varname,class:cls,name:method,location:node.start,argcount:node.args.length,method:m,returnType:m.returnType};
}

function getStaticMethodSymbol(state, cls, method, symbolname, node, nodefail) {
	var m = findMethod(state.metabase, cls, method, node.args, false, node, nodefail);
	if (!m) {
		methodFail(node, method, cls, nodefail);
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
 * this doesn't count on any arguments and signatures and could return multiple symbols
 */
function findMethods(metabase, cls, method) {
	var entry = metabase.classes[cls] || metabase.protocols[cls],
		methods = _clone(entry.methods);

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
		origClass = cls,
		methods = _.clone(entry && entry.methods),
		argcount = args.length;

	// search for super classes, recording the class we find the method on
	if (!methods || !methods[method]) {
		entry = metabase.classes[entry.superClass] || metabase.protocols[entry.superClass];
		while(entry) {
			cls = entry.name;
			if (entry.methods && entry.methods[method]) {
				methods = _.clone(entry.methods);
				break;
			}
			entry = metabase.classes[entry.superClass] || metabase.protocols[entry.superClass];
		}
	}

	// match up arg count
	var result = _.filter(methods[method], function(m){
		return m.args.length === argcount && isInstance === m.instance;
	});

	// we have one match, use it
	if (result && result.length === 1) {
		if (/^alloc(WithZone)?$/.test(method)) {
			// we have to deal with this in a special way. alloc always returns id
			// but we need the return to be correct without a cast
			// do a deep clone, so we don't affect the entire metabase in-memory by setting alloc's return type to whatever invoked it last globally
			result = _.clone(result, true);
			result[0].returnType = result[0].returnSubtype = origClass;
		}
		if (result[0].returnType == 'id') {
			// we know that instancetype means we're returning the type
			// assume init methods that return id actually return the class as well
			if (result[0].returnSubtype == 'instancetype' || /^init.*$/.test(method)) {
				result = _.clone(result, true);
				result[0].returnType = result[0].returnSubtype = cls;
			}
		}
		return result[0];
	}

	// no matches, or more than one match,
	// try to resolve with selector. for example, initWithObjects:count:
	var index = method.indexOf('_');
	if (index > 0) {
		var methodname = method.substring(0,index);
		var selector = method.replace(/_/g,':') + ':';
		var origEntry = metabase.classes[origClass] || metabase.protocols[origClass],
			newMethods = _.clone(origEntry && origEntry.methods);
		// we need to start over and look for the new method name starting at the original class!
		// search for super classes
		if (!newMethods || !newMethods[method]) {
			origEntry = metabase.classes[origEntry.superClass] || metabase.protocols[origEntry.superClass];
			while(origEntry) {
				origEntry.methods && Object.keys(origEntry.methods).forEach(function(name){
					if (!newMethods || !(name in newMethods)) {
						newMethods = newMethods || [];
						newMethods[name] = origEntry.methods[name];
					}
				});
				origEntry = metabase.classes[origEntry.superClass] || metabase.protocols[origEntry.superClass];
			}
		}

		result = _.filter(newMethods[methodname], function(e){return e.selector===selector});
	}

	if (result && result.length === 0) {

		var m = methods[method];

		// see if a vararg
		if (m[0].formatter) {
			return m[0];
		}

		return undefined;
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
					nodefail(entry.location, "couldn't find function named: "+key.yellow);
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
function defineClass(options,state,arch,node,dict,fail) {
	var implementsName = dict.implements,
		methods = [],
		classname = dict.defineClass[0].value,
		protocol = dict.protocol;

	if (implementsName && implementsName.length > 1) {
		fail(node,"defineClass.implements cannot be more than 1 value");
	}
	else if (!implementsName || implementsName.length === 0) {
		implementsName = 'NSObject';
	}
	else {
		implementsName = implementsName[0].value;
	}

	var implementsType = typelib.resolveType(implementsName);
	if (!implementsType.isNativeObject()) {
		fail(node,"defineClass with implements of type: "+implementsName+" is not a class");
	}
	var implementsTypeClass = state.metabase.classes[implementsName] || state.metabase.protocols[implementsName];
	if (!implementsTypeClass) {
		fail(node,"defineClass with implements of type: "+implementsName+" is not found in the metabase");
	}

	var protocols = protocol ? protocol.map(function(p){ return p.value }) : [];
	protocols.forEach(function(p, index){
		var proto = typelib.resolveType(p);
		if (!proto.isProtocol()) {
			fail(node,"defineClass is attempting to use a non-protocol: "+p);
		}
		var protoObj = state.metabase.protocols[p];
		if (!protoObj) {
			fail(node,"defineClass is attempting to use a non-protocol: "+p);
		}
	});

	// figure out the custom implementations header
	var headerInclude = library.getClassFilename(options, state.metabase, state, classname).replace(library.getFileExtension(false),library.getFileExtension(true));

	var classObject = {
		"metatype": "interface",
		"superClass" : implementsName,
		"protocols": protocols,
		"name": classname,
		"methods" : {},
		"properties": {},
		"custom_class": true,
		"extra_includes": [ headerInclude ]
	};

	var elements = [];
	state.custom_properties = (state.custom_properties||[]);

	if (dict.method && dict.method.length) {
		for (var c=0;c<dict.method.length;c++) {
			var m = dict.method[c],
				v = m.value;
			if (m.type !== 'dict') {
				fail(node, "defineClass.method entry must be a dictionary");
			}
			var n = v.name,
				r = v.returns,
				a = v.arguments,
				x = v.action,
				name,
				returns,
				args = [],
				selector;
			if (!n) {
				fail(node,"defineClass.method must define a name property");
			}
			name = n.value;
			if (!r) {
				returns = 'void';
			}
			else {
				returns = r.value;
			}
			if (a) {
				a.value.forEach(function(arg){
					arg = arg.value;
					var obj = {
						name : arg.name && arg.name.value,
						type : arg.type && arg.type.value,
						selector : arg.selector && arg.selector.value
					};
					args.push(obj);
				});
			}
			var returnType = typelib.resolveType(returns);
			if (returnType.isJSUndefined() && !returnType.isNativeVoid() && !returnType.isNativeVoidPointer()) {
				fail(node,"defineClass.method return type is unknown: "+returns);
			}
			var inst = (v.instance ? v.instance.value : true),
				methodObject = {
					name: name,
					metatype: "method",
					instance: inst,
					selector: selector||'',
					returnType: returns,
					returnSubtype: returns,
					requiresSentinel: false,
					args: args,
					action: util.sanitizeSymbolName(classname)+'_Action_'+name+'_'+c
				};
			if (name in classObject.methods) {
				classObject.methods[name].push(methodObject);
			}
			else {
				classObject.methods[name] = [methodObject];
			}
			elements.push({action: x.value, function: methodObject.action});
			state.custom_properties.push(methodObject.action);
		}
	}
	state.custom_classes = state.custom_classes || {};
	state.custom_classes[classname] = classObject;
	state.metabase.classes[classname] = classObject;

	return {
		name: classname,
		args: elements
	};
}

/**
 * called to define a overloaded method
 */
function defineMethod(options,state,arch,node,dict,fail) {
	var varname = dict.method[0].value,
		callstr = dict.method[1].value,
		start = node.start.pos,
		distance = -Number.MAX_VALUE,
		isConstructor = false,
		classname,
		vardef,
		entry;

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

	if (vardef && vardef['class']) {
		classname = vardef['class'];
	} else {
		entry = state.metabase.classes[varname] || state.metabase.protocols[varname];
		if (entry) {
			classname = varname;
		} else {
			throw new Error('failed to lookup definition of '+varname);
		}
	}

	// look up matching method
	var method = callstr.split(':')[0],
		methods = findMethods(state.metabase, classname, method);

	if (!methods) {
		throw new Error("couldn't find method: "+method+" for class: "+classname);
	}

	// look up matching method with signature
	var signature = '',
		methodname = method,
		fn,
		methodObj = _.find(methods, function(m) {return m.selector==callstr;});

	if (!methodObj) {
		throw new Error("couldn't find method: "+methodname+" for class: "+classname);
	}

	//  check if it's constructor
	if (methodObj.name.match(/^init/) && (methodObj.returnSubtype==='id' || methodObj.returnSubtype==='instancetype')) {
		isConstructor = true;
	}

	if (isConstructor) {
		fn = jsgen.generateNewConstructorName(classname, methodname);
		signature = util.sanitizeSymbolName(callstr.replace(/\:$/,''));
	} else {
		fn = jsgen.generateMethodName(classname, methodname);
		signature = util.sanitizeSymbolName(callstr.substr(method.length+1).replace(/\:$/,''));
	}

	fn = signature.length > 0 ? fn+'_'+signature : fn;

	var key = state.obfuscate ? jsgen.obfuscate(fn) : fn,
		node_start = JSON.stringify(node.start);

	if (isConstructor) {
		var argcount = callstr.split(':').length - 1;

		// register method symbol
		state.symbols[key] = {type:'constructor',metatype:'constructor',method:methodObj,name:method,symbolname:fn,class:classname,location:node.start,argcount:argcount,selector:callstr,returnType:classname};
		state.node_map[node_start] = state.symbols[key];

		// save constructor information to make it easy to search later on
		state.constructors = state.constructors || {};
		state.constructors[classname] = state.constructors[classname] || {};
		state.constructors[classname][key] = state.symbols[key];		
	} else {
		// register method symbol
		state.symbols[key] = {type:'method',metatype:'instance',symbolname:fn,instance:varname,returnType:methodObj.returnType,
					class:classname,name:methodname+'_'+signature,location:node.start,argcount:methodObj.args.length,
					method:_.clone(methodObj)};
		// we need to place the instance name as the first parameter in the argument list
		if (methodObj.instance) {
			dict.call.unshift({type:'variable',value:varname});
		}
	}

	// return the name and args to use
	return {
		start: JSON.parse(node_start),
		args: dict.call,
		name: key
	};
}
