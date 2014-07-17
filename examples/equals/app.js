"use hyperloop"

var num=1, str='1', obj={value:'1'}, bool=true,
	nativeObj=NSString.stringWithUTF8String('1'),
	nativeObjSame=NSString.stringWithUTF8String('1'),
	nativeObj2=NSString.stringWithUTF8String('2');

function assert (value, test, msg) {
	console.log(
		(value==test ? '\033[32m✓\033[39m\033[0m ' : '\033[31m✘\033[39m\033[0m') + '\t('+msg+')'
	);
}

assert((num == num), true, 'number to number');
assert((num === num), true, 'number to number (strict)');
assert((num == str), true, 'number to string');
assert((num === str), false, 'number to string (strict)');
assert((num == bool), true, 'number to boolean');
assert((num === bool), false, 'number to boolean (strict)');

assert((num == nativeObj), false, 'number to native');
assert((num === nativeObj), false, 'number to native (strict)');

assert((str == nativeObj), false, 'string to native');
assert((str === nativeObj), false, 'string to native (strict)');

assert((bool == nativeObj), false, 'boolean to native');
assert((bool === nativeObj), false, 'boolean to native (strict)');

assert((obj == nativeObj), false, 'JS object to native');
assert((obj === nativeObj), false, 'JS object to native (strict)');

assert((nativeObj == nativeObj), true, 'native object');
assert((nativeObj === nativeObj), true, 'native object (strict)');

// binary operation just compares pointer address so this should return false.
// Use native method to compare values (e.g. NSString.isEqualToString)
assert((nativeObjSame == nativeObj), false, 'native object with same value');
assert((nativeObjSame === nativeObj), false, 'native object with same value (strict)');
assert((nativeObj2 == nativeObj), false, 'native object with different value');
assert((nativeObj2 === nativeObj), false, 'native object with different value (strict)');

