var controlDefinitions = [];
var controlDefinitionByTypeID = {};

function defineControl(definitionFunction) {
	var controlDefinition = definitionFunction();

	controlDefinition.forEachProperty = function(func) {
		for(var propName in controlDefinition.properties) {
			func(controlDefinition.properties[propName], propName);
		}
	};

	controlDefinitions.push(controlDefinition);
	controlDefinitionByTypeID[controlDefinition.typeID] = controlDefinition;
}

function getControlDefinitionByTypeID(typeID) {
	return controlDefinitionByTypeID[typeID];
}

var svgns = 'http://www.w3.org/2000/svg';
function createSVGElement(tagName) {
	//console.log('create svg, svgns=' + svgns);
	return document.createElementNS(svgns, tagName);
}

function svgAttr(element, attribute, value) {
	if(arguments.length === 2) { 
		return element.getAttributeNS(null, attribute);
	} else {
		element.setAttributeNS(null, attribute, value);
	}
}

function svgTranslate(element, dX, dY) {
	var newX, newY;
	var pos = svgGetPosition(element);

	newX = pos.x + dX; newY = pos.y + dY;
	//console.log('translate ', pos, newX, newY);
	svgAttr(element, 'transform', 'translate(' + newX + ' ' + newY + ')');
}

function svgGetPosition(element) {
	var x, y;
	var currentTransform = svgAttr(element, 'transform');
	// need to match a javascript #, like -1.283e-13
	var translateRegex = /translate\((\-?\d+(\.\d*)?(e\-?\d+)?) (\-?\d+(\.\d*)?(e\-?\d+)?)\)/;
	var regexResults = currentTransform.match(translateRegex);
	if(regexResults && regexResults[1] && regexResults[4]) {
		//console.log('old x y ', regexResults[1], regexResults[2]);
		x = +regexResults[1];
		y = +regexResults[4];
	} else {
		console.log('no pos on ' + currentTransform);
		x = 0;
		y = 0;
	}

	return {x: x, y: y};
}

function svgSetPosition(element, x, y) {
	svgAttr(element, 'transform', 'translate(' + x + ' ' + y + ')');
}

function addPointerListeners(element, eventArray, listener) {
	eventArray.forEach(function(eventName) {
		if(eventName.indexOf('touch') !== -1) {
			element.addEventListener(eventName, function(e) {
				listener(e);
				e.preventDefault();
				return false;
			}, false);
		} else {
			element.addEventListener(eventName, listener, false);
		}
	});
}

function getScale(element, fromWidth, fromHeight) {
	var aspectRatio = fromWidth / fromHeight;
	//console.log('apsectRatio ', aspectRatio);
	if(element.offsetWidth > aspectRatio * element.offsetHeight) {
		//console.log('fromHeight ', fromHeight);
		//console.log('offset ', element.offsetHeight);
		return fromHeight / element.offsetHeight;
	} else {
		//console.log('fromWidth ', fromWidth);
		//console.log('offset ', element.offsetWidth);
		return fromWidth / element.offsetWidth;
	}
}

function getControlScale(svg) {
	return getScale(svg, 2000, 1000);
}


function map(value, fromMin, fromMax, toMin, toMax) {
	return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
}











// basicButton
defineControl(function() {
	var controlDefinition = {
		typeID: 'basicButton',
		displayName: 'Button',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'x', 0); svgAttr(rect, 'y', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'width', '150'); svgAttr(rect, 'height', '150');

			rect.style.fill = '#e7e7e9';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var keyLabel = createSVGElement('text');
			svgAttr(keyLabel, 'x', 75); svgAttr(keyLabel, 'y', 75);
			svgAttr(keyLabel, 'text-anchor', 'middle');
			svgAttr(keyLabel, 'alignment-baseline', 'middle');
			svgAttr(keyLabel, 'font-size', '4em');
			svgAttr(keyLabel, 'font-weight', 'bold');
			keyLabel.textContent = control.getPropertyValue('keyboardShortcut') || '';
			//keyLabel.x = 8; keyLabel.y = 50;
			g.appendChild(keyLabel);
			control.svg.keyLabel = keyLabel;

			var buttonLabel = createSVGElement('text');
			svgAttr(buttonLabel, 'x', 75); svgAttr(buttonLabel, 'y', 160);
			svgAttr(buttonLabel, 'text-anchor', 'middle');
			svgAttr(buttonLabel, 'alignment-baseline', 'text-before-edge');
			svgAttr(buttonLabel, 'font-size', '2em');
			buttonLabel.textContent = control.getPropertyValue('label') || '';
			g.appendChild(buttonLabel);
			control.svg.buttonLabel = buttonLabel;

			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			var buttonPressed = false;

			function pressed() {
				var toSend = control.getPropertyValue('sendOnPress');
				if(toSend && toSend !== '') {
					toSend = unescapeForSerial(toSend);
					controlInterface.send(toSend);
				}
				control.svg.rect.style.fill = 'gold';
			}

			function released() {
				var toSend = control.getPropertyValue('sendOnRelease');
				if(toSend && toSend !== '') {
					toSend = unescapeForSerial(toSend);
					controlInterface.send(toSend);
				}
				control.svg.rect.style.fill = '#e7e7e9';
			}

			var svg = control.svg;

			[svg.rect, svg.keyLabel].forEach(function(element) {
				addPointerListeners(element, ['touchstart', 'mousedown'], function(e) {
					buttonPressed = true;
					pressed();
				});
				element.style.cursor = 'pointer';
			});

			[svg.rect, svg.keyLabel].forEach(function(element) {
				addPointerListeners(element, ['touchend', 'mouseup'], function(e) {
					if(buttonPressed === true) released();
					buttonPressed = false;
				});
			});

			svg.rect.addEventListener('mouseout', function(e) {
				if(buttonPressed === true) released();
			}, false);

			var key = control.getPropertyValue('keyboardShortcut');
			if(key && key !== '') {
				controlInterface.makeShortcut(key, pressed, released);
				control.svg.keyLabel.textContent = key;
			}

		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.buttonLabel.textContent = newValue;
				}
			},
			keyboardShortcut: {
				displayName: 'Key Shortcut',
				type: 'keyboardShortcut',
				onChange: function(control, newValue, oldValue) {
					control.svg.keyLabel.textContent = newValue;
				}
			},
			sendOnPress: {
				displayName: 'Send on press',
				type: 'serial'
			},
			sendOnRelease: {
				displayName: 'Send on release',
				type: 'serial'
			}
		},

	};

	return controlDefinition;
});


















