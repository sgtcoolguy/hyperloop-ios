"use hyperloop"
/**
 * OpenGL demo
 */

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

var CELL_SIZE = 4.0;

// TODO constant
var GL_FRAGMENT_SHADER = 0x8B30;
var GL_VERTEX_SHADER = 0x8B31;
var GL_LINK_STATUS = 0x8B82;
var GL_VALIDATE_STATUS = 0x8B83;
var GL_ACTIVE_ATTRIBUTES = 0x8B89;
var GL_NO_ERROR = 0;
var GL_TRUE = 1;
var GL_FALSE = 0;
var GL_DEPTH_TEST = 0x0B71;
var GL_ARRAY_BUFFER = 0x8892;
var GL_FLOAT = 0x1406;
var GL_STATIC_DRAW = 0x88E4;
var GL_DYNAMIC_DRAW = 0x88E8;
var GL_COLOR_BUFFER_BIT = 0x00004000;
var GL_DEPTH_BUFFER_BIT = 0x00000100;
var GL_TRIANGLES = 0x0004;
var GL_POINTS = 0x0000;

var kEAGLRenderingAPIOpenGLES2 = 2;
var GLKVertexAttribPosition = 0;
var GLKVertexAttribColor = 2;

var NSUTF8StringEncoding = 1;

var size_of_char     = 1;
var size_of_int      = 4;
var size_of_float    = 4;

var modelViewProjectionMatrix = GLKMatrix4Make(0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0);

global.modelViewProjectionMatrix = modelViewProjectionMatrix;

var renderStart = false;

Hyperloop.defineClass(MyGLController)
	.implements('GLKViewController')
	.method(
	{
		name: 'glkView',
		returns: 'void',
		arguments: [ { type: 'GLKView *', name: 'view' }, { type: 'CGRect', name: 'drawInRect', property:'rect' } ],
		action: render
	})
	.method(
	{
		name: 'update',
		returns: 'void',
		arguments: [],
		action: update
	})
	.build();

// create the OpenGL context
var context = new EAGLContext(kEAGLRenderingAPIOpenGLES2);

// you *MUST* set this or your calls to APIs will fail
EAGLContext.setCurrentContext(context);

// create a GL view
var view = new GLKView(CGRectMake(0,0,0,0),context);
view.drawableDepthFormat = GLKViewDrawableDepthFormat24;

// remove the base view
var keyWindow = UIApplication.sharedApplication().keyWindow;
keyWindow.subviews.objectAtIndex(0).cast('UIView').removeFromSuperview();

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
label.setText('FPS: '.toUTF8());
keyWindow.addSubview(label);
keyWindow.makeKeyAndVisible();

// create shader program
var program = glCreateProgram();
var vertShaderPathname = NSBundle.mainBundle().pathForResource('Shader'.toUTF8(),'vsh'.toUTF8());
var fragShaderPathname = NSBundle.mainBundle().pathForResource('Shader'.toUTF8(),'fsh'.toUTF8());

var uniforms = [],
	UNIFORM_MODELVIEWPROJECTION_MATRIX = 0,
	xSize = view.bounds.size.width  / CELL_SIZE,
	ySize = view.bounds.size.height / CELL_SIZE,
	pointCount = xSize * ySize,
	CELL_START = CELL_SIZE / 2;

var viewport = [view.bounds.origin.x, view.bounds.origin.y, 
				view.bounds.size.width, view.bounds.size.height];

console.log(xSize, ySize, pointCount);
console.log(viewport);
console.log('Loading',pointCount,'vertices...this may take time.');

var cellLoadingStart = +new Date();

var cells = [];

var colorDataArray = [];
var cellDataArray  = [];

for (var x = 0; x < xSize; x++) {
	cells[x] = [];
	for (var y = 0; y < ySize; y++) {
		var alive = Math.random() >= 0.5;

		// save the cell
		cells[x][y] = {
			lastAlive: alive,
			alive: alive
		};

		var alpha = alive ? 1.0 : 0.0;

		colorDataArray.push(1.0);
		colorDataArray.push(1.0);
		colorDataArray.push(1.0);
		colorDataArray.push(alpha);

		cellDataArray.push(CELL_START + (x * CELL_SIZE));
		cellDataArray.push(CELL_START + (y * CELL_SIZE));
		cellDataArray.push(0.0);
	}
}

var cellVertexData  = calloc(size_of_float,cellDataArray.length).cast('float *');
var colorBufferData = calloc(size_of_float,colorDataArray.length).cast('float *');

// load the data into memory
cellVertexData = cellDataArray;
colorBufferData = colorDataArray;

var cellVertexData_length = cellDataArray.length;
var colorBufferData_length = colorDataArray.length;

// clear JS arrays
cellDataArray = null;
colorDataArray = null;

// storage of buffer id etc
var vertexArray  = calloc(size_of_int,1).cast('uint *');
var vertexBuffer = calloc(size_of_int,1).cast('uint *');
var colorBuffer  = calloc(size_of_int,1).cast('uint *');

global.cellVertexData = cellVertexData;
global.colorBufferData = colorBufferData;
global.vertexArray = vertexArray;
global.vertexBuffer = vertexBuffer;
global.colorBuffer = colorBuffer;

console.log('Finished loading vertices in',(+new Date() - cellLoadingStart),'msec');

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

var fpsUpdateDate = +new Date();
var frameCount = 0;

