"use hyperloop"

var array = NSMutableArray.array();
array.addObject(NSNumber.numberWithInt(3));
array.addObject(NSNumber.numberWithInt(2));
array.addObject(NSNumber.numberWithInt(1));

console.log("before which should be out of order =>",array);

var newarray = array.sortedArrayUsingFunction(function(a,b,context){
	if (a > b) {
		return 1;
	}
	else if (a < b) {
		return -1;
	}
	return 0;
},null);

console.log("after which should be in order =>",newarray);
