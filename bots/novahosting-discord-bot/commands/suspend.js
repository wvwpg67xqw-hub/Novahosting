const { SlashCommandBuilder } = require("discord.js");
const usersService = require("../services/users");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suspend")
    .setDescription("Suspend all of a customer's FeatherPanel servers")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to suspend").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    let result;
    try {
      result = await usersService.suspendUser(panelUser.id);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Suspend failed", description: err.message })],
      });
      return;
    }

    const { total, succeeded, failed } = result;
    const allFailed = total > 0 && failed.length === total;
    const description =
      total === 0
        ? `${target} has no servers to suspend.`
        : failed.length === 0
          ? `All ${total} of ${target}'s FeatherPanel servers have been suspended.`
          : `Suspended ${succeeded.length}/${total} of ${target}'s servers. ${failed.length} failed: ${failed
              .map((f) => `#${f.server.id} (${f.error?.message || "unknown error"})`)
              .join(", ")}`;

    await interaction.editReply({
      embeds: [
        (failed.length > 0 ? errorEmbed : successEmbed)({
          title: allFailed ? "Suspend Failed" : failed.length > 0 ? "User Partially Suspended" : "User Suspended",
          description,
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Suspend",
      target,
      color: config.brand.warnColor,
    });
  },
};
