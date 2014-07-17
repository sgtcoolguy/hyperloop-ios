"use hyperloop"

// create a NSString from JS string
var format = NSString.stringWithUTF8String('Hello %@'),
	format2 = NSString.stringWithUTF8String('Hello %@ (type=%@)');

// create a direct memory buffer
var world = 'world';
var buffer = calloc(1, world.length).cast('char *');

// write a string into the buffer
buffer = world;

// create an NSString from the buffer
var message = NSString.stringWithUTF8String(buffer);

// log with both NSString
NSLog(format,message);

// log with primitive
NSLog(format,1);

// log with boolean
NSLog(format,true);

// log with object
NSLog(format,{a:1});

// log with string
NSLog(format,'world');

// log with multiple args
NSLog(format2,'world','string');

free(buffer);
