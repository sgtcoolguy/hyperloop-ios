"use hyperloop"

var data = ['hello', 'world', 'how', 'are', 'you', 'doing?'];

Hyperloop.defineClass(TableViewController)
	.implements('UITableViewController')
	.method({
		name: 'viewDidLoad', 
		returns: 'void', 
		arguments: [],
		action: function() {
			var thiz = this.cast('UITableViewController'),
				cellId = NSString.stringWithUTF8String("Cell"),//this must be an NSString
				tblClass = UITableViewCell.class(),
				tableView = thiz.tableView.cast('UITableView');
			this.cellId = cellId;
			Hyperloop.method(tableView, 'registerClass:forCellReuseIdentifier:').call(tblClass, cellId);
		}
	})
	.method({
		name: 'numberOfSectionsInTableView', 
		returns: 'NSInteger', 
		arguments: [{type: 'UITableView', name: 'tableView'}],
		action: function(tableView) {
			return 1;
		}
	})
	.method({
		name: 'tableView', 
		returns: 'NSInteger', 
		arguments: [{type: 'UITableView', name: 'tableView'}, {type: 'NSInteger', name: 'numberOfRowsInSection'}],
		action: function(tableView,numberOfRowsInSection) {
			return data.length;
		}
	})
	.method({
		name: 'tableView', 
		returns: 'UITableViewCell', 
		arguments: [{type: 'UITableView', name: 'tableView'}, {type: 'NSIndexPath', name: 'cellForRowAtIndexPath'}],
		action: function(tableView,_cellForRowAtIndexPath) {
			var thiz = this.cast('UITableViewController');
			var cellForRowAtIndexPath = _cellForRowAtIndexPath.cast('NSIndexPath');
			var cell = tableView.dequeueReusableCellWithIdentifier(this.cellId, cellForRowAtIndexPath).cast('UITableViewCell');

			if (!cell) {
				cell = new UITableViewCell();
			}

			var text = data[cellForRowAtIndexPath.row];
			cell.textLabel.text = NSString.stringWithUTF8String(text);
			return cell;
		}
	})
	.build();

var frame = CGRectMake(100,100,20,20);
var bounds = UIScreen.mainScreen().bounds;
var window = Hyperloop.method(UIWindow, 'initWithFrame:').call(bounds);

var UITableViewStylePlain = 0;
var tableViewController = Hyperloop.method(TableViewController, 'initWithStyle:').call(UITableViewStylePlain);

window.addSubview(tableViewController.tableView);
window.makeKeyAndVisible();



