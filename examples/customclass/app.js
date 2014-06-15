"use hyperloop"

Hyperloop.defineClass(MyClass)
	.implements('NSObject')
	.protocol('UIAlertViewDelegate')
	.method({
		name: 'run', 
		returns: 'const char *', 
		arguments: [{
			name: 'type',
			type: 'const char *'
		}],
		action: function(type) {
			console.log('inside run('+type+')');
			console.log('super',this.super);
			return 'b';
		}
	})
	.method({
		name: 'run2', 
		returns: 'int', 
		action: function(type) {
			return 1;
		}
	})
	.build();

var myClass = new MyClass();
var result = myClass.run('a');

console.log('result was ['+result+']');
console.log('run2 was ['+myClass.run2()+']');


Hyperloop.defineClass(MyClass2)
	.method({
		name: 'run', 
		action: function() {
			console.log('MyClass2 run');
		}
	})
	.build();

//FIXME - this doesn't work and should: new MyClass2().run()  

var myClass2 = new MyClass2();
myClass2.run();

console.log('TI_EXIT');
