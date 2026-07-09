const { SlashCommandBuilder } = require("discord.js");
const serversService = require("../services/servers");
const { requireStaff } = require("../utils/permissions");
const { infoEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Look up a FeatherPanel server's details")
    .addStringOption((opt) =>
      opt
        .setName("server")
        .setDescription("The server identifier (short ID or UUID)")
        .setRequired(true),
    ),

  async execute(interaction) {
    if (!(await requireStaff(interaction))) return;

    const identifier = interaction.options.getString("server", true);
    await interaction.deferReply();

    let server;
    try {
      server = await serversService.findServer(identifier);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Server lookup failed", description: err.message })],
      });
      return;
    }

    if (!server) {
      await interaction.editReply({
        embeds: [
          errorEmbed({
            title: "Server not found",
            description: `No server matching \`${identifier}\` was found on FeatherPanel.`,
          }),
        ],
      });
      return;
    }

    let resources = null;
    try {
      resources = await serversService.getServerResources(server.identifier || identifier);
    } catch {
      // resource usage is best-effort; ignore failures here
    }

    const fields = [
      { name: "Name", value: server.name || "Unknown", inline: true },
      { name: "Identifier", value: server.identifier || identifier, inline: true },
      { name: "Owner ID", value: `${server.user ?? "Unknown"}`, inline: true },
      { name: "Node", value: `${server.node ?? "Unknown"}`, inline: true },
      { name: "Suspended", value: server.suspended ? "Yes" : "No", inline: true },
    ];

    if (resources) {
      fields.push({
        name: "State",
        value: resources.current_state || resources.state || "Unknown",
        inline: true,
      });
    }

    await interaction.editReply({
      embeds: [infoEmbed({ title: `Server: ${server.name || identifier}`, fields })],
    });
  },
};
