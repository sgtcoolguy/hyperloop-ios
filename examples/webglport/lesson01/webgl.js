"use hyperloop"

var __ = NSString.stringWithUTF8String;

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

// platform dependent
var size_of_char     = 1;
var size_of_bool     = 1;
var size_of_short    = 2;
var size_of_int      = 4;
var size_of_float    = 4;
var size_of_long     = 4;
var size_of_double   = 8;
var size_of_longlong = 8;

var GL = function() {};
GL.prototype.toGLBool = function(flag) {
    return flag ? this.TRUE : this.FALSE;
};
GL.prototype.isShort = function(type) {
    return type == this.UNSIGNED_SHORT || type == this.SHORT;
}
GL.prototype.createBuffer = function() {
	var buffer = calloc(size_of_int, 1).cast('uint *');
	buffer[0] = 0;
    glGenBuffers(1, buffer);
    return {_:buffer[0]};
};
GL.prototype.deleteBuffer = function(buffer) {
	var b = calloc(size_of_int, buffer._.length).cast('uint *');
    b = buffer._;
    glDeleteBuffers(1, b);
}
GL.prototype.bindBuffer = function(target, buffer) {
    glBindBuffer(target, buffer._);
};
GL.prototype.bufferData = function(target, buffer, usage) {
    var data;
    if (buffer.constructor.name == 'Array') {
       data = calloc(size_of_float, buffer.length).cast('float *');
       data = buffer;
    } else {
        data = buffer._buffer._buffer;
    }
    glBufferData(target, data.length, data, usage);
};
GL.prototype.shaderSource = function(shader, source) {
	var source_bytes = getASCIIBytes(source);
    var buffer = calloc(size_of_char, source_bytes.length).cast('char *');    
    var length = calloc(size_of_int, 1).cast('int *');
    buffer = source_bytes;
    length[0] =  source_bytes.length - 1;
    glShaderSource(shader._, 1, buffer, length);
};
GL.prototype.getShaderParameter = function(shader, name) {
    var params = calloc(size_of_int, 1).cast('uint *');
    params[0] = 0;
    glGetShaderiv(shader._, name , params);
    return params[0];
};
GL.prototype.getShaderInfoLog = function(shader) {
    var buffer = calloc(size_of_char, 256).cast('char *');
    var length = calloc(size_of_int, 1).cast('uint *');
    length[0] = 0;

    glGetShaderInfoLog(shader._, 256, length, buffer);
    return NSString.stringWithUTF8String(buffer);
};
GL.prototype.getAttribLocation = function(program, name) {
    return glGetAttribLocation(program._, name);
};
GL.prototype.getProgramParameter = function(program, name) {
    var params = calloc(size_of_int, 1).cast('uint *');
    params[0] = 0;
    glGetProgramiv(program._, name, params);
    return params[0];
};
GL.prototype.getUniformLocation = function(program, name) {
    return {_:glGetUniformLocation(program._, name)};
};
GL.prototype.uniform1i = function(location,v0) {
    glUniform1i(location._,v0);
}
GL.prototype.uniform2i = function(location,v0,v1) {
    glUniform2i(location._,v0,v1);
}
GL.prototype.uniform3i = function(location,v0,v1,v2) {
    glUniform3i(location._,v0,v1,v2);
}
GL.prototype.uniform4i = function(location,v0,v1,v2,v3) {
    glUniform4i(location._,v0,v1,v2,v3);
}
GL.prototype.uniform1iv = function(location,v) {
    var data = calloc(size_of_int, 1).cast('uint *');
    data[0] = v;
    glUniform1iv(location._,v.length,data);
}
GL.prototype.uniform2iv = function(location,v) {
    var data = calloc(size_of_int, 1).cast('uint *');
    data[0] = v;
    glUniform2iv(location._,v.length/2,data);
}
GL.prototype.uniform3iv = function(location,v) {
    var data = calloc(size_of_int, 1).cast('uint *');
    data[0] = v;
    glUniform3iv(location._,v.length/3,data);
}
GL.prototype.uniform4iv = function(location,v) {
    var data = calloc(size_of_int, 1).cast('uint *');
    data[0] = v;
    glUniform4iv(location._,v.length/4,data);
}
GL.prototype.uniform1fv = function(location,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniform1fv(location._,v.length,data);
}
GL.prototype.uniform2fv = function(location,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniform2fv(location._,v.length/2,data);
}
GL.prototype.uniform3fv = function(location,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniform3fv(location._,v.length/3,data);
}
GL.prototype.uniform4fv = function(location,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniform4fv(location._,v.length/4,data);
}
GL.prototype.uniform1f = function(location,v0) {
    glUniform1f(location._,v0);
}
GL.prototype.uniform2f = function(location,v0,v1) {
    glUniform2f(location._,v0,v1);
}
GL.prototype.uniform3f = function(location,v0,v1,v2) {
    glUniform3f(location._,v0,v1,v2);
}
GL.prototype.uniform4f = function(location,v0,v1,v2,v3) {
    glUniform4f(location._,v0,v1,v2,v3);
}
GL.prototype.uniformMatrix2fv = function(location,transpose,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniformMatrix4fv(location._,v.length/4,this.toGLBool(transpose),data);
};
GL.prototype.uniformMatrix3fv = function(location,transpose,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniformMatrix4fv(location._,v.length/9,this.toGLBool(transpose),data);
};
GL.prototype.uniformMatrix4fv = function(location,transpose,v) {
    var data = calloc(size_of_float, 1).cast('float *');
    data[0] = v;
    glUniformMatrix4fv(location._,v.length/16,this.toGLBool(transpose),data);
};
GL.prototype.enableVertexAttribArray = function(index) {
    glEnableVertexAttribArray(index);
};
GL.prototype.vertexAttribPointer = function(index,size,type,normalized,stride,data) {
    glVertexAttribPointer(index,size,type,this.toGLBool(normalized),stride,data);
};
GL.prototype.attachShader = function(program, shader) {
    glAttachShader(program._, shader._);
};
GL.prototype.linkProgram = function(program) {
    glLinkProgram(program._);
};
GL.prototype.useProgram = function(program) {
    glUseProgram(program._);
};
GL.prototype.createProgram = function() {
    return {_: glCreateProgram()};
};
GL.prototype.createShader = function(type) {
    return {_: glCreateShader(type)};
};
GL.prototype.compileShader = function(shader) {
    glCompileShader(shader._);
};
GL.prototype.clearColor = function(r,g,b,a) {
    glClearColor(r,g,b,a);
};
GL.prototype.clear = function(mask) {
    glClear(mask);
};
GL.prototype.enable = function(cap) {
    glEnable(cap);
};
GL.prototype.disable = function(cap) {
    glDisable(cap);
};
GL.prototype.blendFunc = function(sfactor,dfactor) {
    glBlendFunc(sfactor,dfactor);
};
GL.prototype.viewport = function(x,y,width,height) {
    glViewport(x,y,width,height);
};
GL.prototype.drawArrays = function(mode,first,count) {
    glDrawArrays(mode,first,count);
};
GL.prototype.drawElements = function(mode,count,type,offset) {
    glDrawElements(mode,count,type,0);
};
GL.prototype.bindTexture = function(target,texture) {
    glBindTexture(target,texture);
};
GL.prototype.texParameterf = function(target,name,param) {
    glTexParameterf(target,name,param);
};
GL.prototype.texParameteri = function(target,name,param) {
    glTexParameteri(target,name,param);
};
GL.prototype.generateMipmap = function(target) {
    glGenerateMipmap(target);
};
GL.prototype.activeTexture = function(texture) {
    glActiveTexture(texture);
};
GL.prototype.pixelStorei = function(name,param) {
    glPixelStorei(name,param);
};
GL.prototype.texImage2D = function(target,level,internalFormat,width,height,border,format,type,data) {
    glTexImage2D(target,level,internalFormat,width,height,border,format,type,data);
};
GL.prototype.ES_VERSION_2_0=1;
GL.prototype.DEPTH_BUFFER_BIT=0x00000100;
GL.prototype.STENCIL_BUFFER_BIT=0x00000400;
GL.prototype.COLOR_BUFFER_BIT=0x00004000;
GL.prototype.FALSE=0;
GL.prototype.TRUE=1;
GL.prototype.POINTS=0x0000;
GL.prototype.LINES=0x0001;
GL.prototype.LINE_LOOP=0x0002;
GL.prototype.LINE_STRIP=0x0003;
GL.prototype.TRIANGLES=0x0004;
GL.prototype.TRIANGLE_STRIP=0x0005;
GL.prototype.TRIANGLE_FAN=0x0006;
GL.prototype.ZERO=0;
GL.prototype.ONE=1;
GL.prototype.SRC_COLOR=0x0300;
GL.prototype.ONE_MINUS_SRC_COLOR=0x0301;
GL.prototype.SRC_ALPHA=0x0302;
GL.prototype.ONE_MINUS_SRC_ALPHA=0x0303;
GL.prototype.DST_ALPHA=0x0304;
GL.prototype.ONE_MINUS_DST_ALPHA=0x0305;
GL.prototype.DST_COLOR=0x0306;
GL.prototype.ONE_MINUS_DST_COLOR=0x0307;
GL.prototype.SRC_ALPHA_SATURATE=0x0308;
GL.prototype.FUNC_ADD=0x8006;
GL.prototype.BLEND_EQUATION=0x8009;
GL.prototype.BLEND_EQUATION_RGB=0x8009;
GL.prototype.BLEND_EQUATION_ALPHA=0x883D;
GL.prototype.FUNC_SUBTRACT=0x800A;
GL.prototype.FUNC_REVERSE_SUBTRACT=0x800B;
GL.prototype.BLEND_DST_RGB=0x80C8;
GL.prototype.BLEND_SRC_RGB=0x80C9;
GL.prototype.BLEND_DST_ALPHA=0x80CA;
GL.prototype.BLEND_SRC_ALPHA=0x80CB;
GL.prototype.CONSTANT_COLOR=0x8001;
GL.prototype.ONE_MINUS_CONSTANT_COLOR=0x8002;
GL.prototype.CONSTANT_ALPHA=0x8003;
GL.prototype.ONE_MINUS_CONSTANT_ALPHA=0x8004;
GL.prototype.BLEND_COLOR=0x8005;
GL.prototype.ARRAY_BUFFER=0x8892;
GL.prototype.ELEMENT_ARRAY_BUFFER=0x8893;
GL.prototype.ARRAY_BUFFER_BINDING=0x8894;
GL.prototype.ELEMENT_ARRAY_BUFFER_BINDING=0x8895;
GL.prototype.STREAM_DRAW=0x88E0;
GL.prototype.STATIC_DRAW=0x88E4;
GL.prototype.DYNAMIC_DRAW=0x88E8;
GL.prototype.BUFFER_SIZE=0x8764;
GL.prototype.BUFFER_USAGE=0x8765;
GL.prototype.CURRENT_VERTEX_ATTRIB=0x8626;
GL.prototype.FRONT=0x0404;
GL.prototype.BACK=0x0405;
GL.prototype.FRONT_AND_BACK=0x0408;
GL.prototype.TEXTURE_2D=0x0DE1;
GL.prototype.CULL_FACE=0x0B44;
GL.prototype.BLEND=0x0BE2;
GL.prototype.DITHER=0x0BD0;
GL.prototype.STENCIL_TEST=0x0B90;
GL.prototype.DEPTH_TEST=0x0B71;
GL.prototype.SCISSOR_TEST=0x0C11;
GL.prototype.POLYGON_OFFSET_FILL=0x8037;
GL.prototype.SAMPLE_ALPHA_TO_COVERAGE=0x809E;
GL.prototype.SAMPLE_COVERAGE=0x80A0;
GL.prototype.NO_ERROR=0;
GL.prototype.INVALID_ENUM=0x0500;
GL.prototype.INVALID_VALUE=0x0501;
GL.prototype.INVALID_OPERATION=0x0502;
GL.prototype.OUT_OF_MEMORY=0x0505;
GL.prototype.CW=0x0900;
GL.prototype.CCW=0x0901;
GL.prototype.LINE_WIDTH=0x0B21;
GL.prototype.ALIASED_POINT_SIZE_RANGE=0x846D;
GL.prototype.ALIASED_LINE_WIDTH_RANGE=0x846E;
GL.prototype.CULL_FACE_MODE=0x0B45;
GL.prototype.FRONT_FACE=0x0B46;
GL.prototype.DEPTH_RANGE=0x0B70;
GL.prototype.DEPTH_WRITEMASK=0x0B72;
GL.prototype.DEPTH_CLEAR_VALUE=0x0B73;
GL.prototype.DEPTH_FUNC=0x0B74;
GL.prototype.STENCIL_CLEAR_VALUE=0x0B91;
GL.prototype.STENCIL_FUNC=0x0B92;
GL.prototype.STENCIL_FAIL=0x0B94;
GL.prototype.STENCIL_PASS_DEPTH_FAIL=0x0B95;
GL.prototype.STENCIL_PASS_DEPTH_PASS=0x0B96;
GL.prototype.STENCIL_REF=0x0B97;
GL.prototype.STENCIL_VALUE_MASK=0x0B93;
GL.prototype.STENCIL_WRITEMASK=0x0B98;
GL.prototype.STENCIL_BACK_FUNC=0x8800;
GL.prototype.STENCIL_BACK_FAIL=0x8801;
GL.prototype.STENCIL_BACK_PASS_DEPTH_FAIL=0x8802;
GL.prototype.STENCIL_BACK_PASS_DEPTH_PASS=0x8803;
GL.prototype.STENCIL_BACK_REF=0x8CA3;
GL.prototype.STENCIL_BACK_VALUE_MASK=0x8CA4;
GL.prototype.STENCIL_BACK_WRITEMASK=0x8CA5;
GL.prototype.VIEWPORT=0x0BA2;
GL.prototype.SCISSOR_BOX=0x0C10;
GL.prototype.COLOR_CLEAR_VALUE=0x0C22;
GL.prototype.COLOR_WRITEMASK=0x0C23;
GL.prototype.UNPACK_ALIGNMENT=0x0CF5;
GL.prototype.PACK_ALIGNMENT=0x0D05;
GL.prototype.MAX_TEXTURE_SIZE=0x0D33;
GL.prototype.MAX_VIEWPORT_DIMS=0x0D3A;
GL.prototype.SUBPIXEL_BITS=0x0D50;
GL.prototype.RED_BITS=0x0D52;
GL.prototype.GREEN_BITS=0x0D53;
GL.prototype.BLUE_BITS=0x0D54;
GL.prototype.ALPHA_BITS=0x0D55;
GL.prototype.DEPTH_BITS=0x0D56;
GL.prototype.STENCIL_BITS=0x0D57;
GL.prototype.POLYGON_OFFSET_UNITS=0x2A00;
GL.prototype.POLYGON_OFFSET_FACTOR=0x8038;
GL.prototype.TEXTURE_BINDING_2D=0x8069;
GL.prototype.SAMPLE_BUFFERS=0x80A8;
GL.prototype.SAMPLES=0x80A9;
GL.prototype.SAMPLE_COVERAGE_VALUE=0x80AA;
GL.prototype.SAMPLE_COVERAGE_INVERT=0x80AB;
GL.prototype.NUM_COMPRESSED_TEXTURE_FORMATS=0x86A2;
GL.prototype.COMPRESSED_TEXTURE_FORMATS=0x86A3;
GL.prototype.DONT_CARE=0x1100;
GL.prototype.FASTEST=0x1101;
GL.prototype.NICEST=0x1102;
GL.prototype.GENERATE_MIPMAP_HINT=0x8192;
GL.prototype.BYTE=0x1400;
GL.prototype.UNSIGNED_BYTE=0x1401;
GL.prototype.SHORT=0x1402;
GL.prototype.UNSIGNED_SHORT=0x1403;
GL.prototype.INT=0x1404;
GL.prototype.UNSIGNED_INT=0x1405;
GL.prototype.FLOAT=0x1406;
GL.prototype.FIXED=0x140C;
GL.prototype.DEPTH_COMPONENT=0x1902;
GL.prototype.ALPHA=0x1906;
GL.prototype.RGB=0x1907;
GL.prototype.RGBA=0x1908;
GL.prototype.LUMINANCE=0x1909;
GL.prototype.LUMINANCE_ALPHA=0x190A;
GL.prototype.UNSIGNED_SHORT_4_4_4_4=0x8033;
GL.prototype.UNSIGNED_SHORT_5_5_5_1=0x8034;
GL.prototype.UNSIGNED_SHORT_5_6_5=0x8363;
GL.prototype.FRAGMENT_SHADER=0x8B30;
GL.prototype.VERTEX_SHADER=0x8B31;
GL.prototype.MAX_VERTEX_ATTRIBS=0x8869;
GL.prototype.MAX_VERTEX_UNIFORM_VECTORS=0x8DFB;
GL.prototype.MAX_VARYING_VECTORS=0x8DFC;
GL.prototype.MAX_COMBINED_TEXTURE_IMAGE_UNITS=0x8B4D;
GL.prototype.MAX_VERTEX_TEXTURE_IMAGE_UNITS=0x8B4C;
GL.prototype.MAX_TEXTURE_IMAGE_UNITS=0x8872;
GL.prototype.MAX_FRAGMENT_UNIFORM_VECTORS=0x8DFD;
GL.prototype.SHADER_TYPE=0x8B4F;
GL.prototype.DELETE_STATUS=0x8B80;
GL.prototype.LINK_STATUS=0x8B82;
GL.prototype.VALIDATE_STATUS=0x8B83;
GL.prototype.ATTACHED_SHADERS=0x8B85;
GL.prototype.ACTIVE_UNIFORMS=0x8B86;
GL.prototype.ACTIVE_UNIFORM_MAX_LENGTH=0x8B87;
GL.prototype.ACTIVE_ATTRIBUTES=0x8B89;
GL.prototype.ACTIVE_ATTRIBUTE_MAX_LENGTH=0x8B8A;
GL.prototype.SHADING_LANGUAGE_VERSION=0x8B8C;
GL.prototype.CURRENT_PROGRAM=0x8B8D;
GL.prototype.NEVER=0x0200;
GL.prototype.LESS=0x0201;
GL.prototype.EQUAL=0x0202;
GL.prototype.LEQUAL=0x0203;
GL.prototype.GREATER=0x0204;
GL.prototype.NOTEQUAL=0x0205;
GL.prototype.GEQUAL=0x0206;
GL.prototype.ALWAYS=0x0207;
GL.prototype.KEEP=0x1E00;
GL.prototype.REPLACE=0x1E01;
GL.prototype.INCR=0x1E02;
GL.prototype.DECR=0x1E03;
GL.prototype.INVERT=0x150A;
GL.prototype.INCR_WRAP=0x8507;
GL.prototype.DECR_WRAP=0x8508;
GL.prototype.VENDOR=0x1F00;
GL.prototype.RENDERER=0x1F01;
GL.prototype.VERSION=0x1F02;
GL.prototype.EXTENSIONS=0x1F03;
GL.prototype.NEAREST=0x2600;
GL.prototype.LINEAR=0x2601;
GL.prototype.NEAREST_MIPMAP_NEAREST=0x2700;
GL.prototype.LINEAR_MIPMAP_NEAREST=0x2701;
GL.prototype.NEAREST_MIPMAP_LINEAR=0x2702;
GL.prototype.LINEAR_MIPMAP_LINEAR=0x2703;
GL.prototype.TEXTURE_MAG_FILTER=0x2800;
GL.prototype.TEXTURE_MIN_FILTER=0x2801;
GL.prototype.TEXTURE_WRAP_S=0x2802;
GL.prototype.TEXTURE_WRAP_T=0x2803;
GL.prototype.TEXTURE=0x1702;
GL.prototype.TEXTURE_CUBE_MAP=0x8513;
GL.prototype.TEXTURE_BINDING_CUBE_MAP=0x8514;
GL.prototype.TEXTURE_CUBE_MAP_POSITIVE_X=0x8515;
GL.prototype.TEXTURE_CUBE_MAP_NEGATIVE_X=0x8516;
GL.prototype.TEXTURE_CUBE_MAP_POSITIVE_Y=0x8517;
GL.prototype.TEXTURE_CUBE_MAP_NEGATIVE_Y=0x8518;
GL.prototype.TEXTURE_CUBE_MAP_POSITIVE_Z=0x8519;
GL.prototype.TEXTURE_CUBE_MAP_NEGATIVE_Z=0x851A;
GL.prototype.MAX_CUBE_MAP_TEXTURE_SIZE=0x851C;
GL.prototype.TEXTURE0=0x84C0;
GL.prototype.TEXTURE1=0x84C1;
GL.prototype.TEXTURE2=0x84C2;
GL.prototype.TEXTURE3=0x84C3;
GL.prototype.TEXTURE4=0x84C4;
GL.prototype.TEXTURE5=0x84C5;
GL.prototype.TEXTURE6=0x84C6;
GL.prototype.TEXTURE7=0x84C7;
GL.prototype.TEXTURE8=0x84C8;
GL.prototype.TEXTURE9=0x84C9;
GL.prototype.TEXTURE10=0x84CA;
GL.prototype.TEXTURE11=0x84CB;
GL.prototype.TEXTURE12=0x84CC;
GL.prototype.TEXTURE13=0x84CD;
GL.prototype.TEXTURE14=0x84CE;
GL.prototype.TEXTURE15=0x84CF;
GL.prototype.TEXTURE16=0x84D0;
GL.prototype.TEXTURE17=0x84D1;
GL.prototype.TEXTURE18=0x84D2;
GL.prototype.TEXTURE19=0x84D3;
GL.prototype.TEXTURE20=0x84D4;
GL.prototype.TEXTURE21=0x84D5;
GL.prototype.TEXTURE22=0x84D6;
GL.prototype.TEXTURE23=0x84D7;
GL.prototype.TEXTURE24=0x84D8;
GL.prototype.TEXTURE25=0x84D9;
GL.prototype.TEXTURE26=0x84DA;
GL.prototype.TEXTURE27=0x84DB;
GL.prototype.TEXTURE28=0x84DC;
GL.prototype.TEXTURE29=0x84DD;
GL.prototype.TEXTURE30=0x84DE;
GL.prototype.TEXTURE31=0x84DF;
GL.prototype.ACTIVE_TEXTURE=0x84E0;
GL.prototype.REPEAT=0x2901;
GL.prototype.CLAMP_TO_EDGE=0x812F;
GL.prototype.MIRRORED_REPEAT=0x8370;
GL.prototype.FLOAT_VEC2=0x8B50;
GL.prototype.FLOAT_VEC3=0x8B51;
GL.prototype.FLOAT_VEC4=0x8B52;
GL.prototype.INT_VEC2=0x8B53;
GL.prototype.INT_VEC3=0x8B54;
GL.prototype.INT_VEC4=0x8B55;
GL.prototype.BOOL=0x8B56;
GL.prototype.BOOL_VEC2=0x8B57;
GL.prototype.BOOL_VEC3=0x8B58;
GL.prototype.BOOL_VEC4=0x8B59;
GL.prototype.FLOAT_MAT2=0x8B5A;
GL.prototype.FLOAT_MAT3=0x8B5B;
GL.prototype.FLOAT_MAT4=0x8B5C;
GL.prototype.SAMPLER_2D=0x8B5E;
GL.prototype.SAMPLER_CUBE=0x8B60;
GL.prototype.VERTEX_ATTRIB_ARRAY_ENABLED=0x8622;
GL.prototype.VERTEX_ATTRIB_ARRAY_SIZE=0x8623;
GL.prototype.VERTEX_ATTRIB_ARRAY_STRIDE=0x8624;
GL.prototype.VERTEX_ATTRIB_ARRAY_TYPE=0x8625;
GL.prototype.VERTEX_ATTRIB_ARRAY_NORMALIZED=0x886A;
GL.prototype.VERTEX_ATTRIB_ARRAY_POINTER=0x8645;
GL.prototype.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING=0x889F;
GL.prototype.IMPLEMENTATION_COLOR_READ_TYPE=0x8B9A;
GL.prototype.IMPLEMENTATION_COLOR_READ_FORMAT=0x8B9B;
GL.prototype.COMPILE_STATUS=0x8B81;
GL.prototype.INFO_LOG_LENGTH=0x8B84;
GL.prototype.SHADER_SOURCE_LENGTH=0x8B88;
GL.prototype.SHADER_COMPILER=0x8DFA;
GL.prototype.SHADER_BINARY_FORMATS=0x8DF8;
GL.prototype.NUM_SHADER_BINARY_FORMATS=0x8DF9;
GL.prototype.LOW_FLOAT=0x8DF0;
GL.prototype.MEDIUM_FLOAT=0x8DF1;
GL.prototype.HIGH_FLOAT=0x8DF2;
GL.prototype.LOW_INT=0x8DF3;
GL.prototype.MEDIUM_INT=0x8DF4;
GL.prototype.HIGH_INT=0x8DF5;
GL.prototype.FRAMEBUFFER=0x8D40;
GL.prototype.RENDERBUFFER=0x8D41;
GL.prototype.RGBA4=0x8056;
GL.prototype.RGB5_A1=0x8057;
GL.prototype.RGB565=0x8D62;
GL.prototype.DEPTH_COMPONENT16=0x81A5;
GL.prototype.STENCIL_INDEX=0x1901;
GL.prototype.STENCIL_INDEX8=0x8D48;
GL.prototype.RENDERBUFFER_WIDTH=0x8D42;
GL.prototype.RENDERBUFFER_HEIGHT=0x8D43;
GL.prototype.RENDERBUFFER_INTERNAL_FORMAT=0x8D44;
GL.prototype.RENDERBUFFER_RED_SIZE=0x8D50;
GL.prototype.RENDERBUFFER_GREEN_SIZE=0x8D51;
GL.prototype.RENDERBUFFER_BLUE_SIZE=0x8D52;
GL.prototype.RENDERBUFFER_ALPHA_SIZE=0x8D53;
GL.prototype.RENDERBUFFER_DEPTH_SIZE=0x8D54;
GL.prototype.RENDERBUFFER_STENCIL_SIZE=0x8D55;
GL.prototype.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE=0x8CD0;
GL.prototype.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME=0x8CD1;
GL.prototype.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL=0x8CD2;
GL.prototype.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE=0x8CD3;
GL.prototype.COLOR_ATTACHMENT0=0x8CE0;
GL.prototype.DEPTH_ATTACHMENT=0x8D00;
GL.prototype.STENCIL_ATTACHMENT=0x8D20;
GL.prototype.NONE=0;
GL.prototype.FRAMEBUFFER_COMPLETE=0x8CD5;
GL.prototype.FRAMEBUFFER_INCOMPLETE_ATTACHMENT=0x8CD6;
GL.prototype.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT=0x8CD7;
GL.prototype.FRAMEBUFFER_INCOMPLETE_DIMENSIONS=0x8CD9;
GL.prototype.FRAMEBUFFER_UNSUPPORTED=0x8CDD;
GL.prototype.FRAMEBUFFER_BINDING=0x8CA6;
GL.prototype.RENDERBUFFER_BINDING=0x8CA7;
GL.prototype.MAX_RENDERBUFFER_SIZE=0x84E8;
GL.prototype.INVALID_FRAMEBUFFER_OPERATION=0x0506;

module.exports = GL;

