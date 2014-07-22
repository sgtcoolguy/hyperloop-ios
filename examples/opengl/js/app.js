"use hyperloop"

/**
 * OpenGL demo
 */

String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

// platform dependent
var size_of_char     = 1;
var size_of_bool     = 1;
var size_of_short    = 2;
var size_of_int      = 4;
var size_of_float    = 4;
var size_of_long     = 4;
var size_of_double   = 8;
var size_of_longlong = 8;

// TODO constant
var GL_MAX_TEXTURE_SIZE = 0x0D33;
var GL_FRAGMENT_SHADER = 0x8B30;
var GL_VERTEX_SHADER = 0x8B31;
var GL_LINK_STATUS = 0x8B82;
var GL_TRUE = 1;
var GL_FALSE = 0;
var GL_DEPTH_TEST = 0x0B71;
var GL_ARRAY_BUFFER = 0x8892;
var GL_FLOAT = 0x1406;
var GL_STATIC_DRAW = 0x88E4;
var GL_COLOR_BUFFER_BIT = 0x00004000;
var GL_DEPTH_BUFFER_BIT = 0x00000100;
var GL_TRIANGLES = 0x0004;
var GL_TEXTURE_2D = 0x0DE1;

var gCubeVertexDataArray = [
	// right wall
    0.5, -0.5, -0.5,        1.0, 0.0, 0.0,	1.0, 0.0,
    0.5, 0.5, -0.5,         1.0, 0.0, 0.0,	1.0, 1.0,
    0.5, -0.5, 0.5,         1.0, 0.0, 0.0,	0.0, 0.0,
    0.5, -0.5, 0.5,         1.0, 0.0, 0.0,	0.0, 0.0,
    0.5, 0.5, -0.5,         1.0, 0.0, 0.0,	1.0, 1.0,
    0.5, 0.5, 0.5,          1.0, 0.0, 0.0,	0.0, 1.0,
    
	// top wall
    0.5, 0.5, -0.5,         0.0, 1.0, 0.0,	1.0, 0.0,
    -0.5, 0.5, -0.5,        0.0, 1.0, 0.0,	1.0, 1.0,
    0.5, 0.5, 0.5,          0.0, 1.0, 0.0,	0.0, 0.0,
    0.5, 0.5, 0.5,          0.0, 1.0, 0.0,	0.0, 0.0,
    -0.5, 0.5, -0.5,        0.0, 1.0, 0.0,	1.0, 1.0,
    -0.5, 0.5, 0.5,         0.0, 1.0, 0.0,	0.0, 1.0,
    
	// left wall
    -0.5, 0.5, -0.5,        -1.0, 0.0, 0.0,	1.0, 0.0,
    -0.5, -0.5, -0.5,       -1.0, 0.0, 0.0,	1.0, 1.0,
    -0.5, 0.5, 0.5,         -1.0, 0.0, 0.0,	0.0, 0.0,
    -0.5, 0.5, 0.5,         -1.0, 0.0, 0.0,	0.0, 0.0,
    -0.5, -0.5, -0.5,       -1.0, 0.0, 0.0,	1.0, 1.0,
    -0.5, -0.5, 0.5,        -1.0, 0.0, 0.0,	0.0, 1.0,
    
	// bottom wall
    -0.5, -0.5, -0.5,       0.0, -1.0, 0.0,	1.0, 0.0,
    0.5, -0.5, -0.5,        0.0, -1.0, 0.0,	1.0, 1.0,
    -0.5, -0.5, 0.5,        0.0, -1.0, 0.0,	0.0, 0.0,
    -0.5, -0.5, 0.5,        0.0, -1.0, 0.0,	0.0, 0.0,
    0.5, -0.5, -0.5,        0.0, -1.0, 0.0,	1.0, 1.0,
    0.5, -0.5, 0.5,         0.0, -1.0, 0.0,	0.0, 1.0,
    
	// front wall
    0.5, 0.5, 0.5,          0.0, 0.0, 1.0,	1.0, 0.0,
    -0.5, 0.5, 0.5,         0.0, 0.0, 1.0,	1.0, 1.0,
    0.5, -0.5, 0.5,         0.0, 0.0, 1.0,	0.0, 0.0,
    0.5, -0.5, 0.5,         0.0, 0.0, 1.0,	0.0, 0.0,
    -0.5, 0.5, 0.5,         0.0, 0.0, 1.0,	1.0, 1.0,
    -0.5, -0.5, 0.5,        0.0, 0.0, 1.0,	0.0, 1.0,
    
	// back wall
    0.5, -0.5, -0.5,        0.0, 0.0, -1.0,	1.0, 0.0,
    -0.5, -0.5, -0.5,       0.0, 0.0, -1.0,	1.0, 1.0,
    0.5, 0.5, -0.5,         0.0, 0.0, -1.0,	0.0, 0.0,
    0.5, 0.5, -0.5,         0.0, 0.0, -1.0,	0.0, 0.0,
    -0.5, -0.5, -0.5,       0.0, 0.0, -1.0,	1.0, 1.0,
    -0.5, 0.5, -0.5,        0.0, 0.0, -1.0, 0.0, 1.0
];

