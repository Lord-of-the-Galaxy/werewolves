//IMPORTANT NOTE - MAJOR OVERHAUL PROBABLY COMING UP SOON
const fs = require("fs");
const utils = require("./utils");
const config = require("./config");
var polls;//So that I can load it later
//The above is self-explanatory, I think

/*
███████ ██   ██ ██████   ██████  ██████  ████████ ███████ ██████
██       ██ ██  ██   ██ ██    ██ ██   ██    ██    ██      ██   ██
█████     ███   ██████  ██    ██ ██████     ██    █████   ██   ██
██       ██ ██  ██      ██    ██ ██   ██    ██    ██      ██   ██
███████ ██   ██ ██       ██████  ██   ██    ██    ███████ ██████
*/
/**
Function init
Initialize the polls data
Arguments:
	reset_data - Forcse reset all polls data
*/
exports.init = function(reset_data){
	if(reset_data){
		utils.warningMessage("Resetting polls (because you asked for it).");
		fs.writeFileSync("./polls.json", '{\n\t"num":0,\n\t"polls":{}\n}');
		utils.infoMessage("Reset polls.");
	}else{
		//create polls.json file if it doesn't exist
		//and inform the user
		if(!fs.existsSync("./polls.json")){
			utils.warningMessage("Record of polls not found. Creating new record (polls.json).");
			fs.writeFileSync("./polls.json", '{\n\t"num":0,\n\t"polls":{}\n}');//"./polls.json" because JS is funny
			utils.successMessage("Created polls.json.");
		}
	}
	polls = require("./polls.json");
}


/**
Function startPoll
Start a poll.
Arguments:
client - The Discord Client the bot uses
data - An object containing three properties - msg_text, channel_id, options:
	msg_text - A String, the text that is displayed at the start of the poll.
	channel_id - The ID of the channel in which to have the poll
	options - An array, the list of choices in the poll, along with thier emojis. Each element has two properties - id, emoji:
		id - The player id corresponding to the option
		emoji - The emoji corresponding to the option (It's just a character BTW, just like all basic emojis in discord)

Example for data:{
	msg_text: "Vote for your favourite!",
	channel_id: "4034578342784532XX",
	options: [{
			id: "32997746935044XXXX",
			emoji: "😃"
		}, {
			id: "40207290728448XXXX",
			emoji: "😕"
		}, {
			id: "13457982471294XXXX",
			emoji: "💀"
		}
	]
}
As in example, the "txt" field of the options can be a mention or just some plain text
 */
exports.startPoll = function(client, data) {
	utils.debugMessage(`Function startPoll was called.`);
	
	var options = data.options;
	var msg_text = data.msg_text;

	var ch = client.channels.get(data.channel_id);

	var nm = (options.length - ((options.length - 1) % 20 + 1)) / 20 + 1; //Number of messages the bot must send
	var txt = new Array(nm); //The text of the messages themselves
	for (var i = 0; i < nm; i++) {
		txt[i] = "";
		if (i === 0)
			txt[0] = msg_text + "-\n";
		for (var j = 0; j < 20; j++) {
		txt[i] += `${options[i * 20 + j].emoji}  -  <@${options[i * 20 + j].id}>`;
			if (i * 20 + j >= options.length - 1)
				break;
			txt[i] += "\n";
		}
	}

	//This will send the messages, and get the Promises of the messages
	var promises = new Array(nm);
	for (i = 0; i < nm; i++) {
		promises[i] = ch.send(txt[i]);
	}
	//Combine all the promises
	Promise.all(promises).then(async function(values){
		//This whole code just adds the emojis
		var msgs = new Array(values.length);
		for (var i = 0; i < values.length; i++) {
			msgs[i] = {
				id: values[i].id,
				options: "If you're seeing this, then the bot isn't working correctly."
			};
			var opts = new Array(0);
			for (var j = 0; j < 20; j++) {
				if (i * 20 + j >= options.length)
					break;
				//make sure to add next emoji only after this one is added
				await values[i].react(options[i * 20 + j].emoji).catch (err => {
					utils.errorMessage(err);
					utils.errorMessage("The bot failed to add an emoji to the message. If you know how I can set this right, please tell me.");
					utils.infoMessage("For now, use " + config.bot_prefix + "check_poll <id> to set the poll right.");
					ch.send(`The bot failed to add an emoji to the message. To set it right, use ${config.bot_prefix}check_poll <id>`);
				});
				opts.push(i * 20 + j);//adds the ids of all the options
			}
			msgs[i]["options"] = opts;
		}
		utils.debugMessage("Added emojis.");
		//Now save the poll so that a restart of the bot doesn't delete all the data
		var num = ++polls["num"];
		polls["polls"][num] = {
			channel: ch.id,
			type: data.type,
			messages: msgs,
			options: options
		};
		//if the bot crashes at this point for some reason, you might as well abandon the newly created poll
		utils.debugMessage("Saving polls....");
		fs.writeFile("./polls.json", JSON.stringify(polls, null, 2), (err) => {
			if (err) {
				utils.errorMessage(err);
				client.channels.get(config.channel_ids.log_channel).send("Error occurred when saving file. This could cause problems - the new poll might be useless.");
			} else {
				utils.successMessage("The poll was created successfully!");
			}
		});
	}).catch (function (err) {
		utils.errorMessage(err);
		utils.errorMessage("There was an error when trying to make the poll.");
		ch.send("The bot failed to make the poll. Perhaps you should contact the @Developers of the bot.");
	});
	return polls["num"] + 1; //Return the ID of the poll
}

