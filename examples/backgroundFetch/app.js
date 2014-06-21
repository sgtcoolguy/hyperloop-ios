"use hyperloop"

// Coordinates of Appcelerator HQ.
var latitude  = "37.389587";
var longitude = "-122.05037";
var weatherUrlStr = "http://api.openweathermap.org/data/2.5/weather?lat=37.389587&lon=-122.05037";

//var weatherUrl = NSString.stringWithFormat("http://api.openweathermap.org/data/2.5/weather?lat=%@&lon=%@", latitude, longitude);
//var weatherUrl = NSString.stringWithUTF8String("http://api.openweathermap.org/data/2.5/weather?lat="+latitude+"&lon="+longitude);
var weatherUrl = NSString.stringWithUTF8String(weatherUrlStr);

function completionHandler(data,response,error) {
	try {
		var str = NSString.alloc().initWithData(data,4/*NSUTF8StringEncoding*/);
		var result = JSON.parse(str);
		var weather = "The weather in Mtn. View is "+result.weather[0].description;
		console.log(weather);
		console.log('TI_EXIT');
	}
	catch (E){
		console.log('error',E); 
	}
}

var session = NSURLSession.sharedSession();
//var url = NSURL.URLWithString(NSString.stringWithUTF8String(weatherUrl));
console.log('weatherUrl=',weatherUrl);
var url = NSURL.URLWithString(weatherUrl);
console.log('url=',url);
var task = session.dataTaskWithURL(url,completionHandler);
task.resume();
