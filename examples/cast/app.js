"use hyperloop"
var array = NSMutableArray.array();
array.addObject(NSString.stringWithUTF8String("abc"));
var obj = array.objectAtIndex(0);
var length = obj.cast(NSString).length();
var numLen = NSNumber.numberWithDouble(length);
//var i = "a" instanceof NSNumber; 
//var i=numLen instanceof numLen;
// console.log("numLen instanceof numLen?",i);
console.log(1.01,1,"1",true,false,{},/a/,null,undefined,numLen,String(numLen));
console.log("typeof(numLen)?",typeof(numLen));
console.log("numLen==numLen?",numLen == numLen);
NSLog(NSString.stringWithUTF8String("[ERROR] %@"), numLen);
