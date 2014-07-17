"use hyperloop"

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

var keyWindow = UIApplication.sharedApplication().keyWindow;
var xbundle = NSBundle.mainBundle();

function nibToView(name) {
  var xib = xbundle.loadNibNamed(name, null, null);
  var xview = xib.lastObject();
  xview.frame = UIScreen.mainScreen().applicationFrame;
  return xview;
}

keyWindow.addSubview(nibToView('View'.toUTF8()));

