"use hyperloop"

var TARGET_FPS = 60;

/*
 Utility.
 */
String.prototype.toUTF8 = function() {
	return NSString.stringWithUTF8String('' + this);
};

/*
 Create our simple UI.
 */
var win = UIApplication.sharedApplication().keyWindow,
	label = new UILabel();
label.textColor = UIColor.darkTextColor();
label.frame = CGRectMake(20, 20, 280, 280);
label.font = UIFont.systemFontOfSize(72);
label.textAlignment = NSTextAlignmentCenter;
label.text = 'Loading...'.toUTF8();
label.lineBreakMode = NSLineBreakByTruncatingTail;
label.numberOfLines = 2;
win.addSubview(label);

/*
 Distance calculation.
 */
var calculateManually = false,
	lastLocation,
	lastSpeed = 0,
	totalTraveled = 0,
	totalDisplayed = 0;

function handleNewPosition(locationManager, didUpdateLocations) {
	var locations = didUpdateLocations.cast('NSArray');
	for (var i = 0, iL = locations.count(); i < iL; i++) {
		var location = locations.objectAtIndex(i).cast('CLLocation'),
			coordinate = location.coordinate;
		var _lastLocation = lastLocation.cast('CLLocation'); // TODO need to cast explicitly here
		if (_lastLocation) {
			if (calculateManually) {
				var lat1 = _lastLocation.latitude, lon1 = _lastLocation.longitude,
					lat2 = coordinate.latitude, lon2 = coordinate.longitude,
					kmTraveled = 3963.0 * Math.acos(
						Math.sin(lat1 / 57.2958) * Math.sin(lat2 / 57.2958)
							+ Math.cos(lat1 / 57.2958) * Math.cos(lat2 / 57.2958)
							* Math.cos(lon2 / 57.2958 - lon1 / 57.2958)
					);
				totalTraveled += kmTraveled * 3280.8399;
			}
			else {
				totalTraveled += location.distanceFromLocation(_lastLocation) * 3.28084;
			}
		}
		lastSpeed = location.speed;
		lastLocation = location;
	}
}

/*
 Update the displayed amount.
 */
Hyperloop.defineClass(TimerCallback)
	.implements('NSObject')
	.method({
		name: 'update',
		returns: 'void',
		arguments: [ { type: 'id', name: 'sender' } ],
		action: update
	})
	.build();

function update() {
	if (totalTraveled && Math.abs(totalTraveled - totalDisplayed) > 0.1) {
		totalDisplayed += Math.max((totalTraveled - totalDisplayed) / TARGET_FPS, 0.1);
		var distance = (totalDisplayed | 0) + 'ft\n',
			distanceRange = NSMakeRange(0, distance.length),
			speed = (lastSpeed | 0) + 'mph',
			speedRange = NSMakeRange(distance.length, speed.length),
			str = (distance + speed).toUTF8(),
			iws = Hyperloop.method(NSMutableAttributedString, 'initWithString:').call(str);
		
		iws.addAttribute(kCTForegroundColorAttributeName, UIColor.redColor(), distanceRange);
		iws.addAttribute(kCTForegroundColorAttributeName, UIColor.blueColor(), speedRange);
		
		label.attributedText = iws;
	}
}


/*
 Location manager hooks.
 */
var manager = new CLLocationManager();
manager.purpose = 'To track how far you have traveled, of course!'.toUTF8();
manager.distanceFilter = kCLDistanceFilterNone;
manager.desiredAccuracy = kCLLocationAccuracyBest;
Hyperloop.defineClass(LocDelegate)
	.implements('NSObject')
	.protocol('CLLocationManagerDelegate')
	.method({
		name: 'locationManager',
		returns: 'void',
		arguments: [
			{ type: 'CLLocationManager *', name: 'locationManager' },
			{ type: 'NSArray *', name: 'didUpdateLocations' }
		],
		action: handleNewPosition
	})
	.build();
var locationDelegate = new LocDelegate();
manager.delegate = locationDelegate;

/*
 We're all set. Go for it!
 */
manager.startUpdatingLocation();
if (CLLocationManager.locationServicesEnabled()) {
	label.text = 'RUN!'.toUTF8();
	NSTimer.scheduledTimerWithTimeInterval(1 / TARGET_FPS, new TimerCallback(), NSSelectorFromString('update:'.toUTF8()), null, true);
}
else {
	label.text = 'Please enable GPS for this app!'.toUTF8();
}
