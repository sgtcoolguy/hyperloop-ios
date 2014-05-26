/**
 * iOS packaging
 */
var fs = require('fs'),
	path = require('path'),
	hyperloop = require('./dev').require('hyperloop-common'),
	log = hyperloop.log,
	_ = require('underscore'),
	appc = require('node-appc'),
	exec = require('child_process').exec,
	wrench = require('wrench'),
	buildlib = require('./buildlib'),
	library = require('./library'),
	async = require('async'),
	util = hyperloop.util,
	launcher = require('./launcher'),
	templateDir = path.join(__dirname,'..','templates','xcode'),
	xcodeTemplateDir = path.join(templateDir,'PRODUCTNAME'),
	titanium;

function readLegacyManifest(file) {
	var contents = fs.readFileSync(file,'utf8'),
		manifest = {},
		r = contents.toString().split('\n').filter(function(l){
			return l!=='' && l.charAt(0)!=='#';
		}).map(function(l){
			var i = l.indexOf(':'),
				k = l.substring(0,i).trim(),
				v = l.substring(i+1).trim();
			manifest[k]=v;
		});
	return manifest;
}

function resolveTiSDK (next) {
	// get the correct location of the current Ti SDK
	exec('ti info -o json -t titanium',function(err,stdout,stderr) {
		if (err) { return next(err); }
		var tiinfo = JSON.parse(stdout),
			titaniumCLI = tiinfo.titaniumCLI;
		titanium = tiinfo.titanium[titaniumCLI.selectedSDK].path;
		next(null,titanium);
	});
}

function looksLikeTiCurrentModule (options) {
	if (options.src) {
		var srcdir = options.src = appc.fs.resolvePath(options.src),
			manifestFile = path.join(srcdir,'..','manifest');
		return fs.existsSync(manifestFile) && readLegacyManifest(manifestFile);
	}
}

function configureTiCurrent(options, buildoptions, next) {
	if (typeof buildoptions === 'function') {
		next = buildoptions;
		buildoptions = options;
	}
	resolveTiSDK(function(err,titanium){
		var iphone = path.join(titanium,'iphone'),
			classes = path.join(iphone,'Classes'),
			headers = path.join(iphone,'headers');
		log.info("Detected ti.current module");
		buildoptions.cflags = buildoptions.cflags || [];
		buildoptions.linkflags = buildoptions.linkflags || [];
		buildoptions.linkflags.push('-L"'+options.dest+'"');
		buildoptions.linkflags.push('-std=c++11');
		buildoptions.linkflags.push('-lc++');
		buildoptions.cflags.push('-DUSE_TIJSCORE');
		buildoptions.cflags.push('-I"'+options.dest+'"');
		buildoptions.cflags.push('-I"'+classes+'"');
		buildoptions.cflags.push('-I"'+headers+'"');
		buildoptions.cflags.push('-I"'+path.join(headers,'TiCore')+'"');
		buildoptions['min-version'] = buildoptions['minVersion'] = '6.0';
		buildoptions.ticurrent = true;
		next();
	});
}

