"use hyperloop"

Hyperloop.defineClass(MyScene)
    .implements('SKScene')
    .method(
    {
        name: 'initWithSize',
        returns: 'id',
        arguments: [ { type: 'CGSize', name: 'size' } ],
        action: function(size) {
            var self = this.super.initWithSize(size);
            self.anchorPoint = CGPointMake(0, 0);
            return self;
        }
    })
    .build();

var size = UIScreen.mainScreen().bounds.size;
var scene = new MyScene(size);
