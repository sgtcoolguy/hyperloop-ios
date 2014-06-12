"use hyperloop"

var frame = CGRectMake(100,100,20,20);
var view = Hyperloop.ctor(UIView, 'initWithFrame:').call(frame);

// drawRect:(CGRect)rect
// if argument count equals 0 or 1 it does not causes ambiguity in Objective-C
view.drawRect(frame);

// drawRect:forViewPrintFormatter:
// if we have more than 2 arguments it could cause ambiguity, thus disambiguation needed
Hyperloop.method(view, 'drawRect:forViewPrintFormatter:').call(frame,null);
console.log('TI_EXIT');