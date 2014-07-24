"use hyperloop"

var VERTICAL_SPEED = 1.0,
    VERTICAL_DELTA = 5.0,
    deltaPosY = 0.0,
    goingUp = false,
    flap,
    flapForever;

Hyperloop.defineClass(Bird)
	.implements('SKSpriteNode')
	.method(
	{
		name: 'init',
		returns: 'id',
		arguments: [],
		action: function() {
			var self = this.super.init();
		    if(self){
		        
		        // TODO : use texture atlas
		        var birdTexture1 = SKTexture.textureWithImageNamed("bird_1".toUTF8());
		        birdTexture1.filteringMode = SKTextureFilteringNearest;
		        var birdTexture2 = SKTexture.textureWithImageNamed("bird_2".toUTF8());
		        birdTexture2.filteringMode = SKTextureFilteringNearest;
		        var birdTexture3 = SKTexture.textureWithImageNamed("bird_3".toUTF8());
		        birdTexture2.filteringMode = SKTextureFilteringNearest;
		
		        self = BirdNode.spriteNodeWithTexture(birdTexture1);
		        
		        flap = SKAction.animateWithTextures([birdTexture1, birdTexture2,birdTexture3], 0.2);
		        flapForever = SKAction.repeatActionForever(flap);
		        
		        self.setTexture(birdTexture1);
		        self.runAction(flapForever, "flapForever".toUTF8());
		    }
		    return self;
		}
	})
	.method({
		name: 'update',
		returns: 'void',
		arguments: [{ type:'NSTimeInterval', name:'currentTime' }],
		action: function() {
			if(!self.physicsBody) {
	            if(self.deltaPosY > VERTICAL_DELTA) {
	                self.goingUp = false;
	            }
	            if(self.deltaPosY < -VERTICAL_DELTA) {
	                self.goingUp = true;
	            }
	            
	            var displacement = self.goingUp ? VERTICAL_SPEED : -VERTICAL_SPEED;
	            self.position = CGPointMake(self.position.x, self.position.y);
	            self.deltaPosY += displacement;
	            
	        } else {
	            self.zRotation = CGFloat(M_PI) * self.physicsBody.velocity.dy * 0.0005;
	        }
		}
	})
	.method({
		name: 'startPlaying',
		returns: 'void',
		arguments: [],
		action: function() {
			self.deltaPosY = 0;
	        self.physicsBody = SKPhysicsBody.bodyWithRectangleOfSize(CGSizeMake(26, 18));
	        self.physicsBody.categoryBitMask = Constants.BIRD_BIT_MASK;
	        self.physicsBody.mass = 0.1;
	        self.removeActionForKey("flapForever".toUTF8());
	    }
	})
	.method({
		name: 'bounce',
		returns: 'void',
		arguments: [],
		action: function() {
			if(self.physicsBody) {
	            self.physicsBody.velocity = CGVectorMake(0, 0);
	            self.physicsBody.applyImpulse(CGVectorMake(0, 40));
	            self.runAction(self.flap);
	        }
	    }
	})
	.build();    

