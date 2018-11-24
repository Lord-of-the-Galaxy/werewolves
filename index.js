/* werewolves bot */

const fs = require('fs');
const utils = require('./utils');
update = true

utils.infoMessage("Starting bot...");
// Check to see if the user wants to run in debug mode
if (process.argv.indexOf("--debug") > -1) {
	utils.debugMode();
}

//Check if the user wants to reset the entire server data (including global profiles)
//WARNING - Use this flag only during the testing phase, or if the server is being reset.
//Maybe someone could figure out a better way of doing this, but this will work
var reset_data = (process.argv.indexOf("--reset-data") > -1);
if(reset_data){
	utils.warningMessage("Will reset the ENTIRE server data!");
	utils.warningMessage("Shut down the bot NOW if you want to prevent that!");
	utils.warningMessage("You have 10 seconds to shut the bot down! (Type CTRL+C)")
	setTimeout(function(){
		utils.warningMessage("RESETTING ENTIRE SERVER DATA (there isn't much in this version of the bot though)")
		require("./game").init(reset_data)
		require("./polls.js").init(reset_data)
		require("./ccs.js").init(reset_data)
	}, 10e3)
}else {

	utils.debugMessage("Debug messages enabled.");
	const token = require('./config').token;
	utils.debugMessage("Config loaded!");

	utils.debugMessage("Loading external modules...");
	const discord = require('discord.js');
	const client = new discord.Client();

	utils.debugMessage("Loaded external modules, loading other modules.");
	const msg_handler = require("./msg_handler");
	const failsafes = require("./failsafes");
	utils.debugMessage("Loaded modules.");

	utils.debugMessage("Running inits:")
	require("./game").init(false)
	require("./polls.js").init(false)
	require("./ccs.js").init(false)
	utils.debugMessage("Inits done")

	if (token == 'insert-token-here') {
		utils.errorMessage("Incorrect login credentials passed! Please edit config.json with your bot's token.", true)
		process.exit();
	}

	// this makes unhandled promise rejections a fatal error, not a supressed warning.
	// this should hopefully make debugging easier
	// hopefully
	process.on('unhandledRejection', ball => { throw ball })

	client.on('ready', () => {
		failsafes(client) // run 'failsafes' module
	  utils.successMessage("Logged in!", true);
	  failsafes(client) // run 'failsafes' module
	});

	client.on('message', msg => {
	  msg_handler(msg, client);
	});

	utils.infoMessage("Initialised bot, logging in:");
	//Now login
	client.login(token)


}