var gCubeVertexData_length = gCubeVertexDataArray.length;
var gCubeVertexData = calloc(size_of_float, gCubeVertexDataArray.length).cast('float *');
gCubeVertexData = gCubeVertexDataArray; // push into memory
gCubeVertexDataArray = null; // we can clean it up here after copying into memory

global.gCubeVertexData = gCubeVertexData;

var vertexArray = calloc(size_of_int, 1).cast('uint *');
var vertexBuffer = calloc(size_of_int, 1).cast('uint *');

global.vertexArray = vertexArray;
global.vertexBuffer = vertexBuffer;

var effect = new GLKBaseEffect();
var modelViewProjectionMatrix = GLKMatrix4Make(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
var normalMatrix = GLKMatrix3Make(0,0,0,0,0,0,0,0,0);
var rotation = 0.0;

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

var max_texture_size = calloc(size_of_int, 1).cast('uint *');
max_texture_size[0] = 1;
glGetIntegerv(GL_MAX_TEXTURE_SIZE, max_texture_size);
console.log("Max texture size is:",max_texture_size[0]);

var options = new NSMutableDictionary();
options.setValue(NSNumber.numberWithBool(true), GLKTextureLoaderOriginBottomLeft);

// load image
var bundlepath = NSBundle.mainBundle().pathForResource('AppcLanicaHyperloop1024'.toUTF8(),'jpg'.toUTF8());

// create texture
var textureInfo = GLKTextureLoader.textureWithContentsOfFile(bundlepath,options,null);

// create shader program
var program = glCreateProgram();
var vertShaderPathname = NSBundle.mainBundle().pathForResource('Shader'.toUTF8(),'vsh'.toUTF8());
var fragShaderPathname = NSBundle.mainBundle().pathForResource('Shader'.toUTF8(),'fsh'.toUTF8());

var uniforms = [],
	UNIFORM_MODELVIEWPROJECTION_MATRIX = 0,
	UNIFORM_NORMAL_MATRIX = 1,
	UNIFORM_TEXTURE_SAMPLER = 2;

function update () {
	if (!renderStart) return;
	try {
		var aspect = Math.abs(view.bounds.size.width / view.bounds.size.height);
		var projectionMatrix = GLKMatrix4MakePerspective(GLKMathDegreesToRadians(65.0), aspect, 0.1, 100.0);

		effect.transform.projectionMatrix = projectionMatrix;

		var baseModelViewMatrix = GLKMatrix4MakeTranslation(0.0, 0.0, -4.0);
		baseModelViewMatrix = GLKMatrix4Rotate(baseModelViewMatrix, rotation, 0.0, 1.0, 0.0);

		// Compute the model view matrix for the object rendered with GLKit
		var modelViewMatrix = GLKMatrix4MakeTranslation(0.0, 0.0, -1.5);
		modelViewMatrix = GLKMatrix4Rotate(modelViewMatrix, rotation, 1.0, 1.0, 1.0);
		modelViewMatrix = GLKMatrix4Multiply(baseModelViewMatrix, modelViewMatrix);

		effect.transform.modelviewMatrix = modelViewMatrix;

		// Compute the model view matrix for the object rendered with ES2
		modelViewMatrix = GLKMatrix4MakeTranslation(0.0, 0.0, 1.5);
		modelViewMatrix = GLKMatrix4Rotate(modelViewMatrix, rotation, 1.0, 1.0, 1.0);
		modelViewMatrix = GLKMatrix4Multiply(baseModelViewMatrix, modelViewMatrix);

		normalMatrix = GLKMatrix3InvertAndTranspose(GLKMatrix4GetMatrix3(modelViewMatrix), null);

		modelViewProjectionMatrix = GLKMatrix4Multiply(projectionMatrix, modelViewMatrix);

		rotation += controller.timeSinceLastUpdate * 0.5;
	} catch (E) {
		console.log('update:',E.message);
	}
}

function render (view, rect) {
	if (!renderStart) return;
	try {
		glClearColor(0.65, 0.65, 0.65, 1.0);
		glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

		// target should be GL_TEXTURE_2D in this case, but this is more flexible if it changes
		glBindTexture(textureInfo.target, textureInfo.name);
		glBindVertexArrayOES(vertexArray[0]);

		// Render the object with GLKit
		effect.prepareToDraw();
		glDrawArrays(GL_TRIANGLES, 0, 36);

		// Render the object again with ES2
		glUseProgram(program);
		glUniformMatrix4fv(uniforms[UNIFORM_MODELVIEWPROJECTION_MATRIX], 1, 0, modelViewProjectionMatrix.m);
		glUniformMatrix3fv(uniforms[UNIFORM_NORMAL_MATRIX], 1, 0, normalMatrix.m);
		
		// Set the sampler texture unit to 0
		glUniform1i(uniforms[UNIFORM_TEXTURE_SAMPLER], 0);

		glDrawArrays(GL_TRIANGLES, 0, 36);
	}
	catch (E) {
		console.log('render:',E.message);
	}
}

/*
 * Make sure we only use ASCII bytes
 */
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
	glBindAttribLocation(program, GLKVertexAttribNormal, 'normal');
	glBindAttribLocation(program, GLKVertexAttribTexCoord0, 'texCoord');

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
	uniforms[UNIFORM_NORMAL_MATRIX] = glGetUniformLocation(program, 'normalMatrix');
	uniforms[UNIFORM_TEXTURE_SAMPLER] = glGetUniformLocation(program, 'texture');

	glDetachShader(program, vertShader);
	glDeleteShader(vertShader);

	glDetachShader(program, fragShader);
	glDeleteShader(fragShader);

	return true;
}

