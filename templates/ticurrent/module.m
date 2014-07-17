/**
 * Appcelerator Titanium is Copyright (c) 2009-2014 by Appcelerator, Inc.
 * and licensed under the Apache Public License (version 2)
 *
 * This is a generated file and any changes will be overwritten.
 */
#import <hyperloop.h>
#import "<%=modulename%>.h"
#import "TiBase.h"
#import "TiHost.h"
#import "TiUtils.h"

@interface HyperloopJS : NSObject
@property (nonatomic, copy) NSString *id;
@property (nonatomic, copy) NSString *filename;
@property (nonatomic, readwrite) BOOL loaded;
@property (nonatomic, retain) HyperloopJS *parent;
@property (nonatomic, assign) TiObjectRef exports;
@property (nonatomic, assign) TiContextRef context;
@property (nonatomic, copy) NSString *prefix;
@end

// in KrollObject
EXPORTAPI id TiValueToId(KrollContext* context, TiValueRef v);
// in source gen
EXPORTAPI void HyperloopInitialize_Source();

extern TiStringRef kTiStringGetTime;
extern TiStringRef kTiStringLength;
extern TiStringRef kTiStringTiPropertyKey;
extern TiStringRef kTiStringPropertyKey;
extern TiStringRef kTiStringEventKey;
extern TiStringRef kTiStringExportsKey;

// Gets a JSValue and converts it to an Objective-C object
// Most of this code is taken, and modified, from TiBindingTiValueToNSObject()
static id JSValueToObjectC(KrollContext *context, TiValueRef objRef)
{
	if(objRef == NULL){
		return nil;
	}
	TiType tt = TiValueGetType([context context], objRef);
	switch (tt) {
		case kJSTypeUndefined:{
			return nil;
		}
		case kJSTypeNull: {
			return [NSNull null];
		}
		case kJSTypeBoolean: {
			return [NSNumber numberWithBool:TiValueToBoolean([context context], objRef)];
		}
		case kJSTypeNumber: {
			double result = TiValueToNumber([context context], objRef, NULL);
			if (std::isnan(result)) {
				return [NSDecimalNumber numberWithDouble:result];
			}
			return [NSNumber numberWithDouble:result];
		}
		case kJSTypeString: {
			TiStringRef stringRefValue = TiValueToStringCopy([context context], objRef, NULL);
			NSString * result = [(NSString *)TiStringCopyCFString (kCFAllocatorDefault,stringRefValue) autorelease];
			TiStringRelease(stringRefValue);
			return result;
		}
		case kJSTypeObject: {
			id privateObject = (id)HyperloopJSValueToVoidPointer([context context], objRef, NULL);
			if (privateObject != nil) {
				return privateObject;
			}
			TiObjectRef obj = TiValueToObject([context context], objRef, NULL);
			if (TiValueIsArray([context context],obj)) {
				TiValueRef length = TiObjectGetProperty([context context], obj, kTiStringLength, NULL);
				double len = TiValueToNumber([context context], length, NULL);
				NSMutableArray* resultArray = [[NSMutableArray alloc] initWithCapacity:len];
				for (size_t c=0; c<len; ++c)
				{
					TiValueRef valueRef = TiObjectGetPropertyAtIndex([context context], obj, c, NULL);
					id value = JSValueToObjectC(context,valueRef);
					//TODO: This is a temprorary workaround for the time being. We have to properly take care of [undefined] objects.
					if(value == nil){
						[resultArray addObject:[NSNull null]];
					}
					else{
						[resultArray addObject:value];
					}
				}
				return [resultArray autorelease];
			}
			if (TiValueIsDate([context context], obj)) {
				TiValueRef fn = TiObjectGetProperty([context context], obj, kTiStringGetTime, NULL);
				TiObjectRef fnObj = TiValueToObject([context context], fn, NULL);
				TiValueRef resultDate = TiObjectCallAsFunction([context context],fnObj,obj,0,NULL,NULL);
				double value = TiValueToNumber([context context], resultDate, NULL);
				return [NSDate dateWithTimeIntervalSince1970:value/1000]; // ms for JS, sec for Obj-C
			}
			if (TiObjectIsFunction([context context],obj)) {
				return [[[KrollCallback alloc] initWithCallback:obj thisObject:TiContextGetGlobalObject([context context]) context: context] autorelease];
			}
			{
				TiPropertyNameArrayRef props = TiObjectCopyPropertyNames([context context],obj);
				NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
				
				size_t count = TiPropertyNameArrayGetCount(props);
				for (size_t i = 0; i < count; i++)
				{
					TiStringRef jsString = TiPropertyNameArrayGetNameAtIndex(props, i);
					TiValueRef v = TiObjectGetProperty([context context], obj, jsString, NULL);
					NSString* jsonkey = (NSString *)TiStringCopyCFString(kCFAllocatorDefault, jsString);
					id jsonvalue = JSValueToObjectC(context,v);
					if (jsonvalue && jsonkey) {
						[dict setObject:jsonvalue forKey:jsonkey];
					}
					[jsonkey release];
				}
				TiPropertyNameArrayRelease(props);
				return [dict autorelease];
			}
		}
		default: {
			return nil;
		}
	}
}