function validate(options,args,required,callback) {

	options.main = (options.main || 'app').replace(/\.js/g,'').replace(/\\/,'_');

	var packageType = 'app',
		manifestFile,
		isLegacyModuledir;

	if (args.length!==0) {
		packageType = args[0];
	}
	
	if (args.length===0 || packageType==='module') {
		// auto-detect package type
		var manifest = looksLikeTiCurrentModule(options);
		if (manifest) {
			packageType = 'module';
			options.manifest = manifest;
			options.ticurrent = true;
			options.moduleid = options.manifest.moduleid;
			options.author = options.manifest.author;
			options.version = options.manifest.version;
			options.name = options.manifest.name;
			options.guid = options.manifest.guid;
			options.cflags = options.cflags || [];
			options.linkflags = options.linkflags || [];
		}
	}

	options.packageType = packageType;

	switch (packageType) {
		case 'module': {

			if (!options.manifest) {
				return callback("Directory: "+srcdir.yellow+" doesn't look like a Titanium module directory");
			}

			// switch out the main to be unique in case we compile multiple modules
			// which all have an app.hjs, we want to have a unique set of names
			options.classprefix = options.moduleid.replace(/\./g,'_')+'_';

			required(options,'name','specify the module name');
			required(options,'moduleid','specify the module identifier (such as com.module.id) for the module');
			required(options,'author','specify the module author');
			required(options,'version','specify the module version such as 1.0.0');

			options.guid = options.guid || util.guid();
			if (options.guid.split('-').length<4) {
				return callback("invalid module guid. should look something like: AAE42805-C190-441B-815E-B4BFC9E437C3. Try running `uuidgen`");
			}
			log.debug('using module guid:',options.guid.magenta);

			break;
		}
		case 'app': {
			required(options,'name','specify the name of the application');
			required(options,'appid','specify the application identifier (such as com.appcelerator.foo) of the application');

			//TODO: maybe make this more flexible.
			var libfile = path.join(options.dest,'libhyperloop.a');
			if (!fs.existsSync(libfile)) {
				return callback("Couldn't find hyperloop library. Run `hyperloop library` to generate one");
			}

			if (options.arch === 'i386' || options.simulator_only) {
				break;
			}
			else {
				// see if we have a connected devices
				launcher.detectConnectedDevices(function(err,uuids){
					if (err) { return callback(err); }
					if (!uuids) {
						// fall back to simulator
						// set a flag to indicate that this is a simulator launch
						options.simulator_only = true;
						options.arch = 'i386';
					}
					else {
						if (options.device_id) {
							if (Array.isArray(options.device_id)) {
								return callback("more than one device connected. only one device can be connected at this time");
							}
							log.debug('validating device-id',options.device_id,'in',uuids.join(', '));
							if (uuids.indexOf(options.device_id)===-1) {
								log.debug("Connected devices: ",uuids.join(', '));
								return callback("Can't find connected device id `"+options.device_id+"`");
							}
						}
						else {
							if (uuids.length > 1) {
								log.warn(uuids.length,"devices are connected, using the first device found `"+uuids[0]+"`");
								log.warn("Use --device-id <id> to specify a specific device to use");
							}
							options.device_id = uuids[0];
						}
						options.arch = 'armv7';
					}
				});
			}
			break;
		}
		default: {
			return callback("Unknown package type: "+packageType.green);
		}
	}

	callback(null,true);
};

/**
 * package an iOS application
 */
