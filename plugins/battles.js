/**
 * YouTube
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * Fetches YouTube video information and handles
 * adding videos to the database
 *
 * @license MIT license
 */

'use strict';

const MIN_TIME_LOCK = 3 * 1000;
/*

const https = require('https');
const youtubeRegex = /https:\/\/(youtu\.be\/|(www\.)?youtube\.com\/watch\?v=)[A-Za-z0-9\-_]{11}/g;
const linkCooldowns = {};
*/
/**
 * @param {Room} room
 * @param {string} messageType
 * @param {Array<string>} splitMessage
 */
function parseMessage(room, messageType, splitMessage) {
	if (room.id.indexOf('battle-') === -1) return;
	var str = "/choose ";
	switch (messageType) {
	case 'request': 
		if(!room.hasSent) {
			room.say("Hi! I'm a robot, so if something goes wrong please feel free to timer me!");
			room.say('glhf');
			room.say('/timer on');
		}
		room.hasSent = true;
		//console.log("hi");
		break;
	case 'teampreview':
		//console.log("hello");
		room.say("/team " + Math.floor(Math.random() * 6 + 1));
		room.say("/team " + Math.floor(Math.random() * 6 + 1));
		room.say("/team " + Math.floor(Math.random() * 6 + 1));
		break;
	case '-mustrecharge':
		room.say("/choose move 1");
		break;
	case 'turn':
		//console.log("yea");
		room.say("/choose move " + Math.floor(Math.random() * 4 + 1));
		break;
	case 'win':
		room.say("gg");
		console.log(messageType);
		console.log(splitMessage);
		room.say("/search gen7challengecup1v1");
		room.say("/leave");
		break;
	case 'error':
		room.say("/choose move " + Math.floor(Math.random() * 4 + 1));
		room.say("/choose move " + Math.floor(Math.random() * 4 + 1));
		room.say("/choose move " + Math.floor(Math.random() * 4 + 1));
		room.say("/choose move " + Math.floor(Math.random() * 4 + 1));
			
		/*
		let message = splitMessage.slice(1).join('|');
		let link = message.match(youtubeRegex);
		if (link) {
			for (let i = 0, len = link.length; i < len; i++) {
				parseYouTubeLink(room, link[i]);
			}
		}
		break;
	}
	case 'c:': {
		let message = splitMessage.slice(2).join('|');
		let link = message.match(youtubeRegex);
		if (link) {
			for (let i = 0, len = link.length; i < len; i++) {
				parseYouTubeLink(room, link[i]);
			}
		}
		break;*/
	}
}

exports.parseMessage = parseMessage;

/**
 * @param {Room} room
 * @param {string} link
 */

