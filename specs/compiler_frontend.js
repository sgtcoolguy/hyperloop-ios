/**
 * compiler front-end test case
 */
var should = require('should'),
	path = require('path'),
	fs = require('fs'),
    wrench = require('wrench'),
	appc = require('node-appc'),
	_ = require('underscore'),
	hyperloop = require('hyperloop-common'),
	log = hyperloop.log,
	compiler = hyperloop.compiler.ast,
	typelib = hyperloop.compiler.type,
	ios_compiler = require(path.join(__dirname, '..', 'lib', 'compiler.js')),
	library = require(path.join(__dirname, '..', 'lib', 'library.js')),
	metabase = require(path.join(__dirname, '..', 'lib', 'metabase.js')),
    TMP = path.join('.', '_tmp'),
    Uglify = require('uglify-js'),
	iosMetabase = null;

describe("iOS Compiler front-end", function() {

	before(function(done) {
		this.timeout(300000);

		wrench.mkdirSyncRecursive(TMP, 0755);

		var options = {platform:'ios', dest:TMP, force:true};

		library.getArchitectures(options, function(err, archs, details, settings){
			library.loadMetabase(options, 'i386', details, settings, function(err, ast, libfile, astFile){
				should.not.exist(err);
				iosMetabase = ast;
				done();
			},true);
		});
	});

	beforeEach(function(){
		typelib.metabase = iosMetabase;
		typelib.platform = path.join(__dirname,'../');
	});

	it("should load", function(done) {
		should.exist(compiler);
		done();
	});

	it("should create builtin object", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = new Date();';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		done();
	});

	it("should use type of variable within context", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = NSString.stringWithUTF8String("hello");\nvar desc = s.description();';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('static');
		method.symbolname.should.eql('NSString_stringWithUTF8String');
		method.class.should.eql('NSString');
		method.name.should.eql('stringWithUTF8String');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});

		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('instance');
		method.symbolname.should.eql('NSString_description');
		method.class.should.eql('NSString');
		method.name.should.eql('description');
		method.instance.should.eql('s');

		done();
	});

	it("should allow redefinition of variable name", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = NSString.stringWithUTF8String("hello");\nvar desc = s.description();\ns=s.description();';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('static');
		method.symbolname.should.eql('NSString_stringWithUTF8String');
		method.class.should.eql('NSString');
		method.name.should.eql('stringWithUTF8String');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 4;
		});

		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('instance');
		method.symbolname.should.eql('NSString_description');
		method.class.should.eql('NSString');
		method.name.should.eql('description');
		method.instance.should.eql('s');
		method.location.value.should.eql('s');

		done();
	});

	it("should transform class methods", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar i = NSString.availableStringEncodings();';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('static');
		method.symbolname.should.eql('NSString_availableStringEncodings');
		method.class.should.eql('NSString');
		method.name.should.eql('availableStringEncodings');

		done();
	});

	it("should transform instance properties", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar obj = new NSObject();\nvar e = obj.isAccessibilityElement;';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(method);
		method.type.should.eql('constructor');
		method.metatype.should.eql('constructor');
		method.symbolname.should.eql('NSObject_init');
		method.class.should.eql('NSObject');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.eql('statement');
		method.metatype.should.eql('getter');
		method.symbolname.should.eql('NSObject_Get_isAccessibilityElement');
		method.class.should.eql('NSObject');
		method.name.should.eql('isAccessibilityElement');
		method.property.metatype.should.eql('property');
		method.property.subtype.should.eql('BOOL');

		done();
	});

	it("should transform instance method chain", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar s = NSString.stringWithUTF8String("hello");\nvar desc = s.description().description();';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		var ast = compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('static');
		method.symbolname.should.eql('NSString_stringWithUTF8String');
		method.class.should.eql('NSString');
		method.name.should.eql('stringWithUTF8String');

		method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.eql('method');
		method.metatype.should.eql('instance');
		method.symbolname.should.eql('NSString_description');
		method.class.should.eql('NSString');
		method.name.should.eql('description');
		method.method.selector.should.eql('description');
		method.method.returnType.should.eql('NSString *');		

		ast.print_to_string().indexOf('var desc=NSString_description(NSString_description(s)').should.be.above(0);

		done();
	});

	it("should transform function", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar obj = CGPointMake(1,2);';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 2;
		});
		should.exist(method);
		method.type.should.eql('function');
		method.symbolname.should.eql('CGPointMake_function');
		method.returnType.should.eql('CGPoint');
		should.exist(method.function);
		method.function.name.should.eql('CGPointMake');
		method.function.signature.should.eql('CGPoint (CGFloat, CGFloat)');

		done();
	});

	it("should transform struct getter", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar obj = CGPointMake(1,2);\nvar x = obj.x;';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3;
		});
		should.exist(method);
		method.type.should.eql('statement');
		method.metatype.should.eql('getter');
		method.symbolname.should.eql('CGPoint_Get_x');
		method.class.should.eql('CGPoint');
		should.exist(method.property);
		method.property.name.should.eql('x');
		method.property.subtype.should.eql('CGFloat');

		done();
	});

	it("should transform struct setter", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
		source = '"use hyperloop"\nvar obj = CGPointMake(1,2);\nobj.y = 3;';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		should.exist(state.symbols);
		state.symbols.should.be.an.Object;
		var method = _.find(state.symbols, function(value, key) {
			return value.location.line == 3 && value.metatype == 'setter';
		});
		should.exist(method);
		method.type.should.eql('statement');
		method.metatype.should.eql('setter');
		method.symbolname.should.eql('CGPoint_Set_y');
		method.class.should.eql('CGPoint');
		should.exist(method.property);
		method.property.name.should.eql('y');
		method.property.subtype.should.eql('CGFloat');

		done();
	});

	it("should transform enum reference to wrapped value", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
			source = '"use hyperloop"\nvar label = new UILabel();\nlabel.textAlignment = NSTextAlignmentCenter;';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		var transformed = compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		// we replace the symbol ref of 'NSTextAlignmentCenter' with a numeric value of 1
		var theValueArg = transformed.body[2].body.args[1];
		should.exist(theValueArg);
		theValueArg.value.should.eql(1);
		//(theValueArg instanceof Uglify.AST_Number).should.be.true; // FIXME No idea why this fails

		done();
	});

	it("should transform multiple assign properly", function(done) {
		this.timeout(100000);
		var arch = 'i386',
			build_opts = {DEBUG:true,OBFUSCATE:false},
			state = {};
			source = '"use hyperloop"\nvar label = new UILabel();label.shadowColor = label.textColor = UIColor.darkTextColor();';

		should.exist(iosMetabase);

		state.metabase = iosMetabase;
		state.libfile = 'blah';
		state.symbols = {};
		state.obfuscate = false;
		var transformed = compiler.compile({platform:'ios'}, state, ios_compiler, arch, source, 'filename', 'filename.js', build_opts);

		// ok how do we determine that we first do an assign of 100 to b, then a to b.
		var assigns = transformed.body[2].body;
		should.exist(assigns);
		var elements = assigns.elements;
		elements.should.be.an.Array;
		//elements[0].should.be.an.instanceof(Uglify.AST_Call); // FIXME No idea why this fails
		elements[0].expression.name.should.eql('UILabel_Set_textColor');
		elements[0].args[0].name.should.eql('label');
		elements[0].args[1].expression.name.should.eql('UIColor_darkTextColor');
		//elements[1].should.be.an.instanceof(Uglify.AST_Call); // FIXME No idea why this fails
		elements[1].expression.name.should.eql('UILabel_Set_shadowColor');
		elements[1].args[0].name.should.eql('label');
		elements[1].args[1].expression.name.should.eql('UILabel_Get_textColor');

		done();
	});
	it("should not transform calls to query methods when property exists", function(){
		var source = "\'use hyperloop\'; CLLocationManager.locationServicesEnabled()",
			options = {},
			state = {
				metabase: {protocols: {}, types:{}, symbols:{}, classes: {'CLLocationManager': {
					'methods': {
						"locationServicesEnabled": [
				          {
				            "name": "locationServicesEnabled",
				            "metatype": "method",
				            "instance": false,
				            "selector": "locationServicesEnabled",
				            "returnType": "signed char",
				            "returnSubtype": "BOOL",
				            "requiresSentinel": false,
				            "args": [],
				            "hasVarArgs": false,
				            "availability": {
				              "platform": "ios",
				              "introduced": "4.0",
				              "deprecated": "0",
				              "obseleted": "0",
				              "message": ""
				            }
				          }]
				},
				'properties': {
					"locationServicesEnabled": {
			          "name": "locationServicesEnabled",
			          "type": "signed char",
			          "subtype": "BOOL",
			          "attributes": [
			            "readonly",
			            "nonatomic"
			          ],
			          "metatype": "property",
			          "header": "CoreLocation/CLLocationManager.h",
			          "availability": {
			            "platform": "ios",
			            "introduced": "2.0",
			            "deprecated": "4.0",
			            "obseleted": "0",
			            "message": ""
			          }
			        }
				}}}},
				libfile: 'blah',
				symbols: {},
				obfuscate: false
			},
			build_opts = {DEBUG:true,platform:'ios',OBFUSCATE:false,DUMP_AST:false};

		var transformed = compiler.compile({platform:'ios'}, state, ios_compiler, 'i386', source, 'filename', 'filename.js', build_opts);
		transformed.print_to_string().should.eql("CLLocationManager_locationServicesEnabled();");
	});
}); 
