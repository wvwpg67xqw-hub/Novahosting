const { SlashCommandBuilder } = require("discord.js");
const billingService = require("../services/billing");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refund")
    .setDescription("Issue a refund to a customer's account")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to refund").setRequired(true),
    )
    .addNumberOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to refund")
        .setRequired(true)
        .setMinValue(0.01),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for the refund").setRequired(true),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getNumber("amount", true);
    const reason = interaction.options.getString("reason", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    try {
      await billingService.refund(panelUser.id, amount, reason);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Refund failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "Refund Issued",
          description: `Refunded **${amount}** to ${target}'s account.`,
          fields: [{ name: "Reason", value: reason }],
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Refund",
      target,
      details: `${amount} — ${reason}`,
      color: config.brand.warnColor,
    });
  },
};
