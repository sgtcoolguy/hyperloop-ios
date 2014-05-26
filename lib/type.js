/**
 * iOS specific type library subclass
 */
var SuperClass = require('./dev').require('hyperloop-common').compiler.type.Class;

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
		if (classRegex.test(type)) {
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
		var p = metabase.protocols[type];
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

exports.Class = iOSType;
