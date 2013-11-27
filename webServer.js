//var httpServerPort = 80;
var httpServerPort = 8090;

var mongo = require('mongoskin');
//var mongoskinstore = require('mongoskinstore');
var mongoskinstore = require('./mongoskinstore');
var mongodb = mongo.db('mongodb://admin:rollerbotpass@paulo.mongohq.com:10018/rollerbot_test?auto_reconnect');
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
			{ compiledID: controller.compiledID },
			{ $set: controller },
			{ upsert: true },
			function (err, object) {
				console.log('save request err ', err, ' object ', object);
				if(err) clientCallback({err: err});
				else clientCallback({});
			}
		);
	});

	socket.on('fetchController', function(data, clientCallback) {
		console.log('fetch request for ' + data.compiledID);
		var compiledID = data.compiledID;
		mongodb.collection('controllers').findOne({compiledID: compiledID}, function(err, result) {
			console.log('fetch request err ', err, ' result ', result);
			if(err) clientCallback({err: err});
			else clientCallback({controller: result});
		});
	});
});





// Express ////////////////////////////////////////////////

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "whaaaaatS?", store: mongoStore }));

app.get('/', function (req, res) {
    //res.redirect('/client.html');
    res.sendfile(__dirname + "/public/client.html");
});

app.get('/screen*', function(req, res) {
    res.sendfile(__dirname + '/public/client.html');
});

app.use(express.static(__dirname + '/public',  {maxAge: 1}));