const discord = require("discord.js")
const config = require("./config")

module.exports = function(client) {
var log = client.channels.get(config.channel_ids.log_channel);
client.on('guildMemberRemove', member => {
  let guild = member.guild
  const embed = new discord.RichEmbed()
  .setColor(0x00AE86)
  .setTimestamp()
  .addField('User Update',
    `${member.user} has left! :neutral_face: `)
  log.send(embed);
});
}
