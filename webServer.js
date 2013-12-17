//var httpServerPort = 80;
var httpServerPort = 8090;

var mongo = require('mongoskin');
//var mongoskinstore = require('mongoskinstore');
var mongoskinstore = require('./mongoskinstore');
//var mongodb = mongo.db('mongodb://admin:' + process.env['ROLLERBOTPASSWORD'] + '@paulo.mongohq.com:10018/rollerbot_test?auto_reconnect', {safe: true});
var mongodb = mongo.db(process.env['ROLLERBOTDBCONNECT'], {safe: true});
var mongoStore = new mongoskinstore({db: mongodb});

var express = require('express');
var app = express();


var localServers = [];
var localServerMap = {};

















// Websocket //////////////////////////////////////////////

var httpServer = require('http').createServer(app);
var socketIO = require('socket.io').listen(httpServer);
httpServer.listen(httpServerPort);

socketIO.set('log level', 1);

socketIO.sockets.on('connection', function(socket) {
	console.log('socketIO connection');

	var socketHostname;

	socket.on('disconnect', function() {
		//console.log('disconnect host ', socketHostname);
		var filterOutSocket = function(client) { return client.socket.id !== socket.id; };
		// if it was a localhost
		localServers = localServers.filter(function(localServerObject) {
			return localServerObject.socket.id !== socket.id;
		});
		localServerMap[socketHostname] = undefined;

		// if it subscribed to a port
		localServers.forEach(function(localServer) {
			for (var spName in localServer.serialPorts) {
				spInfo = localServer.serialPorts[spName];

				if(spInfo.clients.filter(function(client) { return client.socket.id === socket.id; }).length > 0) {
					spInfo.clients = spInfo.clients.filter(filterOutSocket);

					if(spInfo.clients.length === 0) {
						localServer.socket.emit('unsubscribePort', {portName: spName});
					}
				}
			}
		});
	});

	socket.on('unsubscribePort', function(data, clientCallback) {
		console.log('unsubscribePort');
		var pieces = data.portName.split(':');
		var hostname = pieces[0];
		var portname = pieces[1];

		var localServer = localServerMap[hostname];
		if(!localServer) {
			clientCallback({err: 'bad hostname'});
			return;
		}
		var spInfo = localServer.serialPorts[portname];
		if(spInfo) {
			if(spInfo.clients.filter(function(client) { return client.socket.id === socket.id; }).length > 0) {
				spInfo.clients = spInfo.clients.filter(filterOutSocket);

				if(spInfo.clients.length === 0) {
					localServer.socket.emit('unsubscribePort', {portName: portname});
				}
			}
		}
	});






	socket.on('listPorts', function(data, clientCallback) {
		console.log('web listPorts ');
		var returns = [];
		var numReturned = 0;
		var numToReturn = localServers.length;
		if(localServers.length === 0) {
			clientCallback({});
		} else {
			localServers.forEach(function(localServer, index) {
				//console.log('local server ' + localServer.hostname);
				localServer.socket.emit('listPorts', {}, function(data) {
					//console.log('local server ', localServer, ' listPorts return');
					returns.push(data);
					numReturned += 1;
					if(numReturned === numToReturn) {
						var returnPorts = [];
						returns.forEach(function(data) {
							returnPorts = returnPorts.concat(data.ports.map(function(port) {
								port.portName = data.hostname + ':' + port.portName;
								return port;
							}));
						});
						clientCallback({
							ports: returnPorts,
							hostname: ''
						});
					}
				});
			});
		}
	});

	// todo:
	//  on localServerObject, have list of ports, then each has list of clients
	//    add on subscribe, remove on unsubscript
	//    on send, send othersent
	//    on receiveOnPort, forward to all clients

	socket.on('subscribePort', function(data, clientCallback) {
		console.log('subscribePort', data);
		var pieces = data.portName.split(':');
		var hostname = pieces[0];
		var portname = pieces[1];

		var localServer = localServerMap[hostname];
		if(!localServer) {
			console.log('bad hostname');
			clientCallback({err: 'bad hostname'});
			return;
		} 
		localServer.socket.emit('subscribePort', {portName: portname}, function(spReturnData) {
			if(!spReturnData || !spReturnData.err) {
				var spInfo = localServer.serialPorts[portname];
				if(!spInfo) {
					spInfo = {};
					localServer.serialPorts[portname] = spInfo;
				}
				if (!spInfo.clients) spInfo.clients = [];
				if (spInfo.clients.filter(function(client) { return client.socket.id === socket.id; }).length === 0)
					spInfo.clients.push({socket: socket});
				clientCallback(spReturnData);
			} else {
				clientCallback(spReturnData);
			}
		});
	});



	socket.on('sendOnPort', function(data, clientCallback) {
		var pieces = data.portName.split(':');
		var hostname = pieces[0];
		var portname = pieces[1];

		var localServer = localServerMap[hostname];
		if(!localServer) {
			clientCallback({err: 'bad hostname'});
			return;
		}
		localServer.socket.emit('sendOnPort', {
				portName: portname,
				serialData: data.serialData
			}, function(lData) {
				if(!lData || !lData.err) {
					var spInfo = localServer.serialPorts[portname];
					if(spInfo && spInfo.clients) {
						spInfo.clients.forEach(function(client) {
							if(client.socket !== socket) {
								client.socket.emit('otherSent', {
									portName: data.portName,
									serialData: data.serialData
								});
							}
						});
					}
				}

				clientCallback(lData);
			}
		);
	});





	socket.on('registerLocalServer', function(data) {
		console.log('register local server ', data);
		socketHostname = data.hostname;
		var localServer = {
			hostname: data.hostname,
			socket: socket,
			serialPorts: {} // indexed by port name
		};
		localServers.push(localServer);
		localServerMap[data.hostname] = localServer;	

		localServer.socket.on('receiveOnPort', function(data) {
			// portName, serialData
			var spInfo = localServer.serialPorts[data.portName];
			if(spInfo && spInfo.clients) {
				spInfo.clients.forEach(function(client) {
					client.socket.emit('receiveOnPort', {
						portName: localServer.hostname + ':' + data.portName,
						serialData: data.serialData
					});
				});
			}
		});

		localServer.socket.on('otherSent', function(data) {
			// portName, serialData
			var spInfo = localServer.serialPorts[data.portName];
			if(spInfo && spInfo.clients) {
				spInfo.clients.forEach(function(client) {
					client.socket.emit('otherSent', {
						portName: localServer.hostname + ':' + data.portName,
						serialData: data.serialData
					});
				});
			}
		});
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
		var newID;
		mongodb.collection('settings').findOne({settingsID: 1}, function(err, settings) {
			newID = settings.nextControllerID;
			settings.nextControllerID = newID + 1;
			mongodb.collection('settings').save(settings, {}, function(err, result) {
				console.log('settings save err? ', err, ' result ', result);
				clientCallback({controllerID: newID});
			});
		});
	});

	socket.on('removeController', function(data, clientCallback) {
		mongodb.collection('controllers').remove({controllerID: data.controllerID}, {}, function(err) {
			if(err) clientCallback({err: err});
			else clientCallback({});
		});
	});

	socket.on('fetchController', function(data, clientCallback) {
		//var compiledID = data.compiledID;
		mongodb.collection('controllers').findOne(data, function(err, result) {
			console.log('fetch request err ', err, ' result ', result);
			if(err) clientCallback({err: err});
			else clientCallback({controller: result});
		});
	}); 

	socket.on('fetchControllerList', function(data, clientCallback) {
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

app.get('/screen*', function(req, res, next) {
	console.log('send screen*');
    res.sendfile(__dirname + '/public/client.html');
});

app.use(express.static(__dirname + '/public',  {maxAge: 1}));