const fs = require("fs");
const path = require("path")
	const sqlite3 = require("sqlite3")
	const userdb = new sqlite3.Database("game.db")

	exports._db = userdb
	//don't use unless there isn't a function for it
	//and even then it's probably best to write a function for it anyway

	const utils = require("./utils.js")
	const config = require('./config');
const discord = require('discord.js')

	let game_state = {};

exports.commands = {}

exports.season_code = function () {
	return game_state.season_code;
}

exports.state_num = function () {
	return game_state.state_num;
	/**
	0 - pre-signups
	1 - signups
	2 - in progress
	3 - finished
	 */
}

function write_game_state() {
	fs.writeFileSync("./game_state.json", JSON.stringify(game_state)); //error handling?
	utils.debugMessage("Game state saved");
}

exports.init = function (reset_data) {
	// called on bot start
	fs.readFile(path.join(__dirname, 'game.db'), {
		encoding: "utf-8"
	}, function (err, data) {
		if (err)
			throw err;
		if (data === '' || reset_data) { // database is empty and needs to be created
			fs.readFile(path.join(__dirname, 'game_db_schema.sql'), {
				encoding: "utf-8"
			}, function (er, schema) {
				if (er) {
					throw er
				} else {
					utils.warningMessage(reset_data ? "You chose to reset the game data for this bot, creating new user database." : "User database not found - creating a new one");
					userdb.exec(schema);
					if (reset_data) {
						utils.warningMessage("Database reset.");
					} else {
						utils.successMessage("Database created!");
					}
				}
			})
		}
	})
	if (!fs.existsSync('./game_state.json') || reset_data) { //game_state.json may not exist
		if (!reset_data)
			utils.warningMessage("game_state.json does not exist. Creating it.");
		else
			utils.warningMessage("Resetting game state");
		game_state.season_code = "default";
		game_state.state_num = 0;
		write_game_state();
	} else {
		game_state = require('./game_state.json');
	}
}

exports.commands.remove = function (msg, client, content) {
	utils.debugMessage(`@${msg.author.username} ran "g remove" command with emoji ${content[0]}. Current game-state is ${game_state.state_num}`)
	// command for removing player
	if(game_state.state_num > 1){
		msg.reply("game is in progress already");
		return;
	}

	exports.resolve_to_id_all(content[0]).then((id) => {
		removePlayer(id).then(()=>{
			msg.reply(`successfully removed <@${id}>!`);
		});
	}).catch((err) => {
		if(err){
			msg.reply(`error occurred`);
			utils.errorMessage(err.stack);
		}else{
			msg.reply(`player has not signed up yet`);
		}
	});
}

exports.commands.gsignup = function (msg, client, content) {
	utils.debugMessage(`@${msg.author.username} ran signup command with emoji ${content[0]}. Current game-state is ${game_state.state_num}`)
	// command for signing yourself up
	if (game_state.state_num !== 1) {
		if (game_state.state_num == 0) {
			msg.reply("signups aren't open yet!")
		} else {
			msg.reply("a game " + (game_state.state_num == 2 ? "is currently in progress. Please wait for it to finish before signing up." : "has just finished. Please wait for the next season to start."))
		}
	} else {
		if (content.length != 2) {
			msg.reply(`I'm glad you want to sign up someone else but the correct syntax is \`${config.bot_prefix}gsignup <emoji> <mention_of_player>\``)
		} else {
			if(!id(content[1])){
				msg.reply(`I'm glad you want to sign up someone else but the correct syntax is \`${config.bot_prefix}gsignup <emoji> <mention_of_player>\``)
				return;
			}
			msg.react(content[0]).then(mr => {
				msg.clearReactions();
				getUserId(utils.toBase64(content[0])).then((id) => {
					// already in use
					msg.channel.send(`Sorry but <@${id}> is already using that emoji!`); //really?
				}).catch(() => {
					addUser(client, id(content[1]), utils.toBase64(content[0])).then(old => {
						if (old) {
							msg.channel.send(`<@${id(content[1])}>'s emoji was changed from ${utils.fromBase64(old)} to ${content[0]}`)
						} else {
							msg.channel.send(`<@${id(content[1])}> was signed up with emoji ${content[0]}`);
						}
					})
				})
			}).catch(() => { // react
				msg.reply(`${content[0]} is not a valid emoji...`)
			})
		}
	}
}

