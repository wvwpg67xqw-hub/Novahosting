const { SlashCommandBuilder } = require("discord.js");
const serversService = require("../services/servers");
const { requireStaff } = require("../utils/permissions");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop a FeatherPanel server")
    .addStringOption((opt) =>
      opt.setName("server").setDescription("The server identifier").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const identifier = interaction.options.getString("server", true);
    await interaction.deferReply();

    try {
      await serversService.stopServer(identifier);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Stop failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "Server Stopping",
          description: `Sent a stop signal to server \`${identifier}\`.`,
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Stop Server",
      target: identifier,
      color: config.brand.warnColor,
    });
  },
};
