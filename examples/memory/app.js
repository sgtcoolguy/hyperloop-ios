"use hyperloop"

// platform dependent
var size_of_char     = 1;
var size_of_bool     = 1;
var size_of_short    = 2;
var size_of_int      = 4;
var size_of_float    = 4;
var size_of_long     = 4;
var size_of_double   = 8;
var size_of_longlong = 8;

// allocate byte array (char *)
var pbyte = calloc(size_of_char,1024).cast('char *');

// get value from byte array
console.log(pbyte[123],'should be 0');

// set value to byte array
pbyte[123] = 45;

console.log(pbyte[123], 'should be 45');

// unlike JS array, "pbyte.length" does not work.
// this is because sizeof(void*) doesn't return allocated size.

free(pbyte);

// allocate memory and treat it as long array
var plong = calloc(size_of_long,1024).cast('long *');

// get value from long array
console.log(plong[123],'should be 0');

// set value to long array
plong[123] = 456;

console.log(plong[123],'should be 456');

// assign values all at once from index 123
plong[123] = [0,2,3,4,5,6,7,8,9];

console.log(plong[123],'should be 0');
console.log(plong[124],'should be 2');
console.log(plong[125],'should be 3');
console.log(plong[126],'should be 4');

// assign values all at once from index 0
// same as plong[0] = [0,2,3,4,5,6,7,8,9];
plong = [0,2,3,4,5,6,7,8,9];

console.log(plong[0],'should be 0');
console.log(plong[1],'should be 2');
console.log(plong[2],'should be 3');

var pi = calloc(size_of_int, 1).cast('int *');
pi[0] = plong; // pointer to pointer

free(pi);
free(plong);
