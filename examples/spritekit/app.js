"use hyperloop"

var FRAME_DURATION = 0.15,
	screenSize = UIScreen.mainScreen().bounds.size,
	HEIGHT = screenSize.height,
	WIDTH = screenSize.width,
	SPRITE_WIDTH = 48,
	SPRITE_HEIGHT = 107;

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

// given a slices folder, create an NSArray of textures for an SKAction
function textureArrayFromSlices(slices) {

	// get the default file manager
	var manager = NSFileManager.defaultManager();

	// get the path to the given slices folder
	var path = NSBundle.mainBundle().resourcePath().stringByAppendingString(NSString.stringWithUTF8String('/' + slices));

	// get the list of slice images
	var files = manager.contentsOfDirectoryAtPath(path, null);

	// Create an array of the images as textures
	var textures = NSMutableArray.array();
	for (var i = 0; i < files.count(); i++) {

		// make sure we have an actual image
		if (/^Slice\-\d+\.png$/.test(files.objectAtIndex(i))) {

			// get the slice name based on index
			var sliceName = slices + '/Slice-' + (i+1);
			// create the texture and add it to the array
			textures.addObject(SKTexture.textureWithImageNamed(NSString.stringWithUTF8String(sliceName)));
		}
	}

	return textures;
}

// get the main window
var keyWindow = UIApplication.sharedApplication().keyWindow;

// init the SKView
var skView = new SKView();
skView.frame = CGRectMake(0, 0, WIDTH, HEIGHT);
skView.setShowsFPS(true);
skView.setShowsNodeCount(true);

// add SKView to the main window
keyWindow.addSubview(skView);
keyWindow.makeKeyAndVisible();

// create an action for cycling through the sprite textures
var textureAction = SKAction.animateWithTextures(
	textureArrayFromSlices('dragon'), FRAME_DURATION);

// create an action sequence for "jumping"
var jumpAction = SKAction.moveByX(0, 100, 4 * FRAME_DURATION / 2);
var motionSequences = NSMutableArray.array();
motionSequences.addObject(SKAction.waitForDuration(FRAME_DURATION * 2));
motionSequences.addObject(jumpAction);
motionSequences.addObject(jumpAction.reversedAction());
motionSequences.addObject(SKAction.waitForDuration(FRAME_DURATION));
var motionSequence = SKAction.sequence(motionSequences);

// now group the actions to run in parallel
var fullActions = NSMutableArray.array();
fullActions.addObject(textureAction);
fullActions.addObject(motionSequence);
var fullAction = SKAction.group(fullActions);

global.fullAction = fullAction;

// create the native class for overriding SKScene with our behavior
Hyperloop.defineClass(RyuScene)
	.implements('SKScene')
	.method(
	{
		name: 'initWithSize',
		returns: 'id',
		arguments: [ { type: 'CGSize', name: 'size' } ],
		action: function(_size) {
			var size = _size.cast('CGSize');
			var self = this.super.initWithSize(size);

			// set scene properties
			self.scaleMode = SKSceneScaleModeAspectFill;
			self.backgroundColor = UIColor.colorWithRed(0.9, 0.9, 0.9, 1.0);

			// add background image
			var bg = SKSpriteNode.spriteNodeWithImageNamed('background'.toUTF8());
			bg.position = CGPointMake(size.width/2, size.height/2);
			self.addChild(bg);

			// create the sprite
			var sprite = SKSpriteNode.spriteNodeWithImageNamed('dragon/Slice-1'.toUTF8());
			sprite.position = CGPointMake(size.width/2, size.height/2-25);
			sprite.size = CGSizeMake(SPRITE_WIDTH*3, SPRITE_HEIGHT*3);
			self.addChild(sprite);

			// run the composite action
			sprite.runAction(SKAction.repeatActionForever(fullAction));

			return self;
		}
	})
	.build();

// create a scene based on the view bounds
var scene = new RyuScene(skView.bounds.size);

// present scene
skView.presentScene(scene);
