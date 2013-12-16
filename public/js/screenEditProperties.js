// screenPortSelect
defineScreen(function (screen) {
	return {
		name: 'screenEditProperties',
		full: true,
		menu: true,
		onResize: function(screen) {

		},
		buildDOM: function (screen, div) {
			var header = document.createElement('h1');
			header.id = 'screenEditProperties_header';
			header.textContent = 'Properties';
			screen.dom.header = header;
			div.appendChild(header);

			var propertiesDiv = document.createElement('div');
			propertiesDiv.id = 'screenEditProperties_div';
			screen.dom.propertiesDiv = propertiesDiv;
			div.appendChild(propertiesDiv);
		},
		makeURL: function(urlOptions) {
			var url = '/screenEditProperties';
			var pieces = ['botID', 'port', 'controllerID'];
			pieces.forEach(function(piece) {
				url += '/' + piece + '/' + urlOptions[piece];
			});

			return url;
		},
		onNavigateTo: function(screen, urlOptions, otherOptions) {
			if(!otherOptions || !otherOptions.control) {
				// looks like we're coming here fresh, not from an edit screen, maybe a
				// pasted url
				// redirect
				window.location = '/';
			}

			var control = otherOptions.control;
			var def = control.controlDefinition;
			screen.dom.header.textContent = def.displayName + ' Properties';
			var propertiesDiv = screen.dom.propertiesDiv;
			var documentFragment = document.createDocumentFragment();
			clearChildren(propertiesDiv);
			def.forEachProperty(function(property, propName) {
				var h2 = document.createElement('h2');
				h2.style.display = 'inline';
				h2.textContent = property.displayName + ': ';
				documentFragment.appendChild(h2);

				if(property.type === 'select') {
					var select = document.createElement('select');
					documentFragment.appendChild(select);
					var option;
					var propVal = control.getPropertyValue(propName);
					property.values.forEach(function(value) {
						option = document.createElement('option');
						option.textContent = value;
						if(value === propVal) {
							option.selected = true;
						}
						select.appendChild(option);
					});
					select.addEventListener('change', function(e) {
						control.setPropertyValue(propName, select.value);
					}, false);
				} else {
					var input = document.createElement('input');
					documentFragment.appendChild(input);
					input.value = control.getPropertyValue(propName) || '';
					input.addEventListener('change', function(e) {
						control.setPropertyValue(propName, input.value);
					}, false);
				}



				documentFragment.appendChild(document.createElement('br'));
			});

			propertiesDiv.appendChild(documentFragment);
		},
		onNavigateFrom: function(screen) {

		}
	};
});