exports.fetchMessages = function(msg, client, id){
	if (!polls["polls"][id]) {
		utils.errorMessage("The poll with id " + id + " doesn't exist, sadly.");
		msg.reply(`the poll with ID \`${id}\` doesn't exist, or it's results have been checked already.`);
		return false;
	}
	//Fetch the poll and its details
	var poll = polls["polls"][id];
	var ch = client.channels.get(poll["channel"]);
	//Get the messages
	var promises = new Array(poll["messages"].length);
	for (var i = 0; i < promises.length; i++) {
		promises[i] = ch.fetchMessage(poll["messages"][i].id);
	}
	//Work on the messages, and then return a promise of the results
	return {
		p:Promise.all(promises),
		poll: poll,
		ch: ch
	};
}

//at this point I had forgotten what changes I had made
//so forgive me if something here doesn't quite work as expected
exports.calculateResults = function(poll, poll_id, values, client) {
	//The object the function will return
	var results = {
		options: poll["options"]
	};
	utils.debugMessage("Calculating results of polls");
	var disqualified = findDisqualified(values, client);
	var non_participants = findNonParticipants(values, disqualified, client);
	utils.debugMessage("Checked disqualified and non-participants.")
	//TODO - Implement the code for frozen people
	
	//LATER!
	
	//Like really, GET THAT DONE!
	utils.debugMessage("Checked Mayor.");
	ranked = rankResults(results, values, poll);
	utils.debugMessage("Ranked results.");
	//What am I even doing??
	//I really really hope this works
	results.txt = buildMessage(ranked, values, poll, poll_id, disqualified, non_participants);
	utils.debugMessage("Built messages")
	//What is this supposed to do?
	//I'm lost in my own code now
	//Return the data
	return results;
}

exports.cleanUp = function(msgs, id) {
	//Delete the messages
	for (var i = 0; i < msgs.length; i++) {
		msgs[i].delete();
	}
	//Delete the poll from storage
	delete polls["polls"][id];
	
	fs.writeFile("./polls.json", JSON.stringify(polls, null, 2), (err) => {
		if (err) {
			utils.errorMessage(err);
			client.channels.get(config.channel_ids.log_channel).send("Error occurred when trying to edit the polls.json file.");
		}else{
			utils.successMessage("Successfully ended poll!");
		}
	});
		
}

/*
██ ███    ██ ████████ ███████ ██████  ███    ██  █████  ██
██ ████   ██    ██    ██      ██   ██ ████   ██ ██   ██ ██
██ ██ ██  ██    ██    █████   ██████  ██ ██  ██ ███████ ██
██ ██  ██ ██    ██    ██      ██   ██ ██  ██ ██ ██   ██ ██
██ ██   ████    ██    ███████ ██   ██ ██   ████ ██   ██ ███████
*/


