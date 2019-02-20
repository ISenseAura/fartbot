/**
 * Storage
 * Cassius - https://github.com/sirDonovan/Cassius
 *
 * This file handles the storage of room databases
 *
 * @license MIT license
 */

'use strict';

const fs = require('fs');
const BACKUP_INTERVAL = 60 * 60 * 1000;

const CUSTOMS_FILE = "./databases/customs.json";
const CUSTOM_ALIASES_FILE = "./databases/custom-aliases.json";

class Customs {
	constructor() {
		this.customs = {};
		this.deletedCustoms = [];
		this.customAliases = {};
	}

	exportDatabases() {
		this.exportDatabaseToFile(this.customs, CUSTOMS_FILE);
		this.exportDatabaseToFile(this.customAliases, CUSTOM_ALIASES_FILE);
	}

	exportDatabaseToFile(database, fileName) {
		fs.writeFileSync(fileName, JSON.stringify(database));
	}

	importDatabases() {
		// Custom BackupCommands
		let file = '{}';
		try {
			file = fs.readFileSync(CUSTOMS_FILE).toString();
		} catch (e) {}
		this.customs = JSON.parse(file);
		file = '{}';
		try {
			file = fs.readFileSync(CUSTOM_ALIASES_FILE).toString();
		} catch (e) {}
		this.customAliases = JSON.parse(file);
	}

	updateBackupCommands() {
		for (let custom of this.deletedCustoms) {
			if (custom in BackupCommands) {
				delete BackupCommands[custom];
			}
		}
		for (let name in this.customs) {
			if (name in BackupCommands) {
				delete BackupCommands[name];
			}
			let response = this.customs[name];
			BackupCommands[name] = function (target, room, user) {
				room.say(response);
			};
		}

		for (let alias in this.customAliases) {
			if (alias in BackupCommands) {
				delete BackupCommands[alias];
			}
			BackupCommands[alias] = this.customAliases[alias];
		}
	}

	parse(text) {
		let splitText = text.split(",");
		if (splitText.length < 2) {
			return "You must specify a command and the corresponding text";
		}
		let commandText = splitText.slice(1).join(",").trim();
		if (commandText.length == 0) {
			return "You must specify the command corresponding to **" + splitText[0] + "**.";
		}
		return [Tools.toId(splitText[0]), splitText.slice(1).join(",").trim()];
	}

	addCustom(textArray) {
		this.customs[textArray[0]] = textArray[1];
		this.updateBackupCommands();
		this.exportDatabases();
	}

	removeCustom(text, room) {
		let id = Tools.toId(text);
		if (!(id in this.customs || id in this.customAliases)) {
			return room.say("No custom matching **" + text + "** was found");
		}

		if (id in this.customs) delete this.customs[id];
		if (id in this.customAliases) delete this.customAliases[id];
		this.deletedCustoms.push(id);
		this.updateBackupCommands();
		this.exportDatabases();
		room.say("Custom command successfully removed.");
	}

	addCustomAlias(textArray) {
		this.customAliases[textArray[0]] = Tools.toId(textArray[1]);
		this.updateBackupCommands();
		this.exportDatabases();
	}
}

module.exports = new Customs();