// the render function
function update(params) {
	if (!renderStart) return;
	var x, y, cell, colorindex, alpha;

	// render current generation
	for (x = 0; x < xSize; x++) {
		for (y = 0; y < ySize; y++) {
			cell = cells[x][y];

			// minimze number of times we need to modify the proxy object
			if (cell.alive !== cell.lastAlive) {
				alpha = cell.alive ? 1.0 : 0.0;
				colorindex = ((x * ySize) + y) * 4;
				colorBufferData[colorindex + 3] = alpha;
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

	glBindBuffer(GL_ARRAY_BUFFER, colorBuffer[0]);
	glBufferData(GL_ARRAY_BUFFER, colorBufferData_length*size_of_float, colorBufferData, GL_STATIC_DRAW);

    while ((err = glGetError()) != GL_NO_ERROR) {
		console.log('update:', err);
		renderStart = false;
	}

	frameCount++;
	var fpsUpdateDiff = +new Date() - fpsUpdateDate;
	if (fpsUpdateDiff > 2000) {
		label.setText(('FPS: ' + frameCount / 2).toString().toUTF8());
		fpsUpdateDate = +new Date();
		frameCount = 0;
	}
}

function render (params) {
	if (!renderStart) return;
	try {
		glClearColor(0.0, 0.0, 0.0, 1.0);
		glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

		glBindVertexArrayOES(vertexArray[0]);

		// Render the object again with ES2
		glUseProgram(program);

		glUniform1f(glGetUniformLocation(program, 'pointSize'), CELL_SIZE);
		glUniformMatrix4fv(uniforms[UNIFORM_MODELVIEWPROJECTION_MATRIX], 1, 0, modelViewProjectionMatrix.m);

		glDrawArrays(GL_POINTS, 0, pointCount);

	    while ((err = glGetError()) != GL_NO_ERROR) {
			console.log('render:',err);
			renderStart = false;
		}
	}
	catch (E) {
		console.log('render:',E.message);
	}
}

function getASCIIBytes(str) {
	var b = new Array(str.length);
	for (var i = 0; i < str.length; i++) {
		b[i] = str.charCodeAt(i);
	}
	// terminating character
	b.push(0);
	return b;
}

function compileShader(type, file) {
	var source = Hyperloop.method(NSString, 'stringWithContentsOfFile:encoding:error:').call(file,NSUTF8StringEncoding,null);
	var source_bytes = getASCIIBytes(source.toString());
	// create a memory buffer to store the char*
	var buffer = calloc(size_of_char,source_bytes.length).cast('char *');
	// create a memory buffer to store the int as int*
	var buffer_p = calloc(size_of_int,1).cast('uint *');
	var length = calloc(size_of_int,1).cast('uint *');

	buffer = source_bytes;
	buffer_p[0] = buffer;
	length[0] = source_bytes.length - 1;

	var shader = glCreateShader(type);
	glShaderSource(shader, 1, buffer_p, length);
	glCompileShader(shader);
	return shader;
}

function loadShaders () {
	var vertShader = compileShader(GL_VERTEX_SHADER,vertShaderPathname);
	var fragShader = compileShader(GL_FRAGMENT_SHADER,fragShaderPathname);

	glAttachShader(program, vertShader);
	glAttachShader(program, fragShader);

	glBindAttribLocation(program, GLKVertexAttribPosition, 'position');
	glBindAttribLocation(program, GLKVertexAttribColor, 'color'); 
	glLinkProgram(program);

	// create an int* (default) that will serve as out pointer to receive back the status
	// this is the same as this in C:
	//
	// size_t size = 0;
	// glGetProgramiv(program, GL_LINK_STATUS, &size);
	//
	// where size is passed as (int*) and glGetProgramiv sets the value in the pointer location
	var status_mem = calloc(size_of_int,1).cast('uint *');
	glGetProgramiv(program, GL_LINK_STATUS, status_mem);
	var status = status_mem[0];

	if (status != 1) {
		console.log('Received invalid status from GL_LINK_STATUS, should have been 1, was:',status);
		return false;
	}

	// Get uniform locations.
	uniforms[UNIFORM_MODELVIEWPROJECTION_MATRIX] = glGetUniformLocation(program, 'modelViewProjectionMatrix');

	glDetachShader(program, vertShader);
	glDeleteShader(vertShader);

	glDetachShader(program, fragShader);
	glDeleteShader(fragShader);

	return true;
}

try {
	if (loadShaders()) {

		glEnable(GL_DEPTH_TEST);

		glGenVertexArraysOES(1, vertexArray);
		glBindVertexArrayOES(vertexArray[0]);
		
		glGenBuffers(1, vertexBuffer);
		glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer[0]);
		glBufferData(GL_ARRAY_BUFFER, cellVertexData_length*size_of_float, cellVertexData, GL_STATIC_DRAW);

		glEnableVertexAttribArray(GLKVertexAttribPosition);
		glVertexAttribPointer(GLKVertexAttribPosition, 3, GL_FLOAT, GL_FALSE, 12, 0);

		glGenBuffers(1, colorBuffer);
		glBindBuffer(GL_ARRAY_BUFFER, colorBuffer[0]);
		glBufferData(GL_ARRAY_BUFFER, colorBufferData_length*size_of_float, colorBufferData, GL_STATIC_DRAW);

		glEnableVertexAttribArray(GLKVertexAttribColor);
		glVertexAttribPointer(GLKVertexAttribColor, 4, GL_FLOAT, GL_FALSE, 16, 0);

		glBindVertexArrayOES(0);

		// Setup coordinate that starts from top-left corner
		var projectionMatrix = GLKMatrix4MakeOrtho(
			viewport[0], viewport[2], viewport[3], viewport[1], -100, 100);

		var modelViewMatrix = GLKMatrix4Make(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
		modelViewProjectionMatrix = GLKMatrix4Multiply(projectionMatrix, modelViewMatrix);

		renderStart = true;
	}
}
catch(E){
	console.log(E.message);
}

