"use hyperloop"

var N = 1024*1024, 
	M = 80;

var startTime = +new Date();

var memory = malloc(N).cast('char *');

var final = 0;
var buf = new Array(N);
for (var t = 0; t < M; t++) {
for (var i = 0; i < N; i++)
  buf[i] = (i + final)%256;
for (var i = 0; i < N; i++)
  final += buf[i] & 1;
final = final % 1000;
}

memory = buf;

console.log('duration:',(+new Date()-startTime));
