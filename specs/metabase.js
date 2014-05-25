/**
 * metabase test case for Java
 */
var should = require('should'),
    path = require('path'),
    fs = require('fs'),
    appc = require('node-appc'),
	library = require(path.join(__dirname, '..', 'lib', 'library.js')),
	metabase = require(path.join(__dirname, '..', 'lib', 'metabase.js')),
    wrench = require('wrench'),
    TMP = path.join('.', '_tmp');

describe("iOS metabase", function() {

	before(function(done){
		this.timeout(30000);

		wrench.mkdirSyncRecursive(TMP, 0755);

		var options = {platform:'ios', dest:TMP, force:true};

		library.getArchitectures(options, function(err, archs, details, settings){
			library.loadMetabase(options, 'i386', details, settings, function(err, ast, libfile, astFile){
				should.not.exist(err);
				metabase = ast;
				done();
			},true);
		});
	});

	it("should load",function(done) {
		should.exist(metabase);
		done();
	});

	it("should parse Foundation classes",function(done) {
		this.timeout(10000);
		should.exist(metabase);
		metabase.should.be.an.Object;
		metabase.classes.should.be.an.Object;
		should.exist(metabase.classes.NSString);
		metabase.classes.NSString.properties.should.be.an.Object;
		metabase.classes.NSString.methods.should.be.an.Object;
		metabase.classes.NSString.superClass.should.eql('NSObject');
		metabase.classes.NSString.metatype.should.eql('interface');

		(metabase.classes.NSString.methods.init instanceof Array).should.be.true;
		should.exist(metabase.classes.NSString.methods.UTF8String[0]);
		metabase.classes.NSString.methods.UTF8String[0].metatype.should.be.eql('method');
		metabase.classes.NSString.methods.UTF8String[0].selector.should.be.eql('UTF8String');

		should.exist(metabase.classes.NSObject);
		should.not.exist(metabase.classes.NSObject.superClass);
		metabase.classes.NSObject.rootClass.should.be.true;

		done();
	});

	it("should parse Foundation protocols",function(done) {
		this.timeout(10000);
		should.exist(metabase);
		metabase.should.be.an.Object;
		metabase.protocols.should.be.an.Object;
		should.exist(metabase.protocols.NSObject);
		metabase.protocols.NSObject.methods.should.be.an.Object;
		metabase.protocols.NSObject.metatype.should.eql('protocol');

		done();
	});

	it("should parse Foundation symbols",function(done) {
		this.timeout(10000);
		should.exist(metabase);
		metabase.should.be.an.Object;
		metabase.symbols.should.be.an.Object;
		should.exist(metabase.symbols.object_getClassName);
		metabase.symbols.object_getClassName.arguments.should.be.an.Object;
		metabase.symbols.object_getClassName.metatype.should.eql('function');

		should.exist(metabase.symbols.object_getClassName);
		should.exist(metabase.symbols.object_getClassName.signature);
		metabase.symbols.object_getClassName.signature.should.eql('const char *(id)');

		done();
	});

	it("should parse system frameworks",function(done) {
		this.timeout(10000);
		should.exist(metabase);
		metabase.should.be.an.Object;
		metabase.system_frameworks.should.be.an.Object;
		should.exist(metabase.system_frameworks.indexOf('CoreFoundation'));

		done();
	});
});