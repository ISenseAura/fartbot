/**
 * Config (example)
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * Copy this file to 'config.js' before starting Cassius.
 *
 * @license MIT license
 */

'use strict';

// The username and password that Cassius will use to login
exports.username = 'fart';
// leave this blank if the username is unregistered
exports.password = 'Gary was here! This password is a loser!';

// The server address to which Cassius will connect
exports.server = '';

// The avatar that Cassius will use
exports.avatar = '184';

// A guide for commands and features
exports.guide = '';

// Rooms that Cassius will attempt to join after logging in
// example: exports.rooms = ['room1', 'room2', 'room3'];
/**@type {Array<string>} */
exports.rooms = [ 'dreamyard', 'lobby'];

// Rooms where scripted games are enabled
/**@type {Array<string>} */
exports.games = ['dreamyard'];

// Rooms where scripted tournaments are enabled
/**@type {Array<string>} */
exports.tournaments = [];

// The default cap to use for scripted tournaments
exports.defaultTournamentCap = 0;

// The character that determines which messages are read as commands
exports.commandCharacter = '~';

// Symbols and rankings for the server's user groups
exports.groups = {
	'\u203d': 0,
	'!': 0,
	' ': 0,
	'+': 1,
	'%': 2,
	'@': 3,
	'*': 3,
	'#': 4,
	'&': 5,
	'~': 6,
};

// Words that are either filtered or auto-locked by the server
/**@type {Array<string>} */
exports.bannedWords = [];

// Userids of those who have debug access to Cassius
// example: exports.developers = ['devuser1', 'devuser2', 'devuser3'];
/**@type {Array<string>} */
exports.developers = ['fart', 'not fart'];

// Custom functions
/**@type {?Function} */
exports.parseMessage = null;
/**@type {?Function} */
exports.moderate = null;

/**@type {boolean | {[k: string]: boolean}} */
exports.allowModeration = false;

let punishmentPoints = {
	'verbalwarn': 0,
	'warn': 1,
	'mute': 2,
	'hourmute': 3,
	'roomban': 4,
};

let punishmentActions = {};
for (let i in punishmentPoints) {
	punishmentActions['' + punishmentPoints[i]] = i;
}

exports.punishmentPoints = punishmentPoints;
exports.punishmentActions = punishmentActions;

// Reasons used when Cassius punishes a user for
// flooding, stretching, caps, etc.
// example: punishmentReasons = {'flooding': 'please do not flood the chat'}

/**@type {?{[k: string]: string}} */
exports.punishmentReasons = null;

exports.allowMail = false;