exports.commands.signup = function (msg, client, content) {
	utils.debugMessage(`@${msg.author.username} ran signup command with emoji ${content[0]}. Current game-state is ${game_state.state_num}`)
	// command for signing yourself up
	if (game_state.state_num !== 1) {
		if (game_state.state_num == 0) {
			msg.reply("signups aren't open yet!")
		} else {
			msg.reply("a game " + (game_state.state_num == 2 ? "is currently in progress. Please wait for it to finish before signing up." : "has just finished. Please wait for the next season to start."))
		}
	} else {
		if (content.length != 1) {
			msg.reply(`I'm glad you want to sign up but the correct syntax is \`${config.bot_prefix}signup <emoji>\``)
		} else {
			msg.react(content[0]).then(mr => {
				msg.clearReactions();
				getUserId(utils.toBase64(content[0])).then((id) => {
					// already in use
					msg.channel.send(`Sorry but <@${id}> is already using that emoji!`); //really?
				}).catch(() => {
					addUser(client, msg.author.id, utils.toBase64(content[0])).then(old => {
						if (old) {
							msg.channel.send(`<@${msg.author.id}>'s emoji changed from ${utils.fromBase64(old)} to ${content[0]}`)
						} else {
							msg.channel.send(`<@${msg.author.id}> signed up with emoji ${content[0]}`);
						}
					})
				})
			}).catch(() => { // react
				msg.reply(`${content[0]} is not a valid emoji...`)
			})
		}
	}
}

exports.commands.opensignups = function (msg, client, content) {
	if (game_state.state_num !== 0) {
		if (game_state.state_num == 1) {
			msg.reply("signups are already open -_-")
		} else {
			msg.reply("a game " + (game_state.state_num == 2 ? "is already in progress. Please wait for it to finish." : "has just finished. Please ask the devs to know how to start a new season."))
		}
	} else {
		game_state.state_num = 1;
		write_game_state();
		msg.reply("signups opened!");
	}
}

exports.commands.startseason = function (msg, client, content) {
	if (game_state.state_num !== 1) {
		if (game_state.state_num == 0) {
			msg.reply("signups aren't open yet, who do you expect will be playing?")
		} else {
			msg.reply("a game " + (game_state.state_num == 2 ? "is already in progress. Please wait for it to finish." : "has just finished. Please ask the devs to know how to start a new season."))
		}
	} else {
		//what here?
		//I'm not sure
		if (game_state.season_code == "default") {
			msg.reply("set a season code first!");
		} else {
			exports.all_alive().then(async function (rows) {
				utils.debugMessage("Fetched all alive");
				let error = false;
				ps = new Array();
				rows.forEach((row) => {
					ps.push(client.guilds.get(config.guild_id).fetchMember(row.uid).then((member) => {
							member.removeRole(config.role_ids.signed_up);
							member.addRole(config.role_ids.participant);
						}).catch((err) => {
							utils.errorMessage(`Error ${err} at ${err.stack}`);
							utils.debugMessage(`ID: ${row.uid}, Emoji: ${row.emoji}, Row: ${row}`);
							error = true;
						}));
				});
				await Promise.all(ps);
				if (!error) {
					game_state.state_num = 2;
					write_game_state();
					msg.reply(`started new season with season code ${game_state.season_code}`);
					utils.infoMessage(`New season started, season code - ${game_state.season_code}`);
				} else {
					msg.reply("ERROR!!!");
				}
			}).catch((err) => {
				utils.errorMessage(`Error ${err} at ${err.stack}`);
				msg.reply("ERROR!!!");
			})
		}
	}
}

