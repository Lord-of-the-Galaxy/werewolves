const config = require('./config'); //include main config
const utils = require('./utils'); //include utils
const game = require('./game');
const Discord = require('discord.js');
var fs = require('fs')

	var ccconf = {}; //information about the CCs, loadeed later

function writecc() { //function writes ccconf to cc.json
	fs.writeFileSync('./cc.json', JSON.stringify(ccconf), {
		encoding: 'utf-8'
	})
}

exports.commands = {}; //because js

/**
Function init
Initialize the ccs data
Arguments:
reset_data - Forcse reset all ccs data
 */
exports.init = function (reset_data) {
	utils.debugMessage("CCs init");
	if (reset_data) {
		utils.warningMessage("Resetting ccs (because you asked for it).");
		reset_ccconf();
		utils.infoMessage("Reset ccs.");
	} else {
		//create cc.json file if it doesn't exist
		//and inform the user
		if (!fs.existsSync("./cc.json")) {
			utils.warningMessage("Record of ccs not found. Creating new record (cc.json).");
			reset_ccconf();
			utils.successMessage("Created cc.json.");
		}
	}
	ccconf = require("./cc.json");
}

//renew CC  for a player
exports.commands.renew = async function(msg, client, args){//renew
	var syntax = `incorrect syntax, correct usage: \`\`\`${config.bot_prefix}c renew (all|<player1> [<player2> ...])\`\`\` Where <player<n>> is emoji or mention of a participant`;;
	if(args.length == 0){
		msg.reply(syntax);
	}
	if(args[0].toLowerCase() == "all"){
		utils.infoMessage("Renewing everyone's CC limit");
		try{
			renewAll();
			msg.reply("everyone's CC limits renewed");
		}catch(err){
			msg.reply("error");
		}
	}else{
		try{
			for(var i = 0; i < args.length; i++){
				try{
					let id = await game.resolve_to_id(args[i]);
					renew(id);
				}catch(err){
					if(err)throw err;
					utils.debugMessage(`Not found: ${args[i]}`);
				}
			}
			msg.reply("done.");
		}catch(err){
			utils.errorMessage(`Error in CC renew:\n${err.stack}`);
			msg.reply("error");
		}
	}
}

