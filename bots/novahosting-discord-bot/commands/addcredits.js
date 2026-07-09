const { SlashCommandBuilder } = require("discord.js");
const billingService = require("../services/billing");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { successEmbed, errorEmbed } = require("../utils/embeds");
const { logAction } = require("../utils/logger");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcredits")
    .setDescription("Add credits to a customer's account")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to credit").setRequired(true),
    )
    .addNumberOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of credits to add")
        .setRequired(true)
        .setMinValue(0.01),
    ),

  async execute(interaction, client) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getNumber("amount", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    try {
      await billingService.addCredits(panelUser.id, amount, `Added by staff via Discord (${interaction.user.tag})`);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Add credits failed", description: err.message })],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        successEmbed({
          title: "Credits Added",
          description: `Added **${amount}** credits to ${target}'s account.`,
        }),
      ],
    });

    await logAction(client, {
      actor: interaction.user,
      action: "Add Credits",
      target,
      details: `+${amount}`,
      color: config.brand.successColor,
    });
  },
};
