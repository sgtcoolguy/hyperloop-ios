"use hyperloop"

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

// create a string and an array
var str = NSString.stringWithFormat('%@'.toUTF8(),'Passed'),
	array = NSMutableArray.array();

// stack our string in the array
array.addObject(str);

// cast the NSString back when we pull out the string from the array
var str2 = array.objectAtIndex(0).cast('NSString');

console.log(str2.length());

/*
 Create our simple UI.
 */
var win = UIApplication.sharedApplication().keyWindow,
	label = new UILabel();
label.textColor = UIColor.darkTextColor();
label.frame = CGRectMake(20, 20, 280, 280);
label.font = UIFont.systemFontOfSize(72);
label.textAlignment = NSTextAlignmentCenter;
label.text = str2;
label.lineBreakMode = NSLineBreakByTruncatingTail;
label.numberOfLines = 2;
win.addSubview(label);
