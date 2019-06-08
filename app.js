/**
 * App
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * This is the main file that starts Cassius.
 *
 * @license MIT license
 */

const fs = require('fs');
global.online_auth = {};
global.notified = false;
global.topic = {};

global.Tools = require('./tools.js');

try {
	fs.accessSync('./config.js');
} catch (e) {
	if (e.code !== 'ENOENT') throw e;
	console.log("Creating a default config.js file");
	fs.writeFileSync('./config.js', fs.readFileSync('./config-example.js'));
}

// @ts-ignore
global.Config = require('./config.js');
if (!Config.username) throw new Error("Please specify a username in config.js");

global.Commands = require('./commands.js');

global.Rooms = require('./rooms.js').Rooms;

global.Users = require('./users.js').Users;

global.MessageParser = require('./message-parser.js').MessageParser;

global.Client = require('./client.js');

global.Tournaments = require('./tournaments');

global.Games = require('./games.js');

global.Storage = require('./storage.js');
global.Customs = require('./customs.js');
Customs.importDatabases();
Storage.importDatabases();
Storage.globalDatabase = Storage.getDatabase('global');

global.banwords = {};
global.banwords['lobby'] = Storage.getDatabase('lobby').banwords;
global.banwords['dreamyard'] = Storage.getDatabase('dreamyard').banwords;
global.banwords['scholastic'] = Storage.getDatabase('scholastic').banwords;
global.banwords['thecafe'] = Storage.getDatabase('thecafe').banwords;
global.banwords['sports'] = Storage.getDatabase('sports').banwords;
global.banwords['help'] = Storage.getDatabase('help').banwords;

let pluginsList;
let plugins = fs.readdirSync('./plugins');
for (let i = 0, len = plugins.length; i < len; i++) {
	let fileName = plugins[i];
	if (!fileName.endsWith('.js') || fileName === 'example-commands.js' || fileName === 'example-module.js') continue;
	if (!pluginsList) pluginsList = [];
	let file = require('./plugins/' + fileName);
	if (file.name) {
		// @ts-ignore
		global[file.name] = file;
		if (typeof file.onLoad === 'function') file.onLoad();
	}
	if (file.commands) Object.assign(Commands, file.commands);
	pluginsList.push(file);
}

global.Plugins = pluginsList;

if (require.main === module) {
	Games.loadGames();
	Client.connect();
}

	global.uncacheTree = function(root)
	{
		let uncache = [require.resolve(root)];
		do
		{
			let newuncache = [];
			for (let i = 0; i < uncache.length; ++i)
			{
				if (require.cache[uncache[i]])
				{
					newuncache.push.apply(newuncache,
						require.cache[uncache[i]].children.map(function(module)
						{
							return module.filename;
						})
					);
					delete require.cache[uncache[i]];
				}
			}
			uncache = newuncache;
		} while (uncache.length > 0);
	}