//REMOVE PLAYER(S)
exports.commands.remove = async function (msg, client, args) { //remove people in the cc
	if (!msg.channel.name.startsWith(game.season_code().toLowerCase().replace(/[^a-zA-Z0-9-_]/g, "a") + "-cc-")) {
		msg.reply("you can only do that in a CC");
		return;
	}
	var cc = ccconf.ccs[msg.channel.id]; //hope all this stuff works
	if (!cc) {
		msg.reply("this CC was not recognized, please contact the GMs/developers");
		return;
	}
	utils.debugMessage("CC remove command called");
	
	if(cc.creator != msg.author.id && !msg.member.roles.has(config.role_ids.gameMaster)){
		msg.reply("only the creator of this channel and game masters can remove members");
		return;
	}
	
	var syntax = `incorrect syntax, correct usage: \`\`\`${config.bot_prefix}c remove <player1> [<player2> ...]\`\`\` Where <player<n>> is emoji or mention of a participant in the CC`;
	
	if(args.length == 0){
		msg.reply(syntax);
		return;
	}
	var people = [];
	var non_people = [];
	var not_in = [];
	for(var i = 0; i < args.length; i++){
		try{
			let p = await game.resolve_to_id(args[i]);
			if(cc.members.includes(p)){
				people.push(p);
			}else{
				not_in.push(p);
			}
		}catch(err){
			if(err){
				utils.errorMessage(`Error in CC remove (resolving): ${err.stack}`);
				msg.reply("error occurred");
				return;
			}
			non_people.push(args[i]);
		}
	}
	if(people.length == 0){
		msg.reply(syntax);
		return;
	}
	utils.debugMessage(`${people.length} people to be removed`);
	utils.debugMessage(`${not_in.length} people are not in the CC`);
	utils.debugMessage(`${non_people.length} arguments are not emojis or mentions`);
	var nptxt = "", ptxt = "", ntxt;
	if(non_people.length == 1){
		 nptxt = `${non_people[0]} is not an emoji or mention of a living participant!`;
	}else{
		for(var i = 0; i < non_people.length; i++){
			if(i == 0) nptxt += non_people[i];
			else if(i == non_people.length-1)nptxt += ` and ${non_people[i]} are not emojis or mentions of living participants!`
			else nptxt += `, ${non_people[i]}`;
		}
	}
	if(not_in.length == 1){
		 ntxt = `<@${already_in[0]}> is not in this CC!`;
	}else{
		for(var i = 0; i < not_in.length; i++){
			if(i == 0) ntxt += `<@${not_in[i]}>`;
			else if(i == n_in.length-1)ntxt += ` and <@${not_in[i]}> are not in this CC!`
			else ntxt += `, <@${not_in[i]}>`;
		}
	}
	for(var i = 0; i < people.length; i++){
		if(i == 0) ptxt += `<@${people[i]}>`;
		else if(i == people.length-1)ptxt += ` and <@${people[i]}>`
		else ptxt += `, <@${people[i]}>`;
	}
	if(non_people.length > 0 || not_in.length > 0){
		msg.channel.send(`${nptxt} ${ntxt}\nOnly removing ${ptxt}.`);
	}else{
		msg.reply(`removing ${ptxt}.`);
	}
	try{
		await removePlayers(msg.channel, people);
	}catch(err){
		utils.errorMessage(`Error removing player from CC: ${err.stack}`);
		msg.reply("error occurred");
	}
}

//ADD PLAYER(S)
exports.commands.add = async function (msg, client, args) { //add people in the cc
	if (!msg.channel.name.startsWith(game.season_code().toLowerCase().replace(/[^a-zA-Z0-9-_]/g, "a") + "-cc-")) {
		msg.reply("you can only do that in a CC");
		return;
	}
	var cc = ccconf.ccs[msg.channel.id]; //hope all this stuff works
	if (!cc) {
		msg.reply("this CC was not recognized, please contact the GMs/developers");
		return;
	}
	utils.debugMessage("CC add command called");
	
	if(cc.creator != msg.author.id && !msg.member.roles.has(config.role_ids.gameMaster)){
		msg.reply("only the creator of this channel and game masters can add new members");
		return;
	}
	
	var syntax = `incorrect syntax, correct usage: \`\`\`${config.bot_prefix}c add <player1> [<player2> ...]\`\`\` Where <player<n>> is emoji or mention of a participant not in the CC`;
	
	if(args.length == 0){
		msg.reply(syntax);
		return;
	}
	
	var people = [];
	var non_people = [];
	var already_in = [];
	for(var i = 0; i < args.length; i++){
		try{
			let p = await game.resolve_to_id(args[i]);
			if(cc.members.includes(p)){
				already_in.push(p);
			}else{
				people.push(p);
			}
		}catch(err){
			if(err){
				utils.errorMessage(`Error in CC add (resolving): ${err.stack}`);
				msg.reply("error occurred");
				return;
			}
			non_people.push(args[i]);
		}
	}
	
	if(people.length == 0){
		msg.reply(syntax);
		return;
	}
	utils.debugMessage(`${people.length} people to be added`);
	utils.debugMessage(`${already_in.length} people are already in the CC`);
	utils.debugMessage(`${non_people.length} arguments are not emojis or mentions`);
	var nptxt = "", ptxt = "", atxt;
	if(non_people.length == 1){
		 nptxt = `${non_people[0]} is not an emoji or mention of a living participant!`;
	}else{
		for(var i = 0; i < non_people.length; i++){
			if(i == 0) nptxt += non_people[i];
			else if(i == non_people.length-1)nptxt += ` and ${non_people[i]} are not emojis or mentions of living participants!`
			else nptxt += `, ${non_people[i]}`;
		}
	}
	if(already_in.length == 1){
		 atxt = `<@${already_in[0]}> is already in this CC!`;
	}else{
		for(var i = 0; i < already_in.length; i++){
			if(i == 0) atxt += `<@${already_in[i]}>`;
			else if(i == already_in.length-1)atxt += ` and <@${already_in[i]}> are already in this CC!`
			else atxt += `, <@${already_in[i]}>`;
		}
	}
	for(var i = 0; i < people.length; i++){
		if(i == 0) ptxt += `<@${people[i]}>`;
		else if(i == people.length-1)ptxt += ` and <@${people[i]}>`
		else ptxt += `, <@${people[i]}>`;
	}
	if(non_people.length > 0 || already_in.length > 0){
		msg.channel.send(`${nptxt} ${atxt}\nOnly adding ${ptxt}.`);
	}else{
		msg.reply(`adding ${ptxt}.`);
	}
	try{
		await addPlayers(msg.channel, people);
	}catch(err){
		utils.errorMessage(`Error adding player to CC: ${err.stack}`);
		msg.reply("error occurred");
	}
}