// toggle switch
defineControl(function() {
	var controlDefinition = {
		typeID: 'toggleSwitch',
		displayName: 'Switch',
		buildSVG: function(control) {

			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'y', 0); svgAttr(rect, 'x', 0);
			svgAttr(rect, 'rx', 100); svgAttr(rect, 'ry', 100);
			svgAttr(rect, 'height', '200'); svgAttr(rect, 'width', 300);
			//rect.style.fill = '#333333';
			rect.style.fill = '#575759';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var slider = createSVGElement('g');
			svgAttr(slider, 'transform', 'translate(100 100)');
			control.svg.slider = slider;
			control.state = 'left';
			/*
			var snapTo = control.getPropertyValue('snapTo');
			if(snapTo === 'None') {
				svgSetPosition(slider, sliderMinX, 100);
			} else {
				snap(control);
			}*/

			g.appendChild(slider);

			var circle = createSVGElement('circle');
			svgAttr(circle, 'r', 100);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			slider.appendChild(circle);
			control.svg.circle = circle;

			var keyLabel = createSVGElement('text');
			//svgAttr(keyLabel, 'x', 100); svgAttr(keyLabel, 'y', 100);
			svgAttr(keyLabel, 'text-anchor', 'middle');
			svgAttr(keyLabel, 'alignment-baseline', 'middle');
			svgAttr(keyLabel, 'font-size', '4em');
			svgAttr(keyLabel, 'font-weight', 'bold');
			keyLabel.textContent = control.getPropertyValue('keyboardShortcut') || '';
			//keyLabel.x = 8; keyLabel.y = 50;
			slider.appendChild(keyLabel);
			control.svg.keyLabel = keyLabel;

			var label = createSVGElement('text');
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'text-before-edge');
			svgAttr(label, 'font-size', '2em');
			svgAttr(label, 'transform', 'translate(150 210)');
			label.textContent = control.getPropertyValue('label') || '';
			g.appendChild(label);
			control.svg.label = label;

			var leftLabel = createSVGElement('text');
			svgAttr(leftLabel, 'text-anchor', 'middle');
			svgAttr(leftLabel, 'alignment-baseline', 'text-after-edge');
			svgAttr(leftLabel, 'font-size', '2em');
			svgAttr(leftLabel, 'font-weight', 'bold');
			svgAttr(leftLabel, 'transform', 'translate(-20 100) rotate(-90)');
			leftLabel.textContent = control.getPropertyValue('leftLabel') || '';
			g.appendChild(leftLabel);
			control.svg.leftLabel = leftLabel;

			var rightLabel = createSVGElement('text');
			svgAttr(rightLabel, 'text-anchor', 'middle');
			svgAttr(rightLabel, 'alignment-baseline', 'text-before-edge');
			svgAttr(rightLabel, 'font-size', '2em');
			svgAttr(rightLabel, 'transform', 'translate(310 100) rotate(-90)');
			rightLabel.textContent = control.getPropertyValue('rightLabel') || '';
			g.appendChild(rightLabel);
			control.svg.rightLabel = rightLabel;

			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			var svg = control.svg;
			var isPressed = false;

			var slider= svg.slider;
			slider.style.cursor = 'pointer';

			function toggle() {
				var toSend = control.getPropertyValue('sendOnToggle');
				if(toSend && toSend !== '') {
					toSend = unescapeForSerial(toSend);
					controlInterface.send(toSend);
				}

				//console.log('test state ' + control.state);
				if(control.state === 'left') {
					svgAttr(slider, 'transform', 'translate(200 100)');
					control.state = 'right';
					svgAttr(svg.leftLabel, 'font-weight', '');
					svgAttr(svg.rightLabel, 'font-weight', 'bold');
					
					toSend = control.getPropertyValue('sendOnRight');
					if(toSend && toSend !== '') {
						
						toSend = unescapeForSerial(toSend);
						controlInterface.send(toSend);
					}
				} else if(control.state === 'right') {
					svgAttr(slider, 'transform', 'translate(100 100)');
					control.state = 'left';
					svgAttr(svg.leftLabel, 'font-weight', 'bold');
					svgAttr(svg.rightLabel, 'font-weight', '');

					toSend = control.getPropertyValue('sendOnLeft');
					if(toSend && toSend !== '') {
						toSend = unescapeForSerial(toSend);
						controlInterface.send(toSend);
					}
				}
			}

			function pressed() {
				toggle();
				svg.circle.style.fill = 'gold';
				isPressed = true;
			}

			function released() {
				svg.circle.style.fill = '#e7e7e9';
				isPressed = false;
			}

			addPointerListeners(slider, ['touchstart', 'mousedown'], function(e) {
				pressed();
				//toggle();
			});


			addPointerListeners(slider, ['touchend', 'mouseup'], function(e) {
				released();
			});

			slider.addEventListener('mouseout', function(e) {
				if(isPressed === true) released();
			}, false);

			var key = control.getPropertyValue('keyboardShortcut');
			if(key && key !== '') {
				controlInterface.makeShortcut(key, pressed, released);
				control.svg.keyLabel.textContent = key;
			}

			
			/*

			var buttonPressed = false;


			function pressed() {
				var toSend = control.getPropertyValue('sendOnPress');
				if(toSend && toSend !== '') controlInterface.send(toSend);
				control.svg.rect.style.fill = 'gold';
			}

			function released() {
				var toSend = control.getPropertyValue('sendOnRelease');
				if(toSend && toSend !== '') controlInterface.send(toSend);
				control.svg.rect.style.fill = '#e7e7e9';
			}

			var svg = control.svg;

			[svg.rect, svg.keyLabel].forEach(function(element) {
				addPointerListeners(element, ['touchstart', 'mousedown'], function(e) {
					buttonPressed = true;
					pressed();
				});
				element.style.cursor = 'pointer';
			});

			[svg.rect, svg.keyLabel].forEach(function(element) {
				addPointerListeners(element, ['touchend', 'mouseup'], function(e) {
					if(buttonPressed === true) released();
					buttonPressed = false;
				});
			});

			svg.rect.addEventListener('mouseout', function(e) {
				if(buttonPressed === true) released();
			}, false);

			var key = control.getPropertyValue('keyboardShortcut');
			if(key && key !== '') {
				controlInterface.makeShortcut(key, pressed, released);
				control.svg.keyLabel.textContent = key;
			}
			*/
		},

		properties: {
			sendOnToggle: {
				displayName: 'Send on toggle',
				type: 'serial'
			},
						sendOnLeft: {
				displayName: 'Send on switch to left',
				type: 'serial'
			},
			sendOnRight: {
				displayName: 'Send on switch to right',
				type: 'serial'
			},
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			keyboardShortcut: {
				displayName: 'Key Shortcut',
				type: 'keyboardShortcut',
				onChange: function(control, newValue, oldValue) {
					control.svg.keyLabel.textContent = newValue;
				}
			},
			leftLabel: {
				displayName: 'Left side label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.leftLabel.textContent = newValue;
				}
			},
			rightLabel: {
				displayName: 'Right side label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.rightLabel.textContent = newValue;
				}
			}
		},

	};

	return controlDefinition;
});




























