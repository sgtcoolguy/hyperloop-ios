"use hyperloop"

var frame = CGRectMake(100,100,20,20);
var view = Hyperloop.ctor(UIView, 'initWithFrame:').call(frame);

view.constraints().count();
view.constraints().description().description();
console.log('TI_EXIT');