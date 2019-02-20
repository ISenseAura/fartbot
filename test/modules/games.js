'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const room = Rooms.add('mocha');

/**@type {Array<User>} */
const users = [];
for (let i = 0; i < 4; i++) {
	let user = Users.add("User " + i);
	room.onJoin(user, ' ');
	users.push(user);
}

/**@type {Array<any>} */
const games = [];
for (let i in Games.games) {
	let game = Games.getFormat(i);
	if (!game || game.inheritOnly) continue;
	games.push(game);
	if (game.variationIds) {
		for (let i in game.variationIds) {
			let variation = Games.getFormat(game.name + ',' + i);
			if (!variation || !variation.variationId) throw new Error("Games.getFormat('" + game.name + ',' + i + "') did not return a variation.");
			games.push(variation);
		}
	}
	if (game.modeIds) {
		for (let i in game.modeIds) {
			let mode = Games.getFormat(game.name + ',' + i);
			if (!mode || !mode.modeId) throw new Error("Games.getFormat('" + game.name + ',' + i + "') did not return a mode.");
			games.push(mode);
		}
	}
}

describe('Games', function () {
	for (let i = 0, len = games.length; i < len; i++) {
		let game = games[i];
		let name = game.name;
		if (game.modeId) name += " (" + Games.modes[game.modeId].name + ")";
		describe(name, function () {
			beforeEach(function () {
				Games.createGame(game, room);
			});
			afterEach(function () {
				if (room.game) room.game.forceEnd();
			});
			it('should have the necessary functions', function () {
				if (!room.game) throw new Error("Game not created.");
				if (room.game.freeJoin) {
					assert(room.game.onSignups);
				} else {
					assert(room.game.onSignups || room.game.onStart);
				}
				if (room.game.modeId) {
					let mode = Games.modes[room.game.modeId];
					if (mode.requiredProperties) {
						for (let i = 0, len = mode.requiredProperties.length; i < len; i++) {
							assert(mode.requiredProperties[i] in room.game, mode.requiredProperties[i]);
						}
					}
				}
			});
			it('should properly run through a round', function () {
				if (!room.game) throw new Error("Game not created.");
				room.game.signups();
				if (!room.game.freeJoin) {
					let len = users.length;
					for (let i = 0; i < len; i++) {
						assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[i]) === true);
					}
					assert.strictEqual(room.game.playerCount, len);
					room.game.start();
				}
				assert(room.game.started);
				room.game.nextRound();
			});
			it('should support ending at any time', function () {
				if (!room.game) throw new Error("Game not created.");
				room.game.signups();
				if (!room.game.freeJoin) {
					for (let i = 0, len = users.length; i < len; i++) {
						assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[i]) === true);
					}
				}
				room.game.forceEnd();
				Games.createGame(game, room);

				room.game.signups();
				if (!room.game.freeJoin) {
					for (let i = 0, len = users.length; i < len; i++) {
						assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[i]) === true);
					}
					room.game.start();
					room.game.forceEnd();

					Games.createGame(game, room);
					room.game.signups();
					room.game.start();
				}
				if (room.game.started) room.game.nextRound();
				if (room.game) room.game.forceEnd();
			});
			it('should support leaving at any point and late-joining when permitted', function () {
				if (!room.game) throw new Error("Game not created.");
				room.game.signups();
				assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[0]) === true);
				assert(MessageParser.parseCommand(Config.commandCharacter + 'leavegame', room, users[0]) === true);

				room.game.forceEnd();
				Games.createGame(game, room);
				for (let i = 1, len = users.length; i < len; i++) {
					assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[i]) === true);
				}
				room.game.start();
				assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[0]) === true);
				assert(MessageParser.parseCommand(Config.commandCharacter + 'leavegame', room, users[1]) === true);
			});
			it('commands should run at any time', function () {
				if (!room.game) throw new Error("Game not created.");
				room.game.signups();
				if (!room.game.freeJoin) {
					for (let i = 0, len = users.length; i < len; i++) {
						assert(MessageParser.parseCommand(Config.commandCharacter + 'joingame', room, users[i]) === true);
					}
				}

				// before starting
				if (room.game.commands) {
					for (let i in room.game.commands) {
						for (let j in room.game.players) {
							let user = Users.add(room.game.players[j].name);
							if (room.game.pmCommands && (room.game.pmCommands === true || i in room.game.pmCommands)) {
								assert(MessageParser.parseCommand(Config.commandCharacter + i + " mocha", user, user) === true);
							}
							assert(MessageParser.parseCommand(Config.commandCharacter + i + " mocha", room, user) === true);
						}
					}
				}
				room.game.start();

				// before first round
				if (room.game.commands) {
					for (let i in room.game.commands) {
						for (let j in room.game.players) {
							let user = Users.add(room.game.players[j].name);
							if (room.game.pmCommands && (room.game.pmCommands === true || i in room.game.pmCommands)) {
								assert(MessageParser.parseCommand(Config.commandCharacter + i + " mocha", user, user) === true);
							}
							assert(MessageParser.parseCommand(Config.commandCharacter + i + " mocha", room, user) === true);
						}
					}
				}
				if (room.game.round === 0) room.game.nextRound();

				// after first round starts
				if (room.game.commands) {
					for (let i in room.game.commands) {
						for (let j in room.game.players) {
							let user = Users.add(room.game.players[j].name);
							if (room.game.pmCommands && (room.game.pmCommands === true || i in room.game.pmCommands)) {
								assert(MessageParser.parseCommand(Config.commandCharacter + i + " mocha", user, user) === true);
							}
							assert(MessageParser.parseCommand(Config.commandCharacter + i + " mocha", room, user) === true);
						}
					}
				}
			});
			it('should pass any game specfic tests', function () {
				if (!room.game) throw new Error("Game not created.");
				if (game.spawnMochaTests) {
					let tests = game.spawnMochaTests.call(this, room.game);
					if (!tests) return;
					for (let i in tests) {
						room.game.forceEnd();
						Games.createGame(game, room);
						if (!room.game) throw new Error("Game not created.");
						tests[i](room.game);
					}
				}
			});
		});
	}

	let gameTests;
	let directory = path.resolve(__dirname, 'games');
	try {
		gameTests = fs.readdirSync(directory);
	} catch (e) {}
	if (gameTests) {
		for (let i = 0, len = gameTests.length; i < len; i++) {
			if (!gameTests[i].endsWith('.js')) continue;
			require(directory + '/' + gameTests[i]);
		}
	}
});