function packageApp(options,args,callback) {

	var libname = /^lib(\w+)\.a/.exec(options.libname || 'libapp.a')[1],
		arch = options.arch || 'i386',
		arch = /(i386|simulator)/.test(arch) ? 'i386' : 'armv7',
		platform = /(i386|simulator)/.test(arch) ? 'simulator' : 'os',
		appdir = path.join(options.dest,platform,options.name+'.app'),
		appdirParent = path.dirname(appdir),
		builddir = path.resolve(options.dest);

	if (!fs.existsSync(builddir)) {
		wrench.mkdirSyncRecursive(builddir);
	}

	// delete any existing xcode project directories since they will cause problems if we have
	// more than one .xcodeproj when we invoke xcodebuild
	fs.readdirSync(builddir).filter(function(name){return /\.xcodeproj$/.test(name)}).map(function(f){return path.join(builddir,f);}).forEach(wrench.rmdirSyncRecursive);
	
	// delete any older .app folders
	fs.existsSync(appdirParent) && fs.readdirSync(appdirParent).filter(function(name){return /\.app$/.test(name)}).map(function(f){return path.join(appdirParent,f);}).forEach(wrench.rmdirSyncRecursive);

	// delete any older project directories if we find them
	util.filelisting(builddir,/HyperloopApp\.mm$/).map(function(f){return path.dirname(f);}).forEach(wrench.rmdirSyncRecursive);

	if (!fs.existsSync(appdir)) {
		wrench.mkdirSyncRecursive(appdir);
	}

	buildlib.getSystemFrameworks(function(err,sysframeworks) {

		var safeName = options.safeName,
			main_js = options.main,
			linkflags = options.linkflags || [],
			cflags = options.cflags || [],
			infoplist = options.infoplist || {},
			appdelegate = options.appdelegate || 'AppDelegate';

		linkflags.push('-L'+path.resolve(options.dest));
		linkflags.push('-lhyperloop');
		linkflags.push('-l'+libname);

		// these two flags do dead-code stripping
		linkflags.push('-gfull');
		linkflags.push('-dead_strip');

		// for some reason we need to export this
		linkflags.push('-weak_framework MediaPlayer');

		cflags.push('-I'+builddir);

		cflags.forEach(function(flag){
			if (/^-F/.test(flag)) {
				linkflags.push(flag);
			}
		});

		var spacer = '\t\t\t\t\t';

		var copyValues = {
			PRODUCTNAME: safeName,
			LIBDIR: path.relative(builddir,options.dest),
			LIBNAME: libname,
			HYPERLOOP_OTHER_CFLAGS: cflags.map(function(k){return '"'+k+'"'}).join(',\n'+spacer),
			HYPERLOOP_OTHER_LDFLAGS: linkflags.map(function(k){return '"'+k+'"'}).join(',\n'+spacer)
		};

		var xcodeProjectTemplate = path.join(xcodeTemplateDir,'PRODUCTNAME.xcodeproj','project.pbxproj'),
			xcodeProjectDest = path.join(builddir,safeName+'.xcodeproj','project.pbxproj'),
			xcodeSrcDest = path.join(builddir,safeName),
			prefixTemplate = path.join(templateDir,'Prefix.pch'),
			prefixDest = path.join(xcodeSrcDest,safeName+'-Prefix.pch'),
			infoplistTemplate = path.join(templateDir,'info.plist'),
			infoplistDest = path.join(xcodeSrcDest,safeName+'-Info.plist');

		wrench.mkdirSyncRecursive(path.dirname(xcodeProjectDest));
		wrench.mkdirSyncRecursive(xcodeSrcDest);

		util.copyAndFilterString(xcodeProjectTemplate,xcodeProjectDest,copyValues);
		util.copyAndFilterString(prefixTemplate,prefixDest,copyValues);

		util.copyAndFilterEJS(path.join(templateDir,'HyperloopApp.h'),path.join(xcodeSrcDest,'HyperloopApp.h'),{
			product_name: safeName,
			bundle_id: options.appid,
			main_js: main_js,
			prefix: options.classprefix,
			appdelegate: appdelegate
		});
		util.copyAndFilterEJS(path.join(templateDir,'HyperloopApp.mm'),path.join(xcodeSrcDest,'HyperloopApp.mm'),{
			product_name: safeName,
			bundle_id: options.appid,
			main_js: main_js,
			prefix: options.classprefix,
			appdelegate: appdelegate
		});
		util.copyAndFilterEJS(path.join(templateDir,'AppDelegate.h'),path.join(xcodeSrcDest,'AppDelegate.h'),{
			product_name: safeName,
			bundle_id: options.appid,
			main_js: main_js,
			prefix: options.classprefix
		});
		util.copyAndFilterEJS(path.join(templateDir,'AppDelegate.m'),path.join(xcodeSrcDest,'AppDelegate.m'),{
			product_name: safeName,
			bundle_id: options.appid,
			main_js: main_js,
			prefix: options.classprefix
		});
		util.copyAndFilterEJS(path.join(templateDir,'main.mm'),path.join(xcodeSrcDest,'main.mm'),{
			product_name: safeName,
			bundle_id: options.appid,
			main_js: main_js,
			prefix: options.classprefix,
			appdelegate: appdelegate
		});
		util.copyAndFilterEJS(infoplistTemplate,infoplistDest,{
			product_name: safeName,
			bundle_id: options.appid,
			main_js: main_js
		});

		// if we have any modifications to the info.plist, add them
		if (infoplist) {
			var jobs = [];
			Object.keys(infoplist).forEach(function(k){
				jobs.push(function(callback) {
					var entry = infoplist[k],
						type = entry.type
						value = entry.value,
						cmd = '/usr/libexec/PlistBuddy -c "add '+"'"+k+"' "+type+" '"+value+"'"+'" "'+infoplistDest+'"';
					log.debug(cmd);
					exec(cmd,callback);
				});
			});
			async.series(jobs,run);
		}
		else {
			run();
		}

		function run() {

			buildlib.getXcodeSettings(function(err,settings){
				if (err) return callback(err);

				// for any flag that might have a path in it, we need to make sure
				// that the path is quoted
				function quotePaths(flag) {
					if (/^-(F|I|L)/.test(flag)) {
						var path = flag.substring(2);
						if (path!='"') {
							return flag.substring(0,2)+'"'+flag.substring(2)+'"';
						}
					}
					return flag;
				}

				var args = [
					'-sdk', 'iphone'+platform+''+settings.version,
					'VALID_ARCHS='+arch,
					'OTHER_LDFLAGS='+linkflags.map(quotePaths).join(' '),
					'OTHER_CFLAGS='+cflags.map(quotePaths).join(' ')
				];

				buildlib.xcodebuild(builddir,args,function(err,result){
					if (err) { return callback(err); }

					var appdir = path.join(builddir,'build','Release-iphone'+platform,safeName+'.app');

					if (!options.logger && (options.logger && !options.logger.info)) {
						log.info('Built application in',appdir.yellow);
					}

					// copy any third-party framework resources
					options.thirdparty_frameworks && Object.keys(options.thirdparty_frameworks).forEach(function(key){
						var headerdir = options.thirdparty_frameworks[key],
							resourcesDir = path.join(path.dirname(headerdir),'Resources');
						if (fs.existsSync(resourcesDir)) {
							var copyfiles = wrench.readdirSyncRecursive(resourcesDir);
							copyfiles.forEach(function(f){
								var fp = path.join(resourcesDir,f),
									isDir = fs.statSync(fp).isDirectory(),
									dest = path.join(appdir,f);
								if (fp.indexOf('/' + options.dest + '/') >= 0) {
									return;
								}
								if (isDir) {
									wrench.mkdirSyncRecursive(dest);
								}
								else {
									util.copyFileSync(fp, dest);
								}
							});
						}
					});

			    // copy any non-source files into destination
			    if (options.src && util.isDirectory(options.src)) {
						var copyfiles = wrench.readdirSyncRecursive(path.resolve(options.src));
						copyfiles.forEach(function(f){
							var fp = path.join(options.src,f),
								isDir = fs.statSync(fp).isDirectory(),
								dest = path.join(appdir,f);
							if (isDir) {
								wrench.mkdirSyncRecursive(dest);
							}
							else {
								if (!/\.(hjs|js(on)?|m|c|cpp|mm|h)$/.test(f)) {
									if (/\.xib$/.test(f)) {
										var cmd = 'ibtool "'+fp+'" --compile "'+dest.replace('.xib','.nib')+'"';
										log.debug('running ibtool with command:',cmd.cyan);
										exec(cmd, function(err,stdout,stderr){
											stdout && log.debug(stdout);
											stderr && log.error(stderr);
										});
									}
									else {
										util.copyFileSync(fp, dest);
									}
								}
							}
						});
					}

					callback();
				});
			});

		}

		//TODO: OTHER_LDFLAGS for frameworks
		//TODO: handle launch images
	});
}