var GLKTextureEnvModeDecal = 2;
var GLKTextureTarget2D = GL_TEXTURE_2D;

try {
	if (loadShaders()) {
		effect.light0.enabled = GL_TRUE;
		effect.light0.diffuseColor = GLKVector4Make(1.0, 0.4, 0.4, 1.0);
		effect.texture2d0.enabled = GL_TRUE;
		effect.texture2d0.envMode = GLKTextureEnvModeDecal;
		effect.texture2d0.target = GLKTextureTarget2D;
		effect.texture2d0.name = textureInfo.name;

		glEnable(GL_DEPTH_TEST);

	    glGenVertexArraysOES(1, vertexArray);
	    glBindVertexArrayOES(vertexArray[0]);
	    
	    glGenBuffers(1, vertexBuffer);
	    glBindBuffer(GL_ARRAY_BUFFER, vertexBuffer[0]);

	    glBufferData(GL_ARRAY_BUFFER, gCubeVertexData_length*size_of_float, gCubeVertexData, GL_STATIC_DRAW);

	    glEnableVertexAttribArray(GLKVertexAttribPosition);
	    
	    glVertexAttribPointer(GLKVertexAttribPosition, 3, GL_FLOAT, GL_FALSE, 32, 0);
	    glEnableVertexAttribArray(GLKVertexAttribNormal);
	    glVertexAttribPointer(GLKVertexAttribNormal, 3, GL_FLOAT, GL_FALSE, 32, 12);
		glEnableVertexAttribArray(GLKVertexAttribTexCoord0);
	    glVertexAttribPointer(GLKVertexAttribTexCoord0, 2, GL_FLOAT, GL_FALSE, 32, 24);

	    glBindVertexArrayOES(0);

	    renderStart = true;
	}
}
catch(E){
	console.log(E.message);
}

