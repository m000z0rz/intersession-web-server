//var httpServerPort = 80;
//var httpServerPort = 8090;
//var httpServerPort = process.env['ROLLERBOTLISTENPORT'];
var httpServerPort;

if(process.env['NODE_ENV'] === 'production') {
	httpServerPort = 80;
} else if(process.env['NODE_ENV'] === 'dev') {
	httpServerPort = 8090;
}

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

var botQueues = {};


// Array.find polyfill //////////////
if(Array.prototype.find === undefined) {
	Array.prototype.find = function(callback, thisObject) {
		var foundElement;
		thisObject = thisObject || this;
		index = 0;
		while(index < this.length && foundElement === undefined) {
			if(callback(this[index], index, this) === true) {
				foundElement = this[index];
			}
			index += 1;
		}
		return foundElement;
	};
}















// Websocket //////////////////////////////////////////////

var httpServer = require('http').createServer(app);
var socketIO = require('socket.io').listen(httpServer);
httpServer.listen(httpServerPort);

socketIO.set('log level', 1);

socketIO.sockets.on('connection', function(socket) {
	console.log('socketIO connection');

	//var socketHostname;

	socket.on('disconnect', function() {
		//console.log('some kind of disconnect', socket);
		//console.log('disconnect host ', socketHostname);
		var filterToSocket = function(client) { return client.socket.id === socket.id; };
		var filterOutSocket = function(client) { return client.socket.id !== socket.id; };
		var makeSend = function(localServer, spName) {
			return function(toSend) { 
				sendOnPort(localServer, spName, toSend);
			};
		};

		var spInfo, client;

		// if it was a localhost
		var localServer = localServers.find(function(localServer) {
			return localServer.socket.id === socket.id;
		});
		if(localServer) {
			console.log('local server disconnect: ' + localServer.hostname);
			localServers = localServers.filter(function(localServer) {
				return localServer.socket.id !== socket.id;
			});
			localServerMap[localServer.hostname] = undefined;
		} else {
			console.log('non-local-server disconnect');
		}
		/*
		if(socketHostname) {
			console.log('local server disconnect');
			localServers = localServers.filter(function(localServerObject) {
				return localServerObject.socket.id !== socket.id;
			});
			localServerMap[socketHostname] = undefined;
		} else {
			console.log('non-local-server disconnect');
		}
		*/

		// if it subscribed to a port
		flushOnDisconnect(socket);
		localServers.forEach(function(localServer) {
			for (var spName in localServer.serialPorts) {
				spInfo = localServer.serialPorts[spName];
				client = spInfo.clients.find(filterToSocket);
				if(client) {
					console.log('client disconnect');
					spInfo.clients = spInfo.clients.filter(filterOutSocket);

					if(spInfo.clients.length === 0) {
						localServer.socket.emit('unsubscribePort', {portName: spName});
					}					
				}
			}
		});

		// if it was queued bot a bot
		dequeueFromAll(socket);
	});

	socket.on('unsubscribePort', function(data, clientCallback) {
		console.log('unsubscribePort');
		var pieces = data.portName.split(':');
		var hostname = pieces[0];
		var portname = pieces[1];
		var filterOutSocket = function(client) { return client.socket.id !== socket.id; };

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

	function sendOnPort(localServer, portName, serialData, clientCallback) {
		localServer.socket.emit('sendOnPort', {
			portName: portName,
			serialData: serialData
		}, function(lData) {
			if(!lData || !lData.err) {
				var spInfo = localServer.serialPorts[portName];
				if(spInfo && spInfo.clients) {
					spInfo.clients.forEach(function(client) {
						if(client.socket !== socket) {
							client.socket.emit('otherSent', {
								portName: portName,
								serialData: serialData
							});
						}
					});
				}
			}

			if(clientCallback) clientCallback(lData);
		});
	}

	socket.on('sendOnPort', function(data, clientCallback) {
		var pieces = data.portName.split(':');
		var hostname = pieces[0];
		var portname = pieces[1];

		var localServer = localServerMap[hostname];
		if(!localServer) {
			clientCallback({err: 'bad hostname'});
			return;
		}
		sendOnPort(localServer, portname, data.serialData, clientCallback);
		/*
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
		*/
	});

	// send and clear all of the sendOnDisconnect messages for a socket
	// this can happen on an actual disconnect or when request by a socket flushOnDisconnect
	function flushOnDisconnect(forSocket) {
		//console.log('disconnect host ', socketHostname);
		var filterToSocket = function(client) { return client.socket.id === forSocket.id; };
		//var filterOutSocket = function(client) { return client.socket.id !== socket.id; };
		var makeSend = function(localServer, spName) {
			return function(toSend) { 
				sendOnPort(localServer, spName, toSend);
			};
		};
		var spInfo, client;

		// if it subscribed to a port
		localServers.forEach(function(localServer) {
			for (var spName in localServer.serialPorts) {
				spInfo = localServer.serialPorts[spName];

				client = spInfo.clients.find(filterToSocket);
				if(client) {
					if(client.sendOnDisconnect) {
						console.log('flushing disconnect, sending ' + client.sendOnDisconnect);
						client.sendOnDisconnect.forEach( makeSend(localServer, spName) );
					}
					client.sendOnDisconnect = [];
				}
			}
		});
	}

	socket.on('flushOnDisconnect', function(data, clientCallback) {
		flushOnDisconnect(socket);
		if (clientCallback && typeof clientCallback === 'function') clientCallback();
	});

	socket.on('sendOnDisconnect', function(data, clientCallback) {
		console.log('sendOnDisconnect', data);
		var pieces = data.portName.split(':');
		var hostname = pieces[0];
		var portname = pieces[1];

		var localServer = localServerMap[hostname];
		if(!localServer) {
			clientCallback({err: 'bad hostname'});
			return;
		}
		var spInfo = localServer.serialPorts[portname];
		if(spInfo && spInfo.clients) {
			spInfo.clients.forEach(function(client) {
				if(client.socket === socket) {
					if(client.sendOnDisconnect === undefined) client.sendOnDisconnect = [];
					client.sendOnDisconnect.push(data.serialData);
				}
			});
			clientCallback();
		} else {
			clientCallback({err: 'bad portname'});
		}
	});





	socket.on('registerLocalServer', function(data) {
		console.log('register local server ', data);
		//socketHostname = data.hostname;
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




























	function getQueuePosition(socket, botID) {
		var atIndex;
		var queue = botQueues[botID];

		queue.forEach(function(queueItem, queueIndex) {
			if(queueItem.socket === socket) {
				atIndex = queueIndex;
			}
		});

		return atIndex;
	}

	function dequeueFromBot(socket, botID) {
		var queue = botQueues[botID];
		var atIndex = getQueuePosition(socket, botID);

		if(atIndex !== undefined) {
			console.log('pre q: ', queue);
			console.log('dequeueing ' + socket.id + ' from ' + botID + ' at index ' + atIndex);
			queue.splice(atIndex, 1);
			console.log('post q: ', queue);
			queue.forEach(function(queueItem, queueIndex) {
				if(queueIndex >= atIndex) {
					console.log('queue update on index ' + queueIndex);
					queueItem.socket.emit('queueUpdate', {
						botID: botID,
						queuePosition: queueIndex
					});
				}
			});
		}
	}

	function dequeueFromAll(socket) {
		var queue;

		console.log('dequeue ' + socket.id + ' from all');

		Object.keys(botQueues).forEach(function(botID) {
			dequeueFromBot(socket, botID);

			/*
			queue = botQueues[botID];
			queue = queue.filter(function(queueItem) {
				return queueItem.socket !== socket;
			});
			*/
		});
	}

	socket.on('queueForBot', function(data, clientCallback) {
		var botID = data.botID;
		var queue;

		if(!botQueues[botID]) {
			botQueues[botID] = [];
		}

		var atIndex = getQueuePosition(socket, botID);

		if(atIndex === undefined) { // not queued, add this socket
			queue = botQueues[botID];
			queue.push({socket: socket});
			if(clientCallback) clientCallback({queuePosition: queue.length-1});
		} else { // already queued, return position
			if(clientCallback) clientCallback({queuePosition: atIndex});
		}
	});

	socket.on('dequeueFromBot', function(data, clientCallback) {
		var botID = data.botID;
		dequeueFromBot(socket, botID);
		if(clientCallback) clientCallback();
	});






























	socket.on('saveBot', function(data, clientCallback) {
		var bot = data.bot;
		console.log('saving bot ', data);

		// unfudge the serial port for default controller
		/*
		if(bot.defaultPort && bot.defaultPort.indexOf(':')) {
			bot.defaultPort = bot.defaultPort.split(':')[1];
			console.log('unfudged defaultPort to ' + bot.defaultPort);
		}
		*/

		mongodb.collection('bots').update(
			{ botID: bot.botID },
			{ $set: bot },
			{ upsert: true },
			function (err, object) {
				console.log('bot save request err ', err, ' object ', object);
				if(err) clientCallback({err: err});
				else clientCallback({});
			}
		);
	});

	socket.on('fetchBot', function(data, clientCallback) {
		mongodb.collection('bots').findOne(data, function(err, result) {
			console.log('fetch bot request err ', err, ' result ', result);
			/*
			console.log('fetch request err ', err, ' result ', result);
			if(err) clientCallback({err: err});
			else clientCallback({controller: result});
			*/
			if(result) {
				clientCallback({bot: result});
			} else if(data.botID) {
				clientCallback({bot: {botID: data.botID}});
			} else {
				clientCallback({bot: {}});
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

	/*
	socket.on('getBotInfo', function(data, clientCallback) {
		//console.log('fetch request for bot "', data.botID, '"');
		
		//mongodb.collection('bots').find().toArray(function(err, results) {
		//	console.log('bot request results ', results);
		//});
		//return;
		
		mongodb.collection('bots').findOne({botID: +data.botID}, function(err, result) {
			//console.log('fetch request for bot err ', err, ' result ', result);
			if(err) clientCallback({err: err});
			else clientCallback({botInfo: result});
		});
	});
	*/
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

app.get('/bot/*', function(req, res, next) {
	console.log('send bot queue page');
	res.sendfile(__dirname + '/public/client.html');
});


app.get('/client.html', function(req, res, next) {
	console.log('send client direct');
	res.sendfile(__dirname + '/public/client.html');
});


app.use(express.static(__dirname + '/public',  {maxAge: 1}));