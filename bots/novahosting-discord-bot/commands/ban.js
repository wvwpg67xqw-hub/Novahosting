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
    .setDescription("Ban a customer by suspending all of their FeatherPanel servers")
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

    let result;
    try {
      result = await usersService.banUser(panelUser.id, reason);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Ban failed", description: err.message })],
      });
      return;
    }

    const { total, succeeded, failed } = result;
    const allFailed = total > 0 && failed.length === total;
    const description =
      total === 0
        ? `${target} has no servers to suspend (the panel has no separate account-level ban).`
        : failed.length === 0
          ? `All ${total} of ${target}'s FeatherPanel servers have been suspended (the panel has no separate account-level ban).`
          : `Suspended ${succeeded.length}/${total} of ${target}'s servers. ${failed.length} failed: ${failed
              .map((f) => `#${f.server.id} (${f.error?.message || "unknown error"})`)
              .join(", ")}`;

    await interaction.editReply({
      embeds: [
        (failed.length > 0 ? errorEmbed : successEmbed)({
          title: allFailed ? "Ban Failed" : failed.length > 0 ? "User Partially Banned" : "User Banned",
          description,
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
