defineScreen(function (screen) {
	return {
		name: 'bot',
		full: true,
		onResize: function(screen) {
			var svg = screen.dom.svg;
			var titleBar = screen.dom.titleBar;
			svg.style.height = window.innerHeight - titleBar.offsetHeight;
		},
		buildDOM: function (screen, div) {
			screen.buildTitleBar('Queue');

			var svg = createSVGElement('svg');
			screen.dom.svg = svg;
			svg.id = 'bot_svg';
			svgAttr(svg, 'viewBox', '0 0 2000 1000');
			div.appendChild(svg);
			svg.style.display = 'none';

			screen.queueUpdateListener = function(data) {
				console.log('queue update listener ', data);
				var queuePosition = data.queuePosition + 1; // from 0 index to 1 index
				if(queuePosition === 1) {
					svg.style.display = '';
					screen.dom.titleElement.textContent = 'Controlling ' + screen.bot.name();
				} else {
					screen.dom.titleElement.textContent = 'Behind ' + (queuePosition -1) + ' others in line';
				}
			};
		},
		makeURL: function(urlOptions) {
			var url = '/bot/' + urlOptions.botID;
			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			var svg = screen.dom.svg;
			svg.style.display = 'none';

			if(!webSocket || !webSocket.socket.connected) return;

			Bot.fetchByID(urlOptions.botID, function(bot) {
				console.log('bot fetched ', bot);
				screen.bot = bot;
				if(!(bot.defaultControllerID() && bot.defaultPort())) {
					screen.dom.titleElement.textContent = 'Bot ' + urlOptions.botID + ' isn\' setup';
				} else {
					Controller.fetchByID(+bot.defaultControllerID(), function(controller) {
						console.log('controller fetched ', controller);
						screen.controller = controller;

						Bluetooth.openPort(bot.defaultPort(), function(data) {
							console.log('port opened, build control interface for ' + bot.defaultPort());
							screen.controlInterface = new ControlInterface(bot.defaultPort());

							//var controlSVG = screen.dom.svg;
							clearSVG(svg);
							screen.controller.controls.forEach(putControl);

							webSocket.on('queueUpdate', screen.queueUpdateListener);
							webSocket.emit('queueForBot', {botID: urlOptions.botID}, screen.queueUpdateListener);
						});
					});
				}
			});

			function putControl(control) {
				//var svg = screen.dom.svg;
				var g = control.buildForControl(svg, screen.controlInterface);
				svg.appendChild(g);
			}
		},
		onNavigateFrom: function(screen) {

			if(screen.controlInterface) screen.controlInterface.clearEvents();

			if(webSocket && webSocket.socket.connected) {
				webSocket.removeListener('queueUpdate', screen.queueUpdateListener);
			}
		}
	};
});