exports.commands.kill = function (msg, client, content) {
	if (game_state.state_num !== 2) {
		if (game_state.state_num <= 1) {
			msg.reply("the game hasn't started yet.")
		} else {
			msg.reply("a game has just finished.")
		}
	} else {
		if (content.length != 1) {
			msg.reply(`the correct syntax is \`${config.bot_prefix}kill <emoji/mention>\``)
			return;
		}
		exports.resolve_to_id(content[0]).then((uid) => {
			utils.debugMessage("Killing @" + uid);
			killUser_db(uid);
			client.guilds.get(config.guild_id).fetchMember(uid).then((member) => {
				member.removeRole(config.role_ids.participant);
				member.addRole(config.role_ids.dead);
			});
			msg.reply(`killed ${content[0]}`);
		}).catch((err) => {
			if (err) {
				utils.errorMessage(`Error ${err} at ${err.stack}`);
				msg.reply("ERROR!!");
			} else {
				msg.reply("incorrect syntax, or player is already dead");
			}
		});
	}
}

exports.commands.revive = function (msg, client, content) {
	if (game_state.state_num !== 2) {
		if (game_state.state_num <= 1) {
			msg.reply("the game hasn't started yet.")
		} else {
			msg.reply("a game has just finished.")
		}
	} else {
		if (content.length != 1) {
			msg.reply(`the correct syntax is \`${config.bot_prefix}kill <emoji/mention>\``)
			return;
		}
		exports.resolve_to_id_dead(content[0]).then((uid) => {
			utils.debugMessage("Reviving @" + uid);
			reviveUser_db(uid);
			client.guilds.get(config.guild_id).fetchMember(uid).then((member) => {
				member.removeRole(config.role_ids.dead);
				member.addRole(config.role_ids.participant);
			});
			msg.reply(`revived ${content[0]}`);
		}).catch((err) => {
			if (err) {
				utils.errorMessage(`Error ${err} at ${err.stack}`);
				msg.reply("ERROR!!");
			} else {
				msg.reply("incorrect syntax, or player is already alive");
			}
		});
	}
}

exports.commands.endseason = function (msg, client, content) {
	if (game_state.state_num !== 2) {
		if (game_state.state_num <= 1) {
			msg.reply("the game hasn't started yet.")
		} else {
			msg.reply("a game has just finished. Please ask the devs to know how to start a new season.")
		}
	} else {
		/*
		game_state.state_num = 2;
		write_game_state();
		exports.all_alive().then((rows) => {
		for(var row in rows){
		client.guilds.get(config.guild_id).fetchMember(row.id).then((member)=>{
		member.removeRole(config.role_ids.participant);
		member.addRole(config.role_ids.dead);
		killAllUsers_db();
		});
		}
		}).catch((err) =>{
		utils.errorMessage(`Error ${err} at ${err.stack}`);
		})*/
		utils.debugMessage("Ending season");
		exports.all_alive().then(async function (rows) {
			utils.debugMessage("Fetched all alive");
			let error = false;
			ps = new Array();
			rows.forEach((row) => {
				ps.push(client.guilds.get(config.guild_id).fetchMember(row.uid).then((member) => {
						member.removeRole(config.role_ids.participant);
						member.addRole(config.role_ids.dead);
					}).catch((err) => {
						utils.errorMessage(`Error ${err} at ${err.stack}`);
						utils.debugMessage(`ID: ${row.uid}, Emoji: ${row.emoji}, Row: ${row}`);
						error = true;
					}));
			});
			await Promise.all(ps);
			if (!error) {
				game_state.state_num = 3;
				write_game_state();
				killAllUsers_db();
				msg.reply(`ended season with season code ${game_state.season_code}`);
				utils.infoMessage(`Season ended, season code - ${game_state.season_code}`);
			} else {
				msg.reply("ERROR!!!");
			}
		}).catch((err) => {
			utils.errorMessage(`Error ${err} at ${err.stack}`);
			msg.reply("ERROR!!!");
		})
	}
}

