"use hyperloop"

// WebGL porting support library
var WebGL = require('webgl');
var gl;

// GL matrix library
var matrix = require('glmatrix');
var mat4   = matrix.mat4;
var mat3   = matrix.mat3;

var __ = NSString.stringWithUTF8String;

var Lesson = function() {
    gl = new WebGL();
};

function getShader(file, type) {
    var path = NSBundle.mainBundle().pathForResource(__(file),__(''));
    var source = NSString.stringWithContentsOfFile(path,NSUTF8StringEncoding,null);

    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;

function initShaders() {
    var fragmentShader = getShader('shader.fsh', gl.FRAGMENT_SHADER);
    var vertexShader   = getShader('shader.vsh', gl.VERTEX_SHADER);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log('Could not initialise shaders');
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, 'aVertexNormal');
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, 'uNMatrix');
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, 'uSampler');
    shaderProgram.materialShininessUniform = gl.getUniformLocation(shaderProgram, 'uMaterialShininess');
    shaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(shaderProgram, 'uShowSpecularHighlights');
    shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, 'uUseTextures');
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, 'uUseLighting');
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, 'uAmbientColor');
    shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, 'uPointLightingLocation');
    shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, 'uPointLightingSpecularColor');
    shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, 'uPointLightingDiffuseColor');

}

var earthTexture;
var galvanizedTexture;

function initTexture() {
    var texturepath = NSBundle.mainBundle().pathForResource(__('earth.jpg'),__(''));

    var options = new NSMutableDictionary();
    options.setValue(NSNumber.numberWithBool(true),GLKTextureLoaderOriginBottomLeft);
    options.setValue(NSNumber.numberWithBool(true),GLKTextureLoaderGenerateMipmaps);
    earthTexture = GLKTextureLoader.textureWithContentsOfFile(texturepath,options,null);

    gl.bindTexture(earthTexture.target, earthTexture.name);
    gl.texParameteri(earthTexture.target, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(earthTexture.target, gl.TEXTURE_WRAP_T, gl.REPEAT);

    texturepath = NSBundle.mainBundle().pathForResource(__('arroway.de_metal+structure+06_d100_flat.jpg'),__(''));

    options = new NSMutableDictionary();
    options.setValue(NSNumber.numberWithBool(true),GLKTextureLoaderOriginBottomLeft);
    options.setValue(NSNumber.numberWithBool(true),GLKTextureLoaderGenerateMipmaps);
    galvanizedTexture = GLKTextureLoader.textureWithContentsOfFile(texturepath,options,null);

    gl.bindTexture(galvanizedTexture.target, galvanizedTexture.name);
    gl.texParameteri(galvanizedTexture.target, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(galvanizedTexture.target, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.bindTexture(gl.TEXTURE_2D, 0);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix  = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.copy(copy,mvMatrix);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw 'Invalid popMatrix!';
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix,mvMatrix);
    mat3.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

var teapotVertexPositionBuffer;
var teapotVertexNormalBuffer;
var teapotVertexTextureCoordBuffer;
var teapotVertexIndexBuffer;

function handleLoadedTeapot(teapotData) {
    teapotVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexNormals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = teapotData.vertexNormals.length / 3;

    teapotVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexTextureCoords), gl.STATIC_DRAW);
    teapotVertexTextureCoordBuffer.itemSize = 2;
    teapotVertexTextureCoordBuffer.numItems = teapotData.vertexTextureCoords.length / 2;

    teapotVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexPositions), gl.STATIC_DRAW);
    teapotVertexPositionBuffer.itemSize = 3;
    teapotVertexPositionBuffer.numItems = teapotData.vertexPositions.length / 3;

    teapotVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotData.indices), gl.STATIC_DRAW);
    teapotVertexIndexBuffer.itemSize = 1;
    teapotVertexIndexBuffer.numItems = teapotData.indices.length;
}

function loadTeapot() {
    var path = NSBundle.mainBundle().pathForResource(__('Teapot.json'),__(''));
    var teapotJsonString = NSString.stringWithContentsOfFile(path,NSUTF8StringEncoding,null).toString();
    handleLoadedTeapot(JSON.parse(teapotJsonString));
}

var teapotAngle = 180;
var specularHighlights = 1;
var lighting = 1;
var ambientR = 0.5;
var ambientG = 0.5;
var ambientB = 0.5;
var lightPositionX = -10.0;
var lightPositionY = 4.0;
var lightPositionZ = -20.0;
var specularR = 0.8;
var specularG = 0.8;
var specularB = 0.8;
var diffuseR  = 0.8;
var diffuseG  = 0.8;
var diffuseB  = 0.8;
var shininess = 32.0;
var texture = "earth"; // "earth", "none", "galvanized"

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    gl.uniform1i(shaderProgram.showSpecularHighlightsUniform, specularHighlights);
    gl.uniform1i(shaderProgram.useLightingUniform, lighting);
    if (lighting) {
        gl.uniform3f(
            shaderProgram.ambientColorUniform,
            ambientR, ambientG, ambientB
        );

        gl.uniform3f(
            shaderProgram.pointLightingLocationUniform,
            lightPositionX, lightPositionY, lightPositionZ
        );

        gl.uniform3f(
            shaderProgram.pointLightingSpecularColorUniform,
            specularR, specularG, specularB
        );

        gl.uniform3f(
            shaderProgram.pointLightingDiffuseColorUniform,
            diffuseR, diffuseG, diffuseB
        );
    }

    gl.uniform1i(shaderProgram.useTexturesUniform, gl.toGLBool(texture != "none"));

    mat4.identity(mvMatrix);

    mat4.translate(mvMatrix, mvMatrix, [0, 0, -40]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(23.4), [1, 0, -1]);
    mat4.rotate(mvMatrix, mvMatrix, degToRad(teapotAngle), [0, 1, 0]);

    gl.activeTexture(gl.TEXTURE0);
    if (texture == "earth") {
        gl.bindTexture(earthTexture.target, earthTexture.name);
    } else if (texture == "galvanized") {
        gl.bindTexture(galvanizedTexture.target, galvanizedTexture.name);
    }
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.uniform1f(shaderProgram.materialShininessUniform, shininess);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, teapotVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, teapotVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, teapotVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, teapotVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}

var lastTime = 0;

function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;

        teapotAngle += 0.05 * elapsed;
    }
    lastTime = timeNow;
}

Lesson.prototype.start = function(view) {
    var scale = UIScreen.mainScreen().scale;

    gl.viewportWidth  = view.bounds.size.width  * scale;
    gl.viewportHeight = view.bounds.size.height * scale;

    initShaders();
    initTexture();
    loadTeapot();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    drawScene();
};

Lesson.prototype.render = function() {
    drawScene();
};

Lesson.prototype.update = function() {
    animate();    
};

module.exports = Lesson;