static void TiObjectPropertyIterator(TiContextRef context, TiObjectRef object, void(^visitor)(NSString *property, TiStringRef propertyName, TiValueRef propertyValue))
{
	TiPropertyNameArrayRef properties = TiObjectCopyPropertyNames(context,object);
	size_t count = TiPropertyNameArrayGetCount(properties);
	for (size_t c = 0; c < count; c++)
	{
		TiStringRef propertyName = TiPropertyNameArrayGetNameAtIndex(properties,c);
		TiValueRef exception = NULL;
		TiValueRef propertyValue = TiObjectGetProperty(context,object,propertyName,&exception);
		if (exception!=NULL)
		{
			NSLog(@"[ERROR] exception attempting to iterate properties");
			break;
		}
		size_t buflen = TiStringGetMaximumUTF8CStringSize(propertyName);
		if (buflen)
		{
			char buf[buflen];
			buflen = TiStringGetUTF8CString(propertyName, buf, buflen);
			buf[buflen] = '\0';
			NSString *property = [NSString stringWithUTF8String:buf];
			visitor(property,propertyName,propertyValue);
		}
	}
	TiPropertyNameArrayRelease(properties);
}

@implementation <%=modulename%>

#pragma mark Internal

-(id)moduleGUID
{
	return @"<%=guid%>";
}

-(NSString*)moduleId
{
	return @"<%=moduleid%>";
}

#pragma mark Lifecycle

-(void)startup
{
	[super startup];

	KrollContext *kroll = [[self executionContext] krollContext];
	TiGlobalContextRef ctx = [kroll context];

	<%=modulename%> *me = self;
	JSValueRef exception = NULL;

	// tell hyperloop to use this context as the main context
	InitializeHyperloop(ctx);

	// initialize our source
	HyperloopInitialize_Source();

	// run the hyperloop module in the global context of kroll
	JSValueRef result = HyperloopModuleRequire(ctx,&exception,"<%=moduleid%>");

	if (result==NULL)
	{
		TiThreadPerformOnMainThread(^{
			UIAlertView *alert = [[UIAlertView alloc] initWithTitle: @"Application Error"
				message: @"Could not load your application.\n\nThe module returned no exports"
				delegate: nil
				cancelButtonTitle:@"OK"
				otherButtonTitles:nil];
			[alert show];
		},NO);
		return;
	}

	if (exception && (JSValueIsString(ctx, exception) || JSValueIsObject(ctx, exception))) {
		JSStringRef str = JSValueToStringCopy(ctx, exception, NULL);
		size_t len = JSStringGetMaximumUTF8CStringSize(str);
		char buf[len];
		JSStringGetUTF8CString(str, (char *)&buf, len);
		NSLog(@"[ERROR] %s",buf);
		JSStringRelease(str);
		UIAlertView *alert = [[UIAlertView alloc] initWithTitle: @"Application Error"
			message:[NSString stringWithFormat:@"Could not load your application.\n\n%s",buf]
			delegate: nil
			cancelButtonTitle:@"OK"
			otherButtonTitles:nil];
		TiThreadPerformOnMainThread(^{
			[alert show];
		},NO);
		return;
	}

	JSObjectRef exports = JSValueToObject(ctx,result,&exception);

	// copy all the exported properties from module into this module
	TiObjectPropertyIterator(ctx,exports,^(NSString *property, TiStringRef propertyName, TiValueRef propertyValue){
		[me replaceValue:JSValueToObjectC(kroll, propertyValue) forKey:property notification:NO];
	});	
	
}

-(void)shutdown:(id)sender
{
	[super shutdown:sender];
}

@end
