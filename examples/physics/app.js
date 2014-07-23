"use hyperloop"

/**
 * simple example showing off the new iOS7 physics capabilities
 */

Hyperloop.defineClass(DynamicBehaviorDelegate).implements(NSObject)
	.method(
	{
		name: 'tapped',
		returns:'void',
		arguments: [{name:'gesture',type:'UITapGestureRecognizer *'}],
		action: tapped
	}).build();

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

var win = UIApplication.sharedApplication().keyWindow;
var view = new UIView();
view.frame = win.frame;
win.addSubview(view);

var label = new UILabel();
label.textColor = UIColor.darkTextColor();
label.frame = CGRectMake(20, 20, 280, 50);
label.font = UIFont.systemFontOfSize(18);
label.textAlignment = NSTextAlignmentCenter;
label.text = 'Click to drop...'.toUTF8();
label.lineBreakMode = NSLineBreakByTruncatingTail;
label.numberOfLines = 2;
view.addSubview(label);

var delegate = new DynamicBehaviorDelegate();
var gesture = new UITapGestureRecognizer(delegate,NSSelectorFromString('tapped:'.toUTF8()));
view.addGestureRecognizer(gesture);
var animator = new UIDynamicAnimator(view);
var gravityBehavior = new UIGravityBehavior(null);
var collisionBehavior = new UICollisionBehavior(null);
collisionBehavior.translatesReferenceBoundsIntoBoundary = true;

var itemBehavior = new UIDynamicItemBehavior(null);
itemBehavior.elasticity = 0.6;
itemBehavior.friction = 0.5;
itemBehavior.resistance = 0.5;

animator.addBehavior(gravityBehavior);
animator.addBehavior(collisionBehavior);
animator.addBehavior(itemBehavior);

global.view = view;
global.label = label;

function tapped(_gesture) {
	var gesture = _gesture.cast('UITapGestureRecognizer');
	var num = Math.floor(Math.random()*10) % 10 + 1;
	var filename = NSString.stringWithUTF8String('m'+num);
	var image = UIImage.imageNamed(filename);
	var imageView = new UIImageView(image);
	view.addSubview(imageView);

	var tappedPos = gesture.locationInView(gesture.view);
	imageView.center = tappedPos;

	gravityBehavior.addItem(imageView);
	collisionBehavior.addItem(imageView);
	itemBehavior.addItem(imageView);

	if (label.alpha > 0) {
		UIView.beginAnimations(null,null);
		UIView.setAnimationDuration(2);
		label.alpha = 0.0;
		UIView.commitAnimations();
	}
}
