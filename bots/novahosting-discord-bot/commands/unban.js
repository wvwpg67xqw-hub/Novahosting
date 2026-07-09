const { SlashCommandBuilder } = require("discord.js");
const usersService = require("../services/users");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a customer's FeatherPanel account")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to unban").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    try {
      await usersService.unbanUser(panelUser.id);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Unban failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "User Unbanned",
          description: `${target} has been unbanned from FeatherPanel.`,
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Unban",
      target,
      color: config.brand.successColor,
    });
  },
};