// horizontal
defineControl(function() {
	var sliderLength = 900;
	var sliderRadius = 100;

	var sliderMinX = sliderRadius;
	var sliderMaxX = sliderLength - sliderRadius;

	var getSliderValue = function(control) {
		var pos = svgGetPosition(control.svg.slider);
		return Math.round(map(pos.x, sliderMinX, sliderMaxX, 0, 1023));
	};



	function snap(control) {
		var slider = control.svg.slider;
		var snapTo = control.getPropertyValue('snapTo');
		var pos = svgGetPosition(slider);
		if (snapTo === 'None') {
			// nada
		} else if (snapTo === 'Right') {
			svgSetPosition(slider, sliderMaxX, pos.y);
		} else if (snapTo === 'Left') {
			svgSetPosition(slider, sliderMinX, pos.y);
		} else {
			svgSetPosition(slider, (sliderMaxX + sliderMinX)/2, pos.y);
		}
	}





	var controlDefinition = {
		typeID: 'horizontalSlider',
		displayName: 'H Slider',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'y', 80); svgAttr(rect, 'x', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'height', '40'); svgAttr(rect, 'width', sliderLength);
			//rect.style.fill = '#333333';
			rect.style.fill = '#575759';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var slider = createSVGElement('g');
			svgAttr(slider, 'transform', 'translate(0 100)');
			control.svg.slider = slider;
			var snapTo = control.getPropertyValue('snapTo');
			if(snapTo === 'None') {
				svgSetPosition(slider, sliderMinX, 100);
			} else {
				snap(control);
			}

			g.appendChild(slider);

			var circle = createSVGElement('circle');
			svgAttr(circle, 'r', 100);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			slider.appendChild(circle);
			control.svg.circle = circle;


			var label = createSVGElement('text');
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'middle');
			svgAttr(label, 'font-size', '2em');
			label.textContent = control.getPropertyValue('label') || '';
			slider.appendChild(label);
			control.svg.label = label;

			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			var circle = control.svg.circle;
			var slider = control.svg.slider;
			var isDragging = false;
			var lastDragPosition = {};
			var dragTouchIdentifier;

			slider.style.cursor = 'pointer';


			slider.addEventListener('touchstart', function(e) {
				var touch = e.changedTouches[0];
				dragTouchIdentifier = touch.identifier;
				//screenEdit_selectControl(control);

				isDragging = true;
				lastDragPosition = {
					x: touch.clientX, y: touch.clientY
				};
				circle.style.fill = 'gold';
				e.preventDefault();
				return false;
			}, false);
			slider.addEventListener('mousedown', function(e) {
				isDragging = true;
				lastDragPosition = {
					x: e.clientX, y: e.clientY
				};
				circle.style.fill = 'gold';
			}, false);

			var scaleFactor;
			//var svg = document.getElementById('screenControl_svg');



			svgElement.addEventListener('touchmove', function(e) {
				var touch;
				asArray(e.changedTouches).forEach(function(t) {
					if (t.identifier === dragTouchIdentifier) touch = t;
				});
				if(touch) {
					drag(e, touch.clientX);
				}
			}, false);

			svgElement.addEventListener('mousemove', function(e) {
				drag(e, e.clientX);
			}, false);


			var timeoutID;
			var lastSend_ms = (new Date()).valueOf();
			var sendMinInterval = 100;

			function sendCurrentValue() {
				var value = getSliderValue(control);
				var toSend = control.getPropertyValue('sendOnChange');
				if(toSend && toSend !== '') {
					toSend = unescapeForSerial(toSend);
					toSend = toSend.replace('?', value);
					//console.log('send ',toSend);
					controlInterface.send(toSend);
				}

				lastSend_ms = (new Date()).valueOf();
			}

			function drag(e, clientX) {
				var scaleFactor;
				if(isDragging) {
					scaleFactor = getControlScale(svgElement);
					var dX = clientX - lastDragPosition.x;

					svgTranslate(slider, scaleFactor * dX, 0);
					lastDragPosition = {x: clientX};

					var pos = svgGetPosition(slider);
					if(pos.x < sliderMinX) svgSetPosition(slider, sliderMinX, pos.y);
					if(pos.x > sliderMaxX) svgSetPosition(slider, sliderMaxX, pos.y);

					var delay_ms, now_ms;
					now_ms = (new Date()).valueOf();
					if(now_ms - lastSend_ms > sendMinInterval) delay_ms = 0;
					else delay_ms = sendMinInterval - (now_ms - lastSend_ms);

					if(timeoutID) window.clearTimeout(timeoutID);
					timeoutID = window.setTimeout(sendCurrentValue, delay_ms);
				}
				e.preventDefault();
				return false;
			}




			var endDrag = function() {
				if(isDragging) {
					circle.style.fill = '#e7e7e9';
					dragTouchIdentifier = undefined;
					isDragging = false;
					snap(control);
					sendCurrentValue();
				}
			};

			addPointerListeners(slider, ['mouseup', 'touchend'], endDrag);
			svgElement.addEventListener('mouseleave', endDrag, false);
			svgElement.addEventListener('mouseup', endDrag, false);
		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			snapTo: {
				displayName: 'When not pressed, snap to',
				type: 'select',
				values: [
					'None',
					'Middle',
					'Left',
					'Right'
				],
				defaultValue: 'Middle',
				onChange: function(control, newValue, oldValue) {

				}
			},
			sendOnChange: {
				displayName: 'Send on change (? will be replaced with value)',
				type: 'serial'
			},

		},

		helpText: 'Sends a value between 0 and 1023'
	};

	return controlDefinition;
});






























