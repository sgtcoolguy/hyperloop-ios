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
    NSLog(@"%s",str);
}
