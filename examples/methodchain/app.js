"use hyperloop"

var frame = CGRectMake(100,100,20,20);
var view = Hyperloop.method(UIView, 'initWithFrame:').call(frame);

console.log('count=',view.constraints().count());
console.log('description=',view.constraints().description().description());
console.log('TI_EXIT');