// vertical
defineControl(function() {
	var sliderLength = 900;
	var sliderRadius = 100;

	var sliderMinY = sliderRadius;
	var sliderMaxY = sliderLength - sliderRadius;

	var getSliderValue = function(control) {
		var pos = svgGetPosition(control.svg.slider);
		return Math.round(map(pos.y, sliderMaxY, sliderMinY, 0, 1023));
		//return (sliderMaxY - pos.y - sliderMinY) * 1024 / sliderMaxValue;
	};



	function snap(control) {
		var slider = control.svg.slider;
		var snapTo = control.getPropertyValue('snapTo');
		var pos = svgGetPosition(slider);
		if (snapTo === 'None') {
			// nada
		} else if (snapTo === 'Top') {
			svgSetPosition(slider, pos.x, sliderMinY);
		} else if (snapTo === 'Bottom') {
			svgSetPosition(slider, pos.x, sliderMaxY);
		} else {
			svgSetPosition(slider, pos.x, (sliderMaxY + sliderMinY)/2);
		}
	}





	var controlDefinition = {
		typeID: 'verticalSlider',
		displayName: 'V Slider',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var rect = createSVGElement('rect');
			svgAttr(rect, 'x', 80); svgAttr(rect, 'y', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'width', '40'); svgAttr(rect, 'height', sliderLength);
			//rect.style.fill = '#333333';
			rect.style.fill = '#575759';
			rect.style.stroke = '#333333';
			rect.style.strokeWidth = 5;
			g.appendChild(rect);
			control.svg.rect = rect;

			var slider = createSVGElement('g');
			svgAttr(slider, 'transform', 'translate(100 0)');
			control.svg.slider = slider;
			var snapTo = control.getPropertyValue('snapTo');
			if(snapTo === 'None') {
				svgSetPosition(slider, 100, sliderMaxY);
			} else {
				snap(control);
			}

			g.appendChild(slider);

			var circle = createSVGElement('circle');
			svgAttr(circle, 'r', 100);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			slider.appendChild(circle);
			control.svg.circle = circle;


			var label = createSVGElement('text');
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'middle');
			svgAttr(label, 'font-size', '2em');
			label.textContent = control.getPropertyValue('label') || '';
			slider.appendChild(label);
			control.svg.label = label;

			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			var circle = control.svg.circle;
			var slider = control.svg.slider;
			var isDragging = false;
			var lastDragPosition = {};
			var dragTouchIdentifier;

			slider.style.cursor = 'pointer';


			slider.addEventListener('touchstart', function(e) {
				var touch = e.changedTouches[0];
				dragTouchIdentifier = touch.identifier;
				//screenEdit_selectControl(control);

				isDragging = true;
				lastDragPosition = {
					x: touch.clientX, y: touch.clientY
				};
				circle.style.fill = 'gold';
				e.preventDefault();
				return false;
			}, false);
			slider.addEventListener('mousedown', function(e) {
				isDragging = true;
				lastDragPosition = {
					x: e.clientX, y: e.clientY
				};
				circle.style.fill = 'gold';
			}, false);

			var scaleFactor;
			//var svg = document.getElementById('screenControl_svg');



			svgElement.addEventListener('touchmove', function(e) {
				var touch;
				asArray(e.changedTouches).forEach(function(t) {
					if (t.identifier === dragTouchIdentifier) touch = t;
				});
				if(touch) {
					drag(e, touch.clientY);
				}
			}, false);

			svgElement.addEventListener('mousemove', function(e) {
				drag(e, e.clientY);
			}, false);


			var timeoutID;
			var lastSend_ms = (new Date()).valueOf();
			var sendMinInterval = 100;

			function sendCurrentValue() {
				var value = getSliderValue(control);
				var toSend = control.getPropertyValue('sendOnChange');
				if(toSend && toSend !== '') {
					toSend = unescapeForSerial(toSend);
					toSend = toSend.replace('?', value);
					//console.log('send ',toSend);
					controlInterface.send(toSend);
				}

				lastSend_ms = (new Date()).valueOf();
			}

			function drag(e, clientY) {
				var scaleFactor;
				if(isDragging) {
					scaleFactor = getControlScale(svgElement);
					var dY = clientY - lastDragPosition.y;

					svgTranslate(slider, 0, scaleFactor * dY);
					lastDragPosition = {y: clientY};

					var pos = svgGetPosition(slider);
					if(pos.y < sliderMinY) svgSetPosition(slider, pos.x, sliderMinY);
					if(pos.y > sliderMaxY) svgSetPosition(slider, pos.x, sliderMaxY);

					var delay_ms, now_ms;
					now_ms = (new Date()).valueOf();
					if(now_ms - lastSend_ms > sendMinInterval) delay_ms = 0;
					else delay_ms = sendMinInterval - (now_ms - lastSend_ms);

					if(timeoutID) window.clearTimeout(timeoutID);
					timeoutID = window.setTimeout(sendCurrentValue, delay_ms);
				}
				e.preventDefault();
				return false;
			}




			var endDrag = function() {
				if(isDragging) {
					circle.style.fill = '#e7e7e9';
					dragTouchIdentifier = undefined;
					isDragging = false;
					snap(control);
					sendCurrentValue();
				}
			};

			addPointerListeners(slider, ['mouseup', 'touchend'], endDrag);
			svgElement.addEventListener('mouseleave', endDrag, false);
			svgElement.addEventListener('mouseup', endDrag, false);
		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			snapTo: {
				displayName: 'When not pressed, snap to',
				type: 'select',
				values: [
					'None',
					'Middle',
					'Bottom',
					'Top'
				],
				defaultValue: 'Middle',
				onChange: function(control, newValue, oldValue) {

				}
			},
			sendOnChange: {
				displayName: 'Send on change (? will be replaced with value)',
				type: 'serial'
			},

		},

		helpText: 'Sends a value between 0 and 1023'
	};

	return controlDefinition;
});





























