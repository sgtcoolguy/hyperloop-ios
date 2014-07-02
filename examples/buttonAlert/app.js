"use hyperloop"

var keyWindow = UIApplication.sharedApplication().keyWindow;
keyWindow.backgroundColor = UIColor.blueColor();

var contentView = new UIView();
contentView.frame = UIScreen.mainScreen().applicationFrame;
contentView.backgroundColor = UIColor.whiteColor();
keyWindow.addSubview(contentView);

Hyperloop.defineClass(AlertViewDelegate)
	.implements('NSObject')
	.protocol('UIAlertViewDelegate')
	.method({
		name: 'alertView',
		returnType: 'void',
		arguments: [ { type: 'UIAlertView', name: 'alertView' }, { type: 'NSInteger', name: 'clickedButtonAtIndex'} ],
		action: function(params) {
			console.log('clicked alert button: ' + params.clickedButtonAtIndex);
		}
	})
	.build();

Hyperloop.defineClass(ButtonHandler)
	.implements('NSObject')
	.method({
		name: 'buttonClick',
		returnType: 'void',
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
	alert.title = 'The Title';
	alert.message = 'The Message';
	alert.addButtonWithTitle('OK');
	alert.addButtonWithTitle('Cancel');
	alert.show();
};

var buttonHandler = new ButtonHandler();
var alertDelegate = new AlertViewDelegate();

var button = new UIButton();
button.frame = CGRectMake(110, 100, 100, 44);
button.setTitle('click me', 0);
button.setTitleColor(UIColor.blueColor(), 0); // use enum: UIControlStateNormal
contentView.addSubview(button);

button.addTarget(buttonHandler, NSSelectorFromString('buttonClick'), 1 <<  0); // use enum UIControlEventTouchDown
