/**
 * compiler front-end test case
 */
var should = require('should'),
	path = require('path'),
	fs = require('fs'),
	appc = require('node-appc'),
	_ = require('underscore'),
	wrench = require('wrench'),
	async = require('async'),
	hyperloop = require('hyperloop-common'),
	log = hyperloop.log,
	compiler = hyperloop.compiler.ast,
	ioscompiler = require(path.join(__dirname, '..', 'lib', 'compiler.js')),
	ioslib = require(path.join(__dirname, '..', 'lib', 'library.js')),
	common_examples = path.join(hyperloop.dirname,'examples'),
	options;


function compileApp(name, done) {
	log.info('starting test for',name.green);
	if (/^common\//.test(name)) {
		options.src = path.join(common_examples,name.substring('common/'.length));
	}
	else {
		options.src = path.join(__dirname,'..','examples',name);
	}
	var logs = {}, state = {};
	options.logger = {};
	// setup a programmatic logger to capture logs at various levels
	function makeLogger(label) {
		return function(msg) {
			logs[label].push(msg);
			log[label](msg);
		};
	}
	['debug','info','trace','warn','error','fatal'].forEach(function(label){
		logs[label] = [];
		options.logger[label] = makeLogger(label);
	});
	var platform = require('../');
	platform.directory = path.join(__dirname,'..');
	var tasks = [];
	log.info('app build directory is',options.dest.green);
	tasks.push(function(next){
		log.info('creating library for',name.green);
		hyperloop.run(state,'library',options,platform,[],next);
	});
	tasks.push(function(next){
		log.info('compiling',name.green);
		hyperloop.run(state,'compile',options,platform,[],next);
	});
	tasks.push(function(next){
		log.info('packaging',name.green);
		hyperloop.run(state,'package',options,platform,[],next);
	});
	tasks.push(function(next){
		log.info('launching',name.green);
		hyperloop.run(state,'launch',options,platform,[],next);
	});
	async.series(tasks, function(err,results){
		should(err).be.null;
		results.should.have.length(4);
		should(results[0]).be.undefined;
		should(results[1]).be.undefined;
		should(results[2]).be.undefined;
		should(results[3]).be.undefined;
		var fn = path.join(options.dest,'libApp.a');
		fs.existsSync(fn).should.be.true;
		logs.error.should.be.empty;
		logs.fatal.should.be.empty;
		log.info('finished launch',name.green);
		done(logs);
	});
}

describe("Compiler front-end", function() {

	beforeEach(function() {
		options = {
			platform: 'ios',
			arch: 'i386',
			debug: true,
			dest: '_tmp/test-'+(new Date().getTime())+'-'+Math.floor(Math.random()*100),
			name: 'App',
			appid: 'com.hyperloop.test',
			simulator_only: true,
			unit: true,
			hide: true,
			'log-level': 'trace'
		};
		wrench.mkdirSyncRecursive(options.dest);
		log.info('created directory',options.dest);
	});

	afterEach(function(){
		wrench.rmdirSyncRecursive(options.dest);
	});

	it('should compile library',function(done){
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
		compileApp('basic',function(logs){
			logs.debug.should.not.be.empty;
			logs.debug.join('').should.match(/global=/);
			done();
		});
	});

	it('should compile cast app',function(done){
		compileApp('cast',function(logs){
			logs.debug.should.not.be.empty;
			logs.debug.should.have.length(3);
			logs.debug[0].should.equal('1.01 1 1 true false [object Object] /a/ null undefined 3 3');
			logs.debug[1].should.equal('typeof(numLen)? object');
			logs.debug[2].should.equal('numLen==numLen? true');
			done();
		});
	});

	//TODO: for some reason, can't get travis to pull in updated hyperloop-common
	//which has updated node_modules folder under examples/require
	(process.env.TRAVIS ? it.skip : it)('should compile common require app',function(done){
		compileApp('common/require',function(logs){
			logs.debug.should.not.be.empty;
			logs.debug.should.have.length(26);
			logs.debug[0].should.equal('should be /app.js => /app.js');
			logs.debug[1].should.equal('should be /a.js => /a.js');
			logs.debug[2].should.equal('b should be 2 => 2');
			logs.debug[3].should.equal('a.js child[0] =>  /a.js');
			logs.debug[4].should.equal('should be /node_modules/c.js => /node_modules/c.js');
			logs.debug[5].should.equal('c.js parent is /app.js => /app.js');
			logs.debug[6].should.equal('should be /node_modules/e/main.js => /node_modules/e/main.js');
			logs.debug[7].should.equal('should be /node_modules/e/main.js => /node_modules/e/main.js');
			logs.debug[8].should.equal('should be 6 =>  6');
			logs.debug[9].should.equal('should be bar =>  bar');
			logs.debug[10].should.equal('a should be 1 => 6');
			logs.debug[11].should.equal('b should be 2 => bar');
			logs.debug[12].should.equal('c should be 1 => 1');
			logs.debug[13].should.equal('d should be 1 => 1');
			logs.debug[14].should.equal('e should be 2 => 2');
			logs.debug[15].should.equal('f should be 3 => 3');
			logs.debug[16].should.equal('j should be world => world');
			logs.debug[17].should.equal('k should be 4 => 4');
			logs.debug[18].should.equal('l should be 5 => 5');
			logs.debug[19].should.equal('m should be 1 => 1');
			logs.debug[20].should.equal('z should be 1 => 1');
			logs.debug[21].should.equal('fn should be 10 => 10');
			logs.debug[22].should.equal('should be true => true');
			logs.debug[23].should.equal('should be /app.js => /app.js');
			logs.debug[24].should.equal('app.js children => 1');
			logs.debug[25].should.equal('app.js child[0] =>  /app.js');
			done();
		});
	});

	it('should compile common vm app',function(done){
		compileApp('common/vm',function(logs){
			logs.debug.should.not.be.empty;
			logs.debug.should.have.length(16);
			logs.debug[0].should.equal('script should be 1=> 1');
			logs.debug[1].should.equal('script should be 2=> 2');
			logs.debug[2].should.equal('script should be filename=> filename');
			logs.debug[3].should.equal('script should be yes=> yes');
			logs.debug[4].should.equal('script should be Foo=> Foo');
			logs.debug[5].should.equal('foobar should be yes=> yes');
			logs.debug[6].should.equal('c should be 0=> 0');
			logs.debug[7].should.equal('executed anonymous function, good!');
			logs.debug[8].should.equal('cool, worked');
			logs.debug[9].should.equal('yes, worked');
			logs.debug[10].should.equal('while worked');
			logs.debug[11].should.equal('do...while worked');
			logs.debug[12].should.equal('for..in worked');
			logs.debug[13].should.equal('try/catch worked');
			logs.debug[14].should.equal('const static should be 1=> 1');
			logs.debug[15].should.equal('const variable should be 1=> 1');
			done();
		});
	});

	it.skip('should compile common unicode app',function(done){
		//FIXME: this is currently not working for iOS
		compileApp('common/unicode',function(logs){
			console.log(logs);
			logs.debug.should.not.be.empty;
			logs.debug.should.have.length(7);
			done();
		});
	});


});