function rankResults(results, values, poll){
	//Rank the results of the poll (descending order)
	var ranked = new Array(0);
	for (var i = 0; i < values.length; i++) {
		//I really hope I know what I'm doing here
		var n = values[i].size;
		results.options[i].votes = n; //Also add the vote tally to the results object
		if(values[i].size <= 0)continue;
		ranked.push({
			id: i,
			num: n
		});
		
	}
	ranked.sort(function (a, b) {
		return b.num - a.num;
	});
	return ranked;
}

function findNonParticipants(values, disqualified, client){
	//Remove all non-participants
	var non_participants = new Array(0);
	var guild = client.guilds.get(config.guild_id);
	for (var i = 0; i < values.length; i++) {
		var users = Array.from(values[i]);
		users.forEach(function(user){
			if(!guild.members.get(user[0]).roles.has(config.role_ids.participant)){
				non_participants.push(user[0]);
				values[i].delete(user[0]);//I hope this works
			}
		});
	}
	//Even check among the disqualified persons
	for(var i = 0; i < disqualified.length; i++){
		if(!guild.members.get(disqualified[i]).roles.has(config.role_ids.participant)){
			non_participants.push(disqualified[i]);
			disqualified.splice(i, 1);
		}
	}
	//return a list of them
	return non_participants;
}

function findDisqualified(values, client){
	//Disqualified persons
	var disqualified = new Array(0);
	var voted = new Array(0); //Who as voted?
	for (var i = 0; i < values.length; i++) {
		//Check if person has voted twice -> disqualify them
		var users = Array.from(values[i]);
		users.forEach(function (item) {
			if (item[1].id !== client.user.id) {
				if (voted.find(element => {
						return element == item[1].id;
					})) {
					if (!disqualified.find(element => {
							return element == item[1].id;
						})) {
						disqualified.push(item[1].id);
					}
				} else {
					voted.push(item[1].id);
				}
			} else {
				values[i].delete (item[0]); //Forget the reactions the bot itself sent
			}
		});
	}
	//Delete the votes of the disqualified
	for (var i = 0; i < values.length; i++) {
		var users = Array.from(values[i]);
		users.forEach(function (item) {
			if (disqualified.find(element => {
					return element == item[1].id;
				}))
				values[i].delete (item[0]);
		});
	}
	return disqualified;
}

function buildMessage(ranked, values, poll, poll_id, disqualified, non_participants){
	//Build the message to be sent
	var txt = "Results of the polls (ID:" + poll_id + ") :\n\n";
	txt+="GMs will calculate winner.\n";
	for (var k = 0; k < ranked.length; k++) {
		var i = ranked[k].id;
		var users = Array.from(values[i]);
		if(users.length == 0)continue;
		var n = ranked[k].num;
		if(n < 0)n = 0;
		txt += ("\n" + n + " players voted for <@" + poll["options"][i]["id"] + "> :\n");
		for (var j = 0; j < users.length; j++) {
			txt += ("\t<@" + users[j][1].id + ">\n");
		}
		txt += '\n';
	}
	//And make sure to mention who was disqualified
	if (disqualified.length !== 0) {
		txt += "\n";
		if (disqualified.length === 1) {
			txt += "<@" + disqualified[0] + "> was disqualified as they cast multiple votes.";
		} else {
			disqualified.forEach(function (item, index) {
				txt += "<@" + item + ">";
				if (index === disqualified.length - 2)
					txt += " and ";
				else if (index !== disqualified.length - 1)
					txt += ", "
			});
			txt += " were disqualified as they cast multiple votes.";
		}
	}
	//And the non-participants
	if (non_participants.length !== 0) {
		txt += "\n";
		if (non_participants.length === 1) {
			txt += "<@" + non_participants[0] + "> you are not allowed to vote, only participants can vote.";
		} else {
			non_participants.forEach(function (item, index) {
				txt += "<@" + item + ">";
				if (index === non_participants.length - 2)
					txt += " and ";
				else if (index !== non_participants.length - 1)
					txt += ", "
			});
			txt += " you are not allowed to vote, only participants can vote.";
		}
	}
	
	return txt;
}
