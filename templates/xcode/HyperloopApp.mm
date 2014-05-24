/**
 * Copyright (c) 2013 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 *
 * This generated code and related technologies are covered by patents
 * or patents pending by Appcelerator, Inc.
 */
#import <hyperloop.h>
#import "HyperloopApp.h"
#import "AppDelegate.h"
#import <JavaScriptCore/JavaScriptCore.h>

EXPORTAPI void HyperloopAppRequire(JSValueRef *);

// WARNING: this file is generated and will be overwritten
// Generated on <%=new Date%>

@implementation HyperloopApp {
 	JSGlobalContextRef context;
 	UIWindow *window;
 	id<UIApplicationDelegate> mydelegate;
}

@synthesize window=window;
@synthesize mydelegate=mydelegate;

-(id)init
{
	if (self = [super init])
	{		
		    // setup the root window and root view controller
		    self.window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
		    self.window.backgroundColor = [UIColor whiteColor];
		    self.window.rootViewController = [[UIViewController alloc] init];
		    [self.window makeKeyAndVisible];

		    // create the virtual machine
			JSValueRef exception = NULL;
			context = InitializeHyperloop();

		    HyperloopAppRequire(&exception);

			if (exception && (JSValueIsString(context, exception) || JSValueIsObject(context, exception))) {
				auto object = JSValueToObject(context,exception,0);

				auto lineProp = JSStringCreateWithUTF8CString("line");
				auto lineValue = JSObjectGetProperty(context,object,lineProp,0);
				double lineNumber;
				JSStringRelease(lineProp);
				if (JSValueIsNumber(context,lineValue)) {
					lineNumber = JSValueToNumber(context,lineValue,0);
				}

				auto str = JSValueToStringCopy(context, exception, NULL);
				auto len = JSStringGetMaximumUTF8CStringSize(str);
				char buf[len];
				JSStringGetUTF8CString(str, (char *)&buf, len);
				JSStringRelease(str);

				auto sourceProp = JSStringCreateWithUTF8CString("sourceURL");
				auto sourceValue = JSObjectGetProperty(context,object,sourceProp,0);
				JSStringRelease(sourceProp);
				if (JSValueIsString(context,sourceValue)) {
					auto sourceStr = JSValueToStringCopy(context, sourceValue, NULL);
					len = JSStringGetMaximumUTF8CStringSize(sourceStr);
					char sourcebuf[len];
					JSStringGetUTF8CString(sourceStr, (char *)&sourcebuf, len);
					NSLog(@"[ERROR] Error at %s@%.0f. %s",sourcebuf,lineNumber,buf);
					JSStringRelease(sourceStr);
				}

				auto stackProp = JSStringCreateWithUTF8CString("stack");
				auto stackValue = JSObjectGetProperty(context,object,stackProp,0);
				JSStringRelease(stackProp);
				if (JSValueIsString(context,stackValue)) {
					auto stackStr = JSValueToStringCopy(context, stackValue, NULL);
					len = JSStringGetMaximumUTF8CStringSize(stackStr);
					char stackbuf[len];
					JSStringGetUTF8CString(stackStr, (char *)&stackbuf, len);
					NSLog(@"[ERROR] %s",stackbuf);
					JSStringRelease(stackStr);
				}

		        auto alert = [[UIAlertView alloc] initWithTitle: @"Application Error"
		            message:[NSString stringWithFormat:@"Could not load your application.\n\n%s",buf]
		            delegate: nil
		            cancelButtonTitle:@"OK"
		            otherButtonTitles:nil];
		        [alert show];
		        [alert release];
			}

	<% if (appdelegate!=='AppDelegate') { -%>
			// we must call through JS since the compiled code has the embedded / compiled functions in it
	        JSObjectRef global = JSContextGetGlobalObject(context);
	        JSStringRef script = JSStringCreateWithUTF8CString("<%=appdelegate%>()");
	        JSValueRef value = JSEvaluateScript(context, script, global, NULL, 0, 0);
	        JSObjectRef obj = JSValueToObject(context,value,0);
	        JSStringRelease(script);

	        // we are going to make strong reference to hold the pointer
	        //FIXME: self.mydelegate = (id<UIApplicationDelegate>)HyperloopGetPrivateObjectAsID(obj);
	<% } -%>
	}
	return self;
}

<% if (appdelegate!=='AppDelegate') { -%>
-(void)setDelegate:(id<UIApplicationDelegate>) delegate
{
	// this happens because of the main setup of the AppDelegate
	// in which case, we override and install our own here
	// this is only compiled in code when we have a special app delegate
	// that overrides the default
	if ([delegate isKindOfClass:[AppDelegate class]])
	{
		delegate = self.mydelegate;
	}
	[super setDelegate:delegate];
}
<% } -%>

-(void)dealloc
{
	if (context!=NULL)
	{
		JSGlobalContextRelease(context);
		context = NULL;
	}
	[self.mydelegate release];
	self.mydelegate = nil;
	[self.window release];
	self.window = nil;
	[super dealloc];
}

@end
