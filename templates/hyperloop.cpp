/**
 * ios specific hyperloop
 */

#ifdef __cplusplus
extern "C" {
#endif

JSValueRef NSObject_ToJSValue(JSContextRef, NSObject *, JSValueRef *exception);
NSObject * JSValueTo_NSObject(JSContextRef, JSValueRef, JSValueRef *exception);

#ifdef __cplusplus
}
#endif

/**
 * JSValueRef to id
 */
EXPORTAPI JSValueRef id_ToJSValue(JSContextRef ctx, id value, JSValueRef *exception) 
{
	return NSObject_ToJSValue(ctx,static_cast<NSObject *>(value),exception);
}

/**
 * id to JSValueRef
 */
EXPORTAPI id JSValueTo_id(JSContextRef ctx, JSValueRef value, JSValueRef *exception)
{
	return static_cast<id>(JSValueTo_NSObject(ctx, value, exception));
}

/**
 * native implementation of the logger
 */
EXPORTAPI void HyperloopNativeLogger(const char *str)
{
	NSString *msg = [[NSString alloc] initWithUTF8String:str];
	NSLog(@"%@",msg);
	[msg release];
}

/**
 * return a NSString* from a JSValueRef as string
 */
EXPORTAPI NSString* HyperloopJSValueToNSString(JSContextRef ctx, JSValueRef value, JSValueRef *exception) {
    char* copy = HyperloopJSValueToStringCopy(ctx, value, exception);
    NSString* str = [[[NSString alloc] initWithUTF8String:copy] autorelease];
    delete[] copy;
    return str;
}

EXPORTAPI JSValueRef Hyperloop_Binary_InstanceOf(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception) {
    if (argumentCount < 2)
    {
        *exception = HyperloopMakeException(ctx, "Wrong arguments passed to IsInstanceOf");
        return JSValueMakeUndefined(ctx);
    }

    auto isObject_a = JSValueIsObject(ctx, arguments[0]);
    auto isObject_b = JSValueIsObject(ctx, arguments[1]);

    if (isObject_a && isObject_b)
    {
        auto obj_a = JSValueTo_id(ctx, arguments[0], exception);
        auto obj_b = JSValueTo_id(ctx, arguments[1], exception);

        // nullptr means object is not a native object
        if (obj_a == nullptr || obj_b == nullptr) {
            return JSValueMakeBoolean(ctx, false);
        }

        return JSValueMakeBoolean(ctx, ([obj_a isKindOfClass:[obj_b class]]));
    }
    else if (!isObject_a && !isObject_b) {
        return JSValueMakeBoolean(ctx, JSValueIsStrictEqual(ctx, arguments[0], arguments[1]));
    }

    return JSValueMakeBoolean(ctx, false);
}