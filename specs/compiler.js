/**
 * compiler front-end test case
 */
var should = require('should'),
	path = require('path'),
	fs = require('fs'),
	appc = require('node-appc'),
	_ = require('underscore'),
	wrench = require('wrench'),
	hyperloop = require('hyperloop-common'),
	log = hyperloop.log,
	compiler = hyperloop.compiler.ast,
	ioscompiler = require(path.join(__dirname, '..', 'lib', 'compiler.js')),
	ioslib = require(path.join(__dirname, '..', 'lib', 'library.js')),
	options;

function compileApp(name, done) {
	options.src = path.join(__dirname, '..','examples',name);
	function completed() {
		var fn = path.join(options.dest,'libApp.a');
		fs.existsSync(fn).should.be.true;
		done();
	};
	var platform = require('../');
	platform.directory = path.join(__dirname,'..');
	hyperloop.run('package',options,platform,[],completed);
}

describe("Compiler front-end", function() {

	before(function(done) {
		this.timeout(30000);

		options = {
			platform: 'ios',
			arch: 'i386',
			debug: true,
			dest: 'build/test-'+(new Date().getTime()),
			name: 'App',
			appid: 'com.hyperloop.test'
		};

		wrench.mkdirSyncRecursive(options.dest);

		ioslib.getArchitectures(options,function(err,archs,sdks,settings){
			if (err) {
				return done(err);
			}
			ioslib.loadMetabase(options,options.arch,sdks,settings,function(err,m,fn){
				if (err) {
					return done(err);
				}
				should(m).not.be.null;
				should(fn).not.be.null;
				fs.unlinkSync(fn);
				done();
			},true);
		});
	});

	it('should compile library',function(done){
		this.timeout(30000);
		function completed() {
			var fn = path.join(options.dest,'libhyperloop.a');
			fs.existsSync(fn).should.be.true;
			done();
		};
		var platform = require('../');
		platform.directory = path.join(__dirname,'..');
		hyperloop.run('library',options,platform,[],completed);
	});

	it('should compile basic app',function(done){
		this.timeout(30000);
		compileApp('basic',function(err){
			done(err);
		});
	});

	it('should compile cast app',function(done){
		this.timeout(30000);
		compileApp('cast',function(err){
			done(err);
		});
	});

	it.skip('should compile crossplatform require app',function(done){
		this.timeout(30000);
		compileApp('crossplatform/require',function(err){
			done(err);
		});
	});

	it.skip('should compile crossplatform vm app',function(done){
		this.timeout(30000);
		compileApp('crossplatform/vm',function(err){
			done(err);
		});
	});

	it.skip('should compile crossplatform unicode app',function(done){
		this.timeout(30000);
		compileApp('crossplatform/unicode',function(err){
			done(err);
		});
	});

	afterEach(function(){
		['src','build','App','App.xcodeproj','js','simulator'].forEach(function(name){
			var p = path.join(options.dest,name);
			if (fs.existsSync(p)) {
				wrench.rmdirSyncRecursive(p);
			}
		});
		['libApp.a','app.h'].forEach(function(name){
			var p = path.join(options.dest,name);
			if (fs.existsSync(p)) {
				fs.unlinkSync(p);
			}
		});
	});

	after(function(){
		wrench.rmdirSyncRecursive(options.dest);
	});

});
