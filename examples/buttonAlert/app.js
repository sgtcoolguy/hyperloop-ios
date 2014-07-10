"use hyperloop"

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

var bounds = UIScreen.mainScreen().bounds;
var window = new UIWindow(bounds);
window.backgroundColor = UIColor.blueColor();

var contentView = new UIView(bounds);
contentView.backgroundColor = UIColor.whiteColor();

Hyperloop.defineClass(AlertViewDelegate)
	.implements('NSObject')
	.protocol('UIAlertViewDelegate')
	.method({
		name: 'alertView',
		returns: 'void',
		arguments: [ { type: 'UIAlertView', name: 'alertView' }, { type: 'NSInteger', name: 'clickedButtonAtIndex'} ],
		action: function(view,clickedButtonAtIndex) {
			console.log('clicked alert button: ' + clickedButtonAtIndex);
		}
	})
	.build();

Hyperloop.defineClass(ButtonHandler)
	.implements('NSObject')
	.method({
		name: 'buttonClick',
		returns: 'void',
		arguments: [],
		action: function() {
			console.log('clicked button');
			showAlert();
		}
	})
	.build();

var showAlert = function() {
	console.log('showAlert');
	var alert = new UIAlertView();
	alert.delegate = alertDelegate;
	alert.title = 'The Title'.toUTF8();
	alert.message = 'The Message'.toUTF8();
	alert.addButtonWithTitle('OK'.toUTF8());
	alert.addButtonWithTitle('Cancel'.toUTF8());
	alert.show();
};

var buttonHandler = new ButtonHandler();
var alertDelegate = new AlertViewDelegate();

var frame = CGRectMake(110,100,100,44);
var button = new UIButton(frame);
button.setTitle('click me'.toUTF8(), 0);
button.setTitleColor(UIColor.blueColor(), 0); // use enum: UIControlStateNormal

button.addTarget(buttonHandler, NSSelectorFromString('buttonClick'.toUTF8()), 1 <<  0); // use enum UIControlEventTouchDown

contentView.addSubview(button);
window.addSubview(contentView);
window.makeKeyAndVisible();

// for now, we need to hold the window so it won't get cleaned up and then released
// once this module is completed.  we need to think about how to expose the root window
global.contentView = contentView;
global.window = window;
