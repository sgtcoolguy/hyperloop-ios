/**
 * simple hook that inject mocha
 */
var hl = require('hyperloop-common'),
       path = require('path'),
       fs = require('fs'),
       log = hl.log;

exports.version = '>0.0.0';

function createSourceEntry(data, fn, relative, name) {
       if (!(fn in data.uncompiledSources)) {
               var filename = path.relative(relative,fn) || 'index.js',
                       entry = {
                               source: fs.readFileSync(fn).toString(),
                               json: path.extname(fn)==='.json',
                               root: true,
                               relative: '/node_modules/'+name+'/'+filename,
                       };
               data.uncompiledSources[fn] = entry;
       }
       return true;
}

function addUncompiledSource(data, fn, relative, name, filter) {
       if (fs.existsSync(fn)) {
               if (!hl.util.isDirectory(fn)) {
                       return createSourceEntry(data,fn,relative,name);
               }
               var files = hl.util.filelisting(fn, filter);
               for (var c=0;c<files.length;c++) {
                       var file = files[c];
                       if (/\.js(on)?$/.test(file)) {
                               createSourceEntry(data, file, relative, name);
                       }
                       else if (hl.util.isDirectory(file)) {
                               addUncompiledSource(data, file, relative, name, filter);
                       }
               }
       }
       return false;
}

function addRequire(source, line) {
       var lines = source.split(/\n/);
       line = /;$/.test(line) ? line : line+';';
       if (lines[0].trim()==='"use hyperloop"') {
               lines.splice(1,0,line);
       }
       else {
               lines.unshift(line);
       }
       return lines.join('\n');
}

exports.init = function(cli) {
       cli.on('compile.pre.compile.source', {
               pre: function(data) {
                       if (/describe\s*\(/.test(data.source)) {
                               data.source = addRequire(data.source,'require("ti-mocha");var should=require("should")');
                               data.source += ';mocha.run();';
                               var tiMochaFile = path.join(hl.dirname,'examples','mocha','ti-mocha.js');
                               addUncompiledSource(data,tiMochaFile,tiMochaFile,'ti-mocha');
                               var shouldFile = path.join(hl.dirname,'examples','mocha','should.js');
                               addUncompiledSource(data,shouldFile,shouldFile,'should');
                       }
               }
       });
};
