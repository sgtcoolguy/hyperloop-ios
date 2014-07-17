/**
 * iOS specific implementation
 *
 * we specialize member functions to handle the base native object
 * for iOS - which happens to be an id.
 */
#ifndef _HYPERLOOP_IOS_HEADER_
#define _HYPERLOOP_IOS_HEADER_

#include <Foundation/Foundation.h>

EXPORTAPI NSString* HyperloopJSValueToNSString(JSContextRef ctx, JSValueRef value, JSValueRef *exception);

typedef Hyperloop::NativeObject<NSObject *> * NativeObjectId;

template<class T>
void Hyperloop::NativeObject<T>::release()
{
    auto x = this->object;
    if (x!=nullptr)
    {
        [x release];
    }
    delete this;
}

template<class T>
void Hyperloop::NativeObject<T>::retain()
{
    auto x = this->object;
    if (x!=nullptr)
    {
        [x retain];
    }
}

template<class T>
bool Hyperloop::NativeObject<T>::hasInstance(JSContextRef ctx, JSValueRef other, JSValueRef* exception)
{
    auto p = JSObjectGetPrivate(JSValueToObject(ctx,other,0));
    if (p!=nullptr) {
        auto po = reinterpret_cast<NativeObjectId>(p)->getObject();
        if (po!=nullptr)
        {
            return [po isKindOfClass:[this->object class]];
        }
    }
    return false;
}

template<class T>
std::string Hyperloop::NativeObject<T>::toString(JSContextRef ctx, JSValueRef* exception)
{
    auto str = [[this->object description] UTF8String];
    return std::string(str);
}

template<class T>
double Hyperloop::NativeObject<T>::toNumber(JSContextRef ctx, JSValueRef* exception)
{
    if ([this->object isKindOfClass:[NSNumber class]])
    {
        auto n = static_cast<NSNumber *>(this->object);
        return [n doubleValue];
    }
    else
    {
        auto description = [this->object description];
        auto numberFormatter = [[NSNumberFormatter alloc] init];
        [numberFormatter setNumberStyle:NSNumberFormatterDecimalStyle];
        auto result = [[numberFormatter numberFromString:description] doubleValue];
        [numberFormatter release];
        return result;
    }
    return 0;
}

template<class T>
bool Hyperloop::NativeObject<T>::toBoolean(JSContextRef ctx, JSValueRef* exception)
{
    if ([this->object isKindOfClass:[NSNumber class]])
    {
        auto n = static_cast<NSNumber *>(this->object);
        return [n boolValue];
    }
    return false;
}

#endif
