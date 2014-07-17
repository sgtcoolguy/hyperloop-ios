"use hyperloop"

Hyperloop.defineClass(MyClass)
	.implements('NSObject')
	.method({
		name: 'doSomething', 
		returns: 'void', 
		arguments: [],
		action: function() {
			typo = 0;
			throw new Error('This is the exception message');
		}
	})
	.build();

var myClass = new MyClass();
var result = myClass.doSomething();

console.log('TI_EXIT');
