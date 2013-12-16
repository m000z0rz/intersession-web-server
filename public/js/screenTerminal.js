// screen terminal
defineScreen(function (screen) {
	return {
		name: 'screenTerminal',
		full: true,
		menu: true,
		onResize: function(screen) {
			var terminal = screen.dom.terminal;
			var footer = screen.dom.footer;
			var terminalHeader = screen.dom.titleBar;
			terminal.style.height = window.innerHeight - footer.offsetHeight - terminalHeader.offsetHeight - 20;
		},
		buildDOM: function (screen, div) {
			div.style.padding = '0px;';


			screen.buildTitleBar('Terminal');
			screen.dom.gotoEdit = screen.buildTitleButton(
				'screenTerminal_gotoEdit', 'Edit',
				function() {
					screen.navigateTo('screenEdit', screen.urlOptions);
				}
			);

			screen.dom.gotoControl = screen.buildTitleButton(
				'screenTerminal_gotoControl', 'Control',
				function() {
					screen.navigateTo('screenControl', screen.urlOptions);
				}
			);

			var terminal = document.createElement('div');
			terminal.id = 'screenTerminal_terminal';
			terminal.className = 'terminal';
			screen.dom.terminal = terminal;
			div.appendChild(terminal);

			var footer = document.createElement('div');
			footer.id = 'screenTerminal_footer';
			footer.innerHTML = "<input id='screenTerminal_input' type='text' style='border: 1px solid #333333; width: 80%;' /> <button id='screenTerminal_send'>Send</button>    <br/>    <label for='screenTerminal_autoscroll'>Autoscroll</label><input type='checkbox' id='screenTerminal_autoscroll' checked />    <span style='padding-left: 40px;'>    <label for='screenTerminal_lineEnding'>Send newline (\\n) on each send</label>    <select id='screenTerminal_lineEnding'>    <option value='no' default>No</option>    <option value='yes'>Yes</option>    </select>";
			screen.dom.footer = footer;
			div.appendChild(footer);





			var terminalSendButton = footer.querySelector('#screenTerminal_send');
			var terminalInput = footer.querySelector('#screenTerminal_input');
			var terminalHistory = [];
			var terminalHistoryIndex = 0;
			var terminalHistoryMaxItems = 20;
			var thisFromTerminal = false;



			var terminalSend = function() {
				var toSend = terminalInput.value;

				terminalHistory.push(toSend);
				toSend = unescapeForSerial(toSend);

				if(footer.querySelector('#screenTerminal_lineEnding').value === 'yes')
					toSend += '\n';

				console.log('terminal send ', toSend);

				thisFromTerminal = true;
				Bluetooth.sendOnPort(screen.urlOptions.port, toSend);
				thisFromTerminal = false;

				if(terminalHistory.length > terminalHistoryMaxItems) terminalHistory = terminalHistory.slice(terminalHistory.length - terminalHistoryMaxItems, terminalHistoryMaxItems);
				terminalHistoryIndex = terminalHistory.length;

				terminalInput.value = '';
				terminalInput.focus();
			};

			terminalSendButton.addEventListener('click', terminalSend, false);

			terminalInput.addEventListener('keypress', function(e) {
				if(e.keyCode === 13) {
					terminalSend();
				} else {
					terminalHistoryIndex = terminalHistory.length;
				}
			}, false);

			// can't catch up arrow in keypress
			terminalInput.addEventListener('keydown', function(e) {
				if(e.keyCode === 38) { // up arrow
					terminalHistoryIndex -= 1;
					if(terminalHistoryIndex < 0) terminalHistoryIndex = 0;
					if(terminalHistory[terminalHistoryIndex]) terminalInput.value = terminalHistory[terminalHistoryIndex];
				} else if(e.keyCode === 40) { // down arrow
					terminalHistoryIndex += 1;
					if(terminalHistoryIndex > terminalHistory.length) terminalHistoryIndex = terminalHistory.length;
					if(terminalHistory[terminalHistoryIndex]) terminalInput.value = terminalHistory[terminalHistoryIndex];
					else terminalInput.value = '';
				}
			});


			var lastTerminalElement;
			var lastTerminalSource;

			var targetTerminalElement;
			var makeTerminalOnData = function(source) {
				return function(data) {
					if(data.portName === screen.urlOptions.port) {
						terminalAddData(source, data.serialData);
					}
				};
			};

			var terminalAddData = function(source, string) {
				if(source === 'this' && thisFromTerminal) source = 'terminal';
				if(lastTerminalSource === source) {
					targetTerminalElement = lastTerminalElement;
				} else {
					targetTerminalElement = document.createElement('span');
					if(source === 'rx') targetTerminalElement.style.color = 'olivedrab';
					if(source === 'other') targetTerminalElement.style.color = 'navy';
					if(source === 'this') targetTerminalElement.style.color = 'indianred';
					if(source === 'terminal') targetTerminalElement.style.color = 'firebrick';
					lastTerminalSource = source;
					lastTerminalElement = targetTerminalElement;
					terminal.appendChild(targetTerminalElement);
				}

				var lines = string.split('\n');
				lines.forEach(function(line, index) {
					targetTerminalElement.appendChild(document.createTextNode(line));
					if(index !== lines.length-1) {
						targetTerminalElement.appendChild(document.createElement('br'));
					}
				});
				var autoscroll = footer.querySelector('#screenTerminal_autoscroll').checked;
				if(autoscroll) terminal.scrollTop = terminal.scrollHeight;
			};


			Bluetooth.on('receiveOnPort', makeTerminalOnData('rx'));
			Bluetooth.on('otherSent', makeTerminalOnData('other'));
			Bluetooth.on('thisSent', makeTerminalOnData('this'));
		},
		makeURL: function(urlOptions) {
			var url = '/screenTerminal';
			var pieces = ['botID', 'port', 'controllerID'];
			pieces.forEach(function(piece) {
				if(urlOptions[piece]) url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			// options: comPort
			// state: 

			if(urlOptions.controllerID === undefined) {
				screen.dom.gotoEdit.style.display = 'none';
				screen.dom.gotoControl.style.display = 'none';
			} else {
				screen.dom.gotoEdit.style.display = 'inline';
				screen.dom.gotoControl.style.display = 'inline';
			}

			Bluetooth.openPort(urlOptions.port, function(data) {
				screen.dom.titleElement.textContent = 'Terminal on ' + urlOptions.port;

				var terminalInput = screen.dom.footer.querySelector('#screenTerminal_input');
				terminalInput.focus();
			});

		},
		onNavigateFrom: function(screen) {
			//if(screen.controlInterface) screen.controlInterface.clearEvents();
		}
	};
});