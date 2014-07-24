"use hyperloop";

var BACK_SCROLLING_SPEED = 0.5,
	FLOOR_SCROLLING_SPEED = 3,
// Obstacles
	VERTICAL_GAP_SIZE = 120,
	FIRST_OBSTACLE_PADDING = 100,
	OBSTACLE_MIN_HEIGHT = 60,
	OBSTACLE_INTERVAL_SPACE = 130;

// properties  of the scene
var wasted = false,
	nbObstacles,
	lastBlockPos = 0,
	bottomPipes = NSMutableArray.array(),
	topPipes = NSMutableArray.array(),
	floor,
    back,
    scoreLabel,
    score = 0,
    bird;

Hyperloop.defineClass(Scene)
	.implements('SKScene')
	.protocol('SKPhysicsContactDelegate')
	.method(
	{
		name: 'initWithSize',
		returns: 'id',
		arguments: [ { type: 'CGSize', name: 'size' } ],
		action: function(_size) {
			var size = _size.cast('CGSize');
			var self = this.super.initWithSize(size);

			self.physicsWorld.contactDelegate = self;
        	self.startGame();

			return self;
		}
	})
	.method(
	{
		name: 'startGame',
		returns: 'void',
		arguments: [],
		action: function() {
			// Reinit
		    wasted = false;
		    
		    this.removeAllChildren();
		    
		    this.createBackground();
		    this.createFloor();
		    this.createScore();
		    this.createObstacles();
		    this.createBird();
		    
		    // Floor needs to be in front of tubes
		    floor.zPosition = bird.zPosition + 1;
		    
		    //if (this.delegate.respondsToSelector(@selector(eventStart))) {
		        this.delegate.eventStart();
		    //}
		}
	})
	.method({
		name: 'createBackground',
		returns: 'void',
		arguments: [],
		action: function() {
			back = SKScrollingNode.scrollingNodeWithImageNamed("back".toUTF8(), WIDTH(this));
		    back.setScrollingSpeed(BACK_SCROLLING_SPEED);
		    back.setAnchorPoint(CGPointZero);
		    back.setPhysicsBody(SKPhysicsBody.bodyWithEdgeLoopFromRect(this.frame));
		    back.physicsBody.categoryBitMask = backBitMask;
		    back.physicsBody.contactTestBitMask = birdBitMask;
		    this.addChild(back);
		}
	})
	.method({
		name: 'createScore',
		returns: 'void',
		arguments: [],
		action: function() {
		    score = 0;
		    scoreLabel = SKLabelNode.labelNodeWithFontNamed("Helvetica-Bold".toUTF8());
		    scoreLabel.text = "0".toUTF8();
		    scoreLabel.fontSize = 500;
		    scoreLabel.position = CGPointMake(CGRectGetMidX(this.frame), 100);
		    scoreLabel.alpha = 0.2;
		    this.addChild(scoreLabel);
		}
	})
	.method({
		name: 'createFloor',
		returns: 'void',
		arguments: [],
		action: function() {
		    floor = SKScrollingNode.scrollingNodeWithImageNamed("floor".toUTF8(), WIDTH(this));
		    floor.setScrollingSpeed(FLOOR_SCROLLING_SPEED);
		    floor.setAnchorPoint(CGPointZero);
		    floor.setName("floor".toUTF8());
		    floor.setPhysicsBody(SKPhysicsBody.bodyWithEdgeLoopFromRect(floor.frame));
		    floor.physicsBody.categoryBitMask = floorBitMask;
		    floor.physicsBody.contactTestBitMask = birdBitMask;
		    this.addChild(floor);
		}
	})
	.method({
		name: 'createBird',
		returns: 'void',
		arguments: [],
		action: function() {
		    bird = new Bird();
		    bird.setPosition(CGPointMake(100, CGRectGetMidY(this.frame)));
		    bird.setName("bird".toUTF8());
		    this.addChild(bird);
		}
	})
	.method({
		name: 'createObstacles',
		returns: 'void',
		arguments: [],
		action: function() {
		    // Calculate how many obstacles we need, the less the better
		    nbObstacles = ceil(WIDTH(self)/(OBSTACLE_INTERVAL_SPACE));
		    
		    lastBlockPos = 0;
		    bottomPipes = NSMutableArray.array();
		    topPipes = NSMutableArray.array();
		    for(var i = 0; i < nbObstacles; i++){
		        
		        var topPipe = SKSpriteNode.spriteNodeWithImageNamed("pipe_top".toUTF8());
		        topPipe.setAnchorPoint(CGPointZero);
		        this.addChild(topPipe);
		        topPipes.addObject(topPipe);
		        
		        var bottomPipe = SKSpriteNode.spriteNodeWithImageNamed("pipe_bottom".toUTF8());
		        bottomPipe.setAnchorPoint(CGPointZero);
		        this.addChild(bottomPipe);
		        bottomPipes.addObject(bottomPipe);
		        
		        // Give some time to the player before first obstacle
		        if(0 == i) {
		            this.place(bottomPipe, topPipe, WIDTH(this) + FIRST_OBSTACLE_PADDING);
		        }else{
		            this.place(bottomPipe, topPipe, lastBlockPos + WIDTH(bottomPipe) + OBSTACLE_INTERVAL_SPACE);
		        }
		        lastBlockPos = topPipe.position.x;
		    }
		    
		}
	})
	.method({
		name: 'touchesBegan',
		// - (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event {
		returns: 'void',
		arguments: [{type:'NSSet *', name:'touches'}, {type:'UIEvent *', name:'event'}],
		action: function(touches, event) {
		    if(wasted) {
		        this.startGame();
		    } else {
		        if (!bird.physicsBody) {
		            bird.startPlaying();
		            //if([self.delegate respondsToSelector:@selector(eventPlay)]){
		                self.delegate.eventPlay();
		            //}
		        }
		        bird.bounce();
		    }
		}
	})
	.method({
		name: 'update',
		returns: 'void',
		arguments: [{type:'NSTimeInterval', name:'currentTime'}],
		action: function(_currentTime) {
		    if (wasted) {
		        return;
		    }
		    var currentTime = _currentTime.cast('NSTimeInterval');
		    
		    // ScrollingNodes
		    back.update(currentTime);
		    floor.update(currentTime);
		    
		    // Other
		    bird.update(currentTime);
		    this.updateObstacles(currentTime);
		    this.updateScore(currentTime);
		}
	})
	.method({
		name: 'updateObstacles',
		returns: 'void',
		arguments: [{type:'NSTimeInterval', name:'currentTime'}],
		action: function(currentTime) {
		    if(!bird.physicsBody){
		        return;
		    }
		    
		    for(var i = 0; i < nbObstacles; i++){
		        
		        // Get pipes by pairs
		        var topPipe = topPipes[i].cast('SKSpriteNode *');
		        var bottomPipe = bottomPipes[i].cast('SKSpriteNode *');
		        
		        // Check if pair has exited screen, and place them upfront again
		        if (X(topPipe) < -WIDTH(topPipe)){
		            var mostRightPipe = topPipes[(i+(nbObstacles-1))%nbObstacles].cast('SKSpriteNode *');
		            this.place(bottomPipe, topPipe, X(mostRightPipe) + WIDTH(topPipe) + OBSTACLE_INTERVAL_SPACE);
		        }
		        
		        // Move according to the scrolling speed
		        topPipe.position = CGPointMake(X(topPipe) - FLOOR_SCROLLING_SPEED, Y(topPipe));
		        bottomPipe.position = CGPointMake(X(bottomPipe) - FLOOR_SCROLLING_SPEED, Y(bottomPipe));
		    }
		}
	})
	.method({
		name: 'place',
		// - (void) place:(SKSpriteNode *) bottomPipe and:(SKSpriteNode *) topPipe atX:(float) xPos
		returns: 'void',
		arguments: [{type:'SKSpriteNode *', name:'bottomPipe'}, {type:'SKSpriteNode *', name: 'topPipe'}, {type:'float', name:'xPos'}],
		action: function(_bottomPipe, _topPipe, _xPos) {
			var bottomPipe = _bottomPipe.cast('SKSpriteNode *');
			var topPipe = _topPipe.cast('SKSpriteNode *');
			var xPos = _xPos.cast('float');
			
		    // Maths
		    var availableSpace = HEIGHT(self) - HEIGHT(floor);
		    var maxVariance = availableSpace - (2*OBSTACLE_MIN_HEIGHT) - VERTICAL_GAP_SIZE;
		    var variance = Math.randomFloatBetween(0, maxVariance);
		    
		    // Bottom pipe placement
		    var minBottomPosY = HEIGHT(floor) + OBSTACLE_MIN_HEIGHT - HEIGHT(this);
		    var bottomPosY = minBottomPosY + variance;
		    bottomPipe.position = CGPointMake(xPos,bottomPosY);
		    bottomPipe.physicsBody = SKPhysicsBody.bodyWithEdgeLoopFromRect(CGRectMake(0,0, WIDTH(bottomPipe), HEIGHT(bottomPipe)));
		    bottomPipe.physicsBody.categoryBitMask = blockBitMask;
		    bottomPipe.physicsBody.contactTestBitMask = birdBitMask;
		    
		    // Top pipe placement
		    topPipe.position = CGPointMake(xPos,bottomPosY + HEIGHT(bottomPipe) + VERTICAL_GAP_SIZE);
		    topPipe.physicsBody = SKPhysicsBody.bodyWithEdgeLoopFromRect(CGRectMake(0,0, WIDTH(topPipe), HEIGHT(topPipe)));
		    
		    topPipe.physicsBody.categoryBitMask = blockBitMask;
		    topPipe.physicsBody.contactTestBitMask = birdBitMask;
		}
	})
	.method({
		name: 'updateScore',
		returns: 'void',
		arguments: [{type:'NSTimeInterval', name:'currentTime'}],
		action: function(currentTime) {
		    for(var i = 0; i < nbObstacles; i++){
		        
		        var topPipe = topPipes[i].cast('SKSpriteNode *');
		        
		        // Score, adapt font size
		        if(X(topPipe) + WIDTH(topPipe)/2 > bird.position.x &&
		           X(topPipe) + WIDTH(topPipe)/2 < bird.position.x + FLOOR_SCROLLING_SPEED) {
		            score +=1;
		            scoreLabel.text = NSString.stringWithFormat("%lu".toUTF8(), score);
		            if(score >= 10){
		                scoreLabel.fontSize = 340;
		                scoreLabel.position = CGPointMake(CGRectGetMidX(this.frame), 120);
		            }
		        }
		    }
		}
	})
	.method({
		name: 'didBeginContact',
		returns: 'void',
		arguments: [{type:'SKPhysicsContact *', name:'contact'}],
		action: function(contact) {
		    if(wasted) { return; }
		
		    wasted = true;
		    Score.registerScore(score);
		    
		    //if([self.delegate respondsToSelector:@selector(eventWasted)]){
		        this.delegate.eventWasted();
		    //}
		}
	})
	.build();