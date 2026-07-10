const { SlashCommandBuilder } = require("discord.js");
const usersService = require("../services/users");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a customer's FeatherPanel account")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to ban").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for the ban").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    try {
      await usersService.banUser(panelUser.uuid, reason);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Ban failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "User Banned",
          description: `${target}'s FeatherPanel account has been banned.`,
          fields: [{ name: "Reason", value: reason }],
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Ban",
      target,
      details: reason,
      color: config.brand.errorColor,
    });
  },
};