// two axis
defineControl(function() {
	var backdropRadius = 300;
	var sliderRadius = 100;

	var sliderMaxRadius = backdropRadius - sliderRadius;


	/*
	var getSliderValue = function(control) {
		var pos = svgGetPosition(control.svg.slider);
		return Math.round(map(pos.y, sliderMaxY, sliderMinY, 0, 1023));
		//return (sliderMaxY - pos.y - sliderMinY) * 1024 / sliderMaxValue;
	};
	*/



	function snap(control) {
		var slider = control.svg.slider;
		var snapTo = control.getPropertyValue('snapTo');
		var pos = svgGetPosition(slider);
		if (snapTo === 'None') {
			// nada
		} else {
			svgSetPosition(slider, 0, 0);
		}
	}

	function sign(x) {
		return x ? x/Math.abs(x) : 0;
	}

	function toPolar(x, y) {
		if(typeof x === 'object') {
			y = x.y;
			x = x.x;
		}
		var r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
			theta = Math.atan(y/x);
		if(sign(x) === -1) theta += Math.PI;
		else if(sign(y) === -1) theta += 2*Math.PI;
		else if(x === 0 && y === 0) theta = 0;
		return { r: r, theta: theta};
	}

	function toPolarD(x, y) {
		var ret = toPolar(x, y);
		return {
			r: ret.r,
			theta: 360*ret.theta/(2*Math.PI)
		};
	}

	function toCartesian(r, theta) {
		if(typeof r === 'object') {
			theta = r.theta;
			r = r.r;
		}
		return {
			x: r * Math.cos(theta),
			y: r * Math.sin(theta)
		};
	}

	window.toPolar = toPolar;
	window.toPolarD = toPolarD;
	window.toCartesian = toCartesian;



	var controlDefinition = {
		typeID: 'twoAxis',
		displayName: 'Thumbstick',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var backdrop = createSVGElement('circle');
			svgAttr(backdrop, 'r', backdropRadius);
			backdrop.style.fill = '#575759';
			backdrop.style.stroke = '#333333';
			backdrop.style.strokeWidth = 5;
			g.appendChild(backdrop);
			control.svg.backdrop = backdrop;

			var slider = createSVGElement('g');
			svgAttr(slider, 'transform', 'translate(0 0)');
			control.svg.slider = slider;
			var snapTo = control.getPropertyValue('snapTo');
			if(snapTo === 'None') {
				svgSetPosition(slider, 0, 0);
			} else {
				snap(control);
			}
			g.appendChild(slider);
			

			var circle = createSVGElement('circle');
			svgAttr(circle, 'r', 100);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			slider.appendChild(circle);
			control.svg.circle = circle;


			var label = createSVGElement('text');
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'middle');
			svgAttr(label, 'font-size', '2em');
			label.textContent = control.getPropertyValue('label') || '';
			slider.appendChild(label);
			control.svg.label = label;

			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			var circle = control.svg.circle;
			var slider = control.svg.slider;
			var isDragging = false;
			var lastDragPosition = {};
			var dragTouchIdentifier;

			var scaleFactor;
			//var svg = document.getElementById('screenControl_svg');

			slider.style.cursor = 'pointer';


			slider.addEventListener('touchstart', function(e) {
				var touch = e.changedTouches[0];
				dragTouchIdentifier = touch.identifier;

				isDragging = true;
				lastDragPosition = {
					x: touch.clientX, y: touch.clientY
				};
				circle.style.fill = 'gold';
				e.preventDefault();
				return false;
			}, false);
			slider.addEventListener('mousedown', function(e) {
				isDragging = true;
				lastDragPosition = {
					x: e.clientX, y: e.clientY
				};
				circle.style.fill = 'gold';
				slider.style.cursor = 'none';
				svg.style.cursor = 'none';
			}, false);


			svgElement.addEventListener('touchmove', function(e) {
				var touch;
				asArray(e.changedTouches).forEach(function(t) {
					if (t.identifier === dragTouchIdentifier) touch = t;
				});
				if(touch) {
					drag(e, touch.clientX, touch.clientY);
				}
			}, false);

			svgElement.addEventListener('mousemove', function(e) {
				drag(e, e.clientX, e.clientY);
			}, false);


			var timeoutID;
			var lastSend_ms = (new Date()).valueOf();
			var sendMinInterval = 100;

			function sendCurrentValue() {
				//var value = getSliderValue(control);
				var pos = svgGetPosition(slider);
				var value = {
					x: Math.round(map(pos.x, -sliderMaxRadius, sliderMaxRadius, 0, 1023)),
					y: Math.round(map(pos.y, -sliderMaxRadius, sliderMaxRadius, 1023, 0))
				};
				var toSend = control.getPropertyValue('sendOnChange');
				if(toSend && toSend !== '') {
					toSend = unescapeForSerial(toSend);
					toSend = toSend.replace(/\?/, value.x);
					toSend = toSend.replace(/\?/, value.y);
					controlInterface.send(toSend);
				}

				lastSend_ms = (new Date()).valueOf();
			}

			function drag(e, clientX, clientY) {
				var scaleFactor;
				if(isDragging) {
					scaleFactor = getControlScale(svgElement);
					var dX = clientX - lastDragPosition.x;
					var dY = clientY - lastDragPosition.y;

					svgTranslate(slider, scaleFactor * dX, scaleFactor * dY);
					lastDragPosition = {x: clientX, y: clientY};

					// clamp
					var pos = svgGetPosition(slider);
					var polar = toPolar(pos);
					if(polar.r > sliderMaxRadius) {
						var clamped = toCartesian(sliderMaxRadius, polar.theta);
						svgSetPosition(slider, clamped.x, clamped.y);
					}
					//polar.r = Math.max(polar.r, sliderMaxRadius);

					/*
					var pos = svgGetPosition(slider);
					if(pos.y < sliderMinY) svgSetPosition(slider, pos.x, sliderMinY);
					if(pos.y > sliderMaxY) svgSetPosition(slider, pos.x, sliderMaxY);
					*/

					var delay_ms, now_ms;
					now_ms = (new Date()).valueOf();
					if(now_ms - lastSend_ms > sendMinInterval) delay_ms = 0;
					else delay_ms = sendMinInterval - (now_ms - lastSend_ms);

					if(timeoutID) window.clearTimeout(timeoutID);
					timeoutID = window.setTimeout(sendCurrentValue, delay_ms);
				}
				e.preventDefault();
				return false;
			}




			var endDrag = function() {
				if(isDragging) {
					circle.style.fill = '#e7e7e9';
					dragTouchIdentifier = undefined;
					isDragging = false;
					snap(control);
					sendCurrentValue();
					slider.style.cursor = 'pointer';
					svg.style.cursor = '';
				}
			};

			addPointerListeners(slider, ['mouseup', 'touchend'], endDrag);
			svgElement.addEventListener('mouseleave', endDrag, false);
			svgElement.addEventListener('mouseup', endDrag, false);
		},

		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			snapTo: {
				displayName: 'When not pressed, snap to',
				type: 'select',
				values: [
					'None',
					'Middle',
				],
				defaultValue: 'Middle',
				onChange: function(control, newValue, oldValue) {

				}
			},
			sendOnChange: {
				displayName: 'Send on change (first ? will be replaced with x, ? with y)',
				type: 'serial'
			},

		},

		helpText: 'Sends a value between 0 and 1023'
	};

	return controlDefinition;
});













