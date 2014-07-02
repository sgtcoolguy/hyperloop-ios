"use hyperloop"

var keyWindow = UIApplication.sharedApplication().keyWindow;
keyWindow.backgroundColor = UIColor.blueColor();

var contentView = new UIView();
contentView.frame = UIScreen.mainScreen().applicationFrame;
contentView.backgroundColor = UIColor.darkTextColor();
keyWindow.addSubview(contentView);

var supportedColorNames = ['Cyan','Magenta','Yellow'],
	longPressClassType = UILongPressGestureRecognizer.class();

function adjustAnchorPointForGestureRecognizer(gview, gestureRecognizer)
{
    if (gestureRecognizer.state == UIGestureRecognizerStateBegan) {
        var locationInView = gestureRecognizer.locationInView(gview),
        	locationInSuperview = gestureRecognizer.locationInView(gview.superview);

        gview.layer.anchorPoint = CGPointMake(locationInView.x / gview.bounds.size.width, locationInView.y / gview.bounds.size.height);
        gview.center = locationInSuperview;
    }
}

Hyperloop.defineClass(GestureRecognizer)
	.implements('NSObject')
	.protocol('UIGestureRecognizerDelegate')
	.method({
		name: 'panView',
		returnType: 'void',
		arguments: [{type:'UIPanGestureRecognizer',name:'gestureRecognizer'}],
		action: function(params) {
			var gestureRecognizer = params.gestureRecognizer,
				state = gestureRecognizer.state;
			if (state == UIGestureRecognizerStateBegan ||
				state == UIGestureRecognizerStateChanged)
			{
				var gview = gestureRecognizer.view;
				adjustAnchorPointForGestureRecognizer(gview,gestureRecognizer);
				var translation = gestureRecognizer.translationInView(gview.superview);
				gview.center = CGPointMake(gview.center.x + translation.x, gview.center.y + translation.y);
				gestureRecognizer.setTranslation(CGPointZero,gview.superview);
			}
		}
	})
	.method({
		name: 'scaleView',
		returnType: 'void',
		arguments: [{type:'UIPinchGestureRecognizer',name:'gestureRecognizer'}],
		action: function(params) {
			var gestureRecognizer = params.gestureRecognizer,
				state = gestureRecognizer.state;
		    if (state == UIGestureRecognizerStateBegan ||
		    	state == UIGestureRecognizerStateChanged) {
		    	var gview = gestureRecognizer.view;
		        adjustAnchorPointForGestureRecognizer(gview,gestureRecognizer);
		        gview.transform = CGAffineTransformScale(gview.transform, gestureRecognizer.scale, gestureRecognizer.scale);
		        gestureRecognizer.scale = 1;
		    }
		}
	})
	.method({
		name: 'rotateView',
		returnType: 'void',
		arguments: [{type:'UIRotationGestureRecognizer',name:'gestureRecognizer'}],
		action: function(params) {
			var gestureRecognizer = params.gestureRecognizer,
				state = gestureRecognizer.state;
		    if (state == UIGestureRecognizerStateBegan ||
		    	state == UIGestureRecognizerStateChanged) {
				var gview = gestureRecognizer.view;
		        gview.transform = CGAffineTransformRotate(gview.transform, gestureRecognizer.rotation);
		        gestureRecognizer.rotation = 0;
		    }
		}
	})
	.method({
		name: 'gestureRecognizer',
		returnType: 'BOOL',
		arguments: [{type:'UIGestureRecognizer',name:'gestureRecognizer'}, {type:'UIGestureRecognizer',name:'shouldRecognizeSimultaneouslyWithGestureRecognizer',property:'otherGestureRecognizer'}],
		action: function(params){
			var gestureRecognizer = params.gestureRecognizer,
				otherGestureRecognizer = params.otherGestureRecognizer;
			if (gestureRecognizer.view!=otherGestureRecognizer.view) {
				return false;
			}
		    if (gestureRecognizer.isKindOfClass(longPressClassType) ||
		    	otherGestureRecognizer.isKindOfClass(longPressClassType)) {
		    	return false;
		    }
			return true;
		}
	})
	.build();

function TouchableView(colorName) {
	
	var imageBaseName = NSString.stringWithUTF8String(colorName+'Square'),
		image = UIImage.imageNamed(imageBaseName),
		imageViewAlloc = UIImageView.alloc(),
		imageView = imageViewAlloc.initWithImage(image),
		frame = imageView.frame,
		viewAlloc = UIView.alloc(),
		view = viewAlloc.initWithFrame(frame),
		gestureRecognizerDelegate = new GestureRecognizer(),		
		panobj = UIPanGestureRecognizer.alloc(),
		pinchobj = UIPinchGestureRecognizer.alloc(),
		rotationobj = UIRotationGestureRecognizer.alloc(),
		panGestureRecognizer = panobj.initWithTarget(gestureRecognizerDelegate,NSSelectorFromString('panView:')),
		pinchGestureRecognizer = pinchobj.initWithTarget(gestureRecognizerDelegate,NSSelectorFromString('scaleView:')),
		rotationGestureRecognizer = rotationobj.initWithTarget(gestureRecognizerDelegate,NSSelectorFromString('rotateView:'));
	
	view.addGestureRecognizer(panGestureRecognizer);
	view.addGestureRecognizer(pinchGestureRecognizer);
	view.addGestureRecognizer(rotationGestureRecognizer);

	panGestureRecognizer.delegate = gestureRecognizerDelegate;
	pinchGestureRecognizer.delegate = gestureRecognizerDelegate;
	rotationGestureRecognizer.delegate = gestureRecognizerDelegate;

	view.addSubview(imageView);
	this.view = view;
	return this;
}

var views = [];

function resetViews() {

	UIView.beginAnimations(null,null);

	var totalViewSize = CGSizeMake(0,0),
		anchorPoint = CGPointMake(0.5, 0.5);

	views.forEach(function(view){
		view.layer.anchorPoint = anchorPoint;
		view.transform = CGAffineTransformIdentity;
		var size = view.bounds.size;
		totalViewSize.width  += size.width;
        totalViewSize.height += size.height;
	});

	var containerViewSize = contentView.bounds.size,
		locationInContainerView = CGPointMake(0,0);

    locationInContainerView.x = (containerViewSize.width  - totalViewSize.width)  / 2;
    locationInContainerView.y = (containerViewSize.height - totalViewSize.height) / 2;

	views.forEach(function(view){
		var frame = view.frame;
		frame.origin = locationInContainerView;
        view.frame = frame;
        locationInContainerView.x += frame.size.width;
        locationInContainerView.y += frame.size.height;
	});

	UIView.commitAnimations();
}

try {
	supportedColorNames.forEach(function(name){
		var touchView = new TouchableView(name);
		contentView.addSubview(touchView.view);
		views.push(touchView.view);
	});

	resetViews();
}
catch(E) {
	console.log(E.message+' at '+E.line);
	console.log(E.stack);
}

