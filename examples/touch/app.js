"use hyperloop"

try {
	var bounds = UIScreen.mainScreen().bounds;
	var window = Hyperloop.method(UIWindow, 'initWithFrame:').call(bounds);
	window.backgroundColor = UIColor.blueColor();

	var contentView = Hyperloop.method(UIView, 'initWithFrame:').call(bounds);
	contentView.backgroundColor = UIColor.whiteColor();

	var supportedColorNames = ['Cyan','Magenta','Yellow'],
		longPressClassType = UILongPressGestureRecognizer.class();

	function adjustAnchorPointForGestureRecognizer(_gview, _gestureRecognizer)
	{
		var gestureRecognizer = _gestureRecognizer.cast('UIGestureRecognizer');
		var gview = _gview.cast('UIView');
	    if (gestureRecognizer.state == UIGestureRecognizerStateBegan) {
	        var locationInView = gestureRecognizer.locationInView(gview).cast('CGPoint'), // TODO: should work without cast
	        	locationInSuperview = gestureRecognizer.locationInView(gview.superview).cast('CGPoint');

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
			action: function(_gestureRecognizer) {
				var gestureRecognizer = _gestureRecognizer.cast('UIPanGestureRecognizer'),
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
			action: function(_gestureRecognizer) {
				var gestureRecognizer = _gestureRecognizer.cast('UIPinchGestureRecognizer'),
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
			action: function(_gestureRecognizer) {
				var gestureRecognizer = _gestureRecognizer.cast('UIRotationGestureRecognizer'),
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
			action: function(_gestureRecognizer, _otherGestureRecognizer){
				var gestureRecognizer = _gestureRecognizer.cast('UIGestureRecognizer'),
					otherGestureRecognizer = _otherGestureRecognizer.cast('UIGestureRecognizer');
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

	// just want to save our delegates
	global.gestureRecognizer = {};

	function TouchableView(colorName) {
		
		var frame = CGRectMake(100,100,100,100),
			view = Hyperloop.method(UIView,'initWithFrame:').call(frame),
			gestureRecognizerDelegate = new GestureRecognizer(),
			selPanView = NSSelectorFromString(NSString.stringWithUTF8String('panView:')),
			selPinchView = NSSelectorFromString(NSString.stringWithUTF8String('scaleView:')),
			selRotateView = NSSelectorFromString(NSString.stringWithUTF8String('rotateView:')),
			panGestureRecognizer = Hyperloop.method(UIPanGestureRecognizer,'initWithTarget:action:').call(gestureRecognizerDelegate,selPanView),
			pinchGestureRecognizer = Hyperloop.method(UIPinchGestureRecognizer,'initWithTarget:action:').call(gestureRecognizerDelegate,selPinchView),
			rotationGestureRecognizer = Hyperloop.method(UIRotationGestureRecognizer, 'initWithTarget:action:').call(gestureRecognizerDelegate,selRotateView);

		global.gestureRecognizer[colorName] = [
			gestureRecognizerDelegate,
			panGestureRecognizer,
			pinchGestureRecognizer,
			rotationGestureRecognizer,
			view,
		];

		// TODO Use UIImage
		if (colorName == 'Cyan') {
			view.backgroundColor = UIColor.cyanColor();
		} else if (colorName == 'Magenta') {
			view.backgroundColor = UIColor.magentaColor();
		} else if (colorName == 'Yellow') {
			view.backgroundColor = UIColor.yellowColor();
		}
		
		view.addGestureRecognizer(panGestureRecognizer);
		view.addGestureRecognizer(pinchGestureRecognizer);
		view.addGestureRecognizer(rotationGestureRecognizer);

		panGestureRecognizer.delegate = gestureRecognizerDelegate;
		pinchGestureRecognizer.delegate = gestureRecognizerDelegate;
		rotationGestureRecognizer.delegate = gestureRecognizerDelegate;

		this.view = view;
		return this;
	}


	function resetViews() {

		UIView.beginAnimations(null,null);

		var totalViewSize = CGSizeMake(0,0),
			anchorPoint = CGPointMake(0.5, 0.5);

		global.views.forEach(function(_view){
			var view = _view.cast('UIView');
			view.layer.anchorPoint = anchorPoint;
			view.transform = CGAffineTransformMake(1,0,0,1,0,0);//CGAffineTransformIdentity;
			var size = view.bounds.size;
			totalViewSize.width  += size.width;
	        totalViewSize.height += size.height;
		});

		var containerViewSize = contentView.bounds.size,
			locationInContainerView = CGPointMake(0,0);

	    locationInContainerView.x = (containerViewSize.width  - totalViewSize.width)  / 2;
	    locationInContainerView.y = (containerViewSize.height - totalViewSize.height) / 2;

		global.views.forEach(function(_view){
			var view = _view.cast('UIView');
			var frame = view.frame;
			frame.origin = locationInContainerView;
	        view.frame = frame;
	        locationInContainerView.x += frame.size.width;
	        locationInContainerView.y += frame.size.height;
		});

		UIView.commitAnimations();
	}

	// for now, we need to hold the window so it won't get cleaned up and then released
	// once this module is completed.  we need to think about how to expose the root window
	global.contentView = contentView;
	global.window = window;
	global.views = [];

	supportedColorNames.forEach(function(name){
		var touchView = new TouchableView(name);
		contentView.addSubview(touchView.view);
		global.views.push(touchView.view);
	});

	resetViews();

	window.addSubview(contentView);
	window.makeKeyAndVisible();
}
catch(E) {
	console.log(E.message+' at '+E.line);
	console.log(E.stack);
}