exports.commands.setseasoncode = function (msg, client, content) {
	if (game_state.state_num > 1) {
		msg.reply("a game " + (game_state.state_num == 2 ? "is already in progress. Please wait for it to finish." : "has just finished. Please ask the devs to know how to start a new season."))
	} else {
		if (content.length != 1) {
			msg.reply("Syntax is: `" + config.bot_prefix + "g setseasoncode <code>`");
		} else {
			game_state.season_code = content[0];
			write_game_state();
			utils.infoMessage(`New season code: ${content[0]}.`);
			msg.reply(`season code set to ${content[0]}.`)
		}
	}
}

function id(str){
	var plainId = /^(\d+)$/;
	var discordId = /^<@!?(\d+)>$/;
	var uid = false; //eh
	if (plainId.test(str)) {
		uid = plainId.exec(str)[1];
	} else if (discordId.test(str)) { // str is a valid discord mention
		uid = discordId.exec(str)[1];
	}
	return uid;
}

exports.resolve_to_id = function (str) {
	// if str is a discord mention (<@id>), resolve with the id
	// if str is an emoji, resolve with the id of the user with that emoji
	// otherwise, reject
	return new Promise(function (resolve, reject) {
		var plainId = /^(\d+)$/;
		var discordId = /^<@!?(\d+)>$/;
		var uid = false; //eh
		if (plainId.test(str)) {
			uid = plainId.exec(str)[1];
		} else if (discordId.test(str)) { // str is a valid discord mention
			uid = discordId.exec(str)[1];
		}
		if (!uid) { // emoji or invalid
			userdb.get("select user_id from players where emoji = ? and alive = 1", [utils.toBase64(str)], function (err, row) {
				if (err) {
					throw err //TODO: err handling
				}
				if (row) {
					resolve(row.user_id);
				} else {
					reject();
				}
			})
		} else {
			userdb.get("select user_id, emoji from players where user_id = ? and alive = 1", [uid], function (err, row) { //check player is alive
				if (err) {
					throw err //TODO: err handling
				}
				if (row) {
					resolve(row.user_id);
				} else {
					reject();
				}
			})
		}
	});
}

exports.resolve_to_id_all = function (str) {
	// if str is a discord mention (<@id>), resolve with the id
	// if str is an emoji, resolve with the id of the user with that emoji
	// otherwise, reject
	return new Promise(function (resolve, reject) {
		var plainId = /^(\d+)$/;
		var discordId = /^<@!?(\d+)>$/;
		var uid = false; //eh
		if (plainId.test(str)) {
			uid = plainId.exec(str)[1];
		} else if (discordId.test(str)) { // str is a valid discord mention
			uid = discordId.exec(str)[1];
		}
		if (!uid) { // emoji or invalid
			userdb.get("select user_id from players where emoji = ?", [utils.toBase64(str)], function (err, row) {
				if (err) {
					throw err //TODO: err handling
				}
				if (row) {
					resolve(row.user_id);
				} else {
					reject();
				}
			})
		} else {
			userdb.get("select user_id, emoji from players where user_id = ?", [uid], function (err, row) { //check player is playing, dead or alive
				if (err) {
					throw err //TODO: err handling
				}
				if (row) {
					resolve(row.user_id);
				} else {
					reject();
				}
			})
		}
	});
}

