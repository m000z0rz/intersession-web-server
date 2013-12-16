(function (toDiv)  {
	screens = [];
	screenMap = {};

	var currentScreen;
	var screensDiv = document.createElement('div');
	toDiv.appendChild(screensDiv);

	function defineScreen(func) {
		screenDef = func();

		var screen = {};
		screen.definition = screenDef;
		screen.name = screen.definition.name;
		screens.push(screen);
		screenMap[screen.name] = screen;


		screen.buildTitleBar = function(title) {
			var titleBar = document.createElement('div');
			titleBar.className = 'titleBar';
			screen.dom.titleBar = titleBar;

			var h1 = document.createElement('h1');
			h1.style.display = 'inline';

			h1.textContent = title;
			titleBar.appendChild(h1);
			screen.dom.titleElement = h1;

			screen.dom.div.appendChild(titleBar);

		};

		screen.buildTitleButton = function(id, title, onClick, startActive) {
			if(startActive === undefined) startActive = true;
			var titleButton = document.createElement('span');
			titleButton.id = id;
			if(startActive === true) titleButton.className = 'titleIconButton';
			else titleButton.className = ' titleIconButtonDeactivated';
			titleButton.textContent = title;

			addPointerListeners(titleButton, ['click', 'touchstart'], onClick);

			screen.dom.titleBar.appendChild(titleButton);

			return titleButton;
		};

		screen.navigateTo = navigateTo;
		screen.dom = {};



	}

	Screens = {};

	Screens.buildDOM = function() {
		screens.forEach(function(screen) {
			var div = document.createElement('div');
			div.className = 'screen';
			if(screen.definition.full === true) div.className += ' full';
			if(screen.definition.menu === true) div.className += ' menu';
			screen.dom.div = div;
			screen.definition.buildDOM(screen, div);
			screensDiv.appendChild(div);
		});
	};


	function switchScreen(toScreen) {
		var domScreen;
		screens.forEach(function(screen) {
			if(screen.name !== toScreen)  {
				domScreen = screen.dom.div;
				if(domScreen) {
					domScreen.style.opacity = 0;
					domScreen.style.display = 'none';
				}
			} else {
				domScreen = screen.dom.div;
				domScreen.style.opacity = 1;
				domScreen.style.display = 'block';
			}
		});

		historyState.screenName = toScreen;

		onResize();
	}

	function navigateTo(screenName, urlOptions, otherOptions, pushState) {
		var screen = screenMap[screenName];

		if(pushState === undefined) pushState = true;

		screen.urlOptions = urlOptions;
		screen.otherOptions = otherOptions;

		if(screen) {
			if(currentScreen && currentScreen.definition.onNavigateFrom) {
				currentScreen.definition.onNavigateFrom(currentScreen);
			}
			if(screen.definition.onNavigateTo) {
				screen.definition.onNavigateTo(screen, urlOptions, otherOptions);
			}
		}


		var url;
		if(screen.makeURL) url = screen.makeURL(urlOptions);
		else if(screen.definition.makeURL) url = screen.definition.makeURL(urlOptions);
		else url = '/' + screenName + '';
		if(pushState) history.pushState(historyState, '', url);
		currentScreen = screen;

		switchScreen(screenName);
	}
	Screens.navigateTo = navigateTo;

	function onResize() {
		screens.forEach(function(screen) {
			if(screen.definition.onResize) {
				screen.definition.onResize(screen);
			}
		});
	}

	Screens.onResize = onResize;


	window.onresize = onResize;

	window.defineScreen = defineScreen;

	window.Screens = Screens;

}) (document.getElementById('screensDiv'));