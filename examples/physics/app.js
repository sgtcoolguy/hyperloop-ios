/**
 * simple example showing off the new iOS7 physics capabilities
 */
"use hyperloop"
Hyperloop.defineClass(DynamicBehaviorDelegate)
	.method({
		name: 'tapped',
		returns:'void',
		arguments: [{name:'gesture',type:'UITapGestureRecognizer *'}],
		action: tapped
	})
	.build();

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
label.numberOfLinesMode = 2;
view.addSubview(label);

var delegate = new DynamicBehaviorDelegate();

var gesture = UITapGestureRecognizer.alloc().initWithTarget(delegate,NSSelectorFromString('tapped:'.toUTF8()));

view.addGestureRecognizer(gesture);

var animator = UIDynamicAnimator.alloc().initWithReferenceView(view);

var gravityBehavior = UIGravityBehavior.alloc().initWithItems(null);

var collisionBehavior = UICollisionBehavior.alloc().initWithItems(null);
collisionBehavior.translatesReferenceBoundsIntoBoundary = true;

var itemBehavior = UIDynamicItemBehavior.alloc().initWithItems(null);
itemBehavior.elasticity = 0.6;
itemBehavior.friction = 0.5;
itemBehavior.resistance = 0.5;


animator.addBehavior(gravityBehavior);
animator.addBehavior(collisionBehavior);
animator.addBehavior(itemBehavior);


function tapped(params) {

	var num = Math.floor(Math.random()*10) % 10 + 1;
	var filename = "m"+num;
	var image = UIImage.imageNamed(filename);
	var imageView = UIImageView.alloc().initWithImage(image);
	view.addSubview(imageView);

	var tappedPos = gesture.locationInView(params.gesture.view);
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
