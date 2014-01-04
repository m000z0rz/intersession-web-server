// screen edit
defineScreen(function (screen) {
	return {
		name: 'screenEditBot',
		full: true,
		menu: true,
		onResize: function(screen) {
			//var svg = screen.dom.svg;
			//var titleBar = screen.dom.titleBar;
			//svg.style.height = window.innerHeight - titleBar.offsetHeight;
		},
		buildDOM: function (screen, div) {
			screen.buildTitleBar('Edit Bot');

			screen.dom.botButton = screen.buildTitleButton('', 'Change Bot', function() {
				//screen.navigateTo('screenBotSelect', {botID: screen.urlOptions.botID});
				screen.navigateTo('screenBotSelect', screen.urlOptions);
			});

			var nameEdit = document.createElement('input');
			screen.dom.nameEdit = nameEdit;
			var disableNameSave = false;
			screen.setNameWithoutSave = function(newName) {
				disableNameSave = true;
				nameEdit.value = newName;
				disableNameSave = false;
			};
			var saveTimeoutID;
			var saveTimeoutDelay = 300;
			screen.dom.nameEdit.addEventListener('change', function(e) {
				if(!disableNameSave) {
					if(saveTimeoutID) window.clearTimeout(saveTimeoutID);
					saveTimeoutID = window.setTimeout(function () {
						screen.bot.name(nameEdit.value);
					}, saveTimeoutDelay);
				}
			});

			var creatorEdit = document.createElement('input');
			screen.dom.creatorEdit = creatorEdit;
			var disableCreatorSave = false;
			screen.setCreatorWithoutSave = function(newCreator) {
				disableCreatorSave = true;
				creatorEdit.value = newCreator;
				disableCreatorSave = false;
			};
			var creatorSaveTimeoutID;
			var creatorSaveTimeoutDelay = 300;
			screen.dom.creatorEdit.addEventListener('change', function(e) {
				if(!disableCreatorSave) {
					if(creatorSaveTimeoutID) window.clearTimeout(creatorSaveTimeoutID);
					creatorSaveTimeoutID = window.setTimeout(function () {
						screen.bot.creator(creatorEdit.value);
					}, creatorSaveTimeoutDelay);
				}
			});

			var optionsList = document.createElement('ul');
			optionsList.style.clear = 'both';
			div.appendChild(optionsList);
			screen.dom.optionsList = optionsList;

			var fragment = document.createDocumentFragment(); 
			var index = 0;
			var li, h2;


			li = document.createElement('li');
			//li.className = 'clickable';
			h2 = document.createElement('h2');
			//h2.style.display = 'inline';
			//var displayName = controller.name() ||  '(' + controller.controllerID + ')';
			h2.textContent = 'Name: ';
			li.appendChild(h2);
			li.appendChild(nameEdit);
			index++;
			if(index % 2) li.className += ' even';
			else li.className += ' odd';
			fragment.appendChild(li);

			li = document.createElement('li');
			h2 = document.createElement('h2');
			h2.textContent = 'Created by: ';
			li.appendChild(h2);
			li.appendChild(creatorEdit);
			index++;
			if(index % 2) li.className += ' even';
			else li.className += ' odd';
			fragment.appendChild(li);

			li = document.createElement('li');
			h2 = document.createElement('h2');
			h2.textContent = 'Default controller: ';
			screen.dom.defaultController = h2;
			li.appendChild(h2);
			index++;
			if(index % 2) li.className += ' even';
			else li.className += ' odd';
			fragment.appendChild(li);

			li = document.createElement('li');
			h2 = document.createElement('h2');
			h2.textContent = 'Default port: ';
			screen.dom.defaultPort = h2;
			li.appendChild(h2);
			index++;
			if(index % 2) li.className += ' even';
			else li.className += ' odd';
			fragment.appendChild(li);

			optionsList.appendChild(fragment);


		},
		makeURL: function(urlOptions) {
			var url = '/screenEditBot';
			var pieces = ['botID', 'port', 'controllerID'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			if(!webSocket || !webSocket.socket.connected) return;

			screen.dom.titleElement.textContent = 'Edit Bot ' + urlOptions.botID;

			Bot.fetchByID(urlOptions.botID, function(bot) {
				//console.log('bot fetched ', bot);
				screen.bot = bot;
				//screen.titleElement.textContent = 'Edit Bot ' + urlOptions.botID + ' - ' + bot.name();
				screen.setNameWithoutSave(bot.name());
				screen.setCreatorWithoutSave(bot.creator());
				screen.dom.defaultController.textContent = 'Default Controller: ' + bot.defaultControllerID();
				screen.dom.defaultPort.textContent = 'Default Port: ' + bot.defaultPort();

				if(!(bot.defaultControllerID() && bot.defaultPort())) {
					//screen.dom.titleElement.textContent = 'Bot ' + urlOptions.botID + ' isn\'t setup';
				} else {
					Controller.fetchByID(+bot.defaultControllerID(), function(controller) {
						screen.controller = controller;
						screen.dom.defaultController.textContent = 'Default Controller: ' + controller.name() + ' (' + controller.controllerID + ')';
					});
				}
			});
		},
		onNavigateFrom: function(screen) {
			shortcut.remove('Delete');
		}
	};
});