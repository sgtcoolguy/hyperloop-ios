"use hyperloop"

/*
 Utility.
 */
String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

/*
 Create our simple UI.
 */
var win = UIApplication.sharedApplication().keyWindow,
	label = new UILabel();
label.shadowColor = label.textColor = UIColor.darkTextColor();
label.textColor = UIColor.blueColor();
label.frame = CGRectMake(20, 20, 280, 280);
label.font = UIFont.systemFontOfSize(36);
label.textAlignment = NSTextAlignmentCenter;
label.text = 'Loading...'.toUTF8();
label.lineBreakMode = NSLineBreakByTruncatingTail;
label.numberOfLinesMode = 2;
win.addSubview(label);