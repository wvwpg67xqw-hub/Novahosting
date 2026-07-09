const { Events } = require("discord.js");
const { errorEmbed } = require("../utils/embeds");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`[interactionCreate] Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`[interactionCreate] Error running /${interaction.commandName}:`, err);

      const payload = {
        embeds: [
          errorEmbed({
            description: "An unexpected error occurred while running this command.",
          }),
        ],
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
      }
    }
  },
};
