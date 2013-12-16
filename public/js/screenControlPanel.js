defineScreen(function (screen) {
	return {
		name: 'screenControlPanel',
		full: true,
		menu: true,
		onResize: function(screen) {
		},
		buildDOM: function (screen, div) {
			screen.buildTitleBar('Controller Select');

			screen.dom.portButton = screen.buildTitleButton('', 'Port', function() {
				screen.navigateTo('screenPortSelect', {botID: screen.urlOptions.botID}, {port: screen.urlOptions.port});
			});

			screen.dom.botButton = screen.buildTitleButton('', 'Bot', function() {
				screen.navigateTo('screenBotEdit', {botID: screen.urlOptions.botID});
			});

			var controllerList = document.createElement('ul');
			div.appendChild(controllerList);
			screen.dom.controllerList = controllerList;




			var h2;

			var addNewControl = document.createElement('div');
			h2 = document.createElement('h2');
			h2.textContent = "+ New Control";
			addNewControl.appendChild(h2);
			addNewControl.className = 'button';
			div.appendChild(addNewControl);
			addPointerListeners(addNewControl, ['click', 'touchstart'], function(e) {
				console.log('new controller button listener');
				if(webSocket.socket.connected) {
					webSocket.emit('newController', {}, function(data) {
						console.log('new controller');
						var newController = new Controller(data.controllerID, screen.urlOptions.botID);
						newController.save(function() {
							console.log('saved new, using id ' + newController.controllerID);
							screen.navigateTo('screenEdit', {
								botID: screen.urlOptions.botID,
								port: screen.urlOptions.port,
								controllerID: newController.controllerID
							});
						});
					});
				} else {
					console.log('else something');
				}
			});

			var gotoTerminal = document.createElement('div');
			h2 = document.createElement('h2');
			h2.textContent = "Terminal";
			gotoTerminal.appendChild(h2);
			gotoTerminal.className = 'button';
			div.appendChild(gotoTerminal);
			addPointerListeners(gotoTerminal, ['click', 'touchstart'], function() {
				if(screen.urlOptions.port === undefined || screen.urlOptions.port === '') {
					alert('No serial port selected');
				} else {
					screen.navigateTo('screenTerminal', {
						botID: screen.urlOptions.botID,
						port: screen.urlOptions.port,
					});
				}
			});
		},
		makeURL: function(urlOptions) {
			var url = '/screenControlPanel';
			var pieces = ['botID', 'port'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			var domList = screen.dom.controllerList;
			clearChildren(domList);


			Controller.getControllerList(urlOptions.botID, function(list) {
				var fragment = document.createDocumentFragment();

				list.forEach(function(controller, index) {
					var li = getControllerListElement(controller);
					if(index % 2) li.className += ' even';
					else li.className += ' odd';
					fragment.appendChild(li);
				});

				domList.appendChild(fragment);

			}); 

			if(webSocket.socket.connected) {
				screen.dom.botButton.textContent = 'Bot: ';
				
				webSocket.emit('getBotInfo', {botID: urlOptions.botID}, function(data) {
					var botInfo = data.botInfo;
					state.botInfo = botInfo;
					screen.dom.botButton.textContent = 'Bot: ' + botInfo.botID;
				});
			} else {
				screen.dom.botButton.textContent = 'Bot: ' + urlOptions.botID;
			}

			if(urlOptions.port) {
				screen.dom.portButton.textContent = 'Port: ' + urlOptions.port + '*';
				Bluetooth.openPort(urlOptions.port, function(data) {
					screen.dom.portButton.textContent = 'Port: ' + urlOptions.port;
					// port now open
				});
			} else {
				screen.dom.portButton.textContent = 'Port: (none)';
			}





			function getControllerListElement(controller) {
				var li = document.createElement('li');
				li.className = 'clickable';
				var h2 = document.createElement('h2');
				h2.style.display = 'inline';
				var displayName = controller.name() ||  '(' + controller.controllerID + ')';
				h2.textContent = displayName;
				li.appendChild(h2);

				var imgDelete = document.createElement('img');
				imgDelete.src = '/icons/delete.png';
				imgDelete.style.float = 'right';
				li.appendChild(imgDelete);

				var imgEdit = document.createElement('img');
				imgEdit.src = '/icons/edit.png';
				imgEdit.style.float = 'right';
				li.appendChild(imgEdit);




				addPointerListeners(li, ['click', 'touchstart'], function(e) {
					if(screen.urlOptions.port === undefined || screen.urlOptions.port === '') {
						alert('No serial port selected');
					} else {
						screen.navigateTo('screenControl', {
							botID: urlOptions.botID,
							port: urlOptions.port,
							controllerID: controller.controllerID
						});
					}
				});

				addPointerListeners(imgEdit, ['click', 'touchstart'], function(e) {
					console.log('edit click');
					screen.navigateTo('screenEdit', {
						botID: urlOptions.botID,
						port: urlOptions.port,
						controllerID: controller.controllerID
					});
					e.stopPropagation();
				});

				addPointerListeners(imgDelete, ['click', 'touchstart'], function(e) {
					if(confirm('Are you sure you want to delete controller ' + controller.controllerID + '-' + controller.name() + '?') === true) {
						controller.remove(function() {
							screen.navigateTo('screenControlPanel', urlOptions, otherOptions, false);
						});
					}


					e.stopPropagation();
					
				});

				return li;
			}
		},
		onNavigateFrom: function(screen) {

		}
	};
});