exports.resolve_to_id_dead = function (str) {
	// if str is a discord mention (<@id>), resolve with the id
	// if str is an emoji, resolve with the id of the user with that emoji
	// otherwise, reject
	return new Promise(function (resolve, reject) {
		var plainId = /^(\d+)$/;
		var discordId = /^<@!?(\d+)>$/;
		var uid = false; //eh
		if (plainId.test(str)) {
			uid = plainId.exec(str)[1];
		} else if (discordId.test(str)) { // str is a valid discord mention
			uid = discordId.exec(str)[1];
		}
		if (!uid) { // emoji or invalid
			userdb.get("select user_id from players where emoji = ? and alive = 0", [utils.toBase64(str)], function (err, row) {
				if (err) {
					throw err //TODO: err handling
				}
				if (row) {
					resolve(row.user_id);
				} else {
					reject();
				}
			})
		} else {
			userdb.get("select user_id, emoji from players where user_id = ? and alive = 0", [uid], function (err, row) { //check player is dead
				if (err) {
					throw err //TODO: err handling
				}
				if (row) {
					resolve(row.user_id);
				} else {
					reject();
				}
			})
		}
	});
}

exports.all_alive = function () {
	// promise of all alive users and their emojis
	return new Promise(function (resolve, reject) {
		userdb.all("select user_id uid, emoji from players where alive = 1", [], function (err, rows) {
			if (err) {
				reject(err)
			} else {
				resolve(rows)
			}
		});
	});
}

exports.getUserEmoji = function (id) {
	// returns promise of base64 of emoji for user
	return new Promise(function (resolve, reject) {
		userdb.get("select emoji from players where user_id = ?", id, function (err, row) {
			if (err)
				throw err;
			if (row) {
				resolve(row.emoji)
			} else {
				reject()
			}
		})
	});
};

function removeUser(id){
	return new Promise(function (resolve, reject) {
		userdb.run("update players set alive = 1 where user_id = ?;", id, () => {
			resolve(); //why?
		});
	});
}

function addUser(client, id, emoji) {
	// if no one else is using that emoji, sign them up
	// or change their emoji
	// returns promise:
	// reject = id of user using that emoji
	// resolve: old emoji if changed, nothing (undefined) otherwise
	utils.debugMessage("Function addUser called");
	return new Promise(function (resolve, reject) {
		getUserId(emoji).then(i => {
			reject(i)
		}).catch(() => {
			//check if user is already signed up
			exports.getUserEmoji(id).then(old_emoji => {
				//user already signed up, wants to change their emoji
				utils.debugMessage("User wants to replace old emoji");
				userdb.run("replace into players (user_id, emoji) values (?, ?)", [id, emoji], () => {
					resolve(old_emoji);
				})
			}).catch(() => {
				//not signed up, wants to.
				utils.debugMessage("User wants to sign up and not replace an emoji");
				userdb.run("insert into players (user_id, emoji) values (?, ?)", [id, emoji], () => {
					client.guilds.get(config.guild_id).fetchMember(id).then(member => member.addRole(config.role_ids.signed_up))
					resolve()
				})
			})
		})
	})
};

function killUser_db(id) {
	return new Promise(function (resolve, reject) {
		userdb.run("update players set alive = 0 where user_id = ?;", id, () => {
			resolve(); //why?
		});
	});
}

function reviveUser_db(id) {
	return new Promise(function (resolve, reject) {
		userdb.run("update players set alive = 1 where user_id = ?;", id, () => {
			resolve(); //why?
		});
	});
}

function killAllUsers_db() {
	return new Promise(function (resolve, reject) {
		userdb.run("update players set alive = 0;", [], () => {
			resolve(); //why?
		});
	});
}

function getUserId(emoji) {
	// returns promise of id for user by emoji
	utils.debugMessage("getUserId function Called")
	return new Promise(function (resolve, reject) {
		userdb.get("select user_id from players where emoji = ?", [emoji], function (err, row) {
			if (err)
				throw err;
			if (row) {
				utils.debugMessage("Promise resolved; user is already signed up")
				resolve(row.user_id)
			} else {
				utils.debugMessage("Promise rejected; user is not signed up yet")
				reject()
			}
		})
	});
};
