const { SlashCommandBuilder } = require("discord.js");
const usersService = require("../services/users");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unsuspend")
    .setDescription("Lift a suspension on a customer's FeatherPanel account")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to unsuspend").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    try {
      await usersService.unsuspendUser(panelUser.id);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Unsuspend failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "User Unsuspended",
          description: `${target}'s FeatherPanel account has been reactivated.`,
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Unsuspend",
      target,
      color: config.brand.successColor,
    });
  },
};
