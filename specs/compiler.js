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
	var logs = {debug:[],info:[],trace:[],fatal:[],warn:[],error:[]}, state = {};
	options.logger = function(label,message){
		logs[label].push(message);
		log[label](message);
	}
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
			auto_exit: true,
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
		var platform = require('../'),
			state = {};
		platform.directory = path.join(__dirname,'..');
		hyperloop.run(state,'library',options,platform,[],completed);
	});

	it('should test basic app',function(done){
		compileApp('basic',function(logs){
			logs.info.should.not.be.empty;
			logs.info.join('').should.match(/global=/);
			done();
		});
	});

	it('should test cast app',function(done){
		compileApp('cast',function(logs){
			logs.info.should.not.be.empty;
			logs.info.should.have.length(4);
			logs.info[0].should.equal('1.01 1 1 true false [object Object] /a/ null undefined 3 3');
			logs.info[1].should.equal('typeof(numLen)? object');
			logs.info[2].should.equal('numLen==numLen? true');
			logs.info[3].should.equal('3');
			done();
		});
	});

	//TODO: for some reason, can't get travis to pull in updated hyperloop-common
	//which has updated node_modules folder under examples/require
	(process.env.TRAVIS ? it.skip : it)('should test common require app',function(done){
		compileApp('common/require',function(logs){
			logs.info.should.not.be.empty;
			logs.info.should.have.length(26);
			logs.info[0].should.equal('should be /app.js => /app.js');
			logs.info[1].should.equal('should be /a.js => /a.js');
			logs.info[2].should.equal('b should be 2 => 2');
			logs.info[3].should.equal('a.js child[0] =>  /a.js');
			logs.info[4].should.equal('should be /node_modules/c.js => /node_modules/c.js');
			logs.info[5].should.equal('c.js parent is /app.js => /app.js');
			logs.info[6].should.equal('should be /node_modules/e/main.js => /node_modules/e/main.js');
			logs.info[7].should.equal('should be /node_modules/e/main.js => /node_modules/e/main.js');
			logs.info[8].should.equal('should be 6 =>  6');
			logs.info[9].should.equal('should be bar =>  bar');
			logs.info[10].should.equal('a should be 1 => 6');
			logs.info[11].should.equal('b should be 2 => bar');
			logs.info[12].should.equal('c should be 1 => 1');
			logs.info[13].should.equal('d should be 1 => 1');
			logs.info[14].should.equal('e should be 2 => 2');
			logs.info[15].should.equal('f should be 3 => 3');
			logs.info[16].should.equal('j should be world => world');
			logs.info[17].should.equal('k should be 4 => 4');
			logs.info[18].should.equal('l should be 5 => 5');
			logs.info[19].should.equal('m should be 1 => 1');
			logs.info[20].should.equal('z should be 1 => 1');
			logs.info[21].should.equal('fn should be 10 => 10');
			logs.info[22].should.equal('should be true => true');
			logs.info[23].should.equal('should be /app.js => /app.js');
			logs.info[24].should.equal('app.js children => 1');
			logs.info[25].should.equal('app.js child[0] =>  /app.js');
			done();
		});
	});

	it('should test common vm app',function(done){
		compileApp('common/vm',function(logs){
			logs.info.should.not.be.empty;
			logs.info.should.have.length(16);
			logs.info[0].should.equal('script should be 1=> 1');
			logs.info[1].should.equal('script should be 2=> 2');
			logs.info[2].should.equal('script should be filename=> filename');
			logs.info[3].should.equal('script should be yes=> yes');
			logs.info[4].should.equal('script should be Foo=> Foo');
			logs.info[5].should.equal('foobar should be yes=> yes');
			logs.info[6].should.equal('c should be 0=> 0');
			logs.info[7].should.equal('executed anonymous function, good!');
			logs.info[8].should.equal('cool, worked');
			logs.info[9].should.equal('yes, worked');
			logs.info[10].should.equal('while worked');
			logs.info[11].should.equal('do...while worked');
			logs.info[12].should.equal('for..in worked');
			logs.info[13].should.equal('try/catch worked');
			logs.info[14].should.equal('const static should be 1=> 1');
			logs.info[15].should.equal('const variable should be 1=> 1');
			done();
		});
	});

	it.skip('should test common unicode app',function(done){
		//FIXME: this is currently not working for iOS
		compileApp('common/unicode',function(logs){
			console.log(logs);
			logs.debug.should.not.be.empty;
			logs.debug.should.have.length(7);
			done();
		});
	});

	it('should test struct app',function(done){
		compileApp('struct',function(logs){
			logs.info.should.not.be.empty;
			logs.info[0].should.equal('point.x=10');
			logs.info[1].should.equal('point.y=20');
			logs.info[2].should.equal('point.x=11');
			logs.info[3].should.equal('point.y=12');
			done();
		});
	});

});
