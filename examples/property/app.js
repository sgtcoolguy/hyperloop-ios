"use hyperloop"

var frame = CGRectMake(100,100,20,20);
var view = new UIView(frame);

view.alpha;

var alpha = view.alpha;

console.log(view.alpha);

view.alpha = 0;

view.backgroundColor = UIColor.blueColor();

var c = view.backgroundColor.CGColor;
var o = view.layer.opacity;

o = view.layer.mask.opacity;
o = view.layer.mask.mask.opacity;

view.layer.opacity = 1.0;
view.layer.mask.opacity = 1.0;
view.layer.mask.mask.opacity = 1.0;

// assign to readonly property. this should fail
// view.backgroundColor.CGColor = UIColor.blackColor();
console.log('TI_EXIT');