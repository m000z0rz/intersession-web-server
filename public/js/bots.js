var Bot = (function() {
	var Bot = function(_botID, _name, _creator, _defaultControllerID, _defaultPort) {
		var self = this;

		var botID = +_botID;
		var name = _name;
		var creator = _creator;
		var defaultControllerID = _defaultControllerID;
		var defaultPort = _defaultPort;

		var saveCallback = function(data) {
			if(data && data.err) console.log('bot save err ', data.err);
		};

		this.botID = function(value) {
			if(value === undefined) return botID;
			else {
				//botID = value;
				// no need to save
			}
		};

		this.name = function(value) {
			if(value === undefined) return name;
			else {
				name = value;
				self.save(saveCallback);
			}
		};

		this.creator = function(value) {
			if(value === undefined) return creator;
			else {
				creator = value;
				self.save(saveCallback);
			}
		};

		this.defaultControllerID = function(value) {
			if(value === undefined) return defaultControllerID;
			else {
				defaultControllerID = value;
				self.save(saveCallback);
			}
		};

		this.defaultPort = function(value) {
			if(value === undefined) return defaultPort;
			else {
				defaultPort = value;
				self.save(saveCallback);
			}
		};

		this.setDefaults = function (controllerID, port) {
			defaultControllerID = controllerID;
			defaultPort = port;
			self.save(saveCallback);
		};






		this.toJSON = function() {
			return {
				botID: self.botID(),
				name: self.name(),
				creator: self.creator(),
				defaultControllerID: self.defaultControllerID(), 
				defaultPort: self.defaultPort()
			};
		};


		this.save = function(callback) {
			//var controllers = JSON.parse(localStorage.getItem('controllers')) || {};
			var thisJSON = this.toJSON();

			if(webSocket.socket.connected) {
				webSocket.emit('saveBot', {bot: thisJSON}, function(data) {
					if(callback && typeof callback === 'function') callback(data);
				});
			}
		};
	};

	Bot.prototype = new EventEmitter();


	var botCache = {};

	Bot.fromJSON = function(json) {
		var bot = new Bot(json.botID, json.name, json.creator, json.defaultControllerID, json.defaultPort);

		return bot;
	};

	Bot.fetchByID = function(botID, callback) {
		var botJSON;

		if(botCache[botID] !== undefined) {
			callback(botCache[botID]);
			return;
		}

		var localFallback = function() {
			console.log('no local fallback on bot.fetchByID');
			return;
		};

		if(webSocket.socket.connected) {
			webSocket.emit('fetchBot', { botID: +botID }, function(data) {
				if(data.err) {
					console.log('bot fetch err ', data.err);
					localFallback();
				} else {
					if(data.bot && data.bot !== '') {
						var bot = Bot.fromJSON(data.bot);
						botCache[botID] = bot;

						callback(bot);
					}
					else callback();
				}
			});
		} else {
			localFallback();
		}
	};

	return Bot;
}) ();