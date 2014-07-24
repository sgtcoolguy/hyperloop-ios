"use hyperloop"

var scrollingSpeed = 0;

Hyperloop.defineClass(SKScrollingNode)
	.implements('SKSpriteNode')
	.method(
	{
		name: 'scrollingNodeWithImageNamed',
		returns: 'id',
		arguments: [ { type: 'NSString *', name: 'name' }, {type: 'float', name: 'width'}],
		action: function(_name, _width) {
			var name = _name.cast('NSString *');
			var width = _width.cast('float');
			var image = UIImage.imageNamed(name);
    
		    realNode = SKScrollingNode.spriteNodeWithColor(UIColor.clearColor(), CGSizeMake(width, image.size.height));
		    realNode.scrollingSpeed = 1;
		    
		    var total = 0;
		    while (total < (width + image.size.width)) {
		        var child = SKSpriteNode.spriteNodeWithImageNamed(name);
		        child.setAnchorPoint(CGPointZero);
		        child.setPosition(CGPointMake(total, 0));
		        realNode.addChild(child);
		        total += child.size.width;
		    }
		    
		    return realNode;
		}
	})
	.method(
	{
		name: 'update',
		returns: 'void',
		arguments: [ { type: 'NSTimeInterval', name: 'currentTime' }],
		action: function(_currentTime) {
			this.children.enumerateObjectsUsingBlock(function (_child, _idx, _stop) {
				var child  = _child.cast('SKSpriteNode * ');
				var idx = _idx.cast('NSUInteger');
				
		        child.position = CGPointMake(child.position.x - self.scrollingSpeed, child.position.y);
		        if (child.position.x <= -child.size.width){
		            var delta = child.position.x + child.size.width;
		            child.position = CGPointMake(child.size.width * (this.children.count - 1) + delta, child.position.y);
		        }
			});
		}
	})
	.build();
