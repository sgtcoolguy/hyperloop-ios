"use hyperloop"

/*
 Utility.
 */
String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

var pi = fabs(Math.PI);

var keyWindow = UIApplication.sharedApplication().keyWindow;
keyWindow.backgroundColor = UIColor.whiteColor();

var label = new UILabel();
label.textColor = UIColor.darkTextColor();
label.frame = CGRectMake(20, 20, 280, 280);
label.font = UIFont.systemFontOfSize(24);
label.textAlignment = NSTextAlignmentCenter;
label.lineBreakMode = NSLineBreakByWordWrapping;
label.numberOfLines = 0;
label.text = ("PI is:\n\n"+pi).toUTF8();

keyWindow.addSubview(label);
