"use hyperloop"
var frame = CGRectMake(100,100,20,20);
var window = new UIWindow();
var view = new UIView(frame);
var nativeObjects = {
	get frame() {
		return frame;
	},
	get window() {
		return window;
	},
	get view() {
		return view;
	}
};
view.backgroundColor = UIColor.blueColor();
window.addSubview(nativeObjects.view);
window.makeKeyAndVisible();

// for now, we need to hold the window so it won't get cleaned up and then released
// once this module is completed.  we need to think about how to expose the root window
global.window = window;

exports.foo = 1;
console.log('global=',Object.keys(global));
console.log('TI_EXIT');