// tilt
defineControl(function() {
	var betaMiddle = 0;
	var betaHalfRange = 45;
	var gammaMiddle = -45;
	var gammaHalfRange = 45;

	var betaBottom = betaMiddle - betaHalfRange;
	var betaTop = betaMiddle + betaHalfRange;
	var gammaBottom = gammaMiddle - gammaHalfRange;
	var gammaTop = gammaMiddle + gammaHalfRange;

	var controlDefinition = {
		typeID: 'tilt',
		displayName: 'Tilt (unreliable!)',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			g.style.stroke = '#333333';
			g.style.fill = '#333333';

			var horizontalG = createSVGElement('g');
			var horizontalPath = createSVGElement('path');
			svgAttr(horizontalPath, 'd', 'M64,32c0-0.885-0.384-1.681-0.993-2.23l0,0l-10-9l0,0C52.475,20.292,51.771,20,51,20c-1.657,0-3,1.343-3,3\nc0,0.885,0.383,1.681,0.993,2.23l0,0L53.182,29H10.818l4.189-3.77l0,0C15.617,24.681,16,23.885,16,23c0-1.657-1.343-3-3-3\nc-0.772,0-1.475,0.292-2.007,0.77l0,0l-10,9l0,0C0.384,30.319,0,31.115,0,32s0.383,1.68,0.993,2.23l0,0l10,9l0,0\nC11.525,43.709,12.228,44,13,44c1.657,0,3-1.343,3-3c0-0.885-0.383-1.68-0.993-2.23l0,0L10.818,35h42.364l-4.188,3.77l0,0\nC48.384,39.32,48,40.115,48,41c0,1.657,1.343,3,3,3c0.771,0,1.475-0.292,2.007-0.77l0,0l10-9l0,0C63.617,33.682,64,32.885,64,32z');
			horizontalPath.style.strokeWidth = 0;
			//horizontalPath.style.fill = '#333333';
			control.svg.horizontalPath = horizontalPath;
			horizontalG.appendChild(horizontalPath);
			g.appendChild(horizontalG);

			var verticalG = createSVGElement('g');
			var verticalPath = createSVGElement('path');
			svgAttr(verticalG, 'transform', 'translate(0 64)');
			svgAttr(verticalPath, 'd', 'M41,48c-0.885,0-1.682,0.384-2.23,0.993l0,0L35,53.182V10.818l3.77,4.189l0,0C39.318,15.616,40.115,16,41,16\nc1.657,0,3-1.343,3-3c0-0.772-0.292-1.475-0.77-2.007l0,0l-9-10l0,0C33.682,0.384,32.885,0,32,0s-1.681,0.384-2.23,0.993l0,0\nl-9,10l0,0C20.292,11.525,20,12.228,20,13c0,1.657,1.343,3,3,3c0.885,0,1.681-0.384,2.23-0.993l0,0L29,10.818v42.364l-3.77-4.188\nl0,0C24.681,48.384,23.885,48,23,48c-1.657,0-3,1.343-3,3c0,0.771,0.292,1.475,0.77,2.007l0,0l9,10l0,0\nC30.319,63.617,31.115,64,32,64s1.682-0.383,2.23-0.993l0,0l9-10l0,0C43.708,52.475,44,51.771,44,51C44,49.343,42.657,48,41,48z');
			verticalPath.style.strokeWidth = 0;
			//verticalPath.style.fill = '#333333';
			control.svg.verticalPath = verticalPath;
			verticalG.appendChild(verticalPath);
			g.appendChild(verticalG);

			var tiltText = createSVGElement('text');
			svgAttr(tiltText, 'x', -32); svgAttr(tiltText, 'y', 64);
			svgAttr(tiltText, 'text-anchor', 'end');
			svgAttr(tiltText, 'alignment-baseline', 'middle');
			svgAttr(tiltText, 'font-size', '3em');
			svgAttr(tiltText, 'font-weight', 'bold');
			tiltText.textContent = 'Tilt';
			control.svg.tiltText = tiltText;
			g.appendChild(tiltText);

			var horizontalLabel = createSVGElement('text');
			svgAttr(horizontalLabel, 'x', 64+10); svgAttr(horizontalLabel, 'y', 32);
			svgAttr(horizontalLabel, 'text-anchor', 'start');
			svgAttr(horizontalLabel, 'alignment-baseline', 'text-after-edge');
			svgAttr(horizontalLabel, 'font-size', '2em');
			horizontalLabel.textContent = control.getPropertyValue('horizontalTiltLabel') || '';
			control.svg.horizontalLabel = horizontalLabel;
			g.appendChild(horizontalLabel);

			var verticalLabel = createSVGElement('text');
			svgAttr(verticalLabel, 'x', 64+10); svgAttr(verticalLabel, 'y', 64+32);
			svgAttr(verticalLabel, 'text-anchor', 'start');
			svgAttr(verticalLabel, 'alignment-baseline', 'text-after-edge');
			svgAttr(verticalLabel, 'font-size', '2em');
			verticalLabel.textContent = control.getPropertyValue('verticalTiltLabel') || '';
			control.svg.verticalLabel = verticalLabel;
			g.appendChild(verticalLabel);



			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			/*
			if(!controlInterface.hasTilt()) {
				console.log('no tilt');
				control.g.style.stroke = 'e7e7e9';
			}
			console.log('tilt? ', controlInterface.hasTilt());
			*/

			// by default, assume no tilt. at first tilt event we can reset color
			control.element.style.stroke = '#e7e7e9';
			control.element.style.fill = '#e7e7e9';


			var timeoutID;
			var lastSend_ms = (new Date()).valueOf();
			var sendMinInterval = 100;



			function makeSendTilt(e) {
				return function () {
					if(!(e.beta && e.gamma)) return;
					if(firstEvent) {
						control.element.style.stroke = '#333333';
						control.element.style.fill = '#333333';
						firstEvent = false;
					}
					var toSend = control.getPropertyValue('sendOnTilt');
					if(toSend && toSend !== '') {
						var tiltLeftRight = map(e.beta, betaBottom, betaTop, 0, 1023);
						var tiltFwdBack = map(e.gamma, gammaBottom, gammaTop, 0, 1023);
						if(tiltLeftRight < 0) tiltLeftRight = 0;
						if(tiltLeftRight > 1023) tiltLeftRight = 1023;
						if(tiltFwdBack < 0) tiltFwdBack = 0;
						if(tiltFwdBack > 1023) tiltFwdBack = 1023;
					
						toSend = unescapeForSerial(toSend);
						toSend = toSend.replace(/\?/, tiltLeftRight);
						toSend = toSend.replace(/\?/, tiltFwdBack);
						console.log('send tilt ' + toSend);
						controlInterface.send(toSend);
					}
				};
			}

			var firstEvent = true;
			controlInterface.onTilt(function(e) {
				var delay_ms, now_ms;
				now_ms = (new Date()).valueOf();
				if(now_ms - lastSend_ms > sendMinInterval) delay_ms = 0;
				else delay_ms = sendMinInterval - (now_ms - lastSend_ms);

				if(timeoutID) window.clearTimeout(timeoutID);
				timeoutID = window.setTimeout(makeSendTilt(e), delay_ms);
			});
		},

		properties: {
			horizontalTiltLabel: {
				displayName: 'Horizontal Tilt Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.horizontalLabel = newValue;
				}
			},
			verticalTiltLabel: {
				displayName: 'Vertical Tilt Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.verticalLabel = newValue;
				}
			},
			sendOnTilt: {
				displayName: 'Send on tilt change (first ? will be left/right, second ? will be fwd/back)',
				type: 'serial'
			},

		},
	};

	return controlDefinition;
});


















































