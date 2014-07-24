"use hyperloop"

var BACK_BIT_MASK = 0x1 << 0,
	BIRD_BIT_MASK = 0x1 << 1,
	FLOOR_BIT_MASK = 0x1 << 2,
	BLOCK_BIT_MASK = 0x1 << 3;

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};


var gameView, // SKView
	getReadyView, // UIView
	gameOverView, // UIView
	medalImageView, // UIImageView
	currentScore, // UILabel
	bestScoreLabel, // UILabel
	scene, // Scene
	flash; // UIView
	
require('bird');
require('scene');
	
Hyperloop.defineClass(SceneDelegate)
	.method(
	{
		name: 'eventStart',
		returns:'void',
		arguments: [],
		action: function() {
			UIView.animateWithDuration(0.2, function() {
		        	gameOverView.alpha = 0;
		        	gameOverView.transform = CGAffineTransformMakeScale(.8, .8);
		        	flash.alpha = 0;
		        	getReadyView.alpha = 1;
			    }, function(finished) {
			        flash.removeFromSuperview();
			    });
		}
	})
	.method(
	{
		name: 'eventPlay',
		returns:'void',
		arguments: [],
		action: function() {
			UIView.animateWithDuration(0.5, function() {
		        	getReadyView.alpha = 0;
			    });
		}
	})
	.method(
	{
		name: 'eventWasted',
		returns:'void',
		arguments: [],
		action: function() {
			flash = UIView.alloc().initWithFrame(this.view.frame);
		    flash.backgroundColor = UIColor.whiteColor();
		    flash.alpha = 0.9;
		    gameView.insertSubview(flash, getReadyView);
		    
		    this.shakeFrame();
		    
		    UIView.animateWithDuration(0.6, 0, UIViewAnimationOptionCurveEaseIn, function() {
		        
		        // Display game over
		        flash.alpha = .4;
		        gameOverView.alpha = 1;
		        gameOverView.transform = CGAffineTransformMakeScale(1, 1);
		        
		        // Set medal
		        if (scene.score >= 40) {
		            medalImageView.image = UIImage.imageNamed("medal_platinum".toUTF8());
		        } else if (scene.score >= 30) {
		            medalImageView.image = UIImage.imageNamed("medal_gold".toUTF8());
		        } else if (scene.score >= 20) {
		            medalImageView.image = UIImage.imageNamed("medal_silver".toUTF8());
		        } else if (scene.score >= 10) {
		            medalImageView.image = UIImage.imageNamed("medal_bronze".toUTF8());
		        } else {
		            medalImageView.image = null;
		        }
		        
		        // Set scores
		        currentScore.text = F("%li".toUTF8(), scene.score);
		        bestScoreLabel.text = F("%li".toUTF8(), Score.bestScore.cast('long'));
		        
		    }, function(finished) {
		        flash.userInteractionEnabled = false;
		    });
		}
	})
	.method(
	{
		name: 'shakeFrame',
		returns:'void',
		arguments: [],
		action: function() {
			var animation = CABasicAnimation.animationWithKeyPath("position".toUTF8());
		    animation.setDuration(0.05);
		    animation.setRepeatCount(4);
		    animation.setAutoreverses(true);
		    animation.setFromValue(NSValue.valueWithCGPoint(CGPointMake(this.view.center.x - 4.0, this.view.center.y)));
		    animation.setToValue(NSValue.valueWithCGPoint(CGPointMake(this.view.center.x + 4.0, this.view.center.y)));
		    this.view.layer.addAnimation(animation, "position".toUTF8());
		}
	})
	.build();

var sceneDelegate = new SceneDelegate();

UIApplication.sharedApplication().setStatusBarHidden(true, UIStatusBarAnimationSlide);

// get the main window
var keyWindow = UIApplication.sharedApplication().keyWindow;

// init the SKView
var gameView = new SKView();
gameView.frame = CGRectMake(0, 0, 320, 568);
gameView.setShowsFPS(true);
gameView.setShowsNodeCount(true);

// get ready view
getReadyView = new SKView();
getReadyView.frame = CGRectMake(0, 188, 320, 192);
gameView.addSubview(getReadyView);

// TODO Create an image views as subviews of get ready...
//<imageView userInteractionEnabled="NO" contentMode="center" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" image="get_ready.png" translatesAutoresizingMaskIntoConstraints="NO" id="yG3-Wq-3CO">
//    <rect key="frame" x="30" y="0.0" width="260" height="45"/>
//</imageView>
//<imageView userInteractionEnabled="NO" contentMode="center" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" image="taptap.png" translatesAutoresizingMaskIntoConstraints="NO" id="ha9-c0-ZRk">
//    <rect key="frame" x="40" y="62" width="240" height="110"/>
//</imageView>

gameOverView = new SKView();                
gameOverView.frame = CGRectMake(0, 188, 320, 220);
gameView.addSubview(gameOverView);
// TODO add subviews to game over view
//<subviews>
//    <imageView userInteractionEnabled="NO" contentMode="center" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" image="game_over.png" translatesAutoresizingMaskIntoConstraints="NO" id="E9M-XD-v6x">
//        <rect key="frame" x="30" y="0.0" width="260" height="45"/>
//    </imageView>
//    <imageView userInteractionEnabled="NO" contentMode="center" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" image="medal_plate.png" translatesAutoresizingMaskIntoConstraints="NO" id="cqe-Le-Pco">
//        <rect key="frame" x="47" y="62" width="226" height="116"/>
//    </imageView>
//    <imageView userInteractionEnabled="NO" contentMode="scaleToFill" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" image="medal_bronze.png" translatesAutoresizingMaskIntoConstraints="NO" id="M3R-fY-Sp5">
//        <rect key="frame" x="73" y="104" width="44" height="44"/>
//    </imageView>
//    <label opaque="NO" clipsSubviews="YES" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" text="5" textAlignment="right" lineBreakMode="tailTruncation" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="hx9-qP-Lbk">
//        <rect key="frame" x="199" y="94" width="50" height="21"/>
//        <fontDescription key="fontDescription" name="CourierNewPS-BoldMT" family="Courier New" pointSize="20"/>
//        <color key="textColor" red="0.34275350765306123" green="0.19899377777041721" blue="0.18746079285708397" alpha="1" colorSpace="calibratedRGB"/>
//        <nil key="highlightedColor"/>
//    </label>
//    <label opaque="NO" clipsSubviews="YES" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" text="32" textAlignment="right" lineBreakMode="tailTruncation" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="Czi-Ai-JAO">
//        <rect key="frame" x="199" y="135" width="50" height="21"/>
//        <fontDescription key="fontDescription" name="CourierNewPS-BoldMT" family="Courier New" pointSize="20"/>
//        <color key="textColor" red="0.34275350770000002" green="0.19899377779999999" blue="0.18746079290000001" alpha="1" colorSpace="calibratedRGB"/>
//        <nil key="highlightedColor"/>
//    </label>
//</subviews>
  

var mainView = new SKView();
mainView.frame = CGRectMake(0, 0, 320, 568);
mainView.addSubView(gameView);

// add the main game View to the main window
keyWindow.addSubview(mainView);
keyWindow.makeKeyAndVisible();

// Create and configure the scene.
scene = Scene.sceneWithSize(gameView.bounds.size);
scene.scaleMode = SKSceneScaleModeAspectFill;
scene.delegate = sceneDelegate;

// Present the scene
gameOverView.alpha = 0;
gameOverView.transform = CGAffineTransformMakeScale(0.9, 0.9);
gameView.presentScene(scene);
