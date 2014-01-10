defineScreen(function (screen) {
	return {
		name: 'screenBotSelect',
		full: true,
		menu: true,
		onResize: function(screen) {

		},
		buildDOM: function (screen, div) {
			screen.buildTitleBar('Select Bot ID');
		
			var h2 = document.createElement('h2');
			h2.textContent = "Bot ID: ";
			h2.style.display = 'inline';
			div.appendChild(h2);


			var input = document.createElement('input');
			if(screen.botID !== undefined) input.value = screen.botID;
			div.appendChild(input);
			screen.dom.input = input;

			var continueButton = document.createElement('button');
			continueButton.textContent = 'Continue';
			div.appendChild(continueButton);

			continueButton.addEventListener('click', function(e) {
				var botID = input.value;
				localStorage['defaultBotID'] = botID;
				//historyState.botID = botID;
				screen.navigateTo('screenControlPanel', {botID: botID, port: screen.urlOptions.port});
			}, false);
			/*
			addPointerListeners(continueButton, ['click, touchstart'], function(e) {
				console.log('meow');
				var botID = input.value;
				historyState.botID = botID;
				screen.navigateTo('screenControlPanel', {});
			});
			*/
		
		},
		makeURL: function(urlOptions) {
			var url = '/screenBotSelect';
			/*
			var pieces = ['botID', 'port', 'controllerID'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});*/

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			if(otherOptions && otherOptions.botID !== undefined) screen.dom.input.value = otherOptions.botID;
		},
		onNavigateFrom: function(screen) {

		}
	};
});