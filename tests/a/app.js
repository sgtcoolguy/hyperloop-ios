"use hyperloop"

var frame = CGRectMake(100,100,20,20);
var window = new UIWindow();
var view = new UIView(frame);
view.backgroundColor = UIColor.blueColor();
window.addSubview(view);
window.makeKeyAndVisible();

describe("UIView", function(){
	it("should have backgroundColor of blueColor", function(){
		String(view.backgroundColor).should.equal('UIDeviceRGBColorSpace 0 0 1 1');
		view.superview.should.equal(window);
		view.should.equal(view);
		window.should.equal(window);
	});
});
