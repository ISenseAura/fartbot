/**
 * Commands
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * This file contains the base commands for Cassius.
 *
 * @license MIT license
 */

'use strict';

// Users who use the settour command when a tournament is already
// scheduled will be added here and prompted to reuse the command.
// This prevents accidentally overwriting a scheduled tournament.
/**@type {Map<string, string>} */
let overwriteWarnings = new Map();

const juration = require('./lib/juration');
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const wtf = require('wtf_wikipedia');

let repeatTimers = {};
var first = true;

/**@type {{[k: string]: Command | string}} */
let commands = {
	// Developer commands
	js: 'eval',
	eval: function (target, room, user) {
		if (!user.isDeveloper()) return;
		try {
			target = eval(target);
			this.say(JSON.stringify(target));
		} catch (e) {
			this.say(e.name + ": " + e.message);
		}
	},

	// General commands
	about: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '+')) return;
		this.say(Config.username + " code by sirDonovan and fart: https://github.com/tmagicturtle/fartbot");
	},
	help: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '+')) return;
		if (!Config.guide) return this.say("There is no guide available.");
		this.say(Users.self.name + " guide: " + Config.guide);
	},
	
	mail: function (target, room, user) {
		if (!(room instanceof Users.User) || !Config.allowMail) return;
		let targets = target.split(',');
		if (targets.length < 2) return this.say("Please use the following format: .mail user, message");
		let to = Tools.toId(targets[0]);
		if (!to || to.length > 18 || to === Users.self.id || to.startsWith('guest')) return this.say("Please enter a valid username");
		let message = targets.slice(1).join(',').trim();
		let id = Tools.toId(message);
		if (!id) return this.say("Please include a message to send.");
		if (message.length > (258 - user.name.length)) return this.say("Your message is too long.");
		let database = Storage.getDatabase('global');
		if (to in database.mail) {
			let queued = 0;
			for (let i = 0, len = database.mail[to].length; i < len; i++) {
				if (Tools.toId(database.mail[to][i].from) === user.id) queued++;
			}
			if (queued >= 3) return this.say("You have too many messages queued for " + Users.add(targets[0]).name + ".");
		} else {
			database.mail[to] = [];
		}
		database.mail[to].push({time: Date.now(), from: user.name, text: message});
		Storage.exportDatabase('global');
		this.say("Your message has been sent to " + Users.add(targets[0]).name + "!");
	},
	
	seerepeats: 'seerepeat',
	seerepeat: function (target, room, user) {
		if (!user.isDeveloper()) return;
		Tools.uploadToHastebin(JSON.stringify(Storage.globalDatabase.repeat), /**@param {string} hastebinUrl */ hastebinUrl => {
			this.say("All repeats: " + hastebinUrl);
		});
	},
	
	settopic: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '@') && !user.isDeveloper()) return;
		if (room instanceof Users.User) {
			var res = target.split("|");
			if (res.length === 1) {
				this.say("Format: ~settopic room|topic");
			} else {
				var roomid = res[0].toLowerCase().replace(/\s/g, '');
				var roomobj = Rooms.rooms[roomid];
				if (!user.hasRank(roomobj, '@') && !user.isDeveloper()) {this.say("Insufficient privileges."); return;}
				global.topic[roomid] = res[1];
				this.say("Topic set in "+roomid+".");
			}
		} else {
			global.topic[room.id] = target;
			this.say("Topic set.");
		}
	},
	
	settopichtml: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '@') && !user.isDeveloper()) return;
		if (room instanceof Users.User) {
			var res = target.split("|");
			if (res.length === 1) {
				this.say("Format: ~settopichtml room|topic");
			} else {
				var roomid = res[0].toLowerCase().replace(/\s/g, '');
				var roomobj = Rooms.rooms[roomid];
				if (!user.hasRank(roomobj, '@') && !user.isDeveloper()) {this.say("Insufficient privileges."); return;}
				global.topic[roomid] = "/adduhtml t, "+res[1];
				this.say("Topic set in "+roomid+".");
			}
		} else {
			global.topic[room.id] = "/adduhtml t, "+target;
			this.say("Topic set.");
		}
	},
	
	topic: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '%') && !user.isDeveloper()) return;
		if (global.topic[room.id]) {
			this.say(global.topic[room.id]);
		} else {
			this.say("No topic found for this room.");
		}
	},
	
	repeat: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '%') && !user.isDeveloper()) return;
		let targetRoom = this.room instanceof Users.User ? 'in PM' : this.room.id;
		if (targetRoom === 'lobby' && !user.hasRank(room, '@') && !user.isDeveloper()) return;
		let [interval, times, ...repeatMsg] = target.split('|');
		if (!(interval && times && repeatMsg.length)) return this.say("/w " + user.name + ", Syntax: ~repeat <interval>| <times>| <target to repeat>");
		if (!(Number(interval))){
		try {
			interval = juration.parse(interval) * 1000;
		} catch(err) {
			interval = Number(interval) * MINUTE;
		}} else { interval = Number(interval) * MINUTE; }
		if (!interval) return this.say("/w " + user.name + ", Invalid value for interval.");
		if (interval < 5000) { interval = 5000; }
		times = Number(times);
		if (!times) return this.say("/w " + user.name + ", Invalid value for times");
		repeatMsg = repeatMsg.join(',').trim();
		if (repeatMsg.startsWith('/leave') || repeatMsg.startsWith('/part') || (repeatMsg.startsWith('/m') && !repeatMsg.startsWith('/me')) || repeatMsg.startsWith('/hm') || repeatMsg.startsWith('/roomban') || repeatMsg.startsWith('/rb') || repeatMsg.startsWith('/k') || repeatMsg.startsWith('/pm') || repeatMsg.startsWith('/warn')) return this.say("/w " + user.name + ", Please do not enter moderation commands in ``\\repeat``");
		let id = repeatMsg;
		let database = Storage.getDatabase('global');
		if (id in database.repeat) return this.say("/w " + user.name + ", This message is already being repeated.");
		let repeatObj = {msg: repeatMsg, timesLeft: times, interval: interval, room: this.room.id};
		database.repeat[id] = (repeatObj);
		repeatTimers[id] = setTimeout(() => runRepeat(id), interval);
		Storage.exportDatabase('global');
		return this.say(repeatMsg);

		function runRepeat(id) {
			let obj = database.repeat[id];
			if (!obj) return; // failsafe
			if (obj.timesLeft--) {
				Client.send(`${obj.room}|${obj.msg}`);
				repeatTimers[id] = setTimeout(() => runRepeat(id), obj.interval);
			} else {
				delete database.repeat[id];
				delete repeatTimers[id];
			}
			Storage.exportDatabase('global');
		}
	},
	clearrepeat: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '%') && !user.isDeveloper()) return;
		let id = target;
		let database = Storage.getDatabase('global');
		if (id in database.repeat) {
			delete database.repeat[id];
			delete repeatTimers[id];
			this.say("Message cleared.");
			Storage.exportDatabase('global');
		} else {return this.say("This message is not being repeated!");}
	},
	
	randtopic: function (target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '+')) return;
		var pokemonA = require('pokemon-random')();
		var pokemonB = require('pokemon-random')();
		var pokemonC = require('pokemon-random')();
		if (room.id == "lobby") {
			var questions = [
				"/wall How would you improve "+pokemonB+"?",
				"/wall Who would win: "+pokemonA+" or "+pokemonB+"?",
				"/wall Which would be more terrifying in real life: "+pokemonA+" or "+pokemonB+"?",
				"/wall Which Pokémon city or town would you want to live and why?",
			];
		}
			var rand = Tools.sampleOne(questions);
			this.say(rand);
	},
	
	convert: function (target, room, user){
		if (!user.hasRank(room, '+') && !(room instanceof Users.User) && !user.isDeveloper()) return;
		var first = target.split(",")[0].toLowerCase();
		var second = target.split(",")[1].toLowerCase().trim();

		if (first.includes("c")) {
			var celsius = parseInt(first);
			if (celsius < (-273.15)) {
				room.say('Temperature is below absolute zero (−273.15°C).');
				return;
			}
			if (second.includes("c")) {
				room.say(celsius+"º Celsius = "+celsius+"º Celsius.");
				return;
			}
			if (second.includes("f")) {
				var f = celsius * 9 / 5 + 32;
				f = Math.round(f * 100) / 100;
				room.say(celsius+"º Celsius = "+f+"º Fahrenheit.");
				return;
			}
			if (second.includes("k")) {
				room.say(celsius+"º Celsius = "+Math.floor(100*(celsius+273.15))/100+"º Kelvin.");
				return;
			}
		}
		if (first.includes("f")) {
			var f = parseInt(first);
			if (f < (-450)) {
				room.say('Temperature is below absolute zero (−450°F).');
				return;
			}
			if (second.includes("f")) {
				room.say(f+"º Fahrenheit = "+f+"º Fahrenheit.");
				return;
			}
			if (second.includes("c")) {
				var celsius = (f-32) * 5 / 9;
				celsius = Math.round(celsius * 100) / 100;
				room.say(f+"º Fahrenheit = "+celsius+"º Celsius.");
				return;
			}
			if (second.includes("k")) {
				var k = (f-32) * 5 / 9 +273.15;
				k = Math.round(k * 100) / 100;
				room.say(f+"º Fahrenheit = "+(k)+"º Kelvin.");
				return;
			}
		}
		if (first.includes("k")) {
			var k = parseInt(first);
			if (k < (0)) {
				room.say('Temperature is below absolute zero (0°K).');
				return;
			}
			if (second.includes("k")) {
				room.say(k+"º Kelvin = "+k+"º Kelvin.");
				return;
			}
			if (second.includes("c")) {
				room.say(k+"º Kelvin = "+Math.floor((k-273.15)*100)/100+"º Celsius.");
				return;
			}
			if (second.includes("f")) {
				var f = (k-273.15-32)*5/9;
				f = Math.round(f * 100) / 100;
				room.say(k+"º Kelvin = "+(f)+"º Fahrenheit.");
				return;
			}
		}
	},
	
	wiki: function(target, room, user) {
		if (room.id == 'help') return;
		if (!(room instanceof Users.User) && !user.hasRank(room, '+') && !user.isDeveloper()) return;
		(async () => {
			var res = target.split(", ");
			if (res[1] !== undefined) {
				var doc = await wtf.fetch(res[0], res[1]);
			}
			else {
				var doc = await wtf.fetch(target);
			}
			if (doc.sentences(1)) {
				this.say(doc.sentences(0).text()+" "+doc.sentences(1).text()+" [[wiki:"+res[0]+"]]", true);
			}
		})();
	},
	
	randwiki: function(target, room, user) {
		if (room.id == 'help') return;
                if (!(room instanceof Users.User) && !user.hasRank(room, '+') && !user.isDeveloper()) return;
                (async () => {
			if(target) {
				var doc = await wtf.random(target);
			} else {
                        	var doc = await wtf.random("en");
			}
			if (doc.sentences(1)) {
	                        this.say(doc.sentences(0).text()+" "+doc.sentences(1).text()+" [[wiki:"+doc.title()+"]]", true);
			}
                })();
	},
	
	banword: function(target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '@') && !user.isDeveloper()) return;
		if (room instanceof Users.User) {
			var res = target.split("|");
			if (res.length === 1) {
				this.say("Format: ~banword room|WORD");
			} else {
				var roomid = res[0].toLowerCase().replace(/\s/g, '');
				var roomobj = Rooms.rooms[roomid];
				if (!user.hasRank(roomobj, '@') && !user.isDeveloper()) {
					this.say("Insufficient privileges.");
					return;
				}
				let msg = res[1];
				let database = Storage.getDatabase(roomid);
				if (!(database.banwords)) {
					database["banwords"] = [msg];
					global.banwords[roomid] = [msg];
				} else {
					var r = database["banwords"];
					r.push(msg);
					database["banwords"] = r;
					global.banwords[roomid] = r;
				}
				Storage.exportDatabase(roomid);
				this.say("Banword added in "+roomid+".");
				Client.send(roomid+"|/modnote BANWORD ("+msg+") added by "+user.name);
			}
		} else {
			let msg = res[1];
			let database = Storage.getDatabase(room.id);
			if (!(database.banwords)) {
				database["banwords"] = [msg];
				global.banwords[roomid] = [msg];
			} else {
				var r = database["banwords"];
				r.push(msg);
				database["banwords"] = r;
				global.banwords[roomid] = r;
			}
			Storage.exportDatabase(room.id);
			this.say("Banword added.");
			Client.send(room.id+"|/modnote BANWORD ("+msg+") added by "+user.name);
		}
	},

	removebanword: "deletebanword",
	deletebanword: function(target, room, user) {
		if (!(room instanceof Users.User) && !user.hasRank(room, '@') && !user.isDeveloper()) return;
		if (room instanceof Users.User) {
			var res = target.split("|");
			if (res.length === 1) {
				this.say("Format: ~deletebanword room|WORD");
			} else {
				var roomid = res[0].toLowerCase().replace(/\s/g, '');
				var roomobj = Rooms.rooms[roomid];
				if (!user.hasRank(roomobj, '@') && !user.isDeveloper()) {
					this.say("Insufficient privileges.");
					return;
				}
				let msg = res[1];
				let database = Storage.getDatabase(roomid);
				if (!(database.banwords)) {
					return this.say("There are no banwords in "+roomid);
				} else {
					var r = database["banwords"];
					r.remByVal(msg);
					database["banwords"] = r;
					global.banwords[roomid] = r;
				}
				Storage.exportDatabase(roomid);
				this.say("Banword removed from "+roomid+".");
				Client.send(roomid+"|/modnote BANWORD ("+msg+") removed by "+user.name);
			}
		} else {
			let msg = res[1];
			let database = Storage.getDatabase(room.id);
			if (!(database.banwords)) {
				return this.say("There are no banwords in "+roomid);
			} else {
				var r = database["banwords"];
				r.remByVal(msg);
				database["banwords"] = r;
				global.banwords[roomid] = r;
			}
			Storage.exportDatabase(room.id);
			this.say("Banword removed.");
			Client.send(room.id+"|/modnote BANWORD ("+msg+") removed by "+user.name);
		}
	},
	
	recipe: function (target, room, user) {
		if (room.id == 'help') return;
		if (!user.hasRank(room, '+') && !(room instanceof Users.User)) return;
		target = target.replace(/å/g, 'a');target = target.replace(/ä/g, 'a');
		function initialize() {
			// Setting URL and headers for request
			var options = {
				url: 'https://api.edamam.com/search?q='+target+'&app_id=&app_key=&from=0&to=5',
				headers: {
					'User-Agent': 'request'
				}
			};
			// Return new promise
			return new Promise(function(resolve, reject) {
				// Do async job
				request.get(options, function(err, resp, body) {
					if (err) {
						reject(err);
					} else {
						resolve(JSON.parse(body));
					}
				});
			});
		}
		initialize().then(function(data) {
			var recipe = Tools.sampleOne(data.hits).recipe;
			var image = recipe.image;
			var url = recipe.url;
			var title = recipe.label;
			var labels = '';
			var ingredients = '';
			recipe.dietLabels.forEach(function(item){
  				labels = labels + item + ', '
			});
			recipe.healthLabels.forEach(function(item){
  				labels = labels + item + ', '
			});
			recipe.ingredientLines.forEach(function(item){
  				ingredients = ingredients + '<br>' + item;
			});
			labels = labels.substring(0, labels.length-2);
			if (!(room instanceof Users.User)) {
				var html = '/adduhtml '+Math.random()+', <div class="infobox"><table><tbody><tr><td style="padding-right: 5px">';
				html = html + '<img src="'+image+'" height="75" width="75"/></td><td>';
				html = html + '<i>'+labels+'</i><br>'
			} else {
				var html = '/pminfobox '+user.id+',<table><tbody><tr><td style="padding-right: 5px">';
			}
			html = html + '<a href="'+recipe.url+'"><b>'+recipe.label+'</b> by '+recipe.source+'</a><br>';
			html = html + '<details><summary>Ingredients</summary>';
			html = html + ingredients;
			if (!(room instanceof Users.User)) {
				html = html + '</details></td></tr></tbody></table></div>'
				room.say(html, true);
			} else {
				html = html + '</details></td></tr></tbody></table>';
				Client.send('|'+html);
			}
		});
	},
	
	randdish: "randrecipe",
	randrecipe: function (target, room, user) {
		if (room.id == 'help') return;
		if (!user.hasRank(room, '+') && !(room instanceof Users.User)) return;
		var myArray = ['chicken', 'steak', 'pork', 'fish', 'egg', 'tofu', 'artichoke', 'eggplant', 'asparagus', 'cabbage', 'broccoli', 'salad', 'parmesan', 'pizza', 'burger', 'spicy', 'potato', 'ham', 'cheese'];
		var rand = Tools.sampleOne(myArray);

		function initialize() {
			// Setting URL and headers for request
			var options = {
				url: 'https://api.edamam.com/search?q='+rand+'&app_id=&app_key=&from=0&to=5',
				headers: {
					'User-Agent': 'request'
				}
			};
			// Return new promise
			return new Promise(function(resolve, reject) {
				// Do async job
				request.get(options, function(err, resp, body) {
					if (err) {
						reject(err);
					} else {
						resolve(JSON.parse(body));
					}
				});
			});
		}

		initialize().then(function(data) {
			var recipe = Tools.sampleOne(data.hits).recipe;
			var image = recipe.image;
			var url = recipe.url;
			var title = recipe.label;
			var labels = '';
			var ingredients = '';
			recipe.dietLabels.forEach(function(item){
  				labels = labels + item + ', '
			});
			recipe.healthLabels.forEach(function(item){
  				labels = labels + item + ', '
			});
			recipe.ingredientLines.forEach(function(item){
	  			ingredients = ingredients + '<br>' + item;
			});
			labels = labels.substring(0, labels.length-2);
			if (!(room instanceof Users.User)) {
				var html = '/adduhtml '+Math.random()+', <div class="infobox"><table><tbody><tr><td style="padding-right: 5px">';
				html = html + '<img src="'+image+'" height="75" width="75"/></td><td>';
				html = html + '<i>'+labels+'</i><br>'
			} else {
				var html = '/pminfobox '+user.id+',<table><tbody><tr><td style="padding-right: 5px">';
			}
			html = html + '<a href="'+recipe.url+'"><b>'+recipe.label+'</b> by '+recipe.source+'</a><br>';
			html = html + '<details><summary>Ingredients</summary>';
			html = html + ingredients;
			if (!(room instanceof Users.User)) {
				html = html + '</details></td></tr></tbody></table></div>';
				room.say(html, true);
			} else {
				html = html + '</details></td></tr></tbody></table>';
				Client.send('|'+html);
			}
		});
	},

	randathlete: function (target, room, user) {
		if (room.id !== 'lobby' && room.id !== 'sports') return;
		if (!user.hasRank(room, '+')) return;
		function initialize() {

			var nfl_teams = ["SF",  "CHI", "CIN", "BUF", "DEN", "CLE", "ARI", "LAC", "KC", "IND", "DAL", "MIA", "PHI", "ATL", "NYG", "JAC", "NYJ", "DET", "GB", "CAR", "MIN", "NEP", "OAK", "LAR", "BAL", "WAS", "NO", "SEA", "PIT", "TB", "HOU", "TEN"];
			var team = Tools.sampleOne(nfl_teams);

			// Setting URL and headers for request
			var options = {
				url: 'https://api.fantasydata.net/v3/nfl/stats/JSON/Players/'+team,
  				headers: {
    					'User-Agent': 'request',
    					'Ocp-Apim-Subscription-Key': ''
  				}
			};
			// Return new promise
			return new Promise(function(resolve, reject) {
  				// Do async job
  				request.get(options, function(err, resp, body) {
    					if (err) {
      						reject(err);
    					} else {
      						resolve(JSON.parse(body));
    					}
  				});
			});
		}
		initialize().then(function(data) {
			var player = Tools.sampleOne(data);
			var name = player['Name'];
			var team = player['CurrentTeam'];
			var position = player['Position'];
			var image = player['PhotoUrl'];
			var html = '/adduhtml '+Math.random()+', <div class="infobox"><table><tbody><tr><td style="padding-right: 5px">';
			html = html + '<img src="'+image+'" height="90" width="65"/></td><td>';
			html = html + '<b>'+name+'</b> ('+team+'-'+position+')';
			html = html + '</td></tr></tbody></table></div>';
			room.say(html, true);
		});
	},


};

module.exports = commands;
