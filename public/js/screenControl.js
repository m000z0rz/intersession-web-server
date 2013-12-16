// screen control
defineScreen(function () {
	return {
		name: 'screenControl',
		full: true,
		onResize: function(screen) {
			var svg = screen.dom.svg;
			var titleBar = screen.dom.titleBar;
			svg.style.height = window.innerHeight - titleBar.offsetHeight;
		},
		buildDOM: function (screen, div) {
			screen.buildTitleBar('Control');
			screen.buildTitleButton(
				'screenControl_gotoEdit', 'Edit',
				function() {
					screen.navigateTo('screenEdit', screen.urlOptions);
				}
			);

			screen.buildTitleButton(
				'screenEdit_gotoTerminal', 'Terminal',
				function() {
					screen.navigateTo('screenTerminal', screen.urlOptions);
				}
			);

			var svg = createSVGElement('svg');
			screen.dom.svg = svg;
			svg.id = 'screenControl_svg';
			//svgAttr(svg, 'xmlns', 'http://www.w3.org/2000/svg');
			//svgAttr(svg, 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
			svgAttr(svg, 'viewBox', '0 0 2000 1000');
			div.appendChild(svg);


		},
		makeURL: function(urlOptions) {
			var url = '/screenControl';
			var pieces = ['botID', 'port', 'controllerID'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			Controller.fetchByID(urlOptions.controllerID, function(controller) {
				if(!controller) {
					console.log('couldnt fetch controller');
				} else {
					screen.controller = controller;
				}
				
				Bluetooth.openPort(urlOptions.port, function(data) {
					theRest();
				});
			});



			function theRest() {
				screen.controlInterface = new ControlInterface(urlOptions.comPort);

				var controlSVG = screen.dom.svg;
				clearSVG(controlSVG);

				screen.controller.controls.forEach(putControl);

			}


			function putControl(control) {
				var svg = screen.dom.svg;
				var g = control.buildForControl(screen.controlInterface);
				svg.appendChild(g);
			}
		},
		onNavigateFrom: function(screen) {
			if(screen.controlInterface) screen.controlInterface.clearEvents();
		}
	};
});