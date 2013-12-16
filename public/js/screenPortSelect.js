defineScreen(function (screen) {
	return {
		name: 'screenPortSelect',
		full: true,
		menu: true,
		onResize: function(screen) {

		},
		buildDOM: function (screen, div) {
			var header = document.createElement('div');

			var h1 = document.createElement('h1');
			h1.textContent = 'Select Port';

			var hostname = document.createElement('span');
			screen.dom.hostname = hostname;

			h1.appendChild(hostname);
			header.appendChild(h1);
			div.appendChild(header);

			var portList = document.createElement('ul');
			screen.dom.portList = portList;
			div.appendChild(portList);
		},
		makeURL: function(urlOptions) {
			var url = '/screenPortSelect';
			var pieces = ['botID'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			Bluetooth.listPorts(function(data) {
				var ports = data.ports;

				var domHostname = screen.dom.hostname;
				var domList = screen.dom.portList;
				domHostname.textContent = " on " + data.hostname;

				clearChildren(domList);

				var fragment = document.createDocumentFragment();
				ports.forEach(function(port, index) {
					var li = getPortListElement(port);
					if(index % 2) li.className += " even";
					else li.className += " odd";
					fragment.appendChild(li);
				});

				domList.appendChild(fragment);
			});

			function getPortListElement(port) {
				var li = document.createElement('li');
				li.className = 'clickable';
				var h2 = document.createElement('h2');
				h2.textContent = port.portName;
				var small = document.createElement('small');
				small.textContent = port.manufacturer || '';
				//port.isOpen
				small.className = 'sub';
				li.appendChild(h2);
				li.appendChild(small);
				li.addEventListener('click', function(e) {
					if(otherOptions && otherOptions.port && otherOptions.port !== port.portName) Bluetooth.closePort(otherOptions.port);
					screen.navigateTo('screenControlPanel', {
						botID: urlOptions.botID,
						port: port.portName
					});
				});
				return li;
			}

		},
		onNavigateFrom: function(screen) {

		}
	};
});