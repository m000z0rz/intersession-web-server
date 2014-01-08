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

			var i, portItems, portItem;

			var hostFilter = document.createElement('select');
			screen.dom.hostFilter = hostFilter;
			div.appendChild(hostFilter);

			hostFilter.addEventListener('change', function(e) {
				//console.log('change event', hostFilter.value);
				var portItems = screen.dom.portList.querySelectorAll('li');
				if(hostFilter.value === 'Show ports on all hosts') {
					for(i = 0; i < portItems.length; i++) {
						portItem = portItems[i];
						portItem.style.display = '';
					}
				} else {
					var filterOnHostname = hostFilter.value;
					for(i = 0; i < portItems.length; i++) {
						portItem = portItems[i];
						portItem.style.display = 'none';
					}
					//console.log('stuff');
					//console.log(filterOnHostname);
					//console.log(screen.hostMap);
					screen.hostMap[filterOnHostname].forEach(function(portItem) {
						//console.log('loop on portItem ', portItem);
						portItem.style.display = '';
					});
				}
			}, false);

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
			var hostMap = {};

			screen.hostMap = hostMap;
			screen.dom.hostFilter.style.display = 'none';
			clearChildren(screen.dom.hostFilter);
			var option = document.createElement('option');
			option.textContent = 'Show ports on all hosts';
			option.selected = 'selected';
			screen.dom.hostFilter.appendChild(option);

			Bluetooth.listPorts(function(data) {
				var ports = data.ports;

				var domHostname = screen.dom.hostname;
				var domList = screen.dom.portList;
				
				if(data.hostname) domHostname.textContent = " on " + data.hostname;
				else domHostname.textContent = '';

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
				var portName = port.portName;
				var comPort, hostname, pieces;
				var option;

				var li = document.createElement('li');

				if(portName.indexOf(':') !== -1) {
					pieces = portName.split(':');
					hostname = pieces[0];
					comPort = pieces[1];

					if(!hostMap[hostname]) {
						hostMap[hostname] = [];
						option = document.createElement('option');
						option.textContent = hostname;
						screen.dom.hostFilter.appendChild(option);
					}
					hostMap[hostname].push(li);

					screen.dom.hostFilter.style.display = '';
				}
				
				li.className = 'clickable';
				var h2 = document.createElement('h2');
				h2.textContent = portName;
				var small = document.createElement('small');
				small.textContent = port.manufacturer || '';
				//port.isOpen
				small.className = 'sub';
				li.appendChild(h2);
				li.appendChild(small);
				li.addEventListener('click', function(e) {
					if(otherOptions && otherOptions.port && otherOptions.port !== port.portName) Bluetooth.closePort(otherOptions.port);
					localStorage['defaultPort'] = port.portName;
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