//LIST EVERYONE
exports.commands.list = async function (msg, client, args) { //list people in the cc
	if (!msg.channel.name.startsWith(game.season_code().toLowerCase().replace(/[^a-zA-Z0-9-_]/g, "a") + "-cc-")) {
		msg.reply("you can only do that in a CC");
		return;
	}
	var cc = ccconf.ccs[msg.channel.id]; //hope all this stuff works
	if (!cc) {
		msg.reply("this CC was not recognized, please contact the GMs/developers");
		return;
	}
	utils.debugMessage("CC list command called");
	people = cc.members.slice();
	var em = new Discord.RichEmbed()
					.setColor('#0099ff')
					.setTitle(cc.name)
					.setAuthor(`Werewolves Season ${game.season_code()}`, msg.guild.iconURL)
					.setDescription(msg.channel.topic?msg.channel.topic:"No topic provided.")
					.setThumbnail(config.CC_image)
					.setFooter("Werewolves")
					.setTimestamp();
	utils.debugMessage("Embed created, adding fields");
	var emoji, uname; 
	if(!cc.anonymous){
		uname = msg.channel.members.get(cc.creator).displayName;
		try{
			emoji = await game.getUserEmoji(cc.creator);
			emoji = utils.fromBase64(emoji);
		}catch(err){
			if(err)utils.errorMessage(`Uh oh ${err.stack}`);
			emoji = 'No Emoji?';
		}
		em.addField("Creator", `${emoji} - ${uname}`);
	}else{
		people.push(cc.creator);
	}
	utils.debugMessage("Creator handled");
	shuffle(people);
	txt = "";
	for(var i = 0; i < people.length; i++){ //loop through all people, adding new line to the message
		let id = people[i];
		uname = msg.channel.members.get(id).displayName;
		try{
			emoji = await game.getUserEmoji(id);
			emoji = utils.fromBase64(emoji);
		}catch(err){
			if(err)utils.errorMessage(`Uh oh ${err.stack}`);
			emoji = 'No Enoji?';
		}
		txt += `${emoji} - ${uname}\n`;
	}
	if(people.length != 0)em.addField("Members", txt);
	await msg.channel.send(em)
}

exports.commands.create = async function (msg, client, args) {
	var syntax = "correct syntax is:```" + config.bot_prefix + "c create <name> [show-creator (true|false) default true] [person1] [person2] ... [topic]``` topic must not be a mention or emoji, and `person<n>` should be either the emoji of a player or a mention of the player";
	if (game.state_num() != 2) {
		msg.reply("I'm sorry, but the game is not in progress");
		return;
	}
	utils.debugMessage("start of create CC")
	if(!msg.member.roles.has(config.role_ids.participant) && !msg.member.roles.has(config.role_ids.gameMaster)){
		msg.reply("only participants and GMs can make CCs.");
		return;
	}
	msg.delete()
	if (args.length == 0) {
		msg.reply(syntax);
		return;
	}
	if (ccconf.counts[msg.author.id] >= config.CC_limit && !msg.member.roles.has(config.role_ids.gameMaster)) {
		msg.reply(config.messages.CC.limitReached);
		return;
	}
	var people = [];
	var topic = undefined;
	var showCreator = true;
	var name = args[0];
	args.splice(0, 1); //remove first argument
	if (args.length == 0) { //nothing left
		utils.debugMessage("Only name provided");
	} else if (args.length == 1) { //special case
		let w = args[0].toLowerCase();
		if (w == "true" || w == "t") {}
		else if (w == "false" || w == "f") {
			showCreator = false;
		} else {
			try {
				let id = await game.resolve_to_id(args[0]);
				people.push(id);
			} catch (err) {
				if (err) {
					utils.errorMessage(`Error making CC:\n${err.stack}`);
					msg.reply("error");
					return;
				} else {
					topic = args[0]; //weird special case
				}
			}
		}
	} else { //general case
		let w = args[0].toLowerCase();
		if (w == "true" || w == "t") {
			args.splice(0, 1); //not a mention/emoji
		} else if (w == "false" || w == "f") {
			showCreator = false;
			args.splice(0, 1); //not a mention/emoji
		}
		for (let i = 0; i < args.length; i++) {
			try {
				let id = await game.resolve_to_id(args[i]);
				people.push(id);
			} catch (err) {
				if (err) {
					utils.errorMessage(`Error making CC:\n${err.stack}`);
					msg.reply("error")
					return;
				} else {
					//rest of the args are not mentions, or at least should not be
					//which means they make up the topic
					topic = args.slice(i).join(" ");
					break; //no more checking
				}
			}
		}
	}
	//no we can actually make the channel
	await createChannel(client, msg, name, people, showCreator, topic);
	utils.debugMessage("CC created successfully!");
}

//ch is channel, people is list of players to be removed
async function removePlayers(ch, people){
	try{
		for(var i = 0; i < people.length; i++){
			await ch.overwritePermissions(people[i], {
				VIEW_CHANNEL: false
			});
			ccconf.ccs[ch.id].members.splice(ccconf.ccs[ch.id].members.indexOf(people[i]), 1);
		}
	}catch(err){
		throw err;
	}finally{//finally I used this
		writecc();//if some people are removed, but not all, it shoud reflect in the storage (cc.json)
	}
}

//ch is channel, people is list of players to be added
async function addPlayers(ch, people){
	try{
		for(var i = 0; i < people.length; i++){
			await ch.overwritePermissions(people[i], {
				VIEW_CHANNEL: true
			});
			ccconf.ccs[ch.id].members.push(people[i]);
		}
	}catch(err){
		throw err;
	}finally{//finally I used this
		writecc();//if some people are added, but not all, it shoud reflect in the storage (cc.json)
	}
}

//others is array of userIDs
async function createChannel(client, msg, name_, others, showCreator, topic) {
	//make new channel
	var name = (game.season_code() + "-cc-" + name_).replace(/[^a-zA-Z0-9-_]/g, "a");
	var guild = client.guilds.get(config.guild_id);
	var creator = msg.author.id;
	var perms = buildPermissions(client, creator, others);
	try {
		ch = await guild.createChannel(name, 'text', perms);
		utils.debugMessage(`CC created - ${name}`);
	} catch (err) {
		utils.errorMessage(`Could not make channel ${name}:\n${err.stack}`);
		msg.reply("Error creating channel");
		return;
	}
	try {
		await setCategory(ch, client, guild);
		utils.debugMessage("Moved to CCs category");
	} catch (err) {
		utils.errorMessage(`Error moving channel ${name} to a category:\n${err.stack}`);
		ch.delete();
		msg.reply("error occurred.");
		return;
	}
	if (topic && topic != "") {
		try {
			await ch.setTopic(topic);
			utils.debugMessage("Topic set");
		} catch (err) {
			utils.errorMessage(`Error setting topic for ${name}:\n${err.stack}`);
			ch.delete();
			msg.reply("error occurred.");
			return;
		}
	}
	//no problems while creating the channel if it got here
	await ch.send(showCreator ? config.messages.CC.createNotAnonymous : config.messages.CC.createNotAnonymous);
	if (showCreator && others.length != 0) {
		var txt = `<@${creator}> has brought you all together:`
			others.forEach((uid) => {
				txt += `\n\t<@${uid}>`
			})
			await ch.send(txt);
	}
	//if it got till here, no errors
	//so write to cc.json
	var ccinfo = {
		"name": name_,
		"category": ccconf.cat_ID,
		"anonymous": !showCreator,
		"creator": creator,
		"members": others
	}
	ccconf.ccs[ch.id] = ccinfo;
	if (creator in ccconf.counts)
		ccconf.counts[creator] += 1;
	else
		ccconf.counts[creator] = 1;
	writecc();
}

//INTERNAL
async function setCategory(ch, client, guild) {
	try {
		await ch.setParent(ccconf.cat_ID);
	} catch (err) {
		if (ccconf.cat_num == 0 || err == "DiscordAPIError: Invalid Form Body\nparent_id: Maximum number of channels in category reached (50)") {
			try {
				utils.debugMessage("Attempting to make new CC category");
				var categoryName = game.season_code() + "_CC_" + (ccconf.cat_num + 1); //phrase name of catgories
				var cat = await guild.createChannel(categoryName, "category");
				utils.infoMessage(`New category made: ${categoryName} (ID: ${cat.id})`);
				ccconf.cat_num += 1;
				ccconf.cat_ID = cat.id;
				writecc();
				await setCategory(ch, client, guild); //try again
			} catch (err) {
				throw err;
			}
		} else {
			throw err;
		}
	}
}

//INTERNAL
function buildPermissions(client, creator, others) {
	var perms = [];

	//bot can see it
	perms.push({
		id: client.user.id,
		allowed: ['VIEW_CHANNEL']
	});

	//GMs can see it
	perms.push({
		id: config.role_ids.gameMaster,
		allowed: ['VIEW_CHANNEL']
	});

	//@everyone can't see it
	perms.push({
		id: client.guilds.get(config.guild_id).defaultRole.id,
		denied: ['VIEW_CHANNEL']
	});

	//dead can see it but not speak
	perms.push({
		id: config.role_ids.dead,
		allowed: ['VIEW_CHANNEL'],
		denied: ['SEND_MESSAGES']
	});
	
	//speactators can see it but not speak
	perms.push({
		id: config.role_ids.spectator,
		allowed: ['VIEW_CHANNEL'],
		denied: ['SEND_MESSAGES']
	});

	//creator can see it
	perms.push({
		id: creator,
		allowed: ['VIEW_CHANNEL']
	});

	//everyone added can see it
	others.forEach((member) => {
		perms.push({
			id: member,
			allowed: ['VIEW_CHANNEL']
		});
	});

	return perms;
}

function renew(id){
	if(id in ccconf.counts){
		ccconf.counts[id] = 0;
		writecc();
	}
}

function renewAll(){
	cccong.counts = {};
	writecc();
}

//INTERNAL
function reset_ccconf() {
	ccconf.cat_ID = "";
	ccconf.cat_num = 0;
	ccconf.ccs = {};
	ccconf.counts = {}; //number of CCs made by each player
	writecc();
}

//INTERNAL
function shuffle (array) {
  var i = 0,
      j = 0,
      temp = null;

  for (i = array.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1))
    temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}
