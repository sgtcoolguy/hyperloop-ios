var should = require('should'),
	path = require('path'),
	typelib = require('hyperloop-common').compiler.type,
	library = require('hyperloop-common').compiler.library;

describe('#types', function(){

	before(function(){
		typelib.reset();
		typelib.metabase = null;
		typelib.platform = null;
	});

	afterEach(function(){
		typelib.reset();
		typelib.metabase = null;
		typelib.platform = null;
	});

	beforeEach(function(){
		typelib.platform = path.join(__dirname,'..');
	});

	it('id',function() {
		typelib.metabase = {};
		var type = typelib.resolveType('id');
		type.isJSObject().should.be.true;
		type.isNativeObject().should.be.true;
	});

	it('global settings',function() {
		typelib.metabase = {};
		var type = typelib.resolveType('id');
		type.isJSObject().should.be.true;
	});

	it('CMAcceleration', function(){
		var metabase = {
			types: {
				"CMAcceleration": {
					"name": "CMAcceleration",
					"alias": "CMAcceleration",
					"type": "CMAcceleration",
					"subtype": "struct CMAcceleration",
					"metatype": "typedef",
					"framework": "CoreMotion",
					"fields": [
						{
						"name": "x",
						"type": "double",
						"subtype": "double"
						},
						{
						"name": "y",
						"type": "double",
						"subtype": "double"
						},
						{
						"name": "z",
						"type": "double",
						"subtype": "double"
						}
					]
				}				
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('CMAcceleration');
		type.isNativeStruct().should.be.true;
		var preamble = [], cleanup = [], declare = [];
		type.toJSBody('value',preamble,cleanup,declare).should.be.equal('CMAcceleration_ToJSValue(ctx,value$,exception)');
		preamble.should.not.be.empty;
		preamble[0].should.equal('CMAcceleration * value$ = (CMAcceleration *)malloc(sizeof(CMAcceleration));');
		preamble[1].should.equal('memcpy(value$,&value,sizeof(CMAcceleration));');
		cleanup.should.be.empty;
		declare.should.not.be.empty;
		declare[0].should.be.equal('JSValueRef CMAcceleration_ToJSValue(JSContextRef,CMAcceleration *,JSValueRef *);');
		declare=[];
		preamble=[];
		type.toNativeBody('value',preamble,cleanup,declare).should.be.equal('*valuebuf2->getObject()');
		preamble[0].should.be.equal('auto valuebuf = static_cast<Hyperloop::AbstractObject*>(JSObjectGetPrivate(JSValueToObject(ctx,value,exception)));');
		preamble[1].should.be.equal('auto valuebuf2 = static_cast<Hyperloop::NativeObject<CMAcceleration *> *>(valuebuf);');
		cleanup.should.be.empty;
		declare.should.be.empty;

		var code = [],	
			lib = require('../lib/library');
		library.compileType({},metabase,{},lib,'CMAcceleration',type,code);

		var results = 
		[
			'typedef Hyperloop::NativeObject<CMAcceleration *> * NativeCMAcceleration;',
			'',
			'static void FinalizeCMAcceleration(JSObjectRef object)',
			'{',
			'\tauto p = JSObjectGetPrivate(object);',
			'\tauto po = static_cast<NativeCMAcceleration>(static_cast<Hyperloop::AbstractObject *>(p));',
			'\tdelete po;',
			'}',
			'',
			'static JSClassRef RegisterCMAcceleration()',
			'{',
			'\tstatic JSClassDefinition def = kJSClassDefinitionEmpty;',
			'\tstatic JSClassRef ref = nullptr;',
			'\tif (ref==nullptr)',
			'\t{',
			'\t\tdef.finalize = FinalizeCMAcceleration;',
			'\t\tdef.className = "CMAcceleration";',
			'\t\tref = JSClassCreate(&def);',
			'\t}',
			'\treturn ref;',
			'}',
			'',
			'/**',
			' * type: CMAcceleration to JSValueRef',
			' */',
			'EXPORTAPI JSValueRef CMAcceleration_ToJSValue(JSContextRef ctx, CMAcceleration * value, JSValueRef *exception)',
			'{',
			'\treturn JSObjectMake(ctx,RegisterCMAcceleration(),new Hyperloop::NativeObject<CMAcceleration *>(value));',
			'}',
			'',
			'/**',
			' * type: CMAcceleration from JSValueRef',
			' */',
			'EXPORTAPI CMAcceleration * JSValueTo_CMAcceleration(JSContextRef ctx, JSValueRef value, JSValueRef *exception)',
			'{',
			'\tauto p = JSObjectGetPrivate(JSValueToObject(ctx,value,exception));',
			'\tauto po = reinterpret_cast<NativeCMAcceleration>(p);',
			'\treturn po->getObject();',
			'}',
			''
		];
		code.join('\n').should.eql(results.join('\n'));
	});

	it('UIColor *', function() {
		var metabase = {
			classes: {
				"UIColor": {
					"metatype": "interface",
					"framework": "UIKit",
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('UIColor *');
		type.isNativeObject().should.be.true;
		type.isJSObject().should.be.true;
		type.toName().should.be.equal('UIColor');
		type.isPointer().should.be.true;
		type.isConst().should.be.false;
	});

	it('UIColor **', function() {
		var metabase = {
			classes: {
				"UIColor": {
					"metatype": "interface",
					"framework": "UIKit",
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('UIColor **');
		type.isNativePointer().should.be.true;
		type.isJSObject().should.be.true;
		type.toName().should.be.equal('UIColor');
		type.isPointer().should.be.true;
		type.isPointerToPointer().should.be.true;
		type.isConst().should.be.false;
	});

	it('const UIColor *', function() {
		var metabase = {
			classes: {
				"UIColor": {
					"metatype": "interface",
					"framework": "UIKit",
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('const UIColor *');
		type.isNativeObject().should.be.true;
		type.isJSObject().should.be.true;
		type.toName().should.be.equal('UIColor');
		type.isPointer().should.be.true;
		type.isConst().should.be.true;
	});

	it('const UIColor **', function() {
		var metabase = {
			classes: {
				"UIColor": {
					"metatype": "interface",
					"framework": "UIKit",
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('const UIColor **');
		type.isNativePointer().should.be.true;
		type.isJSObject().should.be.true;
		type.toName().should.be.equal('UIColor');
		type.isPointer().should.be.true;
		type.isPointerToPointer().should.be.true;
		type.isConst().should.be.true;
	});

	it('NSFetchedResultsSectionInfo', function() {
		var metabase = {
			classes: {},
			protocols: {
				"NSFetchedResultsSectionInfo": {
			       "metatype": "protocol",
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('NSFetchedResultsSectionInfo');
		type.toString().should.equal('NSObject <NSFetchedResultsSectionInfo> *');
	});

	it('SKStoreProductViewController', function() {
		var metabase = {
			classes: {
				"SKStoreProductViewController": {
			       "metatype": "interface",
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('SKStoreProductViewController');
		type.toString().should.equal('SKStoreProductViewController *');
	});

	it('CLLocationCoordinate2D', function() {
		var metabase = {
			types: {
				"CLLocationCoordinate2D": {
					"name": "CLLocationCoordinate2D",
					"alias": "CLLocationCoordinate2D",
					"type": "CLLocationCoordinate2D",
					"subtype": "struct CLLocationCoordinate2D",
					"metatype": "typedef",
					"framework": "CoreLocation",
					"fields": [
						{
							"name": "latitude",
							"type": "double",
							"subtype": "CLLocationDegrees"
						},
						{
							"name": "longitude",
							"type": "double",
							"subtype": "CLLocationDegrees"
						}
					]
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('CLLocationCoordinate2D');
		var preamble = [], cleanup = [], declare = [];
		type.toNativeBody("value",preamble,cleanup,declare).should.equal('*valuebuf2->getObject()');
		preamble.should.not.be.empty;
		preamble[0].should.be.equal('auto valuebuf = static_cast<Hyperloop::AbstractObject*>(JSObjectGetPrivate(JSValueToObject(ctx,value,exception)));');
		preamble[1].should.be.equal('auto valuebuf2 = static_cast<Hyperloop::NativeObject<CLLocationCoordinate2D *> *>(valuebuf);');
		cleanup.should.be.empty;
		declare.should.be.empty;
		declare = [];
		preamble=[];
		type.toJSBody("value",preamble,cleanup,declare).should.equal('CLLocationCoordinate2D_ToJSValue(ctx,value$,exception)');
		preamble.should.not.be.empty;
		preamble[0].should.be.equal('CLLocationCoordinate2D * value$ = (CLLocationCoordinate2D *)malloc(sizeof(CLLocationCoordinate2D));');
		preamble[1].should.be.equal('memcpy(value$,&value,sizeof(CLLocationCoordinate2D));');
		cleanup.should.be.empty;
		declare.should.not.be.empty;
		declare[0].should.be.equal('JSValueRef CLLocationCoordinate2D_ToJSValue(JSContextRef,CLLocationCoordinate2D *,JSValueRef *);');
	});

	it('NSStringEncoding', function(){
		var metabase = {
			types: {
				"NSStringEncoding":
				{ 
					name: 'NSStringEncoding',
					alias: 'NSStringEncoding',
					type: 'NSUInteger',
					subtype: 'unsigned long',
					metatype: 'typedef',
					framework: 'Foundation' 
				}
			}
		};
		typelib.metabase = metabase;
		var type = typelib.resolveType('const NSStringEncoding *');
		var preamble = [], cleanup = [], declare = [];
		type.toJSBody("value",preamble,cleanup,declare).should.equal('HyperloopVoidPointerToJSValue(ctx,static_cast<void *>(const_cast<unsigned long *>(value)),exception)');
		preamble.should.be.empty;
		cleanup.should.be.empty;
		declare.should.be.empty;
	});
});

