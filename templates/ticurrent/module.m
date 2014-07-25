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
	JSValueRef result = HyperloopModuleRequire(ctx,&exception,"/main");

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
 		[me replaceValue:TiValueToId(kroll,propertyValue) forKey:property notification:NO];	
	});	
	
}

-(void)shutdown:(id)sender
{
	[super shutdown:sender];
}

@end
