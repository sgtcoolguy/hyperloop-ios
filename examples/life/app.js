"use hyperloop"

var CELL_SIZE = 4,
	FPS_INTERVAL = 60;

const screenSize = UIScreen.mainScreen().bounds.size,
	height = screenSize.height,
	width = screenSize.width,
	xSize = width / CELL_SIZE,
	ySize = height / CELL_SIZE;

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

// output raw dimensions
console.log(width + ' x ' + height);

// TODO: move these definitions to their own modules
// set the FPS and rendering functions based on CLI args
var getFPS, render, lastTime = NSDate.date();
if (typeof HYPERLOOP_LINK !== 'undefined') {
	lastTime = 0;
	getFPS = function(sender) {
		var fps = 1.0 / -lastTime.timeIntervalSinceNow();
		lastTime = NSDate.date();
		return fps;
	};
	render = function(callback) {
		console.log('>>>>> Using CADisplayLink for render loop <<<<<');

		// create a display link, using the render loop update function
		var displayLink = CADisplayLink.displayLinkWithTarget(callback, NSSelectorFromString('update:'.toUTF8()));

		// attach the display link to the main run loop
		displayLink.addToRunLoop(NSRunLoop.mainRunLoop(), NSDefaultRunLoopMode);
		global.displayLink = displayLink;
	};
} else {
	getFPS = function(sender) {
		var fps = 1.0 / -lastTime.timeIntervalSinceNow();
		lastTime = NSDate.date();
		return fps;
	};
	render = function(callback) {
		console.log('>>>>> Using NSTimer for render loop <<<<<');

		// launch timer with TimerCallback as its target/selector
		var timer = NSTimer.scheduledTimerWithTimeInterval(
			1.0/FPS_INTERVAL, callback, NSSelectorFromString('update:'.toUTF8()), null, true);
		global.timer = timer;
	};
}

// calculate the next state of each cell
function getNextState(x, y, alive) {
	var count = 0,
		xm1 = x > 0,
		xp1 = x+1 < xSize,
		ym1 = y > 0,
		yp1 = y+1 < ySize;

	if (xm1) {
		if (ym1 && cells[x-1][y-1].lastAlive) { count++; }
		if (cells[x-1][y].lastAlive) { count++; }
		if (yp1 && cells[x-1][y+1].lastAlive) { count++; }
	}
	if (xp1) {
		if (ym1 && cells[x+1][y-1].lastAlive) { count++; }
		if (cells[x+1][y].lastAlive) { count++; }
		if (yp1 && cells[x+1][y+1].lastAlive) { count++; }
	}
	if (ym1 && cells[x][y-1].lastAlive) { count++; }
	if (yp1 && cells[x][y+1].lastAlive) { count++; }

	return (alive && (count === 2 || count === 3)) || (!alive && count === 3);
}

// the render function
var ctr = 0;
function update(sender) {
	var x, y, cell;
	// render current generation
	for (x = 0; x < xSize; x++) {
		for (y = 0; y < ySize; y++) {
			cell = cells[x][y];

			// minimze number of times we need to modify the proxy object
			if (cell.alive !== cell.lastAlive) {
				var proxy = cell.proxy.cast('UIView');
				proxy.setHidden(!cell.alive);
			}

			// save the state
			cell.lastAlive = cell.alive;
		}
	}

	// build next generation
	for (x = 0; x < xSize; x++) {
		for (y = 0; y < ySize; y++) {
			cell = cells[x][y];
			cell.alive = getNextState(x, y, cell.lastAlive);
		}
	}

	// show the average FPS
	if (!(++ctr % FPS_INTERVAL)) {
		ctr = 1;
		var text = 'FPS: ' + (Math.round(FPS_INTERVAL*getFPS())).toFixed(2);
		label.cast('UILabel').setText(NSString.stringWithUTF8String(text));
	}

}
// START UI CONSTRUCTION

// configure main window
var bounds = UIScreen.mainScreen().bounds;
var window = Hyperloop.method(UIWindow, 'initWithFrame:').call(bounds);
window.backgroundColor = UIColor.blackColor();

// seed the grid
var cells = [];
var white = UIColor.whiteColor();
for (var x = 0; x < xSize; x++) {
	cells[x] = [];
	for (var y = 0; y < ySize; y++) {
		// determine whether or not this cell is alive
		var alive = Math.random() >= 0.5;

		// create a native UIView
		var frame = CGRectMake(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
		var cellProxy = Hyperloop.method(UIView, 'initWithFrame:').call(frame);

		cellProxy.backgroundColor = white;
		cellProxy.setHidden(!alive);

		// save the cell
		cells[x][y] = {
			proxy: cellProxy,
			lastAlive: alive,
			alive: alive
		};

		// add the cell to the window
		window.addSubview(cellProxy);
	}
}

// add FPS label
var label = new UILabel();
label.frame = CGRectMake(0, 0, 100, 40);
label.backgroundColor = UIColor.colorWithRed(180/255, 0, 0, 0.8);
label.textColor = UIColor.whiteColor();
label.textAlignment = NSTextAlignmentCenter;
label.setText('FPS: '.toUTF8());
window.addSubview(label);

window.makeKeyAndVisible();

global.window = window;

// RENDER LOOP

// Implement a class for our render loop update
Hyperloop.defineClass(RenderCallback)
	.method({
		name: 'update',
		returns: 'void',
		arguments: [{type:'id',name:'sender'}],
		action: update
	})
	.build();

global.renderCallback = new RenderCallback();

// Let's do this
render(global.renderCallback);
