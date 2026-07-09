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
    .setDescription("Suspend a customer's FeatherPanel account")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to suspend").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    try {
      await usersService.suspendUser(panelUser.id);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Suspend failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "User Suspended",
          description: `${target}'s FeatherPanel account has been suspended.`,
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
