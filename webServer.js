//var httpServerPort = 80;
var httpServerPort = 8090;

var mongo = require('mongoskin');
//var mongoskinstore = require('mongoskinstore');
var mongoskinstore = require('./mongoskinstore');
var mongodb = mongo.db('mongodb://admin:' + process.env['ROLLERBOTPASSWORD'] + '@paulo.mongohq.com:10018/rollerbot_test?auto_reconnect', {safe: true});
var mongoStore = new mongoskinstore({db: mongodb});

var express = require('express');
var app = express();




// Websocket //////////////////////////////////////////////

var httpServer = require('http').createServer(app);
var socketIO = require('socket.io').listen(httpServer);
httpServer.listen(httpServerPort);

socketIO.set('log level', 1);

socketIO.sockets.on('connection', function(socket) {
	console.log('socketIO connection');

	socket.on('disconnect', function() {

	});

	socket.on('saveController', function(data, clientCallback) {
		console.log('save request ', data.controller);
		var controller = data.controller;

		mongodb.collection('controllers').update(
			{ controllerID: controller.controllerID },
			{ $set: controller },
			{ upsert: true },
			function (err, object) {
				console.log('save request err ', err, ' object ', object);
				if(err) clientCallback({err: err});
				else clientCallback({});
			}
		);
		
	});

	socket.on('newController', function(data, clientCallback) {
		console.log('on newController');
		var newID;
		mongodb.collection('settings').findOne({settingsID: 1}, function(err, settings) {
			console.log('settings ', settings);
			newID = settings.nextControllerID;
			settings.nextControllerID = newID + 1;
			mongodb.collection('settings').save(settings, {}, function(err, result) {
				console.log('settings save err? ', err, ' result ', result);
				clientCallback({controllerID: newID});
			});
		});
	});

	socket.on('removeController', function(data, clientCallback) {
		console.log('remove controller request for ' + data);
		mongodb.collection('controllers').remove({controllerID: data.controllerID}, {}, function(err) {
			if(err) clientCallback({err: err});
			else clientCallback({});
		});
	});

	socket.on('fetchController', function(data, clientCallback) {
		console.log('fetch request for ' + data);
		//var compiledID = data.compiledID;
		mongodb.collection('controllers').findOne(data, function(err, result) {
			console.log('fetch request err ', err, ' result ', result);
			if(err) clientCallback({err: err});
			else clientCallback({controller: result});
		});
	}); 

	socket.on('fetchControllerList', function(data, clientCallback) {
		console.log('fetch request list for ' + data);
		mongodb.collection('controllers').find(data).toArray(function(err, results) {
			console.log('fetch request list err ', err, ' results ', results);
			if(err) clientCallback({err: err});
			else clientCallback({controllerList: results});
		});
	});

	socket.on('getBotInfo', function(data, clientCallback) {
		//console.log('fetch request for bot "', data.botID, '"');
		/*
		mongodb.collection('bots').find().toArray(function(err, results) {
			console.log('bot request results ', results);
		});
		return;
		*/
		mongodb.collection('bots').findOne({botID: +data.botID}, function(err, result) {
			//console.log('fetch request for bot err ', err, ' result ', result);
			if(err) clientCallback({err: err});
			else clientCallback({botInfo: result});
		});
	});
});






// Express ////////////////////////////////////////////////

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "whaaaaatS?", store: mongoStore }));

app.get('/', function (req, res) {
    //res.redirect('/client.html');
    console.log('send /');
    res.sendfile(__dirname + "/public/client.html");
});

app.get('/js/Bluetooth.js', function(req, res) {
	console.log('send bluetooth');
    // deliver the local version of this
    res.sendfile(__dirname + '/public/js/Bluetooth_web.js');
});

app.get('/screen*', function(req, res) {
	console.log('send screen*');
    res.sendfile(__dirname + '/public/client.html');
});

app.use(express.static(__dirname + '/public',  {maxAge: 1}));