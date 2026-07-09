const { SlashCommandBuilder } = require("discord.js");
const billingService = require("../services/billing");
const { requireStaff } = require("../utils/permissions");
const { resolvePanelUser } = require("../utils/resolveUser");
const { infoEmbed, errorEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check a customer's account balance")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to check").setRequired(true),
    ),

  async execute(interaction) {
    if (!(await requireStaff(interaction))) return;

    const target = interaction.options.getUser("user", true);
    await interaction.deferReply();

    const panelUser = await resolvePanelUser(interaction, target);
    if (!panelUser) return;

    let balance;
    try {
      balance = await billingService.getBalance(panelUser.id);
    } catch (err) {
      await interaction.editReply({
        embeds: [errorEmbed({ title: "Balance lookup failed", description: err.message })],
      });
      return;
    }

    const amount = balance?.balance ?? balance?.amount ?? balance;

    await interaction.editReply({
      embeds: [
        infoEmbed({
          title: `Balance: ${target.username}`,
          fields: [{ name: "Current Balance", value: `${amount ?? "Unknown"}` }],
        }),
      ],
    });
  },
};