// connections
defineControl(function() {
	var controlDefinition = {
		typeID: 'connections',
		displayName: 'Connections',
		buildSVG: function(control) {
			var g = createSVGElement('g');
			control.svg.g = g;
			var rect = createSVGElement('rect');
			svgAttr(rect, 'x', 0); svgAttr(rect, 'y', 0);
			svgAttr(rect, 'rx', 10); svgAttr(rect, 'ry', 10);
			svgAttr(rect, 'width', '150'); svgAttr(rect, 'height', '150');

			rect.style.fill = '#e7e7e9';
			rect.style.stroke = '#e7e7e9';
			rect.style.strokeWidth = '10px';
			svgAttr(rect, 'stroke-dasharray', '15px 20px');
			svgAttr(rect, 'stroke-linejoin', 'round');
			svgAttr(rect, 'stroke-linecap', 'round');
			g.appendChild(rect);
			control.svg.rect = rect;



			var label = createSVGElement('text');
			svgAttr(label, 'x', 75); svgAttr(label, 'y', 75);
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'middle');
			svgAttr(label, 'font-size', '1.5em');
			label.textContent = 'Connections';
			g.appendChild(label);
			control.svg.label = label;

			return g;
		},

		wireEvents: function(control, svgElement, controlInterface) {
			var buttonPressed = false;

			control.svg.g.style.display = 'none';

			var toSend = control.getPropertyValue('sendOnConnect') || '';
			toSend = unescapeForSerial(toSend);
			if(toSend !== '' ) controlInterface.send(toSend);

			toSend = control.getPropertyValue('sendOnDisconnect') || '';
			if(toSend !== '') controlInterface.sendOnDisconnect(toSend);
		},

		properties: {
			sendOnConnect: {
				displayName: 'Send on connect',
				type: 'serial'
			},
			sendOnDisconnect: {
				displayName: 'Send on disconnect',
				type: 'serial'
			}
		},

	};

	return controlDefinition;
});
























// indicator
defineControl(function() {
	var controlDefinition = {
		typeID: 'indicator',
		displayName: 'Indicator',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var circle = createSVGElement('circle');
			svgAttr(circle, 'cx', 75); svgAttr(circle, 'cy', 75);
			svgAttr(circle, 'r', 75);
			circle.style.fill = '#e7e7e9';
			circle.style.stroke = '#333333';
			circle.style.strokeWidth = 5;
			g.appendChild(circle);
			control.svg.circle = circle;

			var indicatorLabel = createSVGElement('text');
			svgAttr(indicatorLabel, 'x', 74); svgAttr(indicatorLabel, 'y', 160);
			svgAttr(indicatorLabel, 'text-anchor', 'middle');
			svgAttr(indicatorLabel, 'alignment-baseline', 'text-before-edge');
			svgAttr(indicatorLabel, 'font-size', '2em');
			indicatorLabel.textContent = control.getPropertyValue('label') || '';
			g.appendChild(indicatorLabel);
			control.svg.indicatorLabel = indicatorLabel;

			return g;
		},
		wireEvents: function(control, svgElement, controlInterface) {
			controlDefinition.forEachColor(function(colorName, color) {
				var rx = control.getPropertyValue('onReceive_' + colorName);
				if(rx && rx !== '') {
					controlInterface.watchForReceive(rx, function() {
						//console.log('called! ', arguments);
						control.svg.circle.style.fill = color;
					});
				}
			});
		},
		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.indicatorLabel.textContent = newValue;
				}
			},
		},
	};

	controlDefinition.colors = {
		'red': 'FireBrick',
		'orange': 'DarkOrange',
		'yellow': 'Gold',
		'green': 'ForestGreen',
		'blue': 'CornflowerBlue',
		'purple': 'DarkOrchid',
		'white': 'Cornsilk',
		'gray': 'DimGray',
		'black': 'Black'
	};

	controlDefinition.forEachColor = function(func) {
		for(var colorName in controlDefinition.colors) {
			func(colorName, controlDefinition.colors[colorName]);
		}
	};

	for(var colorName in controlDefinition.colors) {
		//var color = controlDefinition.colors[colorName];

		var newProp = {};
		var propName = 'onReceive_' + colorName;
		newProp.displayName = colorName + ' when received';
		newProp.type = 'serial';

		controlDefinition.properties[propName] = newProp;
	}


	return controlDefinition;
});




