/**
 * create a Ti.Current suitable module class name
 */
function makeModuleName(moduleid) {
	var toks = moduleid.split('.'),
		name = toks.map(function(e){ return e.charAt(0).toUpperCase()+e.substring(1)}).join('');
	return name + 'Module';
}

/**
 * package this app into a Ti.Current module
 */
function packageModule (options, args, callback) {
	var name = makeModuleName(options.moduleid),
		copyValues = _.extend(options.manifest, {
			modulename: name,
			app: options.main,
			prefix: options.prefix
		}),
		skipAPIDocGen = options.apidoc===false,
		srcdir = path.join(options.dest,'src'),
		templateDir = path.join(__dirname,'templates','ticurrent'),
		srcs = [];

	util.copyAndFilterEJS(path.join(templateDir,'module.h'),path.join(srcdir,name+'.h'),copyValues);
	util.copyAndFilterEJS(path.join(templateDir,'module.m'),path.join(srcdir,name+'.mm'),copyValues);
	util.copyAndFilterEJS(path.join(templateDir,'module_assets.h'),path.join(srcdir,name+'Assets.h'),copyValues);
	util.copyAndFilterEJS(path.join(templateDir,'module_assets.m'),path.join(srcdir,name+'Assets.m'),copyValues);

	srcs.push(path.join(srcdir,name+'.mm'));
	srcs.push(path.join(srcdir,name+'Assets.m'));

	var libname = options.libname.replace(/^lib/,'').replace(/\.a$/,'').trim(),
		libdir = util.escapePaths(path.resolve(options.dest)),
		includedir = util.escapePaths(path.resolve(srcdir)),
		hllib = util.escapePaths(path.join(options.dest,options.libname)),
		finallib = util.escapePaths(path.join(options.dest,'lib'+options.moduleid+'.a')),
		templib = util.escapePaths(path.join(options.dest,'lib'+options.moduleid+'-temp.a')),
		buildoptions = {
			no_arc: true,
			minVersion: options['min-version'] || '7.0',
			libname: 'lib'+options.moduleid+'module.a',
			outdir: options.dest,
			debug: options.debug,
			cflags: options.cflags.concat(['-I'+includedir]),
			linkflags: options.linkflags.concat(['-L'+libdir,'-l'+libname,'-lhyperloop'])
		};

	// get the correct location of the current Ti SDK
	configureTiCurrent(options, buildoptions, function() {

		library.getArchitectures(options,function(err, archs, sdks, settings){
			var index = 0,
				results_by_arch = {};
			function nextArch () {
				var arch = buildoptions.arch = archs[index++];
				if (!buildoptions.arch) {
					proceed();
				}
				else {
					buildoptions.srcfiles = srcs.map(function(src){
						return {
							compile:true,
							srcfile:src,
							objfile:src.replace(/\.m(m)?$/,'.o').replace('/src/','/'+arch+'/')
						};
					});
					buildlib.compileAndMakeStaticLib(buildoptions,function(err,results){
						if (callback) { return callback(err); }
						results_by_arch[buildoptions.arch] = results;
						nextArch();
					});
				}
			}

			nextArch();

			function mergeLibraries(filename, libs, callback) {
				var cmd = settings.libtool+' -static -o '+filename+' '+libs.join(' ');
				exec(cmd, callback);
			}

			function proceed () {

				var cmd = settings.lipo+' -output '+templib+' -create '+Object.keys(results_by_arch).map(function(k){return results_by_arch[k];}).join(' ');
				log.debug(cmd);

				exec(cmd,function(err,stdout,stderr){
					if (err) { return callback(err); }

					var libs = [templib, path.join(options.dest,'libhyperloop.a'), path.join(options.dest,options.libname)];

					mergeLibraries(finallib, libs, function(){
						log.info('Creating module zip distribution');

						var Zipper = require('zipper').Zipper,
							basedir = 'modules/iphone/'+options.moduleid+'/'+options.manifest.version+'/',
							files = [],
							finalzip = path.join(options.dest,options.moduleid+'-iphone-'+options.manifest.version+'.zip'),
							zipfile = new Zipper(finalzip),
							tasks = [];

						if (fs.existsSync(finalzip)) {
							fs.unlinkSync(finalzip);
						}


						function generateDocumentation(callback) {
							if (skipAPIDocGen) {
								return callback();
							}
							appc.environ.detect();
							var ti_sdk = appc.environ.getSDK('latest'),
								root = process.env.TI_ROOT /* || (ti_sdk && ti_sdk.path)*/, //<-- we don't ship this!
								fn = root && path.join(root,'apidoc','docgen.py');
							if (fn) {
								var api_doc_path = path.join(options.src,'..','apidoc'),
									api_build_path = path.join(options.dest,'apidoc');
								if (!fs.existsSync(api_doc_path)) {
									wrench.mkdirSyncRecursive(api_build_path);
									api_doc_path = path.join(options.src,'..','..','apidoc');
									if (!fs.existsSync(api_doc_path)) {
										return callback();
									}
								}
								var cmd = fn+' --format=jsca,modulehtml --css=styles.css -o "'+api_build_path+'" -e "'+api_doc_path+'"';
								log.info('Running',cmd);
								exec(cmd, function(err,stdout,stderr) {
									if (err) { return callback(stderr || err); }
									callback(api_build_path);
								});
							}
							else {
								log.warn("Not generating API documentation, make sure $TI_ROOT is setup to SDK source directory");
								callback();
							}
						}

						generateDocumentation(function(doc_path){
							var rd = path.join(options.src,'..');
							if (doc_path) {
								rd = path.join(rd,'build');
								wrench.readdirSyncRecursive(doc_path).forEach(function(nf){
									var zfn = path.join(doc_path,nf);
									files.push([zfn,basedir+path.relative(rd,zfn)]);
								});
								rd = path.join(rd,'..');
							}
							files.push([finallib,basedir+path.basename(finallib)]);

							// directories & files we want to include in the module zip
							['assets','platform','hooks','manifest','module.xcconfig','timodule.xml','LICENSE','metadata.json'].forEach(function(fn){
								var f = path.join(rd,fn);
								if (fs.existsSync(f)) {
									if (util.isDirectory(f)) {
										util.filelisting(f).forEach(function(zfn){
											files.push([zfn,basedir+path.relative(rd,zfn)]);
										});
									}
									else {
										//special hack to make sure we indicate this module is a hyperloop module
										if (fn=='manifest') {
											var c = fs.readFileSync(f).toString();
											if (c.indexOf('hyperloop: true')===-1) {
												c+='\n# added to indicate hyperloop compiled module\nhyperloop: true\n';
												fs.writeFileSync(f,c);
											}
										}
										files.push([f,basedir+path.relative(rd,f)]);
									}
								}
							});

							// create a zip task for each file
							files.forEach(function(entry){
								tasks.push(function(callback){
									zipfile.addFile(entry[0],entry[1],callback);
								});
							});

							// run the zip tasks
							async.series(tasks,function(err){
								if (err) return callback(err);
								log.info('Created module distribution:',finalzip.yellow.bold);
								callback();
							});

						});

					});

				});
			}
		});
	});
}

exports.validate = validate;
exports.packageModule = packageModule;
exports.packageApp = packageApp;
exports.configureTiCurrent = configureTiCurrent;
exports.looksLikeTiCurrentModule = looksLikeTiCurrentModule;
