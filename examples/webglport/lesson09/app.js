"use hyperloop"

var __ = NSString.stringWithUTF8String;

var Lesson1  = require('./lesson09');
var renderer = new Lesson9();

var fpsUpdateDate = +new Date();
var frameCount = 0;

Hyperloop.defineClass(MyGLController)
	.implements('GLKViewController')
	.method(
	{
		name: 'glkView',
		returns: 'void',
		arguments: [ { type: 'GLKView *', name: 'view' }, { type: 'CGRect', name: 'drawInRect', property:'rect' } ],
		action: function() { renderer.render(); }
	})
	.method(
	{
		name: 'update',
		returns: 'void',
		arguments: [],
		action: function() { 
			renderer.update();
    		frameCount++;
    		var fpsUpdateDiff = +new Date() - fpsUpdateDate;
    		if (fpsUpdateDiff > 2000) {
        		label.setText(__('FPS: ' + frameCount / 2));
        		fpsUpdateDate = +new Date();
        		frameCount = 0;
    		}
		}
	})
	.build();

// create the OpenGL context
var context = EAGLContext.alloc().initWithAPI(kEAGLRenderingAPIOpenGLES2);

// you *MUST* set this or your calls to APIs will fail
EAGLContext.setCurrentContext(context);

// create a GL view
var view = GLKView.alloc().initWithFrame(CGRectMake(0,0,0,0),context);
view.drawableDepthFormat = GLKViewDrawableDepthFormat24;

// remove the base view
var keyWindow = UIApplication.sharedApplication().keyWindow;
keyWindow.subviews.objectAtIndex(0).removeFromSuperview();

// create our custom GL controller
var controller = new MyGLController();
controller.view = view;
keyWindow.rootViewController = controller;
keyWindow.addSubview(view);

// Set preferred frame per second
controller.preferredFramesPerSecond = 60;

// add FPS label
var label = new UILabel();
label.frame = CGRectMake(0, 20, 100, 40);
label.backgroundColor = UIColor.colorWithRed(180/255, 0, 0, 0.8);
label.textColor = UIColor.whiteColor();
label.textAlignment = NSTextAlignmentCenter;
label.setText(__('FPS: '));
keyWindow.addSubview(label);

// Starts renderer
renderer.start(view);