// vibration
defineControl(function() {
	var controlDefinition = {
		typeID: 'vibration',
		displayName: 'Vibration (unreliable!)',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var path = createSVGElement('path');
			svgAttr(path, 'd', "M12,18c-1.657,0-3,1.343-3,3v22c0,1.657,1.343,3,3,3s3-1.343,3-3V21C15,19.343,13.657,18,12,18z M3,12\nc-1.657,0-3,1.343-3,3v34c0,1.657,1.343,3,3,3s3-1.343,3-3V15C6,13.343,4.657,12,3,12z M52,18c-1.657,0-3,1.343-3,3v22\nc0,1.657,1.343,3,3,3s3-1.343,3-3V21C55,19.343,53.657,18,52,18z M61,12c-1.657,0-3,1.343-3,3v34c0,1.657,1.343,3,3,3\ns3-1.343,3-3V15C64,13.343,62.657,12,61,12z M43,18H21c-1.657,0-3,1.343-3,3v22c0,1.657,1.343,3,3,3h22c1.657,0,3-1.343,3-3V21\nC46,19.343,44.657,18,43,18z M40,40H24V24h16V40z");
			path.style.fill = '#e7e7e9';
			path.style.strokeWidth = 0;
			g.appendChild(path);
			control.svg.path = path;
			return g;
		},
		wireEvents: function(control, svgElement, controlInterface) {
			var rx, stopTimeoutID;
			var path = control.svg.path;

			function clearColorIn(ms) {
				if(stopTimeoutID) window.clearTimeout(stopTimeoutID);
				stopTimeoutID = window.setTimeout(function() {
					console.log('clear vibrate color');
					path.style.fill = '#e7e7e9';
				}, ms);
			}

			rx = control.getPropertyValue('vibrateOnReceive');
			if(rx && rx !== '') {
				console.log('make vibrateOnReceive');
				controlInterface.watchForReceive(rx, function(value) {
					console.log('start vibrate');
					console.log('value: ', value, 'type: ', typeof value);
					path.style.fill = 'gold';
					controlInterface.vibrate(+value);
					clearColorIn(value);
				});
			}

			rx = control.getPropertyValue('stopVibrateOnReceive');
			if(rx && rx !== '') {
				console.log('make stopVibrateOnReceive');
				controlInterface.watchForReceive(rx, function() {
					controlInterface.stopVibrate();
					clearColorIn(0);
				});
			}
		},
		properties: {
			vibrateOnReceive: {
				displayName: 'Vibrate ? ms when received',
				type: 'serial'
			},
			stopVibrateOnReceive: {
				displayName: 'Stop vibrating when received',
				type: 'serial'
			}
		},
	};

	return controlDefinition;
});





















// gauge, meter?
defineControl(function() {
	var angleSweepMin = 220;
	var angleSweepMax = 0;
	var angleOffset = -20;

	var controlDefinition = {
		typeID: 'gauge',
		displayName: 'Gauge',
		buildSVG: function(control) {
			var g = createSVGElement('g');

			var clipPath = createSVGElement('clipPath');
			svgAttr(clipPath, 'id', 'gaugeClipPath');
			g.appendChild(clipPath);
			control.svg.clipPath = clipPath;

			var clipRect = createSVGElement('rect');
			svgAttr(clipRect, 'x', -150 - 5); svgAttr(clipRect, 'width', 300 + 5*2);
			var clipHeight = 150 + 150 * Math.sin(Math.abs(angleOffset)/360*2*Math.PI);
			svgAttr(clipRect, 'y', -150 - 5); svgAttr(clipRect, 'height', clipHeight + 5);
			clipPath.appendChild(clipRect);
			control.clipRect = clipRect;



			var backdrop = createSVGElement('circle');
			//svgAttr(backdrop, 'cx', 75); svgAttr(backdrop, 'cy', 75);
			svgAttr(backdrop, 'r', 150);
			backdrop.style.fill = '#e7e7e9';
			backdrop.style.stroke = '#333333';
			backdrop.style.strokeWidth = 5;
			g.appendChild(backdrop);
			control.svg.backdrop = backdrop;

			svgAttr(backdrop, 'clip-path', 'url(#gaugeClipPath)');

			var label = createSVGElement('text');
			svgAttr(label, 'x', 0); svgAttr(label, 'y', clipHeight - 150 + 10);
			svgAttr(label, 'text-anchor', 'middle');
			svgAttr(label, 'alignment-baseline', 'text-before-edge');
			svgAttr(label, 'font-size', '2em');
			label.textContent = control.getPropertyValue('label') || '';
			g.appendChild(label);
			control.svg.label = label;


			var needle = createSVGElement('line');
			svgAttr(needle, 'x1', 0); svgAttr(needle, 'y1', 0);
			svgAttr(needle, 'x2', 130); svgAttr(needle, 'y2', 0);
			svgAttr(needle, 'transform', 'rotate(-200)');
			needle.style.stroke = '#333333';
			needle.style.strokeWidth = 10;
			g.appendChild(needle);
			control.svg.needle = needle;

			var needleHub = createSVGElement('circle');
			svgAttr(needleHub, 'r', 15);
			needleHub.style.fill = '#333333';
			g.appendChild(needleHub);

			var bottomLine = createSVGElement('line');
			var angleRad = -angleOffset/360 * 2 * Math.PI;
			var x1 = -150 * Math.cos(angleRad),
				x2 = 150 * Math.cos(angleRad),
				y1 = - 150 * Math.sin(-angleRad),
				y2 = y1;
			svgAttr(bottomLine, 'x1', x1); svgAttr(bottomLine, 'y1', y1);
			svgAttr(bottomLine, 'x2', x2); svgAttr(bottomLine, 'y2', y2);
			bottomLine.style.stroke = '#333333';
			bottomLine.style.strokeWidth = 5;
			g.appendChild(bottomLine);



			return g;
		},
		wireEvents: function(control, svgElement, controlInterface) {
			var svg = control.svg;
			var needle = svg.needle;

			var rx = control.getPropertyValue('onReceiveValue');
			//var rxRegexString = rx.replace(/\?/g, '()');
			//var rxRegex = new RegExp(rxRegexString);

			controlInterface.watchForReceive(rx, function(value) {
				//var value = params[0];
				var needleAngle = map(value, 0, 1023, angleSweepMin, angleSweepMax) + angleOffset;
				needleAngle = -needleAngle;
				svgAttr(needle, 'transform', 'rotate(' + needleAngle + ')');
			});

		},
		properties: {
			label: {
				displayName: 'Label',
				type: 'label',
				onChange: function(control, newValue, oldValue) {
					control.svg.label.textContent = newValue;
				}
			},
			onReceiveValue: {
				displayName: 'Change value when received',
				type: 'serial'
			}
		},
	};

	return controlDefinition;
});
