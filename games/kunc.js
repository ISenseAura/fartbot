/**
 * kunc game
 * Cassius - https://github.com/LegoFigure11/Cassius
 *
 * @license MIT license
 */

'use strict';

const name = "kunc";
const kuncSets = require('../data/kunc-sets.json');

class kunc extends Games.Game {
	/**
	 * @param {Room} room
	 */
	constructor(room) {
		super(room);
		this.freeJoin = true;
		/**@type {Array<string>} */
		this.answers = [];
		/**@type {?NodeJS.Timer} */
		this.timeout = null;
		this.hint = '';
		this.points = new Map();
		this.maxPoints = 7;
		this.categories = Object.keys(kuncSets);
	}

	onSignups() {
		this.timeout = setTimeout(() => this.nextRound(), 1 * 1000);
	}

	setAnswers() {
		let category;
		if (this.variation) {
			category = this.variation;
		} else {
			category = Tools.sampleOne(this.categories);
		}
		let kuncAnswerId = Math.floor(Math.random() * 411);
		let kuncSpecies = kuncSets[kuncAnswerId][0];
		let id = Tools.toId(kuncSpecies);
		let kuncMoves = [];
		for (let i = 0; i < 4; i++) {
			kuncMoves.push(kuncSets[kuncAnswerId][1][i][0]);
		}
		let kuncSay = scramble(kuncMoves);
		this.answers = [kuncSpecies];
		this.hint = "__" + kuncSay.join(", ") + "__";
	}

	onNextRound() {
		if (this.answers.length) {
			this.say("Time's up! The answer was __" + this.answers[0] + "__");
		}
		this.setAnswers();
		this.on(this.hint, () => {
			this.timeout = setTimeout(() => this.nextRound(), 15 * 1000);
		});
		this.say(this.hint);
	}
}

exports.name = name;
exports.id = Tools.toId(name);
exports.description = "Players guess the Pokemon from the moves it runs competitively!";
exports.commands = {
	"guess": "guess",
	"g": "guess",
};
exports.aliases = ['kunc'];
exports.modes = ["Survival"];
exports.game = kunc;

/**
 * @param {kunc} game
 */
exports.spawnMochaTests = function (game) {
	if (game.modeId) return;

	const assert = require('assert');

	let tests = {
		/**
		 * @param {Anagrams} game
		 */
		'guess': game => {
			game.signups();
			game.nextRound();
			MessageParser.parseCommand(Config.commandCharacter + 'guess ' + game.answers[0], game.room, Users.add("User 1"));
			assert(game.points.get(game.players['user1']) === 1);
		},
	};

	return tests;
};

function scramble(array) {
	let aLength = array.length;
	let returnArray = [];
	for (let i = 0; i < aLength; i++) {
		let rand = ~~(Math.random() * array.length);
		returnArray.push(array[rand]);
		array.splice(rand, 1);
	}
	return returnArray;
}