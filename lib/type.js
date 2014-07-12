/**
 * iOS specific type library subclass
 */
var SuperClass = require('./dev').require('hyperloop-common').compiler.type.Class,
	jsgen = require('./dev').require('hyperloop-common').compiler.jsgen,
	log = require('./dev').require('hyperloop-common').log;

iOSType.prototype = Object.create(SuperClass.prototype);
iOSType.prototype.constructor = iOSType;
iOSType.prototype.$super = SuperClass.prototype;

function iOSType() { 
	SuperClass.apply(this,arguments);
};

var classRegex = /(const)?\s*(\w+)\s*(\**)$/,
	protocolRegex = /const?\s*(\w+)\<(\w+)\>\s*(\**)$/,
	constRegex = /^const\s+/;

iOSType.prototype.isProtocol = function() {
	return this._protocol;
};

iOSType.prototype.isInstanceType = function() {
	return this._instancetype;
};

iOSType.prototype.safeName = function(name) {
	var value = this.$super.safeName.call(this,name);
	if (this._protocol) {
		value = this._protocolName;
	}
	else if (protocolRegex.test(name)) {
		var m = protocolRegex.exec(name);
		value = m[2];
	}
	return value;
};

iOSType.prototype.getAssignmentName = function(value) {
	if (this._protocolWrap) {
		return this._name.replace(/^const\s*/,'');
	}
	return this.$super.getAssignmentName.call(this,value);
};

iOSType.prototype.getAssignmentCast = function(value) {
	if (this._protocolWrap) {
		return 'static_cast<'+this._name.replace(/^const\s*/,'')+'>('+value+')'; // this points to the real protocol which should be like id<Foo> vs. NSObject<Foo>
	}
	return this.$super.getAssignmentCast.call(this,value);
};

iOSType.prototype._parse = function(metabase) {
	var type = this._type;
	switch (type) {
		//clang requires us to use these as aliases not as structs
		case 'id': {
			this._jstype = SuperClass.JS_OBJECT;
			this._nativetype = SuperClass.NATIVE_OBJECT;
			return;
		}
		case 'id *': {
			this._jstype = SuperClass.JS_OBJECT;
			this._nativetype = SuperClass.NATIVE_POINTER;
			this._pointer = '*';
			return;
		}
	}
	this.$super._parse.call(this,metabase);
	if (this._jstype === SuperClass.JS_UNDEFINED) {
		if (type === 'instancetype') {
			this._instancetype = true;
			this._jstype = SuperClass.JS_OBJECT;
			this._nativetype = SuperClass.NATIVE_OBJECT;
			return;
		}
		// check to see if a class
		if (classRegex.test(type) && metabase.classes) {
			var m = classRegex.exec(type),
				className = m[2],
				entry = metabase.classes[className];
			if (entry) {
				this._jstype = SuperClass.JS_OBJECT;
				this._nativetype = SuperClass.NATIVE_OBJECT;
				this._pointer = m[3] || '*';
				this._const = m[1];
				this._name = className;
				this._value = (className + ' ' + this._pointer).trim(); // trim off const

				if (this.isPointerToPointer()) {
					this._nativetype = SuperClass.NATIVE_POINTER;
				}
				return;
			}
		}
		else if (protocolRegex.test(type)) {
			type = protocolRegex.exec(type)[2];
		}
		// check to see if a protocol
		var p = metabase.protocols && metabase.protocols[type];
		if (p) {
			var className = type;
			this._jstype = SuperClass.JS_OBJECT;
			this._nativetype = SuperClass.NATIVE_OBJECT;
			this._pointer = className == 'id' ? '**' : '*';
			this._const = (constRegex.test(this._name) && 'const') || '';
			// we need to wrap as NSObject instead of id if we are specified as id<Protocol> or 
			// if this is simply the protocol name (without id<>)
			if ((/^(const)?\s*id\</.test(this._name) || !protocolRegex.test(type))) {
				var m = protocolRegex.exec(this._name);
				if (m) {
					this._pointer = m[3]||'';
					if (m[1]==='id') {
						this._pointer+='*';
					}
				}
				if (this._pointer=='**') {
					this._nativetype = SuperClass.NATIVE_POINTER;
				}
				if (className==='NSObject') {
					this._type = this._name = this._value = (this._const ? this._const+' ' : '') +'NSObject '+this._pointer;
					return;
				}
				else {
					this._name = (this._const ? this._const+' ' : '') + 'NSObject <'+className+'> '+this._pointer;
					this._value = this._name;
					this._protocolWrap = true;
				}
			}
			this._protocol = true;
			this._protocolName = className;
		}
	}
}

iOSType.prototype.hasConstructor = function() {
	if (this.isNativeStruct() || this.isProtocol()) {
		return false;
	}
	return true;
};

iOSType.prototype.toBaseCast = function(leaveCast) {
	if (this.isNativeStruct() || this.isNativeUnion()) {
		return 'void *';	
	}
	return this.$super.toBaseCast.call(this,leaveCast);
};

iOSType.prototype.toNativeObject = function() {
	if (this.isNativeStruct()) {
		return 'reinterpret_cast<'+this.toCast()+'>(o->getObject())';
	}
	return this.$super.toNativeObject.call(this);
};

iOSType.prototype.toNativeBody = function(varname, preamble, cleanup, declare) {
	if (this.isNativeString()) {
		// we will release the string, so return a NSString which will
		// get collected when auto release pool runs
		var subvar = this.makeSafeVarname(varname);

		// char accepts char code or boolean
		preamble.push('char * '+subvar+'buf = nullptr;');
		preamble.push('if (JSValueIsNumber(ctx,'+varname+'))');
		preamble.push('{');
		preamble.push('\t'+subvar+'buf = new char[1];');
		preamble.push('\t'+subvar+'buf[0] = static_cast<char>(JSValueToNumber(ctx,'+varname+',exception));');
		preamble.push('}');
		preamble.push('else if (JSValueIsBoolean(ctx,'+varname+'))');
		preamble.push('{');
		preamble.push('\t'+subvar+'buf = new char[1];');
		preamble.push('\t'+subvar+'buf[0] = static_cast<char>(JSValueToBoolean(ctx,'+varname+') ? 1 : 0);');
		preamble.push('}');
		preamble.push('else');
		preamble.push('{');
		preamble.push('\t'+subvar+'buf = HyperloopJSValueToStringCopy(ctx,'+varname+',exception);');
		preamble.push('}');

		cleanup.push('delete [] '+subvar+'buf;');

		if (this._length===1) {
			return '*[[NSString stringWithFormat:@"%c",'+subvar+'buf[0]] UTF8String]';
		}
		return '[[NSString stringWithUTF8String:'+subvar+'buf] UTF8String]';
	}
	else if (this.isNativeBlock()){
		var blockName = jsgen.makeVariableName()+'Block';

		preamble.push('auto fn = JSValueToObject(ctx,'+varname+',exception);');
		preamble.push('JSValueProtect(ctx,fn);');
		if (this._functionArgTypes[0].isNativeVoid()) {
			preamble.push(this._functionReturnType+'(^'+blockName+')(void) = ^{');
		}
		else {
			preamble.push(this._functionReturnType+'(^'+blockName+')('+this._functionArgTypes.map(function(a){return String(a)}).join(',')+') = ^('+this._functionArgTypes.map(function(a,i){return String(a)+' arg'+i}).join(', ')+'){');
		}
		var indent = '\t';
		if (!this._functionReturnType.isNativeVoid()) {
			preamble.push(indent+'__block '+this._functionReturnType+' '+blockName+'Result;');
		}
		preamble.push(indent+this._functionReturnType+'(^'+blockName+'Task)(void) = ^{');
		indent += '\t';
		preamble.push(indent+'JSValueRef args['+this._functionArgTypes.length+'];');
		preamble.push(indent+'auto ctx = HyperloopGlobalContext();')
		preamble.push(indent+'JSValueRef _exception = NULL;');
		preamble.push(indent+'JSValueRef *exception = &_exception;');
		this._functionArgTypes.forEach(function(arg,index){
			preamble.push(indent+'args['+index+'] = '+arg.toJSBody('arg'+index,preamble,cleanup,declare)+';');
		});
		var resultRef = !this._functionReturnType.isNativeVoid() ? 'auto resultRef = ' : ''; 
		preamble.push(indent+resultRef+'JSObjectCallAsFunction(ctx,fn,NULL,'+this._functionArgTypes.length+',args,exception);');
		if (!this._functionReturnType.isNativeVoid()) {
			preamble.push(indent+blockName+'Result = '+this._functionReturnType.toNative('resultRef')+';');
		}
		preamble.push(indent+'JSValueUnprotect(ctx,fn);');
		indent = '\t';
		preamble.push(indent+'};');
		if (!this._functionReturnType.isNativeVoid()) {
			preamble.push(indent+'dispatch_sync(dispatch_get_main_queue(),'+blockName+'Task);');
			preamble.push(indent+'return '+blockName+'Result;');
		}
		else {
			preamble.push(indent+'dispatch_async(dispatch_get_main_queue(),'+blockName+'Task);');
		}
		preamble.push('};');
		return blockName;
	}
	return this.$super.toNativeBody.apply(this,[varname,preamble,cleanup,declare]);
};


exports.Class